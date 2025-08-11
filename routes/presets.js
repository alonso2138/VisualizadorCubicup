const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

const { projectsDir } = require('../config/database');

// Get presets for a specific project
router.get('/:id', (req, res) => {
    const projectId = req.params.id;
    console.log("Trying to deliver presets for project:", projectId);

    try {
        let project;

        try {
            const projectFilePath = path.join(projectsDir, `${projectId}Presets.json`);
            if (fs.existsSync(projectFilePath)) {
                const projectData = JSON.parse(fs.readFileSync(projectFilePath, "utf8"));
                console.log(`Project loaded: ${projectFilePath}`);
                project = projectData;
            } else {
                console.warn(`Project not found: ${projectFilePath}`);
                return res.status(404).json({ error: 'Presets not found' });
            }
        } catch (error) {
            console.error("Error loading project:", error);
            throw error;
        }

        res.json(project);

    } catch (error) {
        console.error('Error loading project:', error);
        res.status(500).json({ error: 'Failed to load project' });
    }
});

module.exports = router;
