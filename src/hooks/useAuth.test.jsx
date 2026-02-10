import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// --- Firebase mocks with in-memory auth + database ---

// Mock firebase/app so that src/config/firebase.js can import it safely
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn((config) => ({ config, _delegate: { _getProvider: vi.fn(() => ({})) } })),
}));

// Mock Firestore to prevent initialization errors
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => () => {}),
  addDoc: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
}));

// Mock firebase/functions so config/firebase.js getFunctions(app) does not throw
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn()),
}));

// Auth mock state lives entirely inside the mock factory so it is safe with Vitest hoisting
vi.mock('firebase/auth', () => {
  const inMemoryAuth = { currentUser: null };
  const authListeners = new Set();

  const getAuth = vi.fn(() => inMemoryAuth);

  const onAuthStateChanged = vi.fn((authArg, callback) => {
    authListeners.add(callback);
    return () => {
      authListeners.delete(callback);
    };
  });

  const signInWithPopup = vi.fn();
  const signOut = vi.fn();
  const createUserWithEmailAndPassword = vi.fn();
  const signInWithEmailAndPassword = vi.fn();
  const updateProfile = vi.fn(async (user, updates) => {
    Object.assign(user, updates);
  });
  const sendEmailVerification = vi.fn();
  const linkWithRedirect = vi.fn();
  const getRedirectResult = vi.fn(() => Promise.resolve(null));
  const fetchSignInMethodsForEmail = vi.fn();

  // Must be constructible because src/config/firebase.js uses `new GoogleAuthProvider()`
  function GoogleAuthProvider() {
    this.providerId = 'google.com';
  }

  return {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    updateProfile,
    sendEmailVerification,
    linkWithRedirect,
    getRedirectResult,
    fetchSignInMethodsForEmail,
  };
});

