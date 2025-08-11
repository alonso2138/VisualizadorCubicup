const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

// Get libro azul data
router.get('/', (req, res) => {
    try {
        const libroAzulPath = path.join(__dirname, "..", "libro-azul", "libro-azul.json");
        
        if (!fs.existsSync(libroAzulPath)) {
            return res.status(404).json({ error: 'Libro Azul file not found' });
        }
        
        const libroAzulData = fs.readFileSync(libroAzulPath, 'utf8');
        const response = JSON.parse(libroAzulData);

        res.json(response);
    } catch (error) {
        console.error('Error fetching libro-azul:', error);
        res.status(500).json({ error: 'Failed to fetch libro azul data' });
    }
});

module.exports = router;
