// Shared configuration for admin interface
export const AdminConfig = {
    // API Base URLs
    API_BASE_URL: '',
    
    // Default PBR Settings
    DEFAULT_PBR_SETTINGS: {
        metalness: 0.3,
        roughness: 0.4,
        normalScale: 1.0,
        aoIntensity: 1.0,
        enableNormal: true,
        enableRoughness: true,
        enableMetalness: true,
        enableAO: true
    },
    
    // File upload settings
    UPLOAD_SETTINGS: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/webp',
            'model/gltf-binary',
            'application/octet-stream'
        ],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.glb']
    },
    
    // UI Settings
    UI_SETTINGS: {
        // Material grid settings
        materialGrid: {
            showCheckboxes: false,
            showSelectionControls: false
        },
        // Animation delays
        animations: {
            modalDelay: 100,
            previewDelay: 300
        }
    },
    
    // Helper methods
    getApiUrl(endpoint) {
        return this.API_BASE_URL + endpoint;
    },
    
    isValidFileType(file) {
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        return this.UPLOAD_SETTINGS.allowedTypes.includes(file.type) || 
               this.UPLOAD_SETTINGS.allowedExtensions.includes(fileExtension);
    },
    
    isValidFileSize(file) {
        return file.size <= this.UPLOAD_SETTINGS.maxFileSize;
    },
    
    // Set context-specific UI settings
    setContext(context) {
        switch(context) {
            case 'materialUploader':
                this.UI_SETTINGS.materialGrid.showCheckboxes = true;
                this.UI_SETTINGS.materialGrid.showSelectionControls = true;
                break;
            case 'experienceCreator':
                this.UI_SETTINGS.materialGrid.showCheckboxes = false;
                this.UI_SETTINGS.materialGrid.showSelectionControls = false;
                break;
            default:
                this.UI_SETTINGS.materialGrid.showCheckboxes = false;
                this.UI_SETTINGS.materialGrid.showSelectionControls = false;
        }
    }
};
