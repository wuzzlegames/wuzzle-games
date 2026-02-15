import { useState, useEffect, useCallback } from 'react';
import { 
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  linkWithRedirect,
  getRedirectResult,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  deleteUser,
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, database } from '../config/firebase';
import { ref, get, set, remove, onValue, update, runTransaction } from 'firebase/database';
import { validateUsername } from '../lib/validation';
import { logError, formatError } from '../lib/errorUtils';
import { flushPendingLeaderboardOnLogin } from '../lib/pendingLeaderboard';
import { syncLocalStreaksToRemoteOnLogin } from '../lib/singlePlayerStore';
import { CHALLENGE_EXPIRY_MS } from './useNotificationSeen';

// Helper: determine whether a user is allowed to use social features (friends,
// challenges, multiplayer). Centralizing this makes it easy to adjust the
// verification policy without touching every caller.
function isVerifiedSocialUser(u) {
  if (!u) return false;
  const providers = u.providerData || [];
  const hasGoogle = providers.some((p) => p && p.providerId === 'google.com');
  return !!u.emailVerified || hasGoogle;
}

// Helper: normalize auth-related errors into user-facing messages. This keeps
// messaging consistent across profile, sign-in, and social helpers.
function formatAuthError(err) {
  if (!err) return null;
  if (typeof err === 'string') return err;
  const code = err.code || '';

  if (code === 'auth/network-request-failed') {
    return 'Network error. Please check your internet connection and try again.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a bit and try again.';
  }

  return err.message || 'Something went wrong with authentication. Please try again.';
}

const LINK_GOOGLE_RETURN_KEY = 'linkGoogleReturnTo';

