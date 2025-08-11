const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

// Get available materials from materials folder
router.get('/', async (req, res) => {
    try {
        const materialsPath = path.join(__dirname, '../materials');
        const materialsJsonPath = path.join(materialsPath, 'materials.json');
        
        // Check if materials directory and JSON exist
        if (!fs.existsSync(materialsPath) || !fs.existsSync(materialsJsonPath)) {
            return res.json({ materials: [] });
        }
        
        // Read materials.json
        const materialsData = JSON.parse(fs.readFileSync(materialsJsonPath, 'utf8'));
        const materials = [];
        
        if (materialsData && materialsData.materials) {
            // Process each material
            for (const [materialId, materialInfo] of Object.entries(materialsData.materials)) {
                // Only process texture materials (skip models)
                if (materialInfo.tipo !== 'textura') {
                    continue;
                }
                
                const materialFolder = path.join(materialsPath, materialId);
                
                // Check if material folder exists
                if (!fs.existsSync(materialFolder)) {
                    continue;
                }
                
                // Find preview image (original file or Color file)
                let previewImage = null;
                const files = fs.readdirSync(materialFolder);
                
                // First try to find the original file
                if (materialInfo.files && materialInfo.files.color) {
                    const originalFile = materialInfo.files.color;
                    if (files.includes(originalFile)) {
                        previewImage = originalFile;
                    }
                }
                
                // If no original file, look for Color file
                if (!previewImage) {
                    const colorFile = files.find(f => f.includes('_Color.'));
                    if (colorFile) {
                        previewImage = colorFile;
                    }
                }
                
                // If still no preview, use any image file as fallback
                if (!previewImage) {
                    previewImage = files.find(f => /\.(png|jpg|jpeg)$/i.test(f));
                }
                
                if (previewImage) {
                    // Build material object
                    const material = {
                        id: materialId,
                        name: materialInfo.nombre || materialId,
                        tipo: materialInfo.tipo,
                        color: materialInfo.color,
                        formato: materialInfo.formato,
                        etiquetas: materialInfo.etiquetas || [],
                        texture: `/materials/${materialId}/${previewImage}`,
                        generatePBR: materialInfo.generatePBR || false,
                        createdAt: materialInfo.createdAt,
                        updatedAt: materialInfo.updatedAt,
                        files: mapMaterialFiles(files, materialId)
                    };
                    
                    materials.push(material);
                }
            }
        }
        
        // Shuffle materials for random order
        const shuffledMaterials = materials.sort(() => Math.random() - 0.5);
        
        res.json({ 
            materials: shuffledMaterials,
            count: shuffledMaterials.length 
        });
        
    } catch (error) {
        console.error('Error loading materials:', error);
        res.status(500).json({ 
            error: 'Error loading materials',
            materials: [] 
        });
    }
});

