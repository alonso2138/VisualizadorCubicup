// File validation utilities for MaterialUploader
export class FileValidator {
    static ALLOWED_TYPES = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'model/gltf-binary', 'application/octet-stream'
    ];
    
    static ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.glb'];
    static MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    static validate(file) {
        const errors = [];
        
        if (!this.isValidType(file)) {
            errors.push(`Tipo de archivo no válido: ${file.name}`);
        }
        
        if (file.size > this.MAX_FILE_SIZE) {
            errors.push(`Archivo demasiado grande: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        }
        
        return { valid: errors.length === 0, errors };
    }
    
    static isValidType(file) {
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        return this.ALLOWED_TYPES.includes(file.type) || this.ALLOWED_EXTENSIONS.includes(fileExtension);
    }
}
