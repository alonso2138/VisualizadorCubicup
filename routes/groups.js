const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

const { uploadDir } = require('../config/database');

// Ruta para /api/groups/ sin parámetro
router.get('/', (req, res) => {
    try {
        // Listar todos los archivos de grupos en el directorio de uploads
        const groupFiles = fs.readdirSync(uploadDir)
            .filter(file => file.endsWith('-groups.json'));
        
        // Para este endpoint, solo devolvemos nombres de archivos, no el contenido completo
        const groupData = groupFiles.map(file => {
            const baseName = file.replace('-groups.json', '');
            return {
                id: baseName,
                file: file
            };
        });
        
        res.json(groupData);
    } catch (error) {
        console.error('Error listing group files:', error);
        res.status(500).json({ error: 'Failed to list group files' });
    }
});

// Get group data for a specific model
router.get('/:modelId', (req, res) => {
    console.log("Api groups called");
    try {
        const modelId = req.params.modelId;
        const modelPath = decodeURIComponent(modelId);

        let fileBaseName;
        if (modelPath.includes('/')) {
            const pathParts = modelPath.split('/');
            fileBaseName = path.parse(pathParts[pathParts.length - 1]).name;
        } else {
            fileBaseName = path.parse(modelPath).name;
        }

        const groupsFilePath = path.join(uploadDir, `${fileBaseName}-groups.json`);
        if (fs.existsSync(groupsFilePath)) {
            const groupsData = JSON.parse(fs.readFileSync(groupsFilePath, 'utf8'));
            res.json(groupsData);
            console.log(groupsData);
        } else {
            res.json({ groups: [], ceilingHeight: null });
        }
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ error: 'Failed to fetch group data' });
    }
});

module.exports = router;
