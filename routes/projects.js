const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require("child_process");
const router = express.Router();

const upload = require('../middleware/upload');
const { saveProjectToDatabase, getProjectFromDatabase } = require('../services/projectService');
const { addTemporaryFile, removeTemporaryFile, isTemporaryFile } = require('../utils/fileManager');
const { projectsDir, uploadDir } = require('../config/database');

// File upload endpoint - Temporary upload
router.post('/upload', upload.single('model'), async (req, res) => {
    console.log('Temporary upload request received');

    try {
        if (!req.file) {
            console.error('No file received');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('File temporarily saved:', req.file);

        // Track the uploaded file
        addTemporaryFile(req.file.filename);

        res.json({
            success: true,
            file: req.file.filename,
            path: `/uploads/${req.file.filename}`
        });
    } catch (error) {
        console.error('Temporary upload error:', error);
        res.status(500).json({ error: error.message || 'Temporary upload failed' });
    }
});

// Temporary model upload for experience creation
router.post('/upload-temp-model', upload.single('model'), async (req, res) => {
    console.log('=== Temporary model upload endpoint called ===');
    console.log('File received:', req.file ? 'Yes' : 'No');

    try {
        if (!req.file) {
            console.log('ERROR: No file in request');
            return res.status(400).json({ 
                success: false,
                error: 'No file uploaded' 
            });
        }

        console.log('File details:', {
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        // Validate file size (0.1MB - 400MB)
        const minSize = 0.1 * 1024 * 1024; // 0.1MB
        const maxSize = 400 * 1024 * 1024; // 400MB
        
        if (req.file.size < minSize) {
            console.log('ERROR: File too small');
            // Remove uploaded file
            await fs.remove(req.file.path);
            return res.status(400).json({ 
                success: false,
                error: `File too small. Minimum: 0.1MB (actual: ${(req.file.size / 1024 / 1024).toFixed(2)}MB)` 
            });
        }
        
        if (req.file.size > maxSize) {
            console.log('ERROR: File too large');
            // Remove uploaded file
            await fs.remove(req.file.path);
            return res.status(400).json({ 
                success: false,
                error: `File too large. Maximum: 400MB (actual: ${(req.file.size / 1024 / 1024).toFixed(2)}MB)` 
            });
        }

        // Validate file extension
        const allowedExtensions = ['.glb', '.gltf'];
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
            console.log('ERROR: Invalid file extension:', fileExtension);
            // Remove uploaded file
            await fs.remove(req.file.path);
            return res.status(400).json({ 
                success: false,
                error: 'Invalid file type. Only GLB and GLTF files are allowed.' 
            });
        }

        // Create uploadsTemp directory if it doesn't exist
        const tempDir = path.join(__dirname, '../uploadsTemp');
        await fs.ensureDir(tempDir);

        // Move file to uploadsTemp directory
        const tempFileName = `temp_${Date.now()}_${req.file.originalname}`;
        const tempFilePath = path.join(tempDir, tempFileName);
        
        await fs.move(req.file.path, tempFilePath);

        // Track the temporary file
        addTemporaryFile(tempFileName);

        console.log('SUCCESS: Model uploaded temporarily:', tempFileName);

        res.json({
            success: true,
            filePath: `/uploadsTemp/${tempFileName}`,
            originalName: req.file.originalname,
            size: req.file.size,
            tempFileName: tempFileName
        });

    } catch (error) {
        console.error('ERROR in upload-temp-model:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error uploading file: ' + error.message 
        });
    }
});

// POST endpoint to save a project
router.post('/', (req, res) => {
    try {
        const projectData = req.body.projectData;
        console.log('Received Project Data:', projectData);

        if (!projectData || !projectData.name) {
            throw new Error('Invalid project data: "name" is required');
        }

        // Ensure the model path exists
        if (!projectData.modelPath) {
            throw new Error('Invalid project data: "modelPath" is required');
        }

        // Move the model file to a permanent location
        const tempFilePath = path.join(uploadDir, projectData.modelPath.split('/').pop());
        const permanentFilePath = path.join(uploadDir, `${projectData.name}.glb`);

        if (fs.existsSync(tempFilePath)) {
            fs.renameSync(tempFilePath, permanentFilePath);
            projectData.modelPath = `/uploads/${projectData.name}.glb`;

            // Remove the file from the temporaryFiles set
            const tempFileName = path.basename(tempFilePath);
            removeTemporaryFile(tempFileName);
        }

        // Save the project to the database
        saveProjectToDatabase(projectData);

        res.status(201).json({ message: 'Project saved successfully', project: projectData });
    } catch (error) {
        console.error('Error saving project:', error);
        res.status(500).json({ error: 'Failed to save project' });
    }
});

// Get list of projects (uploads)
router.get('/', (req, res) => {
    console.log("Sending Projects:");
    try {
        const uploadFiles = fs.readdirSync(projectsDir);
        const uploadsFiles = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];
        console.log(uploadsFiles);

        // Only return new structure projects (folders with info.json + model.glb)
        const projects = uploadFiles
            .filter(folder => fs.statSync(path.join(projectsDir, folder)).isDirectory())
            .map(folder => {
                const folderPath = path.join(projectsDir, folder);
                const infoJsonPath = path.join(folderPath, 'info.json');
                const modelPath = path.join(folderPath, 'model.glb');

                // Check if it's a new structure project (has info.json and model.glb)
                if (!fs.existsSync(infoJsonPath) || !fs.existsSync(modelPath)) {
                    return null;
                }

                try {
                    const info = JSON.parse(fs.readFileSync(infoJsonPath, 'utf8'));
                    const stats = fs.statSync(folderPath);
                    
                    return {
                        id: folder,
                        name: info.experienceId || folder,
                        path: `/projects/${folder}/model.glb`,
                        date: info.createdAt ? new Date(info.createdAt) : stats.mtime,
                        createdBy: info.createdBy || 'unknown',
                        presets: info.presets || [],
                        type: 'new-structure'
                    };
                } catch (error) {
                    console.error(`Error reading info.json for ${folder}:`, error);
                    return null;
                }
            })
            .filter(item => item !== null);

        console.log(projects);
        res.json(projects);
    } catch (error) {
        console.error('Error listing projects:', error);
        res.status(500).json({ error: 'Failed to list projects' });
    }
});

