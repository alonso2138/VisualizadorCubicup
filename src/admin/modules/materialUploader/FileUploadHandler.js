// File upload event handlers for MaterialUploader
import { FileValidator } from './FileValidator.js';
import { MaterialProcessor } from './MaterialProcessor.js';
import { AdminConfig } from '../../config.js';

export class FileUploadHandler {
    constructor(logger, adminInterface) {
        this.logger = logger;
        this.adminInterface = adminInterface;
        this.uploadedFiles = [];
        this.materialProcessor = new MaterialProcessor(logger);
        this.pbrGenerationStarted = false; // Flag to prevent infinite loops
        this.setupEventHandlers();
    }

    init() {
        // Initialize any additional setup if needed
        this.logger.log('FileUploadHandler initialized', 'info');
    }

    setupEventHandlers() {
        this.boundHandlers = {
            handleFileInputChange: this.handleFileInputChange.bind(this),
            handleDropZoneClick: this.handleDropZoneClick.bind(this),
            handleDragOver: this.handleDragOver.bind(this),
            handleDragLeave: this.handleDragLeave.bind(this),
            handleDrop: this.handleDrop.bind(this)
        };
    }

    setupFileUpload() {
        const dropZone = document.getElementById('materialUploadArea');
        const fileInput = document.getElementById('materialFileInput');
        
        if (!dropZone || !fileInput) {
            this.logger.log('Elementos no encontrados, reintentando...', 'warn');
            setTimeout(() => this.setupFileUpload(), 200);
            return;
        }

        if (!dropZone._materialUploaderListenersAttached) {
            dropZone.addEventListener('click', this.boundHandlers.handleDropZoneClick);
            fileInput.addEventListener('change', this.boundHandlers.handleFileInputChange);
            dropZone.addEventListener('dragover', this.boundHandlers.handleDragOver);
            dropZone.addEventListener('dragleave', this.boundHandlers.handleDragLeave);
            dropZone.addEventListener('drop', this.boundHandlers.handleDrop);
            
            dropZone._materialUploaderListenersAttached = true;
            this.logger.log('Event listeners configurados correctamente', 'info');
        }
    }

    handleFileInputChange(e) {
        this.logger.log('Archivo seleccionado via input', 'info', { fileCount: e.target.files.length });
        this.processFiles(Array.from(e.target.files));
    }
    
    handleDropZoneClick(e) {
        if (!e.isTrusted && this.logger.debugMode) {
            this.logger.log('Programmatic click detected, ignoring', 'warn');
            return;
        }
        
        this.logger.log('Click en zona de drop detectado', 'info');
        const fileInput = document.getElementById('materialFileInput');
        if (fileInput) {
            fileInput.click();
        }
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.logger.log('Drop detectado', 'info', { fileCount: e.dataTransfer.files.length });
        e.currentTarget.classList.remove('drag-over');
        this.processFiles(Array.from(e.dataTransfer.files));
    }

    async processFiles(files) {
        if (!files || files.length === 0) return;

        const validationResults = files.map(file => ({
            file,
            validation: FileValidator.validate(file)
        }));

        const validFiles = validationResults
            .filter(result => result.validation.valid)
            .map(result => result.file);

        const errors = validationResults
            .filter(result => !result.validation.valid)
            .flatMap(result => result.validation.errors);

        if (errors.length > 0) {
            this.adminInterface.showNotification(`Errores: ${errors.join(', ')}`, 'error');
        }

        if (validFiles.length > 0) {
            await this.uploadFiles(validFiles);
        }
    }

    async uploadFiles(files) {
        this.logger.log('Iniciando subida de archivos', 'info', { fileCount: files.length });
        this.adminInterface.showNotification('Subiendo archivos...');
        
        try {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));

