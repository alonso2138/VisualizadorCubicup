const fs = require('fs-extra');
const path = require('path');
const { execSync } = require("child_process");
const { projectsDir, uploadDir, gituploadsDir } = require('../config/database');

// Function to commit and push file to GitHub
async function commitFileToGitHub(sourcePath, fileName) {
    try {
        // Create a unique folder name based on timestamp
        const folderName = `model_${Date.now()}`;
        const targetDir = path.join(gituploadsDir, folderName);
        fs.ensureDirSync(targetDir);
        
        // Copy the file to the git repo directory
        const targetPath = path.join(targetDir, fileName);
        fs.copyFileSync(sourcePath, targetPath);
        
        // Git operations - add, commit and push
        execSync('git add .', { cwd: path.join(__dirname, '..') });
        execSync(`git commit -m "Add new model: ${fileName}"`, { cwd: path.join(__dirname, '..') });
        execSync('git push origin main', { cwd: path.join(__dirname, '..') }); // Change 'main' to your branch name if different
        
        console.log(`Model ${fileName} committed and pushed to GitHub`);
        return true;
    } catch (error) {
        console.error('Git operation failed:', error);
        return false;
    }
}

function saveProjectToDatabase(project) {
    try {
        const projectFilePath = path.join(projectsDir, `${project.name}.json`);
        console.log('Saving Project to:', projectFilePath);

        // Write the project data to a JSON file
        fs.writeFileSync(projectFilePath, JSON.stringify(project, null, 2));
        console.log(`Project saved successfully: ${projectFilePath}`);
    } catch (error) {
        console.error("Error saving project:", error);
        throw error;
    }
}

function getProjectFromDatabase(projectName) {
    try {
        // Nueva ruta: projects/projectName/info.json
        const projectDirPath = path.join(projectsDir, projectName);
        const projectFilePath = path.join(projectDirPath, 'info.json');
        
        if (fs.existsSync(projectFilePath)) {
            const projectData = JSON.parse(fs.readFileSync(projectFilePath, "utf8"));
            console.log(`Project loaded: ${projectFilePath}`);
            return projectData;
        } else {
            console.warn(`Project not found: ${projectFilePath}`);
            // También verificar la estructura antigua como fallback
            const oldProjectFilePath = path.join(projectsDir, `${projectName}.json`);
            if (fs.existsSync(oldProjectFilePath)) {
                console.log(`Project found in old format: ${oldProjectFilePath}`);
                const projectData = JSON.parse(fs.readFileSync(oldProjectFilePath, "utf8"));
                return projectData;
            }
            return null;
        }
    } catch (error) {
        console.error("Error loading project:", error);
        throw error;
    }
}

module.exports = {
    commitFileToGitHub,
    saveProjectToDatabase,
    getProjectFromDatabase
};
