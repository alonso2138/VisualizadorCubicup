const fs = require('fs-extra');
const path = require('path');

class MaterialsHelper {
    constructor() {
        this.materialsPath = path.join(__dirname, '..', '..', 'materials', 'materials.json');
        this._cache = null;
        this._lastModified = 0;
    }

    /**
     * Get materials with smart caching - only reload if file changed
     */
    getMaterials() {
        try {
            const stats = fs.statSync(this.materialsPath);
            const lastModified = stats.mtime.getTime();
            
            // Use cache if file hasn't changed
            if (this._cache && this._lastModified === lastModified) {
                return this._cache;
            }
            
            // Reload from file
            const data = fs.readFileSync(this.materialsPath, 'utf-8');
            this._cache = JSON.parse(data);
            this._lastModified = lastModified;
            
            return this._cache;
        } catch (error) {
            console.error('Error loading materials:', error);
            return { materials: {} };
        }
    }

    /**
     * Save materials and update cache
     */
    saveMaterials(materialsData) {
        try {
            fs.writeFileSync(this.materialsPath, JSON.stringify(materialsData, null, 2));
            this._cache = materialsData;
            this._lastModified = fs.statSync(this.materialsPath).mtime.getTime();
            return true;
        } catch (error) {
            console.error('Error saving materials:', error);
            return false;
        }
    }

    /**
     * Get a specific material by ID
     */
    getMaterial(materialId) {
        const materialsData = this.getMaterials();
        return materialsData.materials?.[materialId] || null;
    }

    /**
     * Update a specific material
     */
    updateMaterial(materialId, updates) {
        const materialsData = this.getMaterials();
        
        if (!materialsData.materials[materialId]) {
            return false;
        }
        
        materialsData.materials[materialId] = {
            ...materialsData.materials[materialId],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        return this.saveMaterials(materialsData);
    }

    /**
     * Update PBR settings for a material
     */
    updatePBRSettings(materialId, pbrSettings) {
        const materialsData = this.getMaterials();
        
        if (!materialsData.materials[materialId]) {
            return false;
        }
        
        materialsData.materials[materialId].pbrSettings = {
            ...materialsData.materials[materialId].pbrSettings,
            ...pbrSettings,
            updatedAt: new Date().toISOString()
        };
        
        return this.saveMaterials(materialsData);
    }

    /**
     * Clear cache (force reload on next access)
     */
    clearCache() {
        this._cache = null;
        this._lastModified = 0;
    }
}

// Export singleton instance
module.exports = new MaterialsHelper();
