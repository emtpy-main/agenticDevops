const admin = require('../firebaseAdmin');

const db = admin.firestore();

/**
 * Creates a logger instance for a specific job.
 * @param {string} jobId - The unique ID of the job.
 */
const createLogger = (jobId) => {
    const jobRef = db.collection('jobs').doc(jobId);
    const logsRef = jobRef.collection('logs');

    return {
        /**
         * Updates the job status and optional details.
         * @param {string} status - queued, in-progress, success, failed
         * @param {object} details - Additional data like error messages or image tags.
         */
        updateStatus: async (status, details = {}) => {
            try {
                await jobRef.set({
                    status,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    ...details
                }, { merge: true });
            } catch (err) {
                console.error(`[Firebase] Failed to update status for ${jobId}:`, err.message);
            }
        },

        /**
         * Adds a log entry to the job's logs sub-collection.
         * @param {string} message - The log message.
         * @param {string} type - info, error, warning
         */
        log: async (message, type = 'info') => {
            try {
                // We await this to ensure errors are caught and don't crash the process
                await logsRef.add({
                    message,
                    type,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            } catch (err) {
                console.error(`[Firebase Log Error] ${jobId}:`, err.message);
            }
        },

        /**
         * Deletes all logs in the sub-collection to save space.
         */
        deleteLogs: async () => {
            try {
                console.log(`[Firebase] Cleaning up logs for job: ${jobId}`);
                const snapshot = await logsRef.get();
                
                const batch = db.batch();
                snapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                console.log(`[Firebase] Logs cleared for job: ${jobId}`);
            } catch (err) {
                console.error(`[Firebase Cleanup Error] ${jobId}:`, err.message);
            }
        }
    };
};

module.exports = createLogger;
