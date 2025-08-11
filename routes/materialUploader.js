const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const sharp = require('sharp');
const materialsHelper = require('./helpers/materialsHelper');

const router = express.Router();

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure uploads directory exists
    fs.ensureDirSync('uploads/');
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Use original filename to maintain consistency
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    console.log(`MaterialUploader: Storing file as: ${sanitizedName}`);
    cb(null, sanitizedName);
  }
});

// Filter to accept images and GLB files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'model/gltf-binary', 'application/octet-stream' // GLB files
  ];
  
  const isGLB = file.originalname.toLowerCase().endsWith('.glb');
  const isAllowedType = allowedTypes.includes(file.mimetype) || isGLB;
  
  if (isAllowedType) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no soportado. Solo se permiten imágenes (JPG, PNG, WEBP) y modelos 3D (GLB)'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for GLB files
  }
});

// Cargar datos necesarios
let libroAzul = {};
let materialsDB = { materials: {} };

// Función para cargar datos iniciales
function loadInitialData() {
  try {
    libroAzul = require('../libro-azul/libro-azul.json');
    console.log('MaterialUploader: Libro azul cargado correctamente');
  } catch (error) {
    console.error('MaterialUploader: Error cargando libro azul:', error.message);
  }

  try {
    materialsDB = require('../materials/materials.json');
    console.log('MaterialUploader: Base de datos de materiales cargada');
  } catch (error) {
    console.log('MaterialUploader: Creando nueva base de datos de materiales');
  }
}

// Asegurar que las carpetas necesarias existan
function ensureDirectories() {
  const requiredDirs = ['uploads', 'materials', 'uploadsTemp'];
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`MaterialUploader: Carpeta creada: ${dir}`);
    }
  });
}

// Funciones helper
function extractSKU(filename) {
  // Remover extensión y limpiar nombre
  let sku = filename.replace(/\.[^/.]+$/, "");
  
  // Si ya tiene sufijo _Color, removerlo para obtener el SKU base
  if (sku.endsWith('_Color')) {
    sku = sku.slice(0, -6); // Remover "_Color"
  }
  
  // Limpiar caracteres especiales pero mantener números y letras
  sku = sku.replace(/[^a-zA-Z0-9]/g, '');
  
  return sku;
}

function getPropertiesFromSKU(sku) {
  return {
    nombre: sku,
    color: '',
    formato: '',
    hashtags: [],
    objetos_recomendados: [],
    tipo: 'textura'
  };
}

// Función para generar thumbnail
async function generateThumbnail(inputPath, outputPath) {
  try {
    console.log(`MaterialUploader: Generando thumbnail: ${inputPath} -> ${outputPath}`);
    await sharp(inputPath)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    console.log(`MaterialUploader: Thumbnail generado exitosamente: ${outputPath}`);
    return true;
  } catch (error) {
    console.error('MaterialUploader: Error generando thumbnail:', error);
    return false;
  }
}

