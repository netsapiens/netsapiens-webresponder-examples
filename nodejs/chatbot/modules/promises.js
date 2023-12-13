const config = require('../config.json');

let pendingPromises = {};
let cleanupTimeouts = {};

/**
 * Sets a promise for a given sessionId.
 * @param {string} sessionId
 * @param {Promise} promise
 * @returns {Promise} Timeout-wrapped promise
 */
function set(sessionId, promise) {
    const timeoutPromise = promiseWithTimeout(promise, config.PROMISE_TIMEOUT_DURATION || 90000);

    if (cleanupTimeouts[sessionId]) {
        clearTimeout(cleanupTimeouts[sessionId]);
    }

    pendingPromises[sessionId] = timeoutPromise;
    scheduleCleanup(sessionId);
    return timeoutPromise;
}

/**
 * Gets a promise for a given sessionId.
 * @param {string} sessionId
 * @returns {Promise} Stored promise
 */
function get(sessionId) {
    return pendingPromises[sessionId];
}

/**
 * Removes a promise for a given sessionId.
 * @param {string} sessionId
 */
function remove(sessionId) {
    if (pendingPromises[sessionId]) {
        delete pendingPromises[sessionId];
    }
    if (cleanupTimeouts[sessionId]) {
        clearTimeout(cleanupTimeouts[sessionId]);
        delete cleanupTimeouts[sessionId];
    }
}

/**
 * Schedules a cleanup for a promise associated with a given sessionId.
 * @param {string} sessionId
 * @param {number} [duration=config.PROMISE_CLEANUP_DURATION || 180000]
 */
function scheduleCleanup(sessionId, duration = config.PROMISE_CLEANUP_DURATION || 180000) {
    cleanupTimeouts[sessionId] = setTimeout(() => {
        if (pendingPromises[sessionId]) {
            delete pendingPromises[sessionId];
            console.warn(`Cleaned up pending promise for sessionId: ${sessionId}`);
        }
        // Remove the cleanup timeout from the mapping once it's executed
        delete cleanupTimeouts[sessionId];
    }, duration);
}

/**
 * Wraps a promise with a timeout.
 * @param {Promise} promise 
 * @param {number} ms Timeout in milliseconds
 * @returns {Promise} A promise that rejects after the timeout if the original promise hasn't resolved/rejected
 */
function promiseWithTimeout(promise, ms) {
    let timeout;

    const timeoutPromise = new Promise((_, reject) => {
        timeout = setTimeout(() => {
            reject(new Error('Promise timeout'));
        }, ms);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timeout);
    });
}

module.exports = {
    set,
    get,
    remove
};
