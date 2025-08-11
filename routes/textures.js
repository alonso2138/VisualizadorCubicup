const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

// Get texture material families
router.get('/', (req, res) => {
    try {
        const materialesDir = path.join(__dirname, "..", "materiales");

        const families = fs.readdirSync(materialesDir)
            .filter(item => fs.statSync(path.join(materialesDir, item)).isDirectory());

        console.log(fs.readdirSync(materialesDir));
        res.json(families);
        
    } catch (error) {
        console.error('Error fetching texture materials:', error);
        res.status(500).json({ error: 'Failed to fetch texture materials' });
    }
});

// Get textures for a specific experiment/family
router.get('/:exp', (req, res) => {
    try {
        const exp = req.params.exp;
        const materialesDir = path.join(__dirname, "..", "materiales", exp);

        const families = fs.readdirSync(materialesDir)
            .filter(item => fs.statSync(path.join(materialesDir, item)).isDirectory());
        
        const texturesByFamily = {};
        
        // For each family directory, get all image files
        families.forEach(family => {
            const familyPath = path.join(materialesDir, family);
            // Get all files in the directory once
            const allFiles = fs.readdirSync(familyPath);
            
            const textures = allFiles
                .filter(file => ['.jpg', '.jpeg', '.png'].includes(path.extname(file).toLowerCase()))
                // Exclude files that end with _thumb from the main list
                .filter(file => !path.basename(file, path.extname(file)).toLowerCase().endsWith('_thumb'))
                .map(file => {
                    const extension = path.extname(file);
                    const baseName = path.basename(file, extension);
                    const filePath = `materiales/${exp}/${family}/${file}`;
                    
                    // Look for a thumbnail file with the same base name + _thumb
                    const thumbFile = allFiles.find(f => 
                        path.basename(f, path.extname(f)).toLowerCase() === `${baseName.toLowerCase()}_thumb`
                    );

                    // Use thumbnail if found, otherwise use the original
                    const thumbnailPath = thumbFile 
                        ? `materiales/${exp}/${family}/${thumbFile}`
                        : filePath;
                    
                    return {
                        id: baseName,
                        name: baseName,
                        path: filePath,
                        thumbnail: thumbnailPath,
                        family: family
                    };
                });
            
            texturesByFamily[family] = {
                id: family,
                name: family.charAt(0).toUpperCase() + family.slice(1), // Capitalize first letter
                materials: textures
            };
        });
        
        // Create response object
        const response = {
            families: Object.values(texturesByFamily)
        };
        
        res.json(response);
    } catch (error) {
        console.error('Error fetching texture materials:', error);
        res.status(500).json({ error: 'Failed to fetch texture materials' });
    }
});

module.exports = router;