vi.mock('firebase/database', () => {
  // In-memory Realtime Database implementation scoped to this mock factory
  const createInMemoryDatabaseMock = () => {
    const data = {};
    const listeners = new Map(); // path -> Set<callback>

    const getPath = (path) => {
      if (!path) return undefined;
      const segments = path.split('/').filter(Boolean);
      let current = data;
      for (const segment of segments) {
        if (current == null || typeof current !== 'object' || !(segment in current)) {
          return undefined;
        }
        current = current[segment];
      }
      return current;
    };

    const setPath = (path, value) => {
      const segments = path.split('/').filter(Boolean);
      let current = data;
      for (let i = 0; i < segments.length - 1; i += 1) {
        const segment = segments[i];
        if (!current[segment] || typeof current[segment] !== 'object') {
          current[segment] = {};
        }
        current = current[segment];
      }
      if (value === undefined) {
        delete current[segments[segments.length - 1]];
      } else {
        current[segments[segments.length - 1]] = value;
      }
    };

    const buildSnapshot = (value) => ({
      exists: () => value !== undefined && value !== null,
      val: () => value,
    });

    const notifyListeners = (path) => {
      const value = getPath(path);
      const snapshot = buildSnapshot(value);
      const cbs = listeners.get(path);
      if (!cbs) return;
      for (const cb of Array.from(cbs)) {
        cb(snapshot);
      }
    };

    return {
      data,
      listeners,
      getPath,
      setPath,
      buildSnapshot,
      notifyListeners,
    };
  };

  // Each test file gets a single in-memory DB instance created inside the mock
  const dbState = createInMemoryDatabaseMock();

  const getDatabase = vi.fn(() => ({ __mock: 'database', data: dbState.data }));

  const ref = vi.fn((db, path) => ({ db, path }));

  const onValue = vi.fn((refObj, callback) => {
    const path = refObj.path;
    if (!dbState.listeners.has(path)) {
      dbState.listeners.set(path, new Set());
    }
    dbState.listeners.get(path).add(callback);

    // Immediately send current value snapshot
    const value = dbState.getPath(path);
    callback(dbState.buildSnapshot(value));

    return () => {
      const set = dbState.listeners.get(path);
      if (set) {
        set.delete(callback);
        if (set.size === 0) dbState.listeners.delete(path);
      }
    };
  });

  const set = vi.fn(async (refObj, value) => {
    const path = refObj.path;
    dbState.setPath(path, value);
    dbState.notifyListeners(path);
  });

  const remove = vi.fn(async (refObj) => {
    const path = refObj.path;
    dbState.setPath(path, undefined);
    dbState.notifyListeners(path);
  });

  const get = vi.fn(async (refObj) => {
    const value = dbState.getPath(refObj.path);
    return dbState.buildSnapshot(value);
  });

  const update = vi.fn(async (refObj, value) => {
    const existing = dbState.getPath(refObj.path) || {};
    dbState.setPath(refObj.path, { ...existing, ...value });
    dbState.notifyListeners(refObj.path);
  });

  const runTransaction = vi.fn(async (refObj, transactionUpdate) => {
    const currentData = dbState.getPath(refObj.path) || null;
    const newData = transactionUpdate(currentData);
    if (newData !== null) {
      dbState.setPath(refObj.path, newData);
      dbState.notifyListeners(refObj.path);
    }
    return { committed: true, snapshot: dbState.buildSnapshot(dbState.getPath(refObj.path)) };
  });

  const __resetDb = () => {
    dbState.listeners.clear();
    Object.keys(dbState.data).forEach((k) => delete dbState.data[k]);
  };

  return {
    getDatabase,
    ref,
    onValue,
    set,
    remove,
    get,
    update,
    runTransaction,
    __resetDb,
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

// Now import the hook under test (after mocks)
import { useAuth } from './useAuth';
import * as firebaseAuth from 'firebase/auth';
import * as firebaseDb from 'firebase/database';

const getAuthListener = () => {
  const { onAuthStateChanged } = firebaseAuth;
  const calls = onAuthStateChanged.mock.calls;
  if (!calls.length) return null;
  // listener is second arg
  return calls[0][1];
};

beforeEach(() => {
  // Reset auth + DB between tests
  const auth = firebaseAuth.getAuth();
  auth.currentUser = null;

  if (typeof firebaseDb.__resetDb === 'function') {
    firebaseDb.__resetDb();
  }

  sessionStorage.removeItem('linkGoogleReturnTo');
  vi.clearAllMocks();
});

// --- Tests ---

describe('useAuth - auth flows', () => {
  it('signUpWithEmail calls Firebase and sends verification email, manages loading and error on success', async () => {
    const { createUserWithEmailAndPassword, sendEmailVerification } = firebaseAuth;
    const fakeUser = { uid: 'u1', email: 'test@example.com' };
    createUserWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });
    sendEmailVerification.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth());

    // Simulate initial auth state (logged out)
    const listener = getAuthListener();
    expect(listener).toBeTypeOf('function');
    act(() => {
      listener(null);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.signUpWithEmail('test@example.com', 'password123');
    });

    expect(createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.any(Object),
      'test@example.com',
      'password123',
    );

    expect(sendEmailVerification).toHaveBeenCalledTimes(1);
    expect(sendEmailVerification).toHaveBeenCalledWith(fakeUser);

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('signInWithEmail handles success and sets loading/error correctly', async () => {
    const { signInWithEmailAndPassword } = firebaseAuth;
    const fakeUser = { uid: 'u2', email: 'user@example.com' };
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });

    const { result } = renderHook(() => useAuth());

    const listener = getAuthListener();
    act(() => {
      listener(null);
    });

    await act(async () => {
      await result.current.signInWithEmail('user@example.com', 'secret');
    });

    expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.any(Object),
      'user@example.com',
      'secret',
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('signInWithEmail surfaces error message and rethrows on failure', async () => {
    const { signInWithEmailAndPassword } = firebaseAuth;
    const err = new Error('Invalid credentials');
    signInWithEmailAndPassword.mockRejectedValueOnce(err);

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(null);
    });

    let caught;
    await act(async () => {
      try {
        await result.current.signInWithEmail('user@example.com', 'wrong');
      } catch (e) {
        caught = e;
      }
    });

    expect(caught).toBe(err);
    expect(result.current.error).toBe('Invalid credentials');
    expect(result.current.loading).toBe(false);
  });

  it('signInWithGoogle normal success path calls signInWithPopup and manages loading/error', async () => {
    const { signInWithPopup } = firebaseAuth;
    const fakeUser = { uid: 'g1', email: 'google@example.com' };
    signInWithPopup.mockResolvedValueOnce({ user: fakeUser });

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(null);
    });

    await act(async () => {
      const returnedUser = await result.current.signInWithGoogle();
      expect(returnedUser).toBe(fakeUser);
    });

    expect(signInWithPopup).toHaveBeenCalledTimes(1);
    expect(signInWithPopup.mock.calls[0][0]).toBeDefined(); // auth instance

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('signInWithGoogle handles auth/account-exists-with-different-credential with password method', async () => {
    const { signInWithPopup, fetchSignInMethodsForEmail } = firebaseAuth;
    const baseError = new Error('Account exists with different credential');
    // @ts-expect-error augment error object for testing
    baseError.code = 'auth/account-exists-with-different-credential';
    // @ts-expect-error
    baseError.customData = { email: 'conflict@example.com' };

    signInWithPopup.mockRejectedValueOnce(baseError);
    fetchSignInMethodsForEmail.mockResolvedValueOnce(['password']);

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(null);
    });

    let thrown;
    await act(async () => {
      try {
        await result.current.signInWithGoogle();
      } catch (e) {
        thrown = e;
      }
    });

    expect(fetchSignInMethodsForEmail).toHaveBeenCalledWith(
      expect.any(Object),
      'conflict@example.com',
    );

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.code).toBe('auth/account-exists-with-different-credential');
    expect(thrown.message).toContain('An account with this email already exists');

    expect(result.current.error).toContain('An account with this email already exists');
    expect(result.current.loading).toBe(false);
  });

  it('signOut calls Firebase signOut and user is cleared when auth emits null', async () => {
    const { signOut: firebaseSignOut } = firebaseAuth;
    firebaseSignOut.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth());

    const listener = getAuthListener();
    expect(listener).toBeTypeOf('function');

    const signedInUser = { uid: 'u3', emailVerified: true, providerData: [] };
    act(() => {
      listener(signedInUser);
    });

    expect(result.current.user).toEqual(signedInUser);

    await act(async () => {
      await result.current.signOut();
    });

    expect(firebaseSignOut).toHaveBeenCalledTimes(1);
    expect(firebaseSignOut).toHaveBeenCalledWith(expect.any(Object));

    act(() => {
      listener(null);
    });

    expect(result.current.user).toBeNull();
  });
});