export function useAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [incomingChallenges, setIncomingChallenges] = useState([]);
  // Outgoing multiplayer challenges created by the current user ("Sent" tab in UI).
  const [sentChallenges, setSentChallenges] = useState([]);
  const [linkGoogleJustCompleted, setLinkGoogleJustCompleted] = useState(false);

  // Handle redirect result from linkWithRedirect (Connect Google flow).
  // Must run on mount to detect when user returns from Google sign-in.
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          setUser(auth.currentUser);
          setLinkGoogleJustCompleted(true);
          const returnTo = sessionStorage.getItem(LINK_GOOGLE_RETURN_KEY) || '/profile';
          sessionStorage.removeItem(LINK_GOOGLE_RETURN_KEY);
          navigate(returnTo);
        }
      })
      .catch((err) => {
        if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/provider-already-linked') {
          setError('Google account is already linked.');
        } else {
          setError(formatAuthError(err));
        }
        sessionStorage.removeItem(LINK_GOOGLE_RETURN_KEY);
      });
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeFriends = null;
    let unsubscribeRequests = null;
    let unsubscribeChallenges = null;
    let unsubscribeSentChallenges = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      // Clean up any existing database listeners when auth user changes
      if (unsubscribeFriends) {
        unsubscribeFriends();
        unsubscribeFriends = null;
      }
      if (unsubscribeRequests) {
        unsubscribeRequests();
        unsubscribeRequests = null;
      }
      if (unsubscribeChallenges) {
        unsubscribeChallenges();
        unsubscribeChallenges = null;
      }

      setUser(authUser);

      if (authUser) {
        (async () => {
          try {
            await flushPendingLeaderboardOnLogin(authUser);
            await syncLocalStreaksToRemoteOnLogin(authUser, database);
          } catch (e) {
            logError(e, 'useAuth.flushPendingOnLogin');
          }
        })();
        const hasPasswordProvider = (authUser.providerData || []).some(
          (p) => p && p.providerId === 'password'
        );
        const hasUsername = !!authUser.displayName;
        if (hasPasswordProvider && !hasUsername) {
          const randomDigits = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0');
          const generatedUsername = `wuzzle-games-player-${randomDigits}`;

          updateProfile(authUser, { displayName: generatedUsername })
            .then(() => {
              if (isMounted) {
                setUser({ ...authUser, displayName: generatedUsername });
              }
            })
            .catch((err) => {
              // Failing to assign a default username should not block auth.
              console.error('Failed to assign default username:', err);
            });
        }

        // Ensure a minimal profile + lookup indexes exist in the Realtime Database
        // so we can look up users by email or username when sending friend requests.
        (async () => {
          try {
            const profileRef = ref(database, `users/${authUser.uid}/profile`);
            const email = authUser.email || null;
            const username = authUser.displayName || null;
            const nowIso = new Date().toISOString();

            await set(profileRef, {
              uid: authUser.uid,
              email,
              username,
              updatedAt: nowIso,
            });

            if (username) {
              const usernameKey = username.trim().toLowerCase();
              if (usernameKey) {
                await set(ref(database, `usernames/${usernameKey}`), {
                  uid: authUser.uid,
                });
              }
            }

            if (email) {
              const emailKey = email
                .trim()
                .toLowerCase()
                // Firebase Realtime Database does not allow certain characters in keys.
                .replace(/[.#$\[\]]/g, '_');
              if (emailKey) {
                await set(ref(database, `emails/${emailKey}`), {
                  uid: authUser.uid,
                });
              }
            }
          } catch (indexErr) {
            // Index failures should never block authentication.
            console.error('Failed to update user profile indexes:', indexErr);
          }
        })();
      }

      if (authUser) {
        // Only load social data for verified users (or OAuth providers like Google)
        const verified = isVerifiedSocialUser(authUser);
        if (!verified) {
          setFriends([]);
          setFriendRequests([]);
          setIncomingChallenges([]);
          setSentChallenges([]);
          setLoading(false);
          setError(null);
          return;
        }

        // Load friends list
        const friendsRef = ref(database, `users/${authUser.uid}/friends`);
        unsubscribeFriends = onValue(friendsRef, (snapshot) => {
          if (snapshot.exists()) {
            const friendsData = snapshot.val();
            const friendsList = Object.entries(friendsData).map(([id, data]) => ({
              id,
              ...data
            }));
            setFriends(friendsList);
          } else {
            setFriends([]);
          }
        });

        // Load friend requests
        const requestsRef = ref(database, `users/${authUser.uid}/friendRequests`);
        unsubscribeRequests = onValue(requestsRef, (snapshot) => {
          if (snapshot.exists()) {
            const requestsData = snapshot.val();
            const requestsList = Object.entries(requestsData).map(([id, data]) => ({
              id,
              ...data
            }));
            setFriendRequests(requestsList);
          } else {
            setFriendRequests([]);
          }
        });

        // Load incoming multiplayer challenges for this user
        const challengesRef = ref(database, `users/${authUser.uid}/challenges`);
        unsubscribeChallenges = onValue(challengesRef, (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.val();
            const list = Object.entries(raw).map(([id, data]) => ({ id, ...data }));
            // Sort newest first for nicer UI
            list.sort((a, b) => {
              const at = a.createdAt || a.sentAt || 0;
              const bt = b.createdAt || b.sentAt || 0;
              return bt - at;
            });
            setIncomingChallenges(list);
          } else {
            setIncomingChallenges([]);
          }
        });

        // Load outgoing (sent) multiplayer challenges created by this user.
        const sentRef = ref(database, `users/${authUser.uid}/sentChallenges`);
        unsubscribeSentChallenges = onValue(sentRef, (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.val();
            const list = Object.entries(raw).map(([id, data]) => ({ id, ...data }));
            // Sort newest first by createdAt for consistent UI.
            list.sort((a, b) => {
              const at = a.createdAt || a.sentAt || 0;
              const bt = b.createdAt || b.sentAt || 0;
              return bt - at;
            });
            setSentChallenges(list);
          } else {
            setSentChallenges([]);
          }
        });
        
        setLoading(false);
        setError(null);
      } else {
        setFriends([]);
        setFriendRequests([]);
        setIncomingChallenges([]);
        setSentChallenges([]);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      isMounted = false;
      if (unsubscribeFriends) unsubscribeFriends();
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeChallenges) unsubscribeChallenges();
      if (unsubscribeSentChallenges) unsubscribeSentChallenges();
      unsubscribeAuth();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      // Handle case where an email/password account already exists for this email.
      // In this scenario we always surface a friendly, actionable message instead of
      // the low-level Firebase error, even if we can't successfully inspect the
      // sign-in methods.
      if (err.code === 'auth/account-exists-with-different-credential') {
        const email = err.customData?.email || err.email || null;
        const friendlyMessage =
          'An account with this email already exists. Please sign in with email and password, then link Google from your Profile.';

        try {
          // Best-effort check: if there is no password sign-in method, we simply
          // fall back to the default error handling below. This mirrors Firebase's
          // guidance while still keeping the UX clear for the common case.
          if (email) {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (!methods.includes('password')) {
              // Non-password flow (e.g. another IdP) – keep the original error.
              setError(err.message);
              throw err;
            }
          }
        } catch (inner) {
          // If anything goes wrong while inspecting methods, we still prefer the
          // friendly message rather than the raw Firebase error.
          console.error('Error handling account-exists-with-different-credential:', inner);
        }

        const friendlyError = new Error(friendlyMessage);
        friendlyError.code = err.code;
        if (email) friendlyError.email = email;
        setError(friendlyError.message);
        throw friendlyError;
      }

      setError(formatAuthError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Send verification email for password-based accounts
      try {
        await sendEmailVerification(result.user);
      } catch (verifyErr) {
        console.error('Failed to send verification email:', verifyErr);
      }
      return result.user;
    } catch (err) {
      setError(formatAuthError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      setError(formatAuthError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    try {
      setError(null);
      setLoading(true);
      if (!email) {
        throw new Error('Please enter your email address to reset your password.');
      }
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err) {
      setError(formatAuthError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
    } catch (err) {
      setError(formatAuthError(err));
      throw err;
    }
  }, []);

  const updateUsername = useCallback(async (newUsername) => {
    try {
      setError(null);
      if (!auth.currentUser) throw new Error('No user signed in');

      const trimmed = (newUsername || '').trim();
      if (!trimmed) {
        throw new Error('Username cannot be empty');
      }

      const uid = auth.currentUser.uid;
      const previousUsername = auth.currentUser.displayName || null;
      const previousKey = previousUsername ? previousUsername.trim().toLowerCase() : null;

      // Update Firebase Auth displayName first so UI reflects the new username.
      await updateProfile(auth.currentUser, { displayName: trimmed });
      setUser({ ...auth.currentUser, displayName: trimmed });

      // Keep the Realtime Database profile and username index in sync so that
      // username-based lookups remain correct for friends search.
      const nowIso = new Date().toISOString();
      const profileRef = ref(database, `users/${uid}/profile`);
      await update(profileRef, {
        username: trimmed,
        updatedAt: nowIso,
      });

      const newKey = trimmed.toLowerCase();
      if (newKey) {
        await set(ref(database, `usernames/${newKey}`), { uid });
      }

      if (previousKey && previousKey !== newKey) {
        try {
          await remove(ref(database, `usernames/${previousKey}`));
        } catch (cleanupErr) {
          // Index cleanup should not block profile updates.
          console.error('Failed to remove old username index:', cleanupErr);
        }
      }

      return true;
    } catch (err) {
      setError(formatAuthError(err));
      throw err;
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      setError(null);
      if (!auth.currentUser) throw new Error('No user signed in');
      const uid = auth.currentUser.uid;
      const email = auth.currentUser.email || null;
      const username = auth.currentUser.displayName || null;

      // Best-effort cleanup of this user's social data and indexes.
      try {
        const userRef = ref(database, `users/${uid}`);
        await remove(userRef);

        if (username) {
          const usernameKey = username.trim().toLowerCase();
          if (usernameKey) {
            await remove(ref(database, `usernames/${usernameKey}`));
          }
        }

        if (email) {
          const emailKey = email.trim().toLowerCase().replace(/[.#$\[\]]/g, '_');
          if (emailKey) {
            await remove(ref(database, `emails/${emailKey}`));
          }
        }
      } catch (innerErr) {
        console.error('Failed to remove user social data before account deletion:', innerErr);
      }

      await deleteUser(auth.currentUser);
      return true;
    } catch (err) {
      setError(formatAuthError(err));
      throw err;
    }
  }, []);

  const sendFriendRequest = useCallback(async (friendName, friendId) => {
    try {
      setError(null);
      if (!auth.currentUser) throw new Error('No user signed in');
      if (!isVerifiedSocialUser(auth.currentUser)) {
        throw new Error('You must verify your email or sign in with Google to use friends.');
      }
      
      // Validate inputs
      if (!friendId || typeof friendId !== 'string') {
        throw new Error('Invalid friend ID');
      }
      
      // fromName must be the sender's name so the recipient sees who sent the request
      const senderDisplayName = auth.currentUser.displayName || auth.currentUser.email || 'Unknown';
      const usernameValidation = validateUsername(senderDisplayName);
      const fromName = usernameValidation.isValid ? usernameValidation.value : senderDisplayName;
      // Use transaction to prevent race conditions when both users send requests simultaneously
      const requestRef = ref(database, `users/${friendId}/friendRequests/${auth.currentUser.uid}`);
      const myRequestRef = ref(database, `users/${auth.currentUser.uid}/friendRequests/${friendId}`);
      
      const senderUid = auth.currentUser.uid;
      const payload = {
        from: senderUid,
        fromName,
        sentAt: new Date().toISOString(),
        timestamp: Date.now(),
      };
      await runTransaction(requestRef, (currentData) => {
        // Always write sender fields so existing (e.g. stale) requests get correct fromName/from
        if (currentData && typeof currentData === 'object') {
          return { ...currentData, ...payload };
        }
        return payload;
      });
      
      // Also check if the other user already sent us a request (mutual friend request detection)
      const otherUserRequestRef = ref(database, `users/${auth.currentUser.uid}/friendRequests/${friendId}`);
      const otherUserSnapshot = await get(otherUserRequestRef);
      if (otherUserSnapshot.exists()) {
        // Both users sent requests - they can be auto-accepted or handled specially
        // For now, we'll just proceed normally
      }
      
      return true;
    } catch (err) {
      const errorMessage = formatError(err) || formatAuthError(err) || 'Failed to send friend request';
      logError(err, 'useAuth.sendFriendRequest');
      setError(errorMessage);
      throw err;
    }
  }, []);

  const acceptFriendRequest = useCallback(async (fromUserId, fromUserName) => {
    try {
      setError(null);
      if (!auth.currentUser) throw new Error('No user signed in');
      if (!isVerifiedSocialUser(auth.currentUser)) {
        throw new Error('You must verify your email or sign in with Google to use friends.');
      }
      
      const nowIso = new Date().toISOString();
      
      // Add to current user's friends
      const myFriendRef = ref(database, `users/${auth.currentUser.uid}/friends/${fromUserId}`);
      await set(myFriendRef, {
        name: fromUserName,
        addedAt: nowIso
      });
      
      // Add current user to their friends (so friendship is mutual)
      const theirFriendRef = ref(database, `users/${fromUserId}/friends/${auth.currentUser.uid}`);
      await set(theirFriendRef, {
        name: auth.currentUser.displayName || 'Unknown',
        addedAt: nowIso
      });
      
      // Remove the friend request from the database
      const requestRef = ref(database, `users/${auth.currentUser.uid}/friendRequests/${fromUserId}`);
      await remove(requestRef);
      
      // Optimistically update local state so the Friends popup updates immediately
      setFriendRequests(prev => prev.filter((req) => req.id !== fromUserId));
      setFriends(prev => {
        // Avoid duplicate entries if listener already added this friend
        if (prev.some((f) => f.id === fromUserId)) return prev;
        return [...prev, { id: fromUserId, name: fromUserName, addedAt: nowIso }];
      });
      
      return true;
    } catch (err) {
      setError(formatAuthError(err));
      throw err;
    }
  }, []);

  const declineFriendRequest = useCallback(async (fromUserId, gameCode = null, setFriendStatusInMultiplayer = null) => {
    try {
      setError(null);
      if (!auth.currentUser) throw new Error('No user signed in');
      if (!isVerifiedSocialUser(auth.currentUser)) {
        throw new Error('You must verify your email or sign in with Google to use friends.');
      }
      
      const requestRef = ref(database, `users/${auth.currentUser.uid}/friendRequests/${fromUserId}`);
      await remove(requestRef);

      // If this decline came from a multiplayer game context and we were given a helper,
      // update the multiplayer game's friendRequestStatus so the waiting room button UI
      // can revert from "Friend request sent" back to "Add ... as Friend".
      if (gameCode && typeof setFriendStatusInMultiplayer === 'function') {
        try {
          await setFriendStatusInMultiplayer(gameCode, 'declined');
        } catch (err) {
          console.error('Failed to update multiplayer friendRequestStatus:', err);
        }
      }
      
      return true;
    } catch (err) {
      setError(formatAuthError(err));
      throw err;
    }
  }, []);

  const removeFriend = useCallback(async (friendId) => {
    try {
      setError(null);
      if (!auth.currentUser) throw new Error('No user signed in');
      if (!isVerifiedSocialUser(auth.currentUser)) {
        throw new Error('You must verify your email or sign in with Google to use friends.');
      }
      
      // Remove friend from current user's list
      const myFriendRef = ref(database, `users/${auth.currentUser.uid}/friends/${friendId}`);
      await remove(myFriendRef);
      
      // Also remove current user from the other user's friends list so unfriend is mutual
      const theirFriendRef = ref(database, `users/${friendId}/friends/${auth.currentUser.uid}`);
      await remove(theirFriendRef);
      
      // Update local state
      setFriends(prev => prev.filter(f => f.id !== friendId));
      return true;
    } catch (err) {
      setError(formatAuthError(err));
      throw err;
    }
  }, []);

  // Create or update a multiplayer challenge entry for a specific friend.
  // If a user has sent their friend a challenge, then neither the user nor
  // their friend should be able to send any more challenges to each other
  // until the existing challenge has been accepted or declined.
  //
  // This helper returns `true` when a new challenge is created, and `false`
  // when a challenge between the two users is already pending. In the
  // latter case no alert/error is thrown so callers can show a toast instead.
  // gameVariant can be 'standard' | 'speedrun' | 'solutionhunt' (string) or a boolean for legacy support
  const sendChallenge = useCallback(async (friendId, friendName, gameCode, boards, gameVariant) => {
    try {
      setError(null);
      if (!auth.currentUser) throw new Error('No user signed in');
      if (!isVerifiedSocialUser(auth.currentUser)) {
        throw new Error('You must verify your email or sign in with Google to use friends.');
      }

      const currentUserId = auth.currentUser.uid;
      const fromUserName = auth.currentUser.displayName || auth.currentUser.email || 'Unknown';

      // Before creating a new challenge, enforce that there is no existing
      // pending challenge between these two users in either direction.
      //
      // We can safely read our OWN challenges node; this catches the case
      // where the friend has already challenged us and we are trying to
      // send a new challenge back to them.
      const myChallengesRef = ref(database, `users/${currentUserId}/challenges`);
      const myChallengesSnap = await get(myChallengesRef);
      if (myChallengesSnap.exists()) {
        const challenges = myChallengesSnap.val();
        const hasIncomingPending = Object.values(challenges).some((c) =>
          c &&
          c.fromUserId === friendId &&
          (c.status === 'pending' || c.status === undefined || c.status === null)
        );
        if (hasIncomingPending) {
          // A pending challenge already exists between these two users.
          // Do not create another one; let caller surface a toast instead.
          return false;
        }
      }

      // Normalize variant: support both legacy boolean and new string format
      let variant = 'standard';
      if (typeof gameVariant === 'string') {
        variant = gameVariant;
      } else if (gameVariant === true) {
        // Legacy: boolean true means speedrun
        variant = 'speedrun';
      }

      const now = Date.now();
      const challengeData = {
        fromUserId: currentUserId,
        fromUserName,
        toUserId: friendId,
        toUserName: friendName,
        gameCode,
        boards,
        variant, // new: 'standard' | 'speedrun' | 'solutionhunt'
        speedrun: variant === 'speedrun', // backward compatibility
        solutionHunt: variant === 'solutionhunt',
        status: 'pending', // pending, accepted, cancelled
        createdAt: now,
      };

      // Write the challenge in a single multi-path update so that both the
      // receiver's incoming list and the sender's sent list stay in sync.
      const updates = {};
      updates[`users/${friendId}/challenges/${gameCode}`] = challengeData;
      updates[`users/${currentUserId}/sentChallenges/${gameCode}`] = challengeData;
      await update(ref(database), updates);

      return true;
    } catch (err) {
      console.error('sendChallenge error:', err);
      setError(formatAuthError(err));
      throw err;
    }
  }, []);

  // Accept a challenge and immediately clean it up from the receiver's list.
  // The caller is responsible for navigating into the /game route using the
  // returned challenge data.
  const acceptChallenge = useCallback(async (challengeId) => {
    try {
      setError(null);
      if (!auth.currentUser) throw new Error('No user signed in');
      const challengeRef = ref(database, `users/${auth.currentUser.uid}/challenges/${challengeId}`);
      const snapshot = await get(challengeRef);
      if (!snapshot.exists()) {
        throw new Error('Challenge not found');
      }
      const data = snapshot.val();

      // Auto-clean: remove the challenge node once it has been accepted so it
      // no longer appears in the Challenges list.
      await remove(challengeRef);

      return data;
    } catch (err) {
      console.error('acceptChallenge error:', err);
      setError(formatAuthError(err));
      throw err;
    }
  }, []);

  const dismissChallenge = useCallback(async (challengeId, gameCode = null) => {
    try {
      setError(null);
      if (!auth.currentUser) throw new Error('No user signed in');
      const challengeRef = ref(database, `users/${auth.currentUser.uid}/challenges/${challengeId}`);

      // Read the challenge payload first so we can also clean up the
      // challenger's sentChallenges list when a friend declines.
      const snapshot = await get(challengeRef);
      let challengerId = null;
      let effectiveGameCode = gameCode || challengeId;
      if (snapshot.exists()) {
        const data = snapshot.val();
        challengerId = data.fromUserId || null;
        if (!effectiveGameCode) {
          effectiveGameCode = data.gameCode || challengeId;
        }
      }

      // Always remove the incoming challenge for the current user so it no
      // longer appears in their "Received" list.
      await remove(challengeRef);

      // If we know who created the challenge, also remove it from their
      // sentChallenges list so it disappears from the challenger's modal.
      if (challengerId && effectiveGameCode) {
        try {
          const sentRef = ref(database, `users/${challengerId}/sentChallenges/${effectiveGameCode}`);
          await remove(sentRef);
        } catch (innerErr) {
          console.error('Failed to remove challenge from sender\'s sentChallenges after dismiss:', innerErr);
        }
      }

      // If this dismissal corresponds to a specific multiplayer game, mark it as
      // cancelled only when the room was created for a single Friends-modal
      // challenge (challengeOnly). Already-hosted rooms (invite from waiting room)
      // must not close when one invited friend declines.
      if (effectiveGameCode) {
        try {
          const gameRef = ref(database, `multiplayer/${effectiveGameCode}`);
          const gameSnap = await get(gameRef);
          if (gameSnap.exists()) {
            const gameData = gameSnap.val();
            const playerCount = Object.keys(gameData.players || {}).length;
            // Only cancel the room when it's challenge-only and at most one player (host only).
            // When playerCount > 1, the host can keep inviting others; only challenge list cleanup runs.
            if (gameData.challengeOnly === true && playerCount <= 1) {
              const cancelledByName =
                auth.currentUser.displayName || auth.currentUser.email || 'Your friend';
              await update(gameRef, {
                status: 'cancelled',
                cancelledByName,
              });
            }
          }
        } catch (innerErr) {
          console.error('Failed to mark multiplayer game as cancelled after dismissing challenge:', innerErr);
        }
      }

      return true;
    } catch (err) {
      console.error('dismissChallenge error:', err);
      setError(formatAuthError(err));
      throw err;
    }
  }, []);

  // Host-side helper for cancelling a sent challenge. This removes the
  // challenge from the sender's "Sent" list, from the friend's incoming
  // challenges list, and attempts to mark the underlying multiplayer game as
  // cancelled so that both players see a clear message.
  const cancelSentChallenge = useCallback(async (gameCode) => {
    try {
      setError(null);
      if (!auth.currentUser) throw new Error('No user signed in');
      const currentUserId = auth.currentUser.uid;

      const sentRef = ref(database, `users/${currentUserId}/sentChallenges/${gameCode}`);
      const snapshot = await get(sentRef);
      let friendId = null;
      let isExpired = false;
      if (snapshot.exists()) {
        const data = snapshot.val();
        friendId = data.toUserId || data.friendId || null;
        const createdAt = data.createdAt || 0;
        isExpired = createdAt + CHALLENGE_EXPIRY_MS < Date.now();
      }

      // Remove from the sender's sentChallenges list regardless of whether we
      // managed to read the payload, so that the UI no longer shows it.
      await remove(sentRef);

      // Remove from the friend's incoming challenges list only when challenge is still active.
      // When expired, the recipient may have already dismissed (node gone), which causes
      // PERMISSION_DENIED on remove; skip to avoid console error.
      if (friendId && !isExpired) {
        try {
          const incomingRef = ref(database, `users/${friendId}/challenges/${gameCode}`);
          await remove(incomingRef);
        } catch (innerErr) {
          // In some cases (e.g. legacy data or stricter security rules), the host
          // may not have permission to modify the friend's /challenges/ node.
          // That's OK: the receiver can still dismiss the challenge on their side.
          console.error(
            'Failed to remove incoming challenge after host cancelled sent challenge:',
            innerErr,
          );
        }
      }

      // Best-effort: mark the backing multiplayer game as cancelled only when the
      // room was created for a single Friends-modal challenge (challengeOnly).
      // Already-hosted rooms must not close when the host cancels one sent invite.
      try {
        const gameRef = ref(database, `multiplayer/${gameCode}`);
        const gameSnap = await get(gameRef);
        if (gameSnap.exists()) {
          const gameData = gameSnap.val();
          if (gameData.challengeOnly === true) {
            const cancelledByName =
              auth.currentUser.displayName || auth.currentUser.email || 'You';
            await update(gameRef, {
              status: 'cancelled',
              cancelledByName,
            });
          }
        }
      } catch (innerErr) {
        console.error('Failed to mark multiplayer game as cancelled after host cancelled sent challenge:', innerErr);
      }

      return true;
    } catch (err) {
      console.error('cancelSentChallenge error:', err);
      setError(formatAuthError(err));
      throw err;
    }
  }, []);

  const findUserByIdentifier = useCallback(async (identifier) => {
    const raw = (identifier || '').trim();
    if (!raw) {
      throw new Error('Please enter an email or username.');
    }

    const isEmail = raw.includes('@');
    const normalized = raw.toLowerCase();

    let lookupRef;
    if (isEmail) {
      const emailKey = normalized.replace(/[.#$\[\]]/g, '_');
      lookupRef = ref(database, `emails/${emailKey}`);
    } else {
      const usernameKey = normalized;
      lookupRef = ref(database, `usernames/${usernameKey}`);
    }

    const lookupSnap = await get(lookupRef);
    if (!lookupSnap.exists()) {
      return null;
    }

    const lookupVal = lookupSnap.val();
    const uid = typeof lookupVal === 'string' ? lookupVal : lookupVal?.uid;
    if (!uid) {
      return null;
    }

    if (auth.currentUser && auth.currentUser.uid === uid) {
      throw new Error('You cannot add yourself as a friend.');
    }

    const profileSnap = await get(ref(database, `users/${uid}/profile`));
    let displayName = null;
    let email = null;
    if (profileSnap.exists()) {
      const profile = profileSnap.val() || {};
      displayName = profile.username || profile.displayName || null;
      email = profile.email || null;
    }

    const name = displayName || email || 'Player';
    return { uid, name };
  }, []);

  const sendFriendRequestByIdentifier = useCallback(async (identifier) => {
    try {
      setError(null);
      const target = await findUserByIdentifier(identifier);
      if (!target) {
        throw new Error('No user found with that email or username.');
      }
      await sendFriendRequest(target.name, target.uid);
      return true;
    } catch (err) {
      console.error('sendFriendRequestByIdentifier error:', err);
      setError(formatAuthError(err));
      throw err;
    }
  }, [findUserByIdentifier, sendFriendRequest]);

  const isVerifiedUser = isVerifiedSocialUser(user);

  const resendVerificationEmail = useCallback(async () => {
    try {
      setError(null);
      if (!auth.currentUser) throw new Error('No user signed in');
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (err) {
      setError(formatAuthError(err));
      throw err;
    }
  }, []);

  const linkGoogleAccount = useCallback(async (returnTo = '/profile') => {
    setError(null);
    if (!auth.currentUser) throw new Error('No user signed in');
    sessionStorage.setItem(LINK_GOOGLE_RETURN_KEY, returnTo);
    await linkWithRedirect(auth.currentUser, googleProvider);
    // Page redirects; we never reach here.
  }, []);

  const clearLinkGoogleJustCompleted = useCallback(() => {
    setLinkGoogleJustCompleted(false);
  }, []);

  return {
    user,
    loading,
    error,
    friends,
    friendRequests,
    incomingChallenges,
    sentChallenges,
    isVerifiedUser,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    resetPassword,
    signOut,
    updateUsername,
    deleteAccount,
    sendFriendRequest,
    sendFriendRequestByIdentifier,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    sendChallenge,
    acceptChallenge,
    dismissChallenge,
    cancelSentChallenge,
    resendVerificationEmail,
    linkGoogleAccount,
    linkGoogleJustCompleted,
    clearLinkGoogleJustCompleted,
    // Expose a small helper so views like Profile can format auth errors
    // consistently without having to read the raw error state.
    formatAuthErrorForDisplay: formatAuthError,
  };
}
