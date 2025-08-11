const express = require('express');
const router = express.Router();

// API root endpoint
router.get('/', (req, res) => {
    res.json({ 
        message: 'API del Visualizador 3D',
        version: '1.0.0',
        status: 'Servidor modular funcionando correctamente',
        endpoints: {
            projects: '/api/projects',
            presets: '/api/presets',
            groups: '/api/groups',
            textures: '/api/texture-materials',
            pbr: {
                base: '/api/pbr',
                generate: '/api/pbr/generate',
                delete: '/api/pbr/delete',
                // Legacy endpoints for compatibility
                generateLegacy: '/api/generatePBR',
                deleteLegacy: '/api/delete-PBR'
            },
            libroAzul: '/api/libro-azul',
            upload: '/upload'
        }
    });
});

module.exports = router;