            const response = await fetch(AdminConfig.getApiUrl('/api/materials/upload'), {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const result = await response.json();
            this.logger.log('Server response:', 'info', result);
            
            if (result.files && Array.isArray(result.files)) {
                const processedFiles = await Promise.all(
                    result.files.map(fileInfo => {
                        this.logger.log('Processing file info:', 'info', fileInfo);
                        return this.materialProcessor.createFileData(fileInfo);
                    })
                );
                
                this.logger.log('Processed files:', 'info', processedFiles);
                
                this.uploadedFiles = [...this.uploadedFiles, ...processedFiles];
                
                // Register temporary materials for PBR preview
                processedFiles.forEach(file => {
                    if (file.sku && file.isTexture) {
                        // Initialize temporary PBR config with defaults
                        if (!window.tempPBRConfigs) window.tempPBRConfigs = new Map();
                        
                        if (!window.tempPBRConfigs.has(file.sku)) {
                            window.tempPBRConfigs.set(file.sku, {
                                metalness: 0.5,
                                roughness: 0.5,
                                normalScale: 1.0,
                                aoIntensity: 0.0,
                                enableColor: true,
                                enableNormal: true,
                                enableRoughness: true,
                                enableMetalness: true,
                                enableAO: true,
                                isTemporary: true,
                                createdAt: new Date().toISOString()
                            });
                            this.logger.log(`Temporary PBR config initialized for ${file.sku}`, 'info');
                        }
                    }
                });
                
                this.adminInterface.showNotification(
                    `${files.length} archivos subidos correctamente`, 
                    'success'
                );
                
                // Show preview after successful upload
                this.showPreviewContainer();
                this.updatePreviewContainer();
                
                return this.uploadedFiles;
            } else {
                throw new Error('Respuesta inesperada del servidor');
            }
            
        } catch (error) {
            this.logger.log('Error en la subida de archivos', 'error', error);
            this.adminInterface.showNotification(
                `Error subiendo archivos: ${error.message}`, 
                'error'
            );
        }
    }

    clearUploadedFiles() {
        // Clear temporary PBR configs for uploaded files
        if (window.tempPBRConfigs && this.uploadedFiles) {
            this.uploadedFiles.forEach(file => {
                if (file.sku && window.tempPBRConfigs.has(file.sku)) {
                    window.tempPBRConfigs.delete(file.sku);
                    this.logger.log(`Temporary PBR config cleared for ${file.sku}`, 'info');
                }
            });
        }
        
        this.uploadedFiles = [];
        this.pbrGenerationStarted = false; // Reset PBR generation flag
        this.hidePreviewContainer();
    }

    getUploadedFiles() {
        return this.uploadedFiles;
    }

    showPreviewContainer() {
        const previewSection = document.getElementById('materialPreviewSection');
        if (previewSection) {
            previewSection.style.display = 'block';
            this.logger.log('Preview container shown', 'info');
        }

        // Enable validate button when files are uploaded
        const validateBtn = document.getElementById('validateMaterialsBtn');
        if (validateBtn && this.uploadedFiles.length > 0) {
            validateBtn.disabled = false;
            this.logger.log('Validate button enabled', 'info');
        }
    }

    hidePreviewContainer() {
        const previewSection = document.getElementById('materialPreviewSection');
        if (previewSection) {
            previewSection.style.display = 'none';
            this.logger.log('Preview container hidden', 'info');
        }

        // Disable validation and save buttons when no files
        const validateBtn = document.getElementById('validateMaterialsBtn');
        const saveAllBtn = document.getElementById('saveAllMaterialsBtn');
        
        if (validateBtn) {
            validateBtn.disabled = true;
        }
        if (saveAllBtn) {
            saveAllBtn.disabled = true;
            saveAllBtn.style.display = 'none';
        }
    }

