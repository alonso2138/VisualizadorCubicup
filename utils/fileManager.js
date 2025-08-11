const fs = require('fs-extra');
const { uploadDir } = require('../config/database');

// Temporary files tracking
const temporaryFiles = new Set();

// Schedule file deletion
function scheduleFileDeletion(filename) {
    const filePath = require('path').join(uploadDir, filename);
    setTimeout(() => {
        if (temporaryFiles.has(filename)) {
            fs.unlink(filePath, err => {
                if (err) {
                    console.error('Error deleting temporary file:', err);
                } else {
                    console.log(`Deleted temporary file: ${filename}`);
                    temporaryFiles.delete(filename);
                }
            });
        }
    }, 60 * 60 * 1000); // 1 hour
}

// Add file to temporary tracking
function addTemporaryFile(filename) {
    temporaryFiles.add(filename);
    scheduleFileDeletion(filename);
}

// Remove file from temporary tracking
function removeTemporaryFile(filename) {
    temporaryFiles.delete(filename);
}

// Check if file is temporary
function isTemporaryFile(filename) {
    return temporaryFiles.has(filename);
}

// Get all temporary files
function getTemporaryFiles() {
    return Array.from(temporaryFiles);
}

module.exports = {
    addTemporaryFile,
    removeTemporaryFile,
    isTemporaryFile,
    getTemporaryFiles,
    scheduleFileDeletion
};