// Función para generar PBR para un material específico
async function generatePBRForMaterial(sku, colorFilePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'generate_pbr.py');
    const args = ['--input', colorFilePath, '--res', '1000'];
    
    console.log(`🐍 Ejecutando script PBR: python ${scriptPath} ${args.join(' ')}`);
    
    const pythonProcess = spawn('python', [scriptPath, ...args]);
    
    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`📤 PBR ${sku}:`, data.toString().trim());
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
      console.error(`❌ PBR Error ${sku}:`, data.toString().trim());
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ PBR script completado exitosamente para ${sku}`);
        resolve({ success: true, output });
      } else {
        console.error(`❌ PBR script falló para ${sku} con código ${code}`);
        reject(new Error(`Script PBR falló con código ${code}: ${error}`));
      }
    });
    
    pythonProcess.on('error', (err) => {
      console.error(`❌ Error ejecutando script PBR para ${sku}:`, err);
      reject(err);
    });
  });
}

// Función para ejecutar script Python PBR (legacy)
function generatePBR(inputPath) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', ['scripts/generate_pbr.py', '--input', inputPath]);
    
    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result.generated || []);
        } catch (e) {
          resolve([]);
        }
      } else {
        reject(new Error(error || 'Error ejecutando script PBR'));
      }
    });
  });
}

// Rutas de la API

// Obtener todos los materiales
router.get('/', (req, res) => {
  console.log('🔍 GET /api/materials - Obteniendo todos los materiales');
  
  try {
    const materialsData = materialsHelper.getMaterials();
    console.log('📊 Materials data loaded from helper');
    res.json(materialsData);
  } catch (error) {
    console.error('Error loading materials:', error);
    res.status(500).json({ error: 'Error al cargar materiales' });
  }
});

// Subir archivos y procesar
router.post('/upload', upload.array('files'), async (req, res) => {
  console.log('📤 MaterialUploader: Iniciando subida de archivos');
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se recibieron archivos' });
    }

    console.log(`📤 MaterialUploader: Procesando ${req.files.length} archivos`);
    const processedFiles = [];
    const materialsList = new Map(); // Para trackear materiales únicos
    
    // Primero, procesar todos los archivos y crear la lista de materiales
    for (const [index, file] of req.files.entries()) {
      console.log(`📤 MaterialUploader: Procesando archivo ${index + 1}/${req.files.length}:`, {
        originalname: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path
      });

      const sku = extractSKU(file.originalname);
      const isGLB = file.originalname.toLowerCase().endsWith('.glb');
      const isTexture = !isGLB && ['.jpg', '.jpeg', '.png', '.webp'].some(ext => 
        file.originalname.toLowerCase().endsWith(ext)
      );
      
      if (!isTexture && !isGLB) {
        console.log(`⚠️ Archivo ${file.originalname} no es una textura ni modelo válido`);
        continue;
      }

      // Crear carpeta del material en uploadsTemp (temporal)
      const materialDir = path.join('uploadsTemp', sku);
      await fs.ensureDir(materialDir);
      console.log(`📁 Carpeta temporal del material creada: ${materialDir}`);

      // Determinar el nombre del archivo destino
      let targetFileName;
      if (isGLB) {
        targetFileName = `${sku}.glb`;
      } else {
        // Para texturas, siempre usar formato _Color
        const ext = path.extname(file.originalname);
        targetFileName = `${sku}_Color${ext}`;
      }

      const targetPath = path.join(materialDir, targetFileName);
      
      // Mover archivo desde uploads a materials/sku/
      await fs.move(file.path, targetPath, { overwrite: true });
      console.log(`📦 Archivo movido: ${file.path} -> ${targetPath}`);

      // NO crear entrada en materialsDB todavía (esto se hará en el endpoint de confirmación)
      // Solo añadir a lista de materiales para PBR
      if (isTexture) {
        materialsList.set(sku, {
          sku,
          colorFile: targetPath,
          materialDir
        });
      }

      const processedFile = {
        sku,
        originalName: file.originalname,
        path: `/uploadsTemp/${sku}/${targetFileName}`, // Usar ruta temporal
        size: file.size,
        fileType: isGLB ? 'modelo' : 'textura',
        isGLB,
        isTexture,
        properties: getPropertiesFromSKU(sku), // No guardar en materialsDB aún
        canGeneratePBR: isTexture,
        pbrStatus: 'none', // Inicializar como 'none', se actualizará después de PBR
        isTemporary: true // Marcar como temporal
      };

      processedFiles.push(processedFile);
    }

    // NO guardar materials.json todavía (esto se hará en el endpoint de confirmación)
    console.log(`📦 ${materialsList.size} materiales temporales procesados`);

    // Generar PBR para todas las texturas
    if (materialsList.size > 0) {
      console.log(`🔧 Iniciando generación de PBR para ${materialsList.size} materiales...`);
      
      for (const [sku, materialInfo] of materialsList) {
        try {
          console.log(`🔧 Generando PBR para material: ${sku}`);
          await generatePBRForMaterial(sku, materialInfo.colorFile);
          
          // Actualizar estado del archivo procesado
          const fileIndex = processedFiles.findIndex(f => f.sku === sku);
          if (fileIndex >= 0) {
            processedFiles[fileIndex].pbrStatus = 'ready';
          }
          
          console.log(`✅ PBR generado exitosamente para: ${sku}`);
        } catch (pbrError) {
          console.error(`❌ Error generando PBR para ${sku}:`, pbrError);
          const fileIndex = processedFiles.findIndex(f => f.sku === sku);
          if (fileIndex >= 0) {
            processedFiles[fileIndex].pbrStatus = 'error';
          }
        }
      }
    }

    console.log(`✅ MaterialUploader: ${processedFiles.length} archivos procesados correctamente`);
    res.json({ 
      success: true, 
      files: processedFiles,
      materialsProcessed: materialsList.size,
      pbrGenerated: Array.from(materialsList.keys())
    });

  } catch (error) {
    console.error('❌ MaterialUploader: Error procesando archivos:', error);
    res.status(500).json({ error: 'Error procesando archivos: ' + error.message });
  }
});

// Generar canales PBR
router.post('/generate-pbr', async (req, res) => {
  try {
    const { filePath, sku } = req.body;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    // Crear directorio del material si no existe
    const materialDir = path.join('materials', sku);
    if (!fs.existsSync(materialDir)) {
      fs.mkdirSync(materialDir, { recursive: true });
    }
    
    // Copiar archivo original al directorio del material si no está ahí
    const originalFileName = path.basename(filePath);
    const materialFilePath = path.join(materialDir, originalFileName);
    
    if (!fs.existsSync(materialFilePath)) {
      fs.copyFileSync(filePath, materialFilePath);
    }
    
    // Generar PBR en el directorio del material
    const generatedFiles = await generatePBR(materialDir);
    res.json({ generated: generatedFiles });
  } catch (error) {
    console.error('MaterialUploader: Error generando PBR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar si el material ya existe
router.get('/check/:sku', (req, res) => {
  const { sku } = req.params;
  const exists = materialsDB.materials.hasOwnProperty(sku);
  res.json({ exists });
});

// Guardar material
router.post('/save', async (req, res) => {
  try {
    const { sku, properties, files } = req.body;
    
    if (!sku || !properties) {
      return res.status(400).json({ error: 'SKU y propiedades son requeridos' });
    }

    // Create material directory
    const materialDir = path.join('materials', sku);
    await fs.ensureDir(materialDir);

    // Move files and build file structure
    const materialFiles = {};
    
    for (const file of files || []) {
      try {
        const fileName = path.basename(file.path);
        const newPath = path.join(materialDir, fileName);
        
        // Move file to material directory
        if (await fs.pathExists(file.path)) {
          await fs.move(file.path, newPath, { overwrite: true });
          materialFiles[file.type || 'color'] = fileName;
          console.log(`MaterialUploader: File moved: ${file.path} -> ${newPath}`);
        }
      } catch (fileError) {
        console.error(`MaterialUploader: Error processing file ${file.path}:`, fileError);
        return res.status(500).json({ error: `Error procesando archivo: ${fileError.message}` });
      }
    }
    
    // Guardar en base de datos
    materialsDB.materials[sku] = {
      ...properties,
      files: materialFiles,
      pbrSettings: {
        metalness: 0.3,
        roughness: 0.41,
        normalScale: 1.0,
        aoIntensity: 1.0,
        enableNormal: true,
        enableRoughness: true,
        enableMetalness: true,
        enableAO: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Guardar archivo JSON
    await fs.writeJson('./materials/materials.json', materialsDB, { spaces: 2 });
    
    // Reload materials DB to keep in-memory cache in sync
    reloadMaterialsDB();
    
    res.json({ success: true, material: materialsDB.materials[sku] });
  } catch (error) {
    console.error('MaterialUploader: Error guardando material:', error);
    res.status(500).json({ error: 'Error guardando material' });
  }
});

// PUT: Actualizar material existente
router.put('/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const { nombre, hashtags, etiquetas, formato, acabado } = req.body;
    
    console.log(`MaterialUploader: Actualizando material ${sku}`);
    console.log('Datos recibidos:', { nombre, hashtags, etiquetas, formato, acabado });
    
    // Load fresh data
    let materialsData = { materials: {} };
    const materialsPath = path.join(__dirname, '..', 'materials', 'materials.json');
    
    if (fs.existsSync(materialsPath)) {
      try {
        materialsData = JSON.parse(fs.readFileSync(materialsPath, 'utf-8'));
      } catch (parseError) {
        console.error('Error parsing materials.json:', parseError);
        materialsData = { materials: {} };
      }
    }
    
    // Validar que el material existe
    if (!materialsData.materials[sku]) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }
    
    // Obtener material actual
    const currentMaterial = materialsData.materials[sku];
    
    // Procesar etiquetas (puede venir como hashtags o etiquetas)
    let etiquetasArray = [];
    const tagsSource = etiquetas || hashtags;
    
    if (Array.isArray(tagsSource)) {
      etiquetasArray = tagsSource.filter(tag => tag && tag.trim()).map(tag => tag.trim());
    } else if (typeof tagsSource === 'string' && tagsSource.trim()) {
      etiquetasArray = tagsSource.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    
    // Determine tipo automatically based on files
    const autoTipo = currentMaterial.files?.model || sku.toLowerCase().includes('.glb') ? 'modelo' : 'textura';
    
    // Actualizar datos del material
    const updatedMaterial = {
      ...currentMaterial,
      nombre: nombre?.trim() || currentMaterial.nombre,
      tipo: autoTipo,
      etiquetas: etiquetasArray,
      updatedAt: new Date().toISOString()
    };
    
    // Añadir campos opcionales si se proporcionan
    if (formato !== undefined) {
      updatedMaterial.formato = formato.trim();
    }
    
    if (acabado !== undefined) {
      updatedMaterial.acabado = acabado.trim();
    }
    
    // Guardar material actualizado
    materialsData.materials[sku] = updatedMaterial;
    
    // Guardar archivo JSON
    await fs.writeJson('./materials/materials.json', materialsData, { spaces: 2 });
    
    console.log(`MaterialUploader: Material ${sku} actualizado exitosamente`);
    
    res.json({ 
      success: true, 
      message: 'Material actualizado correctamente',
      material: updatedMaterial
    });
    
  } catch (error) {
    console.error('MaterialUploader: Error actualizando material:', error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar material' });
  }
});

// Obtener material específico
router.get('/:sku', (req, res) => {
  const { sku } = req.params;
  console.log(`📡 MaterialUploader GET: Solicitando material ${sku}`);
  
  try {
    // Read fresh data from file
    const materialsPath = path.join(__dirname, '..', 'materials', 'materials.json');
    let freshMaterialsData = { materials: {} };
    
    console.log(`📁 Buscando archivo en: ${materialsPath}`);
    
    if (fs.existsSync(materialsPath)) {
      freshMaterialsData = JSON.parse(fs.readFileSync(materialsPath, 'utf-8'));
      console.log(`📦 Datos cargados: ${Object.keys(freshMaterialsData.materials || {}).length} materiales en total`);
    } else {
      console.log(`❌ Archivo materials.json no encontrado en ${materialsPath}`);
    }
    
    const material = freshMaterialsData.materials[sku];
    
    if (!material) {
      console.log(`❌ Material ${sku} no encontrado en la base de datos`);
      console.log(`📋 Materiales disponibles: ${Object.keys(freshMaterialsData.materials || {}).join(', ')}`);
      return res.status(404).json({ error: 'Material no encontrado' });
    }
    
    console.log(`✅ Material ${sku} encontrado y enviado`);
    res.json(material);
  } catch (error) {
    console.error('❌ Error loading fresh material data:', error);
    // Fallback to cached data
    const material = materialsDB.materials[sku];
    if (!material) {
      console.log(`❌ Material ${sku} tampoco encontrado en caché`);
      return res.status(404).json({ error: 'Material no encontrado' });
    }
    console.log(`🔄 Usando material ${sku} desde caché`);
    res.json(material);
  }
});

// Eliminar material
router.delete('/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    
    if (!materialsDB.materials[sku]) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }
    
    // Delete material directory
    const materialDir = path.join('materials', sku);
    if (await fs.pathExists(materialDir)) {
      await fs.remove(materialDir);
    }
    
    // Remove from database
    delete materialsDB.materials[sku];
    
    // Save updated database
    await fs.writeJson('./materials/materials.json', materialsDB, { spaces: 2 });
    
    res.json({ success: true, message: 'Material eliminado correctamente' });
  } catch (error) {
    console.error('MaterialUploader: Error eliminando material:', error);
    res.status(500).json({ error: 'Error eliminando material' });
  }
});

// Obtener archivos de un material
router.get('/:sku/files', (req, res) => {
  const { sku } = req.params;
  const materialDir = path.join('materials', sku);
  
  if (!fs.existsSync(materialDir)) {
    return res.status(404).json({ error: 'Material no encontrado' });
  }
  
  try {
    const files = fs.readdirSync(materialDir);
    const fileInfo = {};
    
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      const name = path.parse(file).name;
      const lowerName = name.toLowerCase();
      
      if (ext === '.glb') {
        fileInfo.model = file;
      } else if (lowerName.includes('color') || lowerName.includes('diffuse') || lowerName.includes('albedo')) {
        fileInfo.color = file;
      } else if (lowerName.includes('normal')) {
        fileInfo.normal = file;
      } else if (lowerName.includes('roughness')) {
        fileInfo.roughness = file;
      } else if (lowerName.includes('metalness') || lowerName.includes('metallic')) {
        fileInfo.metalness = file;
      } else if (lowerName.includes('ao') || lowerName.includes('ambient')) {
        fileInfo.ao = file;
      }
    });
    
    res.json(fileInfo);
  } catch (error) {
    console.error('Error reading material files:', error);
    res.status(500).json({ error: 'Error leyendo archivos del material' });
  }
});

// Guardar configuración de preview
router.post('/:sku/preview-config', (req, res) => {
  try {
    const { sku } = req.params;
    const { config } = req.body;
    
    if (!materialsDB.materials[sku]) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }
    
    // Guardar configuración en el material
    materialsDB.materials[sku].previewConfig = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    
    materialsDB.materials[sku].updatedAt = new Date().toISOString();
    
    // Guardar archivo JSON
    fs.writeJson('./materials/materials.json', materialsDB, { spaces: 2 })
      .then(() => {
        res.json({ success: true, config: materialsDB.materials[sku].previewConfig });
      })
      .catch(error => {
        console.error('MaterialUploader: Error guardando configuración:', error);
        res.status(500).json({ error: 'Error guardando configuración' });
      });
      
  } catch (error) {
    console.error('MaterialUploader: Error procesando configuración:', error);
    res.status(500).json({ error: 'Error procesando configuración' });
  }
});

// Obtener configuración de preview
router.get('/:sku/preview-config', (req, res) => {
    try {
        const { sku } = req.params;
        const materialsJsonPath = path.join(__dirname, '../materials/materials.json');
        if (!fs.existsSync(materialsJsonPath)) {
            return res.status(404).json({ error: 'materials.json not found' });
        }
        const materialsData = JSON.parse(fs.readFileSync(materialsJsonPath, 'utf8'));
        const material = materialsData.materials[sku];

        console.log(material,"------------", material.pbrSettings)

        if (material && material.pbrSettings) {
            // Devuelve los settings tal cual están guardados
            res.json(material.pbrSettings);
        } else {
            // Defaults si no hay settings guardados
            res.json({
                metalness: 0.5,
                roughness: 0.5,
                normalScale: 1.0,
                aoIntensity: 0.0,
                enableColor: true,
                enableNormal: true,
                enableRoughness: true,
                enableMetalness: true,
                enableAO: true
            });
        }
    } catch (error) {
        console.error('Error getting preview config:', error);
        res.status(500).json({ error: 'Error loading preview configuration' });
    }
});

// Eliminar material individual
router.delete('/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    
    if (!materialsDB.materials[sku]) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }
    
    // Eliminar carpeta del material
    const materialDir = path.join('materials', sku);
    if (fs.existsSync(materialDir)) {
      await fs.remove(materialDir);
      console.log(`MaterialUploader: Carpeta del material eliminada: ${materialDir}`);
    }
    
    // Eliminar del JSON
    delete materialsDB.materials[sku];
    
    // Guardar archivo JSON actualizado
    await fs.writeJson('./materials/materials.json', materialsDB, { spaces: 2 });
    
    res.json({ success: true, message: 'Material eliminado correctamente' });
  } catch (error) {
    console.error('MaterialUploader: Error eliminando material:', error);
    res.status(500).json({ error: 'Error eliminando material' });
  }
});

// Eliminar múltiples materiales
router.delete('/', async (req, res) => {
  try {
    const { skus } = req.body;
    
    if (!Array.isArray(skus) || skus.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de SKUs válido' });
    }
    
    const deletedMaterials = [];
    const errors = [];
    
    for (const sku of skus) {
      try {
        if (!materialsDB.materials[sku]) {
          errors.push(`Material ${sku} no encontrado`);
          continue;
        }
        
        // Eliminar carpeta del material
        const materialDir = path.join('materials', sku);
        if (fs.existsSync(materialDir)) {
          await fs.remove(materialDir);
          console.log(`MaterialUploader: Carpeta del material eliminada: ${materialDir}`);
        }
        
        // Eliminar del JSON
        delete materialsDB.materials[sku];
        deletedMaterials.push(sku);
        
      } catch (error) {
        console.error(`MaterialUploader: Error eliminando material ${sku}:`, error);
        errors.push(`Error eliminando ${sku}: ${error.message}`);
      }
    }
    
    // Guardar archivo JSON actualizado
    await fs.writeJson('./materials/materials.json', materialsDB, { spaces: 2 });
    
    res.json({ 
      success: true, 
      message: `${deletedMaterials.length} materiales eliminados correctamente`,
      deleted: deletedMaterials,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.error('MaterialUploader: Error eliminando materiales:', error);
    res.status(500).json({ error: 'Error eliminando materiales' });
  }
});

// Save material PBR settings
router.post('/save-material-settings', async (req, res) => {
  try {
    const { id, materialId, pbrSettings, settings } = req.body;
    
    // Accept both formats for compatibility
    const finalMaterialId = id || materialId;
    const finalSettings = pbrSettings || settings;
    
    if (!finalMaterialId || !finalSettings) {
      return res.status(400).json({ error: 'Material ID y settings son requeridos' });
    }
    
    // Update material using helper
    const success = materialsHelper.updatePBRSettings(finalMaterialId, finalSettings);
    
    if (!success) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }
    
    const updatedMaterial = materialsHelper.getMaterial(finalMaterialId);
    
    console.log(`MaterialUploader: PBR settings saved for material ${finalMaterialId}`);
    
    res.json({ 
      success: true, 
      message: 'Configuración PBR guardada correctamente',
      settings: updatedMaterial.pbrSettings
    });
    
  } catch (error) {
    console.error('Error saving material settings:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Save PBR settings for materials
router.post('/pbr-settings', async (req, res) => {
  try {
    console.log('PBR settings request body:', req.body);
    
    const { materialId, settings } = req.body;
    
    if (!materialId || !settings) {
      console.log('Missing required fields:', { materialId: !!materialId, settings: !!settings });
      return res.status(400).json({ 
        success: false,
        error: 'materialId and settings are required' 
      });
    }
    
    // Load current materials data
    const materialsPath = path.join(__dirname, '..', 'materials', 'materials.json');
    let materialsData = { materials: {} };
    
    if (fs.existsSync(materialsPath)) {
      try {
        const fileContent = fs.readFileSync(materialsPath, 'utf-8');
        console.log('Materials file content length:', fileContent.length);
        
        if (fileContent.trim().length === 0) {
          console.log('Materials file is empty, using default structure');
          materialsData = { materials: {} };
        } else {
          materialsData = JSON.parse(fileContent);
        }
      } catch (parseError) {
        console.error('Error parsing materials.json:', parseError);
        console.log('Using default materials structure');
        materialsData = { materials: {} };
      }
    } else {
      console.log('Materials file does not exist, creating new structure');
    }
    
    // Ensure materials structure exists
    if (!materialsData.materials) {
      materialsData.materials = {};
    }
    
    // Create material if it doesn't exist
    if (!materialsData.materials[materialId]) {
      console.log('Creating new material entry for:', materialId);
      materialsData.materials[materialId] = {
        id: materialId,
        nombre: materialId,
        tipo: 'textura',
        createdAt: new Date().toISOString()
      };
    }
    
    // Update PBR settings
    materialsData.materials[materialId].pbrSettings = {
      ...materialsData.materials[materialId].pbrSettings,
      ...settings,
      updatedAt: new Date().toISOString()
    };
    
    materialsData.materials[materialId].updatedAt = new Date().toISOString();
    
    // Ensure materials directory exists
    const materialsDir = path.join(__dirname, '..', 'materials');
    await fs.ensureDir(materialsDir);
    
    // Save updated data
    await fs.writeJson(materialsPath, materialsData, { spaces: 2 });
    
    // Update in-memory cache
    materialsDB = materialsData;
    
    console.log(`MaterialUploader: PBR settings saved for material ${materialId}`);
    
    res.json({ 
      success: true,
      message: 'PBR settings saved successfully',
      settings: materialsData.materials[materialId].pbrSettings
    });
    
  } catch (error) {
    console.error('Error saving PBR settings:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Inicializar módulo
function initMaterialUploader() {
  ensureDirectories();
  loadInitialData();
  console.log('MaterialUploader: Módulo inicializado correctamente');
}

// Helper function to reload materials from file
function reloadMaterialsDB() {
  try {
    const materialsPath = path.join(__dirname, '..', 'materials', 'materials.json');
    if (fs.existsSync(materialsPath)) {
      // Clear require cache to force reload
      delete require.cache[require.resolve('../materials/materials.json')];
      materialsDB = require('../materials/materials.json');
      console.log('MaterialUploader: Materials DB reloaded from file');
    }
  } catch (error) {
    console.error('MaterialUploader: Error reloading materials DB:', error);
  }
}

// Helper function to get fresh materials data
function getFreshMaterialsData() {
  try {
    const materialsPath = path.join(__dirname, '..', 'materials', 'materials.json');
    if (fs.existsSync(materialsPath)) {
      return JSON.parse(fs.readFileSync(materialsPath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error reading fresh materials data:', error);
  }
  return { materials: {} };
}

// Exportar router y función de inicialización
module.exports = {
  router,
  initMaterialUploader
};

// Confirmar materiales temporales y moverlos a definitivos
router.post('/confirm-materials', async (req, res) => {
  console.log('📤 MaterialUploader: Confirmando materiales temporales');
  
  try {
    const { materials, pbrConfigs } = req.body;
    
    if (!materials || !Array.isArray(materials)) {
      return res.status(400).json({ error: 'Se requiere un array de materiales válido' });
    }

    const confirmedMaterials = [];
    const errors = [];
    
    for (const materialData of materials) {
      try {
        const { sku, properties } = materialData;
        
        if (!sku) {
          errors.push('SKU es requerido para cada material');
          continue;
        }
        
        // Verificar que no exista ya en materials
        if (materialsDB.materials[sku]) {
          errors.push(`Material ${sku} ya existe`);
          continue;
        }
        
        const tempDir = path.join('uploadsTemp', sku);
        const finalDir = path.join('materials', sku);
        
        // Verificar que exista la carpeta temporal
        if (!await fs.pathExists(tempDir)) {
          errors.push(`No se encontró carpeta temporal para ${sku}`);
          continue;
        }
        
        // Crear carpeta definitiva
        await fs.ensureDir(finalDir);
        
        // Mover archivos de temporal a definitivo
        const tempFiles = await fs.readdir(tempDir);
        const materialFiles = {};
        
        for (const file of tempFiles) {
          const sourcePath = path.join(tempDir, file);
          const destPath = path.join(finalDir, file);
          await fs.move(sourcePath, destPath, { overwrite: true });
          
          // Determinar tipo de archivo
          if (file.toLowerCase().endsWith('.glb')) {
            materialFiles.model = file;
          } else if (file.includes('_Color')) {
            materialFiles.color = file;
          } else if (file.includes('_Normal')) {
            materialFiles.normal = file;
          } else if (file.includes('_Roughness')) {
            materialFiles.roughness = file;
          } else if (file.includes('_Metalness')) {
            materialFiles.metalness = file;
          } else if (file.includes('_AmbientOcclusion')) {
            materialFiles.ao = file;
          }
        }
        
        // Obtener configuración PBR si existe
        const pbrSettings = pbrConfigs && pbrConfigs[sku] ? pbrConfigs[sku] : {
          metalness: 0.3,
          roughness: 0.41,
          normalScale: 1.0,
          aoIntensity: 1.0,
          enableNormal: true,
          enableRoughness: true,
          enableMetalness: true,
          enableAO: true
        };
        
        // Crear entrada en materials.json
        materialsDB.materials[sku] = {
          ...properties,
          files: materialFiles,
          pbrSettings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Eliminar carpeta temporal
        await fs.remove(tempDir);
        
        confirmedMaterials.push(sku);
        console.log(`✅ Material ${sku} confirmado y movido a definitivo`);
        
      } catch (error) {
        console.error(`❌ Error confirmando material ${materialData.sku}:`, error);
        errors.push(`Error confirmando ${materialData.sku}: ${error.message}`);
      }
    }
    
    // Guardar materials.json actualizado
    if (confirmedMaterials.length > 0) {
      await fs.writeJson('./materials/materials.json', materialsDB, { spaces: 2 });
      console.log(`💾 Materials.json actualizado con ${confirmedMaterials.length} materiales`);
    }
    
    res.json({ 
      success: true, 
      confirmed: confirmedMaterials,
      errors: errors.length > 0 ? errors : null,
      message: `${confirmedMaterials.length} materiales confirmados correctamente`
    });

  } catch (error) {
    console.error('❌ MaterialUploader: Error confirmando materiales:', error);
    res.status(500).json({ error: 'Error confirmando materiales: ' + error.message });
  }
});

// Limpiar archivos temporales (al recargar página o cancelar proceso)
router.delete('/cleanup-temp', async (req, res) => {
  console.log('🧹 MaterialUploader: Limpiando archivos temporales');
  
  try {
    const tempDir = path.join(__dirname, '..', 'uploadsTemp');
    
    if (await fs.pathExists(tempDir)) {
      // Leer contenido de uploadsTemp
      const tempContents = await fs.readdir(tempDir);
      let cleanedCount = 0;
      
      for (const item of tempContents) {
        const itemPath = path.join(tempDir, item);
        const stat = await fs.stat(itemPath);
        
        // Solo eliminar directorios (materiales temporales)
        if (stat.isDirectory()) {
          await fs.remove(itemPath);
          cleanedCount++;
          console.log(`🗑️ Carpeta temporal eliminada: ${item}`);
        }
      }
      
      console.log(`✅ ${cleanedCount} carpetas temporales eliminadas`);
      res.json({ 
        success: true, 
        cleaned: cleanedCount,
        message: `${cleanedCount} archivos temporales eliminados`
      });
    } else {
      res.json({ 
        success: true, 
        cleaned: 0,
        message: 'No hay archivos temporales para limpiar'
      });
    }
    
  } catch (error) {
    console.error('❌ Error limpiando archivos temporales:', error);
    res.status(500).json({ error: 'Error limpiando archivos temporales: ' + error.message });
  }
});
