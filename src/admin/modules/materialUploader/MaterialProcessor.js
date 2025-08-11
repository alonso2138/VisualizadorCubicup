// Material processing utilities
export class MaterialProcessor {
    constructor(logger) {
        this.logger = logger;
        this.materialsData = null;
    }

    static extractSKU(filename) {
        return filename.replace(/\.[^/.]+$/, "");
    }
    
    static isGLBFile(filename) {
        return filename.toLowerCase().endsWith('.glb');
    }

    static isTextureFile(filename) {
        const textureExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'];
        return textureExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    }

    // Cargar materials.json para auto-llenado
    async loadMaterialsData() {
        try {
            const response = await fetch('/materials/materials.json');
            if (response.ok) {
                const data = await response.json();
                this.materialsData = data.materials || {};
                this.logger?.log('Materials.json cargado', 'info', { count: Object.keys(this.materialsData).length });
            }
        } catch (error) {
            this.logger?.log('Error cargando materials.json', 'warn', error);
            this.materialsData = {};
        }
    }

    // Buscar material existente por SKU
    findExistingMaterial(sku) {
        if (!this.materialsData) return null;
        return this.materialsData[sku] || null;
    }

    // Auto-llenar propiedades desde materials.json
    autoFillProperties(sku, isGLB) {
        const existingMaterial = this.findExistingMaterial(sku);
        
        if (existingMaterial) {
            this.logger?.log('Material encontrado en base de datos', 'info', { sku, material: existingMaterial });
            
            return {
                nombre: existingMaterial.nombre || sku,
                color: existingMaterial.color || '',
                formato: existingMaterial.formato || '',
                acabado: existingMaterial.acabado || '',
                hashtags: Array.isArray(existingMaterial.hashtags) ? existingMaterial.hashtags : 
                         (existingMaterial.objetos_recomendados || []),
                objetos_recomendados: existingMaterial.objetos_recomendados || [],
                tipo: isGLB ? 'modelo' : (existingMaterial.tipo || 'textura'),
                generatePBR: existingMaterial.generatePBR !== false, // Default true para texturas
                pbrSettings: existingMaterial.pbrSettings || this.getDefaultPBRSettings(),
                isAutoFilled: true
            };
        } else {
            this.logger?.log('Material nuevo - campos vacíos', 'info', { sku });
            
            return {
                nombre: sku,
                color: '',
                formato: '',
                acabado: '',
                hashtags: [],
                objetos_recomendados: [],
                tipo: isGLB ? 'modelo' : 'textura',
                generatePBR: !isGLB, // Solo para texturas por defecto
                pbrSettings: this.getDefaultPBRSettings(),
                isAutoFilled: false
            };
        }
    }

    getDefaultPBRSettings() {
        return {
            metalness: 0.3,
            roughness: 0.7,
            normalScale: 1.0,
            aoIntensity: 1.0,
            enableNormal: true,
            enableRoughness: true,
            enableMetalness: true,
            enableAO: true
        };
    }
    
    async createFileData(fileInfo) {
        // Asegurar que materials.json esté cargado
        if (!this.materialsData) {
            await this.loadMaterialsData();
        }

        const sku = MaterialProcessor.extractSKU(fileInfo.originalName || fileInfo.name);
        const isGLB = MaterialProcessor.isGLBFile(fileInfo.originalName || fileInfo.name);
        const isTexture = MaterialProcessor.isTextureFile(fileInfo.originalName || fileInfo.name);
        
        // Auto-llenar propiedades
        const properties = this.autoFillProperties(sku, isGLB);
        
        // Use path from server response or construct fallback
        let filePath = fileInfo.path;
        
        // If no path provided by server, construct legacy path as fallback
        if (!filePath) {
            filePath = `/uploads/${fileInfo.originalName || fileInfo.name}`;
            // Remove /admin/ prefix if present
            if (filePath.startsWith('/admin/uploads/')) {
                filePath = filePath.replace('/admin/uploads/', '/uploads/');
            }
        }

        return {
            file: fileInfo.file || fileInfo,
            originalName: fileInfo.originalName || fileInfo.name,
            path: filePath,
            sku,
            size: fileInfo.size,
            isGLB,
            isTexture,
            fileType: isGLB ? 'modelo' : 'textura',
            properties,
            canGeneratePBR: isTexture && !isGLB,
            pbrStatus: fileInfo.pbrStatus || 'none', // Use server response or default to 'none'
            pbrChannels: [],
            pbrSettings: {
                metalness: 0.3,
                roughness: 0.4,
                normalScale: 1.0,
                aoIntensity: 1.0
            }
        };
    }
}
