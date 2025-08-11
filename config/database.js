const path = require('path');
const fs = require('fs-extra');

// Directories configuration
const uploadDir = path.join(__dirname, "..", "uploads");
const gituploadsDir = path.join(__dirname, "..", "public", "uploads");
const projectsDir = path.join(__dirname, "..", "projects");

// Ensure directories exist
fs.ensureDirSync(uploadDir);
fs.ensureDirSync(gituploadsDir);
fs.ensureDirSync(projectsDir);

console.log('Projects Directory:', projectsDir);

module.exports = {
    uploadDir,
    gituploadsDir,
    projectsDir
};
