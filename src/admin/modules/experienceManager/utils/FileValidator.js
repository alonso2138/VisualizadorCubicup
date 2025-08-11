// FileValidator - Validation utilities for file uploads
// Part of the ExperienceManager modular system

export class FileValidator {
    static validateFileType(file, allowedExtensions = ['.glb']) {
        const fileName = file.name.toLowerCase();
        return allowedExtensions.some(ext => fileName.endsWith(ext));
    }

    static validateFileSize(file, minSize = 1024, maxSize = 100 * 1024 * 1024) {
        return file.size >= minSize && file.size <= maxSize;
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    }

    static isValidGLBFile(file) {
        return this.validateFileType(file, ['.glb']) && 
               this.validateFileSize(file, 1024, 100 * 1024 * 1024);
    }

    static generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}
