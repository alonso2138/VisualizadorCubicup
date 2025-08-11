const multer = require("multer");
const path = require("path");
const { uploadDir } = require('../config/database');

// Configure multer for file storage
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir); // Save model files in the "uploads" directory
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
            const fileExt = path.extname(file.originalname);
            const fileName = path.basename(file.originalname, fileExt) + "-" + uniqueSuffix + fileExt;
            cb(null, fileName);
        }
    }),
    limits: { fileSize: 1000 * 1024 * 1024 } // 100MB limit
});

module.exports = upload;
