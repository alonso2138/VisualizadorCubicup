const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');
const { getTemporaryFiles, removeTemporaryFile } = require('../utils/fileManager');
const { uploadDir } = require('../config/database');

// Schedule cleanup every day at midnight
function startCleanupSchedule() {
    cron.schedule('0 0 * * *', () => {
        console.log('Running cleanup for temporary uploads...');

        fs.readdir(uploadDir, (err, files) => {
            if (err) {
                console.error('Error reading uploads directory:', err);
                return;
            }

            const temporaryFiles = getTemporaryFiles();
            
            files.forEach(file => {
                const filePath = path.join(uploadDir, file);

                // Check if the file is temporary
                if (temporaryFiles.includes(file)) {
                    fs.unlink(filePath, err => {
                        if (err) {
                            console.error('Error deleting temporary file:', err);
                        } else {
                            console.log(`Deleted orphaned temporary file: ${file}`);
                            removeTemporaryFile(file);
                        }
                    });
                }
            });
        });
    });
}

module.exports = {
    startCleanupSchedule
};
