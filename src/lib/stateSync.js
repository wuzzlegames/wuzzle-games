// State synchronization layer for managing local, persisted, and server state
// Handles conflict resolution, offline queuing, and retry logic

import { logError } from './errorUtils';

/**
 * State synchronization class
 * Manages synchronization between local storage, Firebase, and in-memory state
 */
export class StateSync {
  constructor(options = {}) {
    this.offlineQueue = [];
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.maxQueueSize = options.maxQueueSize || 100;
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  /**
   * Sync local and server state with conflict resolution
   * @param {string} key - State key
   * @param {Object} localState - Local state object
   * @param {Object} serverState - Server state object
   * @returns {Object} Merged state (newer timestamp wins)
   */
  async sync(key, localState, serverState) {
    if (!localState && !serverState) {
      return null;
    }
    
    if (!localState) {
      return serverState;
    }
    
    if (!serverState) {
      return localState;
    }
    
    // Compare timestamps for conflict resolution
    const localTimestamp = typeof localState.timestamp === 'number' ? localState.timestamp : 0;
    const serverTimestamp = typeof serverState.timestamp === 'number' ? serverState.timestamp : 0;
    
    if (serverTimestamp >= localTimestamp) {
      // Server is newer or equal - prefer server
      return serverState;
    } else {
      // Local is newer - prefer local
      return localState;
    }
  }

  /**
   * Queue an update for when connection is restored
   * @param {string} key - State key
   * @param {Function} updateFn - Async function that performs the update
   * @param {Object} metadata - Optional metadata about the update
   */
  queueUpdate(key, updateFn, metadata = {}) {
    if (this.offlineQueue.length >= this.maxQueueSize) {
      // Remove oldest entry
      this.offlineQueue.shift();
    }
    
    this.offlineQueue.push({
      key,
      updateFn,
      metadata,
      timestamp: Date.now(),
      attempts: 0,
    });
    
    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }
  }

  /**
   * Process queued updates
   */
  async processQueue() {
    if (!this.isOnline || this.offlineQueue.length === 0) {
      return;
    }
    
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const item of queue) {
      try {
        await item.updateFn();
        // Success - item is removed from queue
      } catch (error) {
        item.attempts++;
        
        if (item.attempts < this.retryAttempts) {
          // Retry later with exponential backoff
          setTimeout(() => {
            this.offlineQueue.push(item);
            this.processQueue();
          }, this.retryDelay * Math.pow(2, item.attempts - 1));
        } else {
          // Max retries exceeded - log and drop
          logError(
            `Failed to sync state for key ${item.key} after ${this.retryAttempts} attempts`,
            'StateSync.processQueue'
          );
        }
      }
    }
  }

  /**
   * Get connection status
   * @returns {boolean} True if online
   */
  getConnectionStatus() {
    return this.isOnline;
  }

  /**
   * Get queue size
   * @returns {number} Number of queued updates
   */
  getQueueSize() {
    return this.offlineQueue.length;
  }

  /**
   * Clear the offline queue
   */
  clearQueue() {
    this.offlineQueue = [];
  }
}

/**
 * Create a state sync instance
 * @param {Object} options - Configuration options
 * @returns {StateSync} State sync instance
 */
export function createStateSync(options = {}) {
  return new StateSync(options);
}

/**
 * Default state sync instance
 */
export const defaultStateSync = new StateSync();
