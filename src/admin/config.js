// Admin Panel Configuration
// Configuration for API endpoints and MaterialUploader integration

export const AdminConfig = {
  // Base API URL - now simplified since we have Vite proxy
  apiBaseUrl: '/api',
  
  // MaterialUploader API endpoints
  materialUploader: {
    // Materials endpoints
    materials: '/api/materials',
    upload: '/api/materials/upload',
    generatePBR: '/api/pbr/generate-material',
    check: '/api/materials/check',
    save: '/api/materials/save',
    pbrSettings: '/api/materials/pbr-settings',
    
    // File serving endpoints
    materialFiles: '/materials',
    uploads: '/uploads',
    
    // Helper functions for file URLs
    getMaterialFileUrl: (sku, filename) => {
      return `/materials/${sku}/${filename}`;
    },
    
    getUploadFileUrl: (filename) => {
      return `/uploads/${filename}`;
    },
    
    // Supported file types
    supportedImageTypes: [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp'
    ],
    supportedModelTypes: [
      'model/gltf-binary',
      'application/octet-stream' // GLB files
    ],
    
    // File extensions
    supportedExtensions: [
      '.jpg', '.jpeg', '.png', '.webp', '.glb'
    ],
    
    // File size limits
    maxFileSize: 50 * 1024 * 1024, // 50MB for GLB files
    maxImageSize: 10 * 1024 * 1024, // 10MB for images
    
    // Validation rules
    validation: {
      requiredFields: ['nombre', 'color', 'estilo', 'tipo'],
      skuPattern: /(\d{10,})/, // 10+ digit SKU pattern
      maxFiles: 20 // Maximum files per upload batch
    }
  },
  
  // Helper functions to get full URLs
  getApiUrl: (endpoint) => {
    if (endpoint.startsWith('/')) {
      return endpoint;
    }
    return `${AdminConfig.apiBaseUrl}/${endpoint}`;
  },
  
  getFullUrl: (path) => {
    if (path.startsWith('http')) return path;
    return path;
  },
  
  // Project management endpoints (existing)
  projects: {
    base: '/api/projects',
    upload: '/upload',
    presets: '/api/presets',
    groups: '/api/groups'
  },
  
  // PBR generation settings
  pbr: {
    endpoint: '/api/pbr',
    pythonScript: 'scripts/generate_pbr.py',
    supportedChannels: ['normal', 'roughness', 'metalness', 'ao', 'height']
  },
  
  // Three.js CDN URLs
  threejs: {
    core: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    orbitControls: 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
    gltfLoader: 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'
  },
  
  // UI Settings
  ui: {
    // Default modal sizes
    modalSizes: {
      small: '400px',
      medium: '600px',
      large: '800px',
      'extra-large': '1200px'
    },
    
    // Notification durations (in ms)
    notificationDuration: {
      success: 4000,
      error: 6000,
      warning: 5000,
      info: 3000
    },
    
    // Animation durations
    animationDuration: {
      modal: 300,
      notification: 250,
      hover: 200
    }
  },
  
  // Feature flags
  features: {
    materialUploader: true,
    projectManager: true,
    preview3D: true,
    pbrGeneration: true,
    bulkOperations: true,
    searchFilter: true
  }
};

// Export individual configurations for convenience
export const MaterialUploaderConfig = AdminConfig.materialUploader;
export const ProjectConfig = AdminConfig.projects;
export const PBRConfig = AdminConfig.pbr;
export const UIConfig = AdminConfig.ui;

export default AdminConfig;
