// Material API service for MaterialUploader
import { AdminConfig } from '../../config.js';

export class MaterialApiService {
    constructor(logger) {
        this.logger = logger;
    }

    async saveMaterialToDatabase(file) {
        try {
            const filesData = [{
                path: file.path || `/uploads/${file.originalName}`,
                type: file.isGLB ? 'model' : 'color'
            }];

            const requestData = {
                sku: file.sku,
                properties: file.properties,
                files: filesData
            };

            const response = await fetch(AdminConfig.getApiUrl('/api/materials/save'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error guardando material');
            }

            return await response.json();
        } catch (error) {
            this.logger.log('Error guardando material', 'error', error);
            throw error;
        }
    }

    async loadMaterials() {
        try {
            const timestamp = new Date().getTime();
            const response = await fetch(AdminConfig.getApiUrl(`/api/materials?t=${timestamp}`));
            const data = await response.json();
            
            return data.materials ? Object.entries(data.materials).map(([id, material]) => ({
                id,
                ...material
            })) : [];
        } catch (error) {
            this.logger.log('Error loading materials', 'error', error);
            throw error;
        }
    }

    async updateMaterial(sku, formData) {
        try {
            const response = await fetch(AdminConfig.getApiUrl(`/api/materials/${sku}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            this.logger.log('Error updating material', 'error', error);
            throw error;
        }
    }

    async deleteMaterial(id) {
        try {
            const response = await fetch(AdminConfig.getApiUrl(`/api/materials/${id}`), {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Error al eliminar material');
            }
            
            return await response.json();
        } catch (error) {
            this.logger.log('Error deleting material', 'error', error);
            throw error;
        }
    }
}
