/**
 * Cloud Function: cleanupExpiredRooms
 * 
 * Scheduled function that runs periodically (e.g., every 10 minutes)
 * to delete expired multiplayer rooms and their associated chat/comments.
 * 
 * This prevents the database from growing unbounded with stale rooms.
 * 
 * Setup:
 * 1. Install Cloud Functions dependencies:
 *    npm install firebase-admin firebase-functions
 * 
 * 2. Deploy this function:
 *    firebase deploy --only functions:cleanupExpiredRooms
 * 
 * 3. Create a scheduled Cloud Scheduler job via the GCP Console:
 *    - Frequency: every 10 minutes (cron: 0,10,20,30,40,50 * * * *)
 *    - Timezone: UTC
 *    - HTTP Target: POST https://[REGION]-[PROJECT].cloudfunctions.net/cleanupExpiredRooms
 *    - Auth header: Add OIDC token (service account)
 * 
 * Alternative: Use the Firebase CLI to create the job:
 *    gcloud scheduler jobs create http cleanupExpiredRooms \
 *      --schedule="0,10,20,30,40,50 * * * *" \
 *      --uri=https://[REGION]-[PROJECT].cloudfunctions.net/cleanupExpiredRooms \
 *      --oidc-service-account-email=[SERVICE_ACCOUNT_EMAIL] \
 *      --oidc-token-audience=https://[REGION]-[PROJECT].cloudfunctions.net/cleanupExpiredRooms
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const database = admin.database();

// Timeout for expired rooms (30 minutes in milliseconds)
const ROOM_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Cloud Function to clean up expired multiplayer rooms.
 * Runs on a schedule (e.g., every 10 minutes).
 */
exports.cleanupExpiredRooms = functions.https.onRequest(async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const now = Date.now();
    const cutoffTime = now - ROOM_TIMEOUT_MS;

    // Query all rooms in multiplayer/*
    const roomsSnapshot = await database.ref('multiplayer').once('value');
    const allRooms = roomsSnapshot.val() || {};

    let deletedCount = 0;
    const deletePromises = [];

    // Find and delete expired rooms
    Object.entries(allRooms).forEach(([code, roomData]) => {
      if (!roomData) return;

      const createdAt = roomData.createdAt || 0;

      // If room is older than timeout, mark it for deletion
      if (createdAt < cutoffTime) {
        deletedCount += 1;

        // Delete the room and all its associated data (chat, comments are stored separately)
        deletePromises.push(
          database.ref(`multiplayer/${code}`).remove()
            .catch((err) => {
              console.error(`Failed to delete room ${code}:`, err);
            })
        );

        // Optionally also delete the chat messages for this room
        deletePromises.push(
          database.ref(`multiplayer/${code}/chat`).remove()
            .catch((err) => {
              console.error(`Failed to delete chat for room ${code}:`, err);
            })
        );
      }
    });

    // Wait for all deletes to complete
    await Promise.all(deletePromises);

    console.log(`Cleanup complete. Deleted ${deletedCount} expired rooms.`);

    return res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} expired rooms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error during room cleanup:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Alternative: Firestore-triggered cleanup (if using Firestore instead)
 * This can be used alongside or instead of the scheduled function.
 */
exports.cleanupExpiredRoomsOnWrite = functions.database
  .ref('multiplayer/{roomCode}')
  .onWrite(async (change, context) => {
    const roomCode = context.params.roomCode;
    const roomData = change.after.val();

    if (!roomData) return; // Room was deleted, nothing to do

    const createdAt = roomData.createdAt || 0;
    const now = Date.now();
    const age = now - createdAt;

    // If room exceeds timeout, delete it
    if (age > ROOM_TIMEOUT_MS) {
      try {
        await database.ref(`multiplayer/${roomCode}`).remove();
        console.log(`Deleted expired room: ${roomCode}`);
      } catch (error) {
        console.error(`Failed to delete room ${roomCode}:`, error);
      }
    }
  });