describe('useAuth - social data subscription', () => {
  it('subscribes to friends, friendRequests, and challenges when a verified user logs in', async () => {
    const db = firebaseDb.getDatabase();
    const friendsRef = firebaseDb.ref(db, 'users/u123/friends');
    const requestsRef = firebaseDb.ref(db, 'users/u123/friendRequests');
    const challengesRef = firebaseDb.ref(db, 'users/u123/challenges');

    await firebaseDb.set(friendsRef, {
      friend1: { name: 'Alice' },
      friend2: { name: 'Bob' },
    });

    await firebaseDb.set(requestsRef, {
      r1: { fromName: 'Carol' },
    });

    await firebaseDb.set(challengesRef, {
      c1: { fromUserName: 'Dave', createdAt: 2 },
      c2: { fromUserName: 'Eve', createdAt: 5 },
    });

    const { result } = renderHook(() => useAuth());

    const listener = getAuthListener();
    expect(listener).toBeTypeOf('function');

    const verifiedUser = {
      uid: 'u123',
      emailVerified: true,
      providerData: [],
    };

    act(() => {
      listener(verifiedUser);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    expect(result.current.friends).toEqual([
      { id: 'friend1', name: 'Alice' },
      { id: 'friend2', name: 'Bob' },
    ]);

    expect(result.current.friendRequests).toEqual([
      { id: 'r1', fromName: 'Carol' },
    ]);

    // Challenges should be sorted newest first by createdAt
    expect(result.current.incomingChallenges.map((c) => c.id)).toEqual(['c2', 'c1']);
  });

  it('clears social arrays and resets loading/error when auth emits null', () => {
    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();

    const verifiedUser = {
      uid: 'u123',
      emailVerified: true,
      providerData: [],
    };

    act(() => {
      listener(verifiedUser);
    });

    act(() => {
      listener(null);
    });

    expect(result.current.friends).toEqual([]);
    expect(result.current.friendRequests).toEqual([]);
    expect(result.current.incomingChallenges).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useAuth - profile helpers', () => {
  it('updateUsername updates displayName, profile username, and username index', async () => {
    const { getAuth, updateProfile } = firebaseAuth;
    const { set, get, ref } = firebaseDb;
    const auth = getAuth();
    auth.currentUser = {
      uid: 'u5',
      displayName: 'Old Name',
      emailVerified: true,
      providerData: [],
    };

    const db = firebaseDb.getDatabase();
    // Seed existing profile + username index for the old name.
    await set(ref(db, 'users/u5/profile'), {
      uid: 'u5',
      email: 'old@example.com',
      username: 'Old Name',
    });
    await set(ref(db, 'usernames/old name'), { uid: 'u5' });

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(auth.currentUser);
    });

    await act(async () => {
      await result.current.updateUsername('New Name');
    });

    expect(updateProfile).toHaveBeenCalledWith(auth.currentUser, { displayName: 'New Name' });
    expect(result.current.user.displayName).toBe('New Name');

    const profileSnap = await get(ref(db, 'users/u5/profile'));
    expect(profileSnap.val().username).toBe('New Name');

    const newIndexSnap = await get(ref(db, 'usernames/new name'));
    expect(newIndexSnap.val().uid).toBe('u5');

    const oldIndexSnap = await get(ref(db, 'usernames/old name'));
    expect(oldIndexSnap.exists()).toBe(false);

    expect(result.current.error).toBeNull();
  });

  it('resendVerificationEmail calls sendEmailVerification for current user', async () => {
    const { getAuth, sendEmailVerification } = firebaseAuth;
    const auth = getAuth();
    auth.currentUser = {
      uid: 'u6',
      email: 'verify@example.com',
      emailVerified: false,
      providerData: [],
    };

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(auth.currentUser);
    });

    await act(async () => {
      await result.current.resendVerificationEmail();
    });

    expect(sendEmailVerification).toHaveBeenCalledTimes(1);
    expect(sendEmailVerification).toHaveBeenCalledWith(auth.currentUser);
    expect(result.current.error).toBeNull();
  });

  it('linkGoogleAccount sets sessionStorage and calls linkWithRedirect', async () => {
    const { getAuth, linkWithRedirect } = firebaseAuth;
    const auth = getAuth();
    auth.currentUser = {
      uid: 'u7',
      email: 'link@example.com',
      emailVerified: false,
      providerData: [],
    };

    linkWithRedirect.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(auth.currentUser);
    });

    await act(async () => {
      await result.current.linkGoogleAccount('/profile');
    });

    expect(sessionStorage.getItem('linkGoogleReturnTo')).toBe('/profile');
    expect(linkWithRedirect).toHaveBeenCalledTimes(1);
    expect(linkWithRedirect).toHaveBeenCalledWith(auth.currentUser, expect.anything());
  });

  it('linkGoogleAccount propagates error when linkWithRedirect rejects', async () => {
    const { getAuth, linkWithRedirect } = firebaseAuth;
    const auth = getAuth();
    auth.currentUser = {
      uid: 'u8',
      email: 'linked@example.com',
      emailVerified: true,
      providerData: [{ providerId: 'google.com' }],
    };

    const err = new Error('Already linked');
    // @ts-expect-error - augment error
    err.code = 'auth/provider-already-linked';
    linkWithRedirect.mockRejectedValueOnce(err);

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(auth.currentUser);
    });

    let caught;
    await act(async () => {
      try {
        await result.current.linkGoogleAccount();
      } catch (e) {
        caught = e;
      }
    });

    expect(caught).toBe(err);
  });
});

