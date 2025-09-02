const express = require('express');
const router = express.Router();

// POST endpoint to receive project data
router.post('/project-data', (req, res) => {
    try {
        const { code, siteName, items } = req.body;
        
        // Validate required fields
        if (!code) {
            return res.status(400).json({
                error: 'El código del proyecto es requerido',
                field: 'code'
            });
        }
        
        if (!siteName) {
            return res.status(400).json({
                error: 'El nombre de la estancia es requerido',
                field: 'siteName'
            });
        }
        
        if (!Array.isArray(items)) {
            return res.status(400).json({
                error: 'Los elementos deben ser un array',
                field: 'items'
            });
        }
        
        // Log the received data for debugging
        console.log('Datos del proyecto recibidos:', {
            code,
            siteName,
            itemsCount: items.length,
            timestamp: new Date().toISOString()
        });
        
        // Here you would typically save to database or send to external service
        // For now, we'll just log the full data
        console.log('Datos completos:', JSON.stringify({ code, siteName, items }, null, 2));
        
        // TODO: Replace this with actual data processing logic
        // Examples:
        // - Save to database
        // - Send to external API
        // - Generate reports
        // - Trigger workflows
        
        // Return success response
        res.json({
            success: true,
            message: 'Datos del proyecto recibidos correctamente',
            data: {
                code,
                siteName,
                itemsCount: items.length,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error procesando datos del proyecto:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// GET endpoint to retrieve project data (optional, for future use)
router.get('/project-data/:code', (req, res) => {
    const { code } = req.params;
    
    // TODO: Implement retrieval logic
    res.json({
        message: 'Endpoint para consultar datos del proyecto',
        code,
        note: 'Por implementar: consulta de datos almacenados'
    });
});

module.exports = router;