// Get specific project
router.get('/:id', (req, res) => {
    const projectId = req.params.id;
    console.log("Trying to deliver project:", projectId);

    try {
        const project = getProjectFromDatabase(projectId);
        if (project) {
            // Buscar grupos en la nueva estructura primero
            const projectDirPath = path.join(projectsDir, projectId);
            const groupsFilePath = path.join(projectDirPath, 'groups.json');
            
            if (fs.existsSync(groupsFilePath)) {
                project.groups = JSON.parse(fs.readFileSync(groupsFilePath, 'utf8'));
                console.log(`Groups loaded from project directory: ${groupsFilePath}`);
            } else {
                // Fallback a la estructura antigua
                const oldGroupsFilePath = path.join(uploadDir, `${projectId}-groups.json`);
                if (fs.existsSync(oldGroupsFilePath)) {
                    project.groups = JSON.parse(fs.readFileSync(oldGroupsFilePath, 'utf8'));
                    console.log(`Groups loaded from old location: ${oldGroupsFilePath}`);
                }
            }

            res.json(project);
        } else {
            res.status(404).json({ error: 'Project not found.' });
        }
    } catch (error) {
        console.error('Error loading project:', error);
        res.status(500).json({ error: 'Failed to load project' });
    }
});

// Delete a project
router.delete('/:id', (req, res) => {
    try {
        const projectId = req.params.id;
        
        // Check if it's a new structure project (folder with info.json + model.glb)
        const projectFolder = path.join(projectsDir, projectId);
        const infoJsonPath = path.join(projectFolder, 'info.json');
        const modelPath = path.join(projectFolder, 'model.glb');

        if (fs.existsSync(projectFolder) && fs.existsSync(infoJsonPath) && fs.existsSync(modelPath)) {
            // Remove the entire project folder (new structure)
            fs.rmSync(projectFolder, { recursive: true, force: true });
            console.log(`Deleted project folder: ${projectFolder}`);
            
            res.json({ 
                success: true, 
                message: `Project ${projectId} deleted successfully` 
            });
        } else {
            // Fallback: Check old structure (for backwards compatibility)
            const oldGroupsPath = `${path.join(projectsDir, projectId)}.json`;
            const oldModelPath = `${path.join(uploadDir, projectId)}.glb`;

            if (fs.existsSync(oldModelPath)) {
                // Remove the model file
                fs.unlinkSync(oldModelPath);
                console.log(`Deleted old model file: ${oldModelPath}`);
                
                // Check if groups JSON file exists and delete it too
                if (fs.existsSync(oldGroupsPath)) {
                    fs.unlinkSync(oldGroupsPath);
                    console.log(`Deleted associated groups file: ${oldGroupsPath}`);
                }
                
                res.json({ 
                    success: true, 
                    message: `Project ${projectId} deleted from old structure` 
                });
            } else {
                res.status(404).json({ error: `Project ${projectId} not found` });
            }
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Delete temporary file endpoint
router.delete('/delete-temp-file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    if (isTemporaryFile(filename)) {
        fs.unlink(filePath, err => {
            if (err) {
                console.error('Error deleting temporary file:', err);
                return res.status(500).json({ error: 'Failed to delete temporary file' });
            }

            console.log(`Deleted temporary file: ${filename}`);
            removeTemporaryFile(filename);
            res.json({ success: true });
        });
    } else {
        res.status(404).json({ error: 'File not found or not marked as temporary' });
    }
});

// Create a new experience (scalable, simple)
router.post('/create-experience', async (req, res) => {
    try {
        const { experienceId, presets, metadata, tempModelPath } = req.body;
        if (!experienceId || !tempModelPath) {
            return res.status(400).json({ success: false, error: 'Missing experienceId or tempModelPath' });
        }
        const projectFolder = path.join(projectsDir, experienceId);
        await fs.ensureDir(projectFolder);

        // Look for the temp model in uploadsTemp
        const tempUploadsDir = path.join(__dirname, '../uploadsTemp');
        const tempModelFullPath = path.join(tempUploadsDir, path.basename(tempModelPath));
        const modelDestPath = path.join(projectFolder, 'model.glb');
        if (!await fs.pathExists(tempModelFullPath)) {
            return res.status(404).json({ success: false, error: 'Temp model file not found' });
        }
        await fs.move(tempModelFullPath, modelDestPath, { overwrite: true });

        // Write info.json (extensible)
        const info = {
            experienceId,
            createdAt: new Date().toISOString(),
            presets: presets || {},
            ...metadata
        };
        await fs.writeJson(path.join(projectFolder, 'info.json'), info, { spaces: 2 });

        res.status(201).json({ success: true, folder: `/projects/${experienceId}` });
    } catch (err) {
        console.error('Error creating experience:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