    updatePreviewContainer() {
        const previewContainer = document.getElementById('materialPreviewContainer');
        if (!previewContainer) {
            this.logger.log('Preview container not found', 'warn');
            return;
        }

        // Import UITemplates for preview rendering
        import('./UITemplates.js').then(({ UITemplates }) => {
            if (this.uploadedFiles.length === 0) {
                previewContainer.innerHTML = UITemplates.renderEmptyState('No hay archivos para mostrar');
                return;
            }

            const previewHTML = this.uploadedFiles.map((file, index) => 
                UITemplates.createPreviewItem(file, index)
            ).join('');

            previewContainer.innerHTML = previewHTML;
            this.logger.log('Preview container updated with new layout', 'info', { 
                fileCount: this.uploadedFiles.length 
            });

            // Auto-start PBR generation for texture files (only once)
            if (!this.pbrGenerationStarted) {
                this.pbrGenerationStarted = true;
                this.autoGeneratePBR();
            }
        }).catch(error => {
            this.logger.log('Error loading UITemplates', 'error', error);
            previewContainer.innerHTML = '<p>Error al cargar la vista previa</p>';
        });
    }

    removeFile(index) {
        if (index >= 0 && index < this.uploadedFiles.length) {
            const removedFile = this.uploadedFiles.splice(index, 1)[0];
            this.logger.log('File removed', 'info', { file: removedFile.originalName });
            
            if (this.uploadedFiles.length === 0) {
                this.hidePreviewContainer();
            } else {
                this.updatePreviewContainer();
            }
            
            this.adminInterface.showNotification('Archivo eliminado', 'info');
        }
    }

    // New preview methods for different file types
    previewTexture(index) {
        if (index >= 0 && index < this.uploadedFiles.length) {
            const file = this.uploadedFiles[index];
            this.logger.log('Previewing texture', 'info', { file: file.originalName });
            // Open texture in new tab or lightbox
            window.open(file.path, '_blank');
        }
    }

    preview3D(index) {
        if (index >= 0 && index < this.uploadedFiles.length) {
            const file = this.uploadedFiles[index];
            this.logger.log('Previewing 3D model', 'info', { file: file.originalName });
            this.adminInterface.showNotification('Vista previa 3D (próximamente)', 'info');
        }
    }

    async autoGeneratePBR() {
        this.logger.log('Starting auto PBR generation for uploaded files', 'info');
        
        // Count texture files that can have PBR generated
        const textureFiles = this.uploadedFiles.filter(file => 
            file.isTexture && 
            file.sku && 
            file.pbrStatus !== 'generating' && 
            file.pbrStatus !== 'ready'
        );
        
        if (textureFiles.length === 0) {
            this.logger.log('No texture files need PBR generation', 'info');
            return;
        }
        
        this.adminInterface.showNotification(
            `Iniciando generación automática de PBR para ${textureFiles.length} archivo(s)...`, 
            'info'
        );
        
        // Wait a bit for the UI to render
        setTimeout(async () => {
            for (let i = 0; i < this.uploadedFiles.length; i++) {
                const file = this.uploadedFiles[i];
                
                // Only generate PBR for texture files that haven't been processed
                if (file.isTexture && 
                    file.sku && 
                    file.pbrStatus !== 'generating' && 
                    file.pbrStatus !== 'ready') {
                    
                    this.logger.log(`Auto-generating PBR for: ${file.sku}`, 'info');
                    
                    try {
                        // Mark as generating to prevent duplicate requests
                        file.pbrStatus = 'generating';
                        
                        // Update UI to show generating state
                        const generateBtn = document.getElementById(`generatePBR-${i}`);
                        if (generateBtn) {
                            generateBtn.disabled = true;
                            generateBtn.innerHTML = '⏳ Generando automáticamente...';
                        }
                        
                        // Use MaterialUploader's PBR generation logic
                        if (window.materialUploader) {
                            await window.materialUploader.handlePBRGenerationForFile(file, i);
                        }
                        
                    } catch (error) {
                        this.logger.log(`Error auto-generating PBR for ${file.sku}:`, 'error', error);
                        file.pbrStatus = 'not_generated';
                        
                        // Reset button state
                        const generateBtn = document.getElementById(`generatePBR-${i}`);
                        if (generateBtn) {
                            generateBtn.disabled = false;
                            generateBtn.innerHTML = '🔧 Generar PBR';
                        }
                    }
                }
            }
        }, 1000); // Wait 1 second for UI to render
    }
}
