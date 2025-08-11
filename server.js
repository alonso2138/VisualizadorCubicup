const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const cors = require("cors");

// Import routes
const indexRoutes = require('./routes/index');
const projectsRoutes = require('./routes/projects');
const presetsRoutes = require('./routes/presets');
const groupsRoutes = require('./routes/groups');
const texturesRoutes = require('./routes/textures');
const pbrRoutes = require('./routes/pbr');
const libroAzulRoutes = require('./routes/libroAzul');
const availableMaterialsRoutes = require('./routes/availableMaterials');

// Import MaterialUploader module
const { router: materialUploaderRoutes, initMaterialUploader } = require('./routes/materialUploader');

// Import services
const { startCleanupSchedule } = require('./services/cronService');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Enable JSON body parsing
app.use(express.json());

// Set proper content type for JS files
app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

// Serve static files from the "dist" folder
app.use(express.static(path.join(__dirname, "dist")));

// Serve static files from subdirectories
app.use('/datos', express.static(path.join(__dirname, "dist/datos")));
app.use('/uploads', express.static(path.join(__dirname, "dist/uploads")));
app.use('/uploads', express.static(path.join(__dirname, "uploads")));
app.use('/uploadsTemp', express.static(path.join(__dirname, "uploadsTemp")));
app.use('/materials', express.static(path.join(__dirname, "materials"))); // MaterialUploader materials folder

// Use modular routes
app.use('/api', indexRoutes);

// Available materials routes (must be before the catch-all projects route)
app.use('/api/available-materials', availableMaterialsRoutes);

// MaterialUploader routes (BEFORE projects routes to avoid conflicts)
console.log('📦 Registrando rutas de MaterialUploader en /api/materials');
app.use('/api/materials', materialUploaderRoutes);
console.log('✅ Rutas de MaterialUploader registradas correctamente');

app.use('/api/projects', projectsRoutes);
app.use('/upload', projectsRoutes); // Keep upload endpoint accessible at root level
// Specific route for upload-temp-model endpoint
app.post('/api/upload-temp-model', (req, res, next) => {
  // Forward to projects router but change the URL to match the route
  req.url = '/upload-temp-model';
  projectsRoutes(req, res, next);
});
app.use('/api/presets', presetsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/texture-materials', texturesRoutes);
app.use('/api/pbr', pbrRoutes);
app.use('/api/generatePBR', pbrRoutes); // Mantener compatibilidad
app.use('/api/delete-PBR', pbrRoutes); // Mantener compatibilidad
app.use('/api/libro-azul', libroAzulRoutes);

// Serve admin UI static files (CSS, JS, etc.) - debe ir DESPUÉS de las rutas específicas de admin
app.use('/admin', express.static(path.join(__dirname, "src/admin"), { 
  index: false // Importante: evita que sirva index.html automáticamente
}));

// Admin panel route - serve the main HTML
app.get('/admin', (req, res) => {
  console.log("Serving admin panel");
  const adminPath = path.join(__dirname, "src/admin/index.html");
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    console.error("Error: Admin panel not found at:", adminPath);
    res.status(404).send("Admin panel not found");
  }
});

// Initialize MaterialUploader module
initMaterialUploader();

// Start cleanup schedule
startCleanupSchedule();

// Catch-all route to serve "index.html" for SPA
app.use((req, res) => {
  const indexPath = path.join(__dirname, "dist", "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error("Error: index.html not found");
    res.status(500).send("Server configuration error: index.html not found");
  }
});

app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", port, app.settings.env);
});