// Save material PBR settings
router.post('/save-material-settings', async (req, res) => {
    try {
        const { id, pbrSettings } = req.body;
        
        console.log('Saving material settings for:', id);
        console.log('PBR Settings received:', JSON.stringify(pbrSettings, null, 2));
        
        if (!id || !pbrSettings) {
            return res.status(400).json({ error: 'ID and PBR settings are required' });
        }

        const materialsPath = path.join(__dirname, '../materials/materials.json');
        
        // Read current materials with error handling
        let materialsData = { materials: {} };
        if (fs.existsSync(materialsPath)) {
            try {
                const data = fs.readFileSync(materialsPath, 'utf8');
                console.log('Raw file data length:', data.length);
                
                // Validate JSON before parsing
                const parsed = JSON.parse(data);
                if (parsed && typeof parsed === 'object') {
                    materialsData = parsed;
                }
            } catch (parseError) {
                console.error('Error parsing existing materials.json:', parseError);
                // Use backup if main file is corrupted
                materialsData = { materials: {} };
            }
        }

        // Update material with PBR settings
        if (materialsData.materials && materialsData.materials[id]) {
            materialsData.materials[id].pbrSettings = {
                ...pbrSettings,
                updatedAt: new Date().toISOString()
            };
            materialsData.materials[id].updatedAt = new Date().toISOString();
            
            // Validate data before saving
            const jsonString = JSON.stringify(materialsData, null, 2);
            console.log('About to save JSON of length:', jsonString.length);
            
            // Create backup before saving
            if (fs.existsSync(materialsPath)) {
                const backupPath = materialsPath + '.backup';
                fs.copyFileSync(materialsPath, backupPath);
            }
            
            // Save back to file
            fs.writeFileSync(materialsPath, jsonString);
            
            // Verify the saved file
            const verification = fs.readFileSync(materialsPath, 'utf8');
            JSON.parse(verification); // This will throw if invalid
            
            console.log('Material settings saved successfully for:', id);
            res.json({ success: true, message: 'Material settings saved successfully' });
        } else {
            console.error('Material not found:', id);
            res.status(404).json({ error: 'Material not found' });
        }
        
    } catch (error) {
        console.error('Error saving material settings:', error);
        
        // Try to restore from backup if it exists
        const materialsPath = path.join(__dirname, '../materials/materials.json');
        const backupPath = materialsPath + '.backup';
        
        if (fs.existsSync(backupPath)) {
            try {
                fs.copyFileSync(backupPath, materialsPath);
                console.log('Restored materials.json from backup');
            } catch (restoreError) {
                console.error('Could not restore from backup:', restoreError);
            }
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Preview configuration endpoints
router.get('/:materialId/preview-config', async (req, res) => {
    console.log("buscando config de sku: "+req.params)
    try {
        const { materialId } = req.params;
        const materialsJsonPath = path.join(__dirname, '../materials/materials.json');
        if (!fs.existsSync(materialsJsonPath)) {
            return res.status(404).json({ error: 'materials.json not found' });
        }
        const materialsData = JSON.parse(fs.readFileSync(materialsJsonPath, 'utf8'));
        const material = materialsData.materials[materialId];

        console.log(materialsData, material)

        if (material && material.pbrSettings) {
            // Devuelve los settings tal cual están guardados
            res.json(material.pbrSettings);
        } else {
            // Defaults si no hay settings guardados
            res.json({
                metalness: 0.5,
                roughness: 0.5,
                normalScale: 1.0,
                aoIntensity: 0.0,
                enableColor: true,
                enableNormal: true,
                enableRoughness: true,
                enableMetalness: true,
                enableAO: true
            });
        }
    } catch (error) {
        console.error('Error getting preview config:', error);
        res.status(500).json({ error: 'Error loading preview configuration' });
    }
});

router.post('/:materialId/preview-config', async (req, res) => {
    console.log("heil hitler")
    try {
        const { materialId } = req.params;
        const config = req.body;
        
        // Ensure material directory exists
        const materialDir = path.join(__dirname, '../materials', materialId);
        await fs.ensureDir(materialDir);
        
        // Save configuration
        const configPath = path.join(materialDir, 'preview-config.json');
        await fs.writeJSON(configPath, config, { spaces: 2 });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving preview config:', error);
        res.status(500).json({ error: 'Error saving preview configuration' });
    }
});

// Helper function to map material files
function mapMaterialFiles(files, materialId) {
    const mappedFiles = {};
    
    files.forEach(file => {
        const fileName = file.toLowerCase();
        if (fileName.includes('_color.')) {
            mappedFiles.color = `/materials/${materialId}/${file}`;
        } else if (fileName.includes('_normal.')) {
            mappedFiles.normal = `/materials/${materialId}/${file}`;
        } else if (fileName.includes('_roughness.')) {
            mappedFiles.roughness = `/materials/${materialId}/${file}`;
        } else if (fileName.includes('_metalness.')) {
            mappedFiles.metalness = `/materials/${materialId}/${file}`;
        } else if (fileName.includes('_ao.')) {
            mappedFiles.ao = `/materials/${materialId}/${file}`;
        }
    });
    
    return mappedFiles;
}

module.exports = router;
