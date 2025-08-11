const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

const { runScript } = require('../utils/scriptRunner');

// Mantener rutas específicas para compatibilidad
router.get('/', (req, res) => {
    // Si la URL original es /api/generatePBR
    if (req.originalUrl.includes('generatePBR')) {
        console.log("Generating PBR materials");
        const materialesDir = path.join(__dirname, '..', 'materiales');
        runScript(
            path.join(__dirname, '..', 'scripts', 'generate_pbr.py'),
            ['--input', materialesDir, '--res', '1000'],
            res
        );
    }
    // Si la URL original es /api/delete-PBR
    else if (req.originalUrl.includes('delete-PBR')) {
        console.log("Deleting PBR materials");
        const materialesDir = path.join(__dirname, '..', 'materiales');
        runScript(
            path.join(__dirname, '..', 'scripts', 'delete_pbr.py'),
            ['--input', materialesDir],
            res
        );
    }
    // Rutas nuevas organizadas
    else {
        res.json({
            message: 'PBR Management API',
            endpoints: {
                generate: '/api/pbr/generate',
                delete: '/api/pbr/delete'
            }
        });
    }
});

router.get('/generate', (req, res) => {
    console.log("Generating PBR materials");
    const materialesDir = path.join(__dirname, '..', 'materiales');
    runScript(
        path.join(__dirname, '..', 'scripts', 'generate_pbr.py'),
        ['--input', materialesDir, '--res', '1000'],
        res
    );
});

router.get('/delete', (req, res) => {
    console.log("Deleting PBR materials");
    const materialesDir = path.join(__dirname, '..', 'materiales');
    runScript(
        path.join(__dirname, '..', 'scripts', 'delete_pbr.py'),
        ['--input', materialesDir],
        res
    );
});

// Generate PBR for a specific material
router.post('/generate-material', async (req, res) => {
    try {
        const { materialId, filename, generateChannels, useExistingFile, isTemporary } = req.body;
        
        if (!materialId) {
            return res.status(400).json({
                success: false,
                message: 'materialId is required'
            });
        }
        
        console.log(`Generating PBR for material: ${materialId}, file: ${filename}, useExisting: ${useExistingFile}, isTemporary: ${isTemporary}`);
        
        // Create materials directory for this specific material
        const materialDir = path.join(__dirname, '..', 'materials', materialId);
        await fs.ensureDir(materialDir);

        let colorFile;
        
        if (useExistingFile) {
            // For existing materials, check if Color file already exists in materials directory
            const possibleExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
            let foundColorFile = false;
            
            for (const ext of possibleExtensions) {
                const testFile = path.join(materialDir, `${materialId}_Color${ext}`);
                if (await fs.pathExists(testFile)) {
                    colorFile = testFile;
                    foundColorFile = true;
                    break;
                }
            }
            
            if (!foundColorFile) {
                return res.status(400).json({
                    success: false,
                    message: 'No se encontró archivo de color para el material existente'
                });
            }
        } else {
            // For new files during upload process
            if (!filename) {
                return res.status(400).json({
                    success: false,
                    message: 'Filename is required for new materials'
                });
            }
            
            let sourceFile;
            
            // Check if file already exists in materials directory (new flow)
            const ext = path.extname(filename);
            const materialColorFile = path.join(materialDir, `${materialId}_Color${ext}`);
            
            if (await fs.pathExists(materialColorFile)) {
                colorFile = materialColorFile;
                console.log('Using existing color file in materials directory:', colorFile);
            } else {
                // Fall back to uploads directory (legacy flow)
                sourceFile = path.join(__dirname, '..', 'uploads', filename);
                
                console.log('Looking for source file:', sourceFile);
                console.log('File exists:', await fs.pathExists(sourceFile));
                
                if (!await fs.pathExists(sourceFile)) {
                    // If not found in uploads, try uploadsTemp as fallback
                    const fallbackFile = path.join(__dirname, '..', 'uploadsTemp', filename);
                    console.log('Trying fallback file:', fallbackFile);
                    console.log('Fallback file exists:', await fs.pathExists(fallbackFile));
                    
                    if (await fs.pathExists(fallbackFile)) {
                        sourceFile = fallbackFile;
                    } else {
                        return res.status(400).json({
                            success: false,
                            message: `No se encontró el archivo fuente: ${filename} (checked materials, uploads and uploadsTemp)`
                        });
                    }
                }
                
                // Copy source file to materials directory as Color.png/jpg
                colorFile = path.join(materialDir, `${materialId}_Color${ext}`);
                await fs.copy(sourceFile, colorFile);
            }
        }
        
        // Generate PBR channels
        const channels = generateChannels || ['normal', 'roughness', 'metalness', 'ao'];
        
        // Run Python script for this specific material
        const scriptPath = path.join(__dirname, '..', 'scripts', 'generate_pbr.py');
        const args = ['--input', colorFile, '--res', '1000'];
        
        console.log('Executing PBR generation:', scriptPath, args);
        console.log('Color file path:', colorFile);
        
        // Execute PBR generation
        try {
            const result = await new Promise((resolve, reject) => {
                const { spawn } = require('child_process');
                const python = spawn('python', [scriptPath, ...args]);
                
                let output = '';
                let errorOutput = '';
                
                python.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                python.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });
                
                python.on('close', (code) => {
                    if (code === 0) {
                        resolve({ success: true, output });
                    } else {
                        reject(new Error(`Python script failed: ${errorOutput || output}`));
                    }
                });
                
                python.on('error', (error) => {
                    reject(new Error(`Failed to start Python script: ${error.message}`));
                });
            });
            
            // Verify generated files exist
            const generatedFiles = {};
            for (const channel of channels) {
                const channelFile = path.join(materialDir, `${materialId}_${channel.charAt(0).toUpperCase() + channel.slice(1)}.png`);
                if (await fs.pathExists(channelFile)) {
                    generatedFiles[channel] = `/materials/${materialId}/${materialId}_${channel.charAt(0).toUpperCase() + channel.slice(1)}.png`;
                }
            }
            
            res.json({
                success: true,
                materialId,
                channels: Object.keys(generatedFiles),
                files: generatedFiles,
                message: `PBR generado correctamente para ${materialId}`
            });
            
        } catch (scriptError) {
            console.error('Script execution error:', scriptError);
            res.status(500).json({
                success: false,
                message: `Error ejecutando script de PBR: ${scriptError.message}`
            });
        }
        
    } catch (error) {
        console.error('Error generating PBR for material:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error during PBR generation'
        });
    }
});

module.exports = router;