describe('useAuth - friends & challenges helpers', () => {
  it('sendFriendRequest writes request for verified users and rejects unverified', async () => {
    // This test intentionally exercises an error path for unverified users,
    // so silence the expected console.error noise.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getAuth } = firebaseAuth;
    const auth = getAuth();
    auth.currentUser = {
      uid: 'me',
      displayName: 'Me',
      emailVerified: false,
      providerData: [],
    };

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(auth.currentUser);
    });

    // Unverified user should see an error
    let unverifiedError;
    await act(async () => {
      try {
        await result.current.sendFriendRequest('Friend', 'friend-1');
      } catch (e) {
        unverifiedError = e;
      }
    });
    expect(unverifiedError).toBeInstanceOf(Error);

    // Now mark user verified and try again
    auth.currentUser.emailVerified = true;
    let ok;
    await act(async () => {
      ok = await result.current.sendFriendRequest('Friend', 'friend-1');
    });
    expect(ok).toBe(true);

    const { __resetDb, get, ref } = firebaseDb;
    const db = firebaseDb.getDatabase();
    const reqRef = ref(db, 'users/friend-1/friendRequests/me');
    const snap = await get(reqRef);
    expect(snap.exists()).toBe(true);

    consoleErrorSpy.mockRestore();
  });

  it('acceptFriendRequest creates mutual friends and removes request', async () => {
    const { getAuth } = firebaseAuth;
    const auth = getAuth();
    auth.currentUser = {
      uid: 'me',
      displayName: 'Me',
      emailVerified: true,
      providerData: [],
    };

    const { set } = firebaseDb;
    const db = firebaseDb.getDatabase();
    // Seed a request
    await set(firebaseDb.ref(db, 'users/me/friendRequests/other'), {
      fromName: 'Other',
    });

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(auth.currentUser);
    });

    let ok;
    await act(async () => {
      ok = await result.current.acceptFriendRequest('other', 'Other');
    });
    expect(ok).toBe(true);

    const { get, ref } = firebaseDb;
    const myFriendSnap = await get(ref(db, 'users/me/friends/other'));
    const theirFriendSnap = await get(ref(db, 'users/other/friends/me'));
    const reqSnap = await get(ref(db, 'users/me/friendRequests/other'));
    expect(myFriendSnap.exists()).toBe(true);
    expect(theirFriendSnap.exists()).toBe(true);
    expect(reqSnap.exists()).toBe(false);
  });

  it('removeFriend removes friendship from both users', async () => {
    const { getAuth } = firebaseAuth;
    const auth = getAuth();
    auth.currentUser = {
      uid: 'me',
      displayName: 'Me',
      emailVerified: true,
      providerData: [],
    };

    const { set, get, ref } = firebaseDb;
    const db = firebaseDb.getDatabase();
    await set(ref(db, 'users/me/friends/other'), { name: 'Other' });
    await set(ref(db, 'users/other/friends/me'), { name: 'Me' });

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(auth.currentUser);
    });

    await act(async () => {
      await result.current.removeFriend('other');
    });

    const myFriendSnap = await get(ref(db, 'users/me/friends/other'));
    const theirFriendSnap = await get(ref(db, 'users/other/friends/me'));
    expect(myFriendSnap.exists()).toBe(false);
    expect(theirFriendSnap.exists()).toBe(false);
  });

  it('sendChallenge prevents duplicates and writes multi-path updates', async () => {
    const { getAuth } = firebaseAuth;
    const auth = getAuth();
    auth.currentUser = {
      uid: 'me',
      displayName: 'Me',
      email: 'me@example.com',
      emailVerified: true,
      providerData: [],
    };

    const db = firebaseDb.getDatabase();
    const { set, get, ref, update } = firebaseDb;

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(auth.currentUser);
    });

    // Seed an existing incoming challenge from friend -> should cause sendChallenge to return false
    await set(ref(db, 'users/me/challenges/EXISTING'), {
      fromUserId: 'friend-1',
      status: 'pending',
    });

    let ok;
    await act(async () => {
      ok = await result.current.sendChallenge('friend-1', 'Friend', 'NEWCODE', 3, true);
    });
    expect(ok).toBe(false);

    // Now clear challenges and verify that a new challenge writes multi-path updates
    await firebaseDb.remove(ref(db, 'users/me/challenges/EXISTING'));

    let capturedUpdate = null;
    update.mockImplementationOnce(async (rootRef, value) => {
      capturedUpdate = { rootRef, value };
    });

    await act(async () => {
      ok = await result.current.sendChallenge('friend-1', 'Friend', 'GAME123', 4, false);
    });
    expect(ok).toBe(true);
    expect(capturedUpdate).not.toBeNull();
    const keys = Object.keys(capturedUpdate.value);
    expect(keys).toContain('users/friend-1/challenges/GAME123');
    expect(keys).toContain('users/me/sentChallenges/GAME123');
  });

  it('acceptChallenge returns data and removes the stored challenge', async () => {
    const { getAuth } = firebaseAuth;
    const auth = getAuth();
    auth.currentUser = {
      uid: 'me',
      displayName: 'Me',
      emailVerified: true,
      providerData: [],
    };

    const { set, get, ref } = firebaseDb;
    const db = firebaseDb.getDatabase();
    const challengeRef = ref(db, 'users/me/challenges/CH123');
    const payload = { boards: 5, speedrun: true, gameCode: 'GAME123' };
    await set(challengeRef, payload);

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(auth.currentUser);
    });

    let returned;
    await act(async () => {
      returned = await result.current.acceptChallenge('CH123');
    });
    expect(returned).toEqual(payload);

    const snap = await get(challengeRef);
    expect(snap.exists()).toBe(false);
  });

  it('dismissChallenge removes incoming challenge and marks multiplayer game cancelled when gameCode provided', async () => {
    const { getAuth } = firebaseAuth;
    const auth = getAuth();
    auth.currentUser = {
      uid: 'me',
      displayName: 'Me User',
      emailVerified: true,
      providerData: [],
    };

    const { set, get, ref } = firebaseDb;
    const db = firebaseDb.getDatabase();

    const chRef = ref(db, 'users/me/challenges/CH456');
    await set(chRef, { fromUserId: 'friend-1', gameCode: 'GM456' });
    const sentRef = ref(db, 'users/friend-1/sentChallenges/GM456');
    await set(sentRef, { toUserId: 'me', gameCode: 'GM456' });
    const gameRef = ref(db, 'multiplayer/GM456');
    await set(gameRef, { status: 'waiting', challengeOnly: true });

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(auth.currentUser);
    });

    await act(async () => {
      await result.current.dismissChallenge('CH456', 'GM456');
    });

    const chSnap = await get(chRef);
    const sentSnap = await get(sentRef);
    const gameSnap = await get(gameRef);
    expect(chSnap.exists()).toBe(false);
    expect(sentSnap.exists()).toBe(false);
    expect(gameSnap.val().status).toBe('cancelled');
    expect(gameSnap.val().cancelledByName).toBe('Me User');
  });

  it('cancelSentChallenge cleans up sent and incoming challenges and updates multiplayer game', async () => {
    const { getAuth } = firebaseAuth;
    const auth = getAuth();
    auth.currentUser = {
      uid: 'me',
      displayName: 'Me User',
      emailVerified: true,
      providerData: [],
    };

    const { set, get, ref } = firebaseDb;
    const db = firebaseDb.getDatabase();

    const sentRef = ref(db, 'users/me/sentChallenges/GM1');
    await set(sentRef, { toUserId: 'friend-1', gameCode: 'GM1', createdAt: Date.now() });
    const incomingRef = ref(db, 'users/friend-1/challenges/GM1');
    await set(incomingRef, { fromUserId: 'me', gameCode: 'GM1' });
    const gameRef = ref(db, 'multiplayer/GM1');
    await set(gameRef, { status: 'waiting', challengeOnly: true });

    const { result } = renderHook(() => useAuth());
    const listener = getAuthListener();
    act(() => {
      listener(auth.currentUser);
    });

    await act(async () => {
      await result.current.cancelSentChallenge('GM1');
    });

    const sentSnap = await get(sentRef);
    const incomingSnap = await get(incomingRef);
    const gameSnap = await get(gameRef);
    expect(sentSnap.exists()).toBe(false);
    expect(incomingSnap.exists()).toBe(false);
    expect(gameSnap.val().status).toBe('cancelled');
    expect(gameSnap.val().cancelledByName).toBe('Me User');
  });
});
