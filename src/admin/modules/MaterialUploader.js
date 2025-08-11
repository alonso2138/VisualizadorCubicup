// Simplified and modular MaterialUploader
import { DebugLogger } from './materialUploader/DebugLogger.js';
import { FileUploadHandler } from './materialUploader/FileUploadHandler.js';
import { MaterialApiService } from './materialUploader/MaterialApiService.js';
import { MaterialProcessor } from './materialUploader/MaterialProcessor.js';
import { UITemplates } from './materialUploader/UITemplates.js';
import { AdminConfig } from '../config.js';

export class MaterialUploader {
    constructor(adminInterface) {
        this.adminInterface = adminInterface;
        this.currentEditingSku = null;
        
        // Initialize modules
        this.logger = new DebugLogger(false); // Disable debug mode
        this.uploadHandler = new FileUploadHandler(this.logger, adminInterface);
        this.apiService = new MaterialApiService(this.logger);
        
        // Initialize temporary PBR configurations storage
        if (!window.tempPBRConfigs) {
            window.tempPBRConfigs = new Map();
            console.log('Temporary PBR configs storage initialized');
        }
        
        // Clean up any leftover temporary files on initialization
        this.cleanupTemporaryFiles();
        
        this.init();
    }

    init() {
        this.setupGlobalEventListeners();
        
        // Clean up temporary files when page is about to unload
        window.addEventListener('beforeunload', () => {
            this.cleanupOnExit();
        });
        
        requestAnimationFrame(() => this.initializeComponents());
    }
    
    setupGlobalEventListeners() {
        document.addEventListener('click', (e) => this.handleGlobalClick(e));
        document.addEventListener('change', (e) => this.handleGlobalChange(e));
        document.addEventListener('input', (e) => this.handleGlobalInput(e));
    }
    
    handleGlobalClick(e) {
        // Handle tab clicks
        if (e.target.matches('[data-tab]')) {
            const tabId = e.target.dataset.tab;
            this.switchTab(tabId);
        }
        
        // Handle modal actions
        const action = e.target.dataset.action;
        if (action) {
            // For PBR actions that need an index
            if ((action === 'generate-pbr' || action === 'preview-pbr') && e.target.dataset.index !== undefined) {
                this.handlePBRActionWithIndex(action, parseInt(e.target.dataset.index));
            } else {
                this.handleModalAction(action);
            }
        }
    }

    handleGlobalChange(e) {
        // Handle property updates
        if (e.target.matches('.property-input')) {
            this.updateFileProperty(e.target);
        }
        
        // Handle PBR checkbox
        if (e.target.matches('.pbr-checkbox')) {
            this.updatePBRSetting(e.target);
        }
    }

    handleGlobalInput(e) {
        // Handle real-time property updates for text inputs
        if (e.target.matches('.property-input')) {
            this.updateFileProperty(e.target);
        }
    }

    updateFileProperty(input) {
        const index = parseInt(input.dataset.index);
        const property = input.dataset.property;
        const value = input.value;

        if (this.uploadHandler.uploadedFiles[index]) {
            if (property === 'hashtags') {
                // Convert comma-separated string to array
                this.uploadHandler.uploadedFiles[index].properties[property] = 
                    value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            } else {
                this.uploadHandler.uploadedFiles[index].properties[property] = value;
            }
            
            this.logger.log('Property updated', 'info', { index, property, value });
        }
    }

    updatePBRSetting(checkbox) {
        const index = parseInt(checkbox.dataset.index);
        const isChecked = checkbox.checked;

        if (this.uploadHandler.uploadedFiles[index]) {
            this.uploadHandler.uploadedFiles[index].properties.generatePBR = isChecked;
            
            this.logger.log('PBR setting updated', 'info', { 
                index, 
                generatePBR: isChecked,
                sku: this.uploadHandler.uploadedFiles[index].sku 
            });
        }
    }
    
    handleModalAction(action) {
        switch(action) {
            case 'close-edit-modal':
                this.closeEditModal();
                break;
            case 'save-material':
                this.saveMaterialEdit();
                break;
            case 'preview-material-3d':
                this.previewMaterial3D();
                break;
            case 'generate-pbr':
                this.handlePBRGeneration();
                break;
            case 'preview-pbr':
                this.handlePBRPreview();
                break;
            case 'back-to-dashboard':
                this.adminInterface.showDashboard();
                break;
        }
    }

    handlePBRActionWithIndex(action, index) {
        const fileData = this.uploadHandler.uploadedFiles[index];
        if (!fileData) {
            this.adminInterface.showNotification('Archivo no encontrado', 'error');
            return;
        }

        switch(action) {
            case 'generate-pbr':
                this.handlePBRGenerationForFile(fileData, index);
                break;
            case 'preview-pbr':
                this.handlePBRPreviewForFile(fileData, index);
                break;
        }
    }

    showEditModal() {

                // Eliminar modal existente si lo hay
        const existingModal = document.getElementById('editMaterialModal');
        if (existingModal) existingModal.remove();

        // Inyectar CSS moderno y comprimido solo una vez
        if (!document.getElementById('edit-material-modal-css')) {
            const style = document.createElement('style');
            style.id = 'edit-material-modal-css';
            style.textContent = `
            `;
            document.head.appendChild(style);
        }

        // HTML comprimido
        const modalHTML = `
            <!-- Modal de edición de material -->
            <div class="modal-overlay.active" id="editMaterialModal">
                <div class="modal-content modern-edit-modal">
                    <div class="modal-header">
                        <div class="modal-title-section">
                            <h3>✏️ Editar Material</h3>
                            <p class="modal-subtitle">Modifica las propiedades del material</p>
                        </div>
                        <button class="modal-close" data-action="close-edit-modal">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="edit-content-grid">
                            <!-- Preview Section -->
                            <div class="material-preview-section">
                                <div class="preview-container">
                                    <div class="preview-image" id="editPreviewImage">
                                        <div class="preview-placeholder">
                                            <span class="preview-icon">🎨</span>
                                            <p>Vista previa del material</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Form Section -->
                            <div class="material-form-section">
                                <form id="editMaterialForm">
                                    <input type="hidden" id="editSku">
                                    
                                    <div class="form-section">
                                        <h4 class="section-title">Información básica</h4>
                                        
                                        <div class="form-group">
                                            <label for="editNombre">
                                                Nombre del material
                                                <span class="required">*</span>
                                            </label>
                                            <input type="text" id="editNombre" required placeholder="Nombre descriptivo del material">
                                            <small class="field-help">Nombre que aparecerá en la galería de materiales</small>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="editFormato">Formato/Dimensiones</label>
                                            <input type="text" id="editFormato" placeholder="ej: 60x60cm, 30x90cm">
                                            <small class="field-help">Dimensiones físicas del material</small>
                                        </div>
                                    </div>
                                    
                                    <div class="form-section">
                                        <h4 class="section-title">Propiedades adicionales</h4>
                                        
                                        <div class="form-group">
                                            <label for="editHashtags">
                                                Tags/Etiquetas
                                                <span class="required">*</span>
                                            </label>
                                            <input type="text" id="editHashtags" required placeholder="moderno, minimalista, elegante">
                                            <small class="field-help">Palabras clave separadas por comas para búsqueda (mínimo una)</small>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="editAcabado">Acabado</label>
                                            <input type="text" id="editAcabado" placeholder="ej: Mate, Brillo, Satinado">
                                            <small class="field-help">Tipo de acabado superficial</small>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer modern-footer">
                        <div class="footer-actions">
                            <button type="button" class="btn btn-secondary" data-action="close-edit-modal">
                                <span class="icon">❌</span>
                                Cancelar
                            </button>
                            <button type="button" class="btn btn-success" data-action="save-material">
                                <span class="icon">💾</span>
                                Guardar cambios
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }


    async handlePBRGeneration() {
        if (!this.currentEditingSku) {
            this.adminInterface.showNotification('No hay material seleccionado para generar PBR', 'warning');
            return;
        }

        try {
            // Update UI to show generating state
            const generateBtn = document.getElementById('generatePbrBtn');
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.innerHTML = '<span class="icon">⏳</span> Generando...';
            }
            
            this.adminInterface.showNotification('Generando PBR...', 'info');
            
            // For existing materials, we try to find the Color file
            const materialId = this.currentEditingSku;
            
            // Try different extensions for the color file
            const possibleExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
            let filename = null;
            
            // Check which color file exists
            for (const ext of possibleExtensions) {
                const testFilename = `${materialId}_Color${ext}`;
                try {
                    const testResponse = await fetch(`/materials/${materialId}/${testFilename}`, { method: 'HEAD' });
                    if (testResponse.ok) {
                        filename = testFilename;
                        break;
                    }
                } catch (e) {
                    // Continue to next extension
                }
            }

            if (!filename) {
                throw new Error('No se encontró archivo de color para este material');
            }

            const requestBody = {
                materialId: materialId,
                filename: filename,
                generateChannels: ['normal', 'roughness', 'metalness', 'ao'],
                useExistingFile: true // Flag to indicate we're using an existing material file
            };

            console.log('PBR generation request for existing material:', requestBody);
            
            const response = await fetch(AdminConfig.materialUploader.generatePBR, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('PBR generation response error:', response.status, errorText);
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('PBR generation result:', result);
            
            if (result.success) {
                this.adminInterface.showNotification('PBR generado correctamente', 'success');
                
                // Update material status in the edit modal
                const statusSpan = document.querySelector('.pbr-status');
                if (statusSpan) {
                    statusSpan.textContent = 'Generado';
                    statusSpan.className = 'pbr-status generated';
                }
                
                // Enable preview button
                const previewBtn = document.querySelector('[data-action="preview-pbr"]');
                if (previewBtn) {
                    previewBtn.disabled = false;
                    previewBtn.classList.remove('disabled');
                }
                
                // Reset generate button
                if (generateBtn) {
                    generateBtn.disabled = false;
                    generateBtn.innerHTML = '<span class="icon">🔧</span> Generar PBR';
                }
                
                // Reload materials to get updated data
                this.loadExistingMaterials();
            } else {
                throw new Error(result.message || 'Error desconocido');
            }
        } catch (error) {
            console.error('PBR generation error:', error);
            this.adminInterface.showNotification(`Error al generar PBR: ${error.message}`, 'error');
            
            // Reset UI state
            const generateBtn = document.getElementById('generatePbrBtn');
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<span class="icon">🔧</span> Generar PBR';
            }
        }
    }

    async handlePBRGenerationForFile(fileData, index) {
        if (!fileData.sku) {
            this.adminInterface.showNotification('El material necesita un SKU válido para generar PBR', 'warning');
            return;
        }

        try {
            // Update UI to show generating state
            const generateBtn = document.getElementById(`generatePBR-${index}`);
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.innerHTML = '⏳ Generando...';
            }

            fileData.pbrStatus = 'generating';
            
            this.adminInterface.showNotification('Generando PBR...', 'info');
            
            // Check if file information exists
            if (!fileData.originalName) {
                throw new Error('No se encontró información del archivo fuente para generar PBR');
            }

            const requestBody = {
                materialId: fileData.sku,
                filename: fileData.originalName, // Use originalName but server will look in materials directory first
                isTemporary: true, 
                useExistingFile: true, // Try to use existing file in materials directory first
                generateChannels: ['normal', 'roughness', 'metalness', 'ao']
            };

            console.log('PBR generation request:', requestBody);
            
            const response = await fetch(AdminConfig.materialUploader.generatePBR, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('PBR generation response error:', response.status, errorText);
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.adminInterface.showNotification('PBR generado correctamente', 'success');
                fileData.pbrStatus = 'ready';
                
                // Update buttons
                if (generateBtn) {
                    generateBtn.disabled = false;
                    generateBtn.innerHTML = '🔧 Generar PBR';
                }

                const previewBtn = document.getElementById(`previewPBR-${index}`);
                if (previewBtn) {
                    previewBtn.disabled = false;
                    previewBtn.style.opacity = '1';
                }
            } else {
                throw new Error(result.message || 'Error desconocido');
            }
        } catch (error) {
            console.error('PBR generation error:', error);
            this.adminInterface.showNotification(`Error al generar PBR: ${error.message}`, 'error');
            
            // Reset UI state
            fileData.pbrStatus = 'not_generated';
            const generateBtn = document.getElementById(`generatePBR-${index}`);
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '🔧 Generar PBR';
            }
        }
    }

    async handlePBRPreviewForFile(fileData, index) {
        if (!fileData.sku) {
            this.adminInterface.showNotification('El material necesita un SKU válido para preview', 'warning');
            return;
        }

        if (fileData.pbrStatus !== 'ready') {
            this.adminInterface.showNotification('Primero genera el PBR para este material', 'warning');
            return;
        }

        try {
            // Create a temporary material object for preview
            const materialData = {
                id: fileData.sku,
                nombre: fileData.properties.nombre || fileData.sku,
                ...fileData.properties
            };

            // Use the unified MaterialsManager preview system
            if (window.materialsManager && window.materialsManager.createMaterialPreviewModal) {
                window.materialsManager.createMaterialPreviewModal(fileData.sku, materialData);
            } else {
                // Fallback to ExperienceManager if MaterialsManager not available
                const experienceManager = this.adminInterface.experienceManager;
                if (experienceManager && experienceManager.showPBRPreview) {
                    experienceManager.showPBRPreview(fileData.sku, materialData);
                } else {
                    this.adminInterface.showNotification('Sistema de vista previa no disponible', 'warning');
                }
            }
        } catch (error) {
            console.error('PBR preview error:', error);
            this.adminInterface.showNotification(`Error al mostrar preview: ${error.message}`, 'error');
        }
    }

    initializeComponents() {
        this.uploadHandler.init();
        this.loadExistingMaterials();
        window.materialUploader = this;
    }

    render() {
        return UITemplates.renderMainContainer();
    }

    initializeAfterRender() {
        this.uploadHandler.setupFileUpload();
        this.setupButtonEventListeners();
        this.loadExistingMaterials();
        window.materialUploader = this;
    }

    setupButtonEventListeners() {
        // Validate button
        const validateBtn = document.getElementById('validateMaterialsBtn');
        if (validateBtn) {
            validateBtn.addEventListener('click', () => this.validateMaterials());
        }

        // Save all button
        const saveAllBtn = document.getElementById('saveAllMaterialsBtn');
        if (saveAllBtn) {
            saveAllBtn.addEventListener('click', () => this.saveAllMaterials());
        }

        this.logger.log('Button event listeners configured', 'info');
    }

    switchTab(tabId) {
        this.logger.log('Cambiando a pestaña:', 'info', { tabId });
        
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabId}-tab`)?.classList.add('active');
        
        // Re-setup file upload when switching to upload tab
        if (tabId === 'upload') {
            setTimeout(() => this.uploadHandler.setupFileUpload(), 100);
        }
    }

    async loadExistingMaterials() {
        try {
            const materials = await this.apiService.loadMaterials();
            this.renderExistingMaterials(materials);
        } catch (error) {
            this.logger.log('Error loading materials:', 'error', error);
            const grid = document.getElementById('materialsGrid');
            if (grid) {
                grid.innerHTML = UITemplates.renderEmptyState('Error al cargar materiales');
            }
        }
    }

    renderExistingMaterials(materials) {
        const grid = document.getElementById('materialsGrid');
        if (!grid) return;
        
        if (!materials || materials.length === 0) {
            grid.innerHTML = UITemplates.renderEmptyState();
            return;
        }

        grid.innerHTML = materials.map(material => 
            UITemplates.renderMaterialItem(material)
        ).join('');
    }

    // Material management methods
    async editMaterial(sku) {
        this.currentEditingSku = sku;
        
        try {
            const materials = await this.apiService.loadMaterials();
            const material = materials.find(m => m.id === sku);
            
            if (!material) {
                this.adminInterface.showNotification('Material no encontrado', 'error');
                return;
            }
            
            this.populateEditForm(material);
            document.getElementById('editMaterialModal').classList.add('active');
            
        } catch (error) {
            this.adminInterface.showNotification('Error al cargar datos del material', 'error');
        }
    }

    populateEditForm(material) {
        document.getElementById('editSku').value = material.id;
        document.getElementById('editNombre').value = material.nombre || '';
        document.getElementById('editHashtags').value = Array.isArray(material.hashtags) ? 
            material.hashtags.join(', ') : (material.hashtags || '');
        document.getElementById('editFormato').value = material.formato || '';
        
        const acabadoField = document.getElementById('editAcabado');
        if (acabadoField) {
            acabadoField.value = material.acabado || '';
        }
        
        this.updateEditPreview(material.id, material);
    }

    updateEditPreview(sku, material) {
        const previewContainer = document.getElementById('editPreviewImage');
        if (!previewContainer) return;
        
        const imageUrl = material.files?.color ? `/materials/${sku}/${material.files.color}` : null;
        
        if (imageUrl) {
            previewContainer.innerHTML = `
                <img src="${imageUrl}" alt="${material.nombre}" class="preview-image-full" 
                     onload="this.style.display='block';"
                     onerror="this.style.display='none';">
            `;
        } else {
            previewContainer.innerHTML = UITemplates.renderPreviewPlaceholder();
        }
    }

    async saveMaterialEdit() {
        try {
            const sku = document.getElementById('editSku').value;
            const hashtagsValue = document.getElementById('editHashtags').value.trim();
            const hashtagsArray = hashtagsValue ? hashtagsValue.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
            
            const formData = {
                nombre: document.getElementById('editNombre').value.trim(),
                hashtags: hashtagsArray,
                formato: document.getElementById('editFormato').value.trim()
            };
            
            const acabadoField = document.getElementById('editAcabado');
            if (acabadoField) {
                formData.acabado = acabadoField.value.trim();
            }
            
            if (!formData.nombre || hashtagsArray.length === 0) {
                this.adminInterface.showNotification('Por favor completa el nombre y al menos una etiqueta', 'warning');
                return;
            }
            
            await this.apiService.updateMaterial(sku, formData);
            this.adminInterface.showNotification('Material actualizado exitosamente', 'success');
            this.closeEditModal();
            this.loadExistingMaterials();
            
        } catch (error) {
            this.adminInterface.showNotification('Error al guardar material', 'error');
        }
    }

    async previewMaterial3D(materialId = null) {
        const targetMaterialId = materialId || this.currentEditingSku;
        
        if (!targetMaterialId) {
            this.adminInterface.showNotification('No hay material seleccionado para preview', 'warning');
            return;
        }

        try {
            const materials = await this.apiService.loadMaterials();
            const material = materials.find(m => m.id === targetMaterialId);
            
            if (!material) {
                this.adminInterface.showNotification('Material no encontrado', 'error');
                return;
            }

            // Use the unified MaterialsManager preview system
            if (window.materialsManager && window.materialsManager.createMaterialPreviewModal) {
                window.materialsManager.createMaterialPreviewModal(targetMaterialId, material);
            } else {
                // Fallback to ExperienceManager if MaterialsManager not available
                const experienceManager = this.adminInterface.experienceManager;
                if (!experienceManager.materials || experienceManager.materials.length === 0) {
                    experienceManager.materials = materials;
                }
                
                if (experienceManager.showPBRPreview) {
                    experienceManager.showPBRPreview(targetMaterialId);
                } else {
                    this.adminInterface.showNotification('Sistema de vista previa no disponible', 'warning');
                }
            }
        } catch (error) {
            this.adminInterface.showNotification('Error al cargar vista previa: ' + error.message, 'error');
        }
    }

    editMaterial(materialId) {
        // Set the current editing SKU and show edit modal
        this.currentEditingSku = materialId;
        this.adminInterface.experienceManager.materialsManager.createMaterialInfoModal(materialId, {})
    }

    async deleteMaterial(materialId) {
        if (!confirm(`¿Estás seguro de que quieres eliminar el material ${materialId}?`)) {
            return;
        }

        try {
            const response = await fetch(`${AdminConfig.materialUploader.materials}/${materialId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            this.adminInterface.showNotification('Material eliminado correctamente', 'success');
            this.loadExistingMaterials(); // Refresh the list
        } catch (error) {
            console.error('Delete material error:', error);
            this.adminInterface.showNotification(`Error al eliminar material: ${error.message}`, 'error');
        }
    }

    removeFile(index) {
        if (!confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
            return;
        }

        try {
            // Remove file from uploadHandler's file list
            if (this.uploadHandler && this.uploadHandler.uploadedFiles) {
                const removedFile = this.uploadHandler.uploadedFiles[index];
                this.uploadHandler.uploadedFiles.splice(index, 1);
                
                this.logger.log(`File removed: ${removedFile?.originalName || 'Unknown'} at index ${index}`);
                
                // Update the preview display
                this.updatePreviewDisplay();
                
                // Show feedback
                this.adminInterface.showNotification(
                    `Archivo "${removedFile?.originalName || 'desconocido'}" eliminado de la lista`,
                    'info'
                );
                
                // If no files left, hide preview section and show upload area
                if (this.uploadHandler.uploadedFiles.length === 0) {
                    this.showUploadArea();
                }
            }
        } catch (error) {
            this.logger.log('Error removing file:', 'error', error);
            this.adminInterface.showNotification('Error al eliminar el archivo', 'error');
        }
    }

    async savePBRSettings(materialId, settings) {
        try {
            const response = await fetch(AdminConfig.materialUploader.pbrSettings, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    materialId: materialId,
                    settings: settings
                })
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.logger.log('PBR settings saved successfully', 'info', { materialId, settings });
                return true;
            } else {
                throw new Error(result.message || 'Error desconocido al guardar configuración PBR');
            }
        } catch (error) {
            console.error('Save PBR settings error:', error);
            this.adminInterface.showNotification(`Error al guardar configuración PBR: ${error.message}`, 'error');
            return false;
        }
    }

    // Debug methods
    enableDebugMode() { this.logger.enableDebugMode(); }
    disableDebugMode() { this.logger.disableDebugMode(); }
    enableTemporaryLogging() { this.logger.enableTemporaryLogging(); }

    validateMaterials() {
        const uploadedFiles = this.uploadHandler.getUploadedFiles();
        
        if (uploadedFiles.length === 0) {
            this.adminInterface.showNotification('No hay archivos para validar', 'warning');
            return;
        }

        this.logger.log('Iniciando validación de materiales', 'info', { fileCount: uploadedFiles.length });
        
        let isValid = true;
        const errors = [];
        const warnings = [];

        uploadedFiles.forEach((file, index) => {
            const fileErrors = [];
            const fileWarnings = [];

            // Validar campos requeridos
            if (!file.properties.nombre || file.properties.nombre.trim() === '') {
                fileErrors.push('SKU/Nombre es requerido');
            }

            if (!file.properties.hashtags || file.properties.hashtags.length === 0) {
                fileWarnings.push('Se recomienda añadir hashtags');
            }

            // Validar formato de archivo
            if (file.isTexture && file.size > 10 * 1024 * 1024) { // 10MB
                fileWarnings.push('El archivo es muy grande (>10MB)');
            }

            // Validar SKU único
            const duplicates = uploadedFiles.filter((otherFile, otherIndex) => 
                otherIndex !== index && otherFile.sku === file.sku
            );
            if (duplicates.length > 0) {
                fileErrors.push('SKU duplicado en la lista');
            }

            if (fileErrors.length > 0) {
                isValid = false;
                errors.push({
                    file: file.originalName,
                    index,
                    errors: fileErrors
                });
            }

            if (fileWarnings.length > 0) {
                warnings.push({
                    file: file.originalName,
                    index,
                    warnings: fileWarnings
                });
            }
        });

        // Mostrar resultados de validación
        this.showValidationResults(isValid, errors, warnings);
        
        // Habilitar botón de guardar si todo está válido
        const saveAllBtn = document.getElementById('saveAllMaterialsBtn');
        if (saveAllBtn) {
            saveAllBtn.disabled = !isValid;
            saveAllBtn.style.display = 'inline-block';
        }

        return isValid;
    }

    showValidationResults(isValid, errors, warnings) {
        let message = '';
        let type = 'success';

        if (isValid && warnings.length === 0) {
            message = '✅ Todos los materiales son válidos y están listos para subir';
            type = 'success';
        } else if (isValid && warnings.length > 0) {
            message = `⚠️ Materiales válidos con ${warnings.length} advertencia(s). `;
            message += warnings.map(w => `${w.file}: ${w.warnings.join(', ')}`).join('; ');
            type = 'warning';
        } else {
            message = `❌ Se encontraron ${errors.length} error(es): `;
            message += errors.map(e => `${e.file}: ${e.errors.join(', ')}`).join('; ');
            type = 'error';
        }

        this.adminInterface.showNotification(message, type);

        // Marcar campos con errores en la UI
        if (errors.length > 0) {
            errors.forEach(error => {
                this.highlightFieldErrors(error.index, error.errors);
            });
        }
    }

    highlightFieldErrors(fileIndex, errors) {
        // Encontrar el contenedor del archivo
        const fileContainer = document.querySelector(`[data-file-index="${fileIndex}"]`);
        if (!fileContainer) return;

        // Resaltar campos con errores
        errors.forEach(error => {
            if (error.includes('SKU') || error.includes('Nombre')) {
                const nameInput = fileContainer.querySelector('[data-property="nombre"]');
                if (nameInput) {
                    nameInput.classList.add('error');
                    setTimeout(() => nameInput.classList.remove('error'), 3000);
                }
            }
        });
    }

    // Cleanup temporary files on initialization (handles page reload/restart scenarios)
    async cleanupTemporaryFiles() {
        try {
            console.log('🧹 Cleaning up temporary files on initialization...');
            
            const response = await fetch(AdminConfig.getApiUrl('/api/materials/cleanup-temp'), {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.cleaned > 0) {
                    console.log(`✅ Cleaned up ${result.cleaned} temporary files`);
                    this.adminInterface.showNotification(
                        `Limpiados ${result.cleaned} archivos temporales de sesión anterior`, 
                        'info'
                    );
                }
            }
        } catch (error) {
            console.warn('⚠️ Error cleaning temporary files:', error);
            // Don't show error to user as this is not critical
        }
    }

    // Clean up on page exit (optional, as server cleanup on init is more reliable)
    cleanupOnExit() {
        if (window.tempPBRConfigs && window.tempPBRConfigs.size > 0) {
            // Send cleanup request (fire and forget)
            fetch(AdminConfig.getApiUrl('/api/materials/cleanup-temp'), {
                method: 'DELETE',
                keepalive: true // Ensure request completes even if page is closing
            }).catch(() => {}); // Ignore errors
        }
    }

    // Confirm and save all temporary materials
    async saveAllMaterials() {
        try {
            const uploadedFiles = this.uploadHandler.getUploadedFiles();
            
            if (!uploadedFiles || uploadedFiles.length === 0) {
                this.adminInterface.showNotification('No hay materiales para guardar', 'warning');
                return;
            }

            // Prepare materials data
            const materialsToConfirm = uploadedFiles.map(file => ({
                sku: file.sku,
                properties: {
                    nombre: file.properties.nombre || file.sku,
                    color: file.properties.color || '',
                    formato: file.properties.formato || '',
                    hashtags: file.properties.hashtags || [],
                    etiquetas: file.properties.etiquetas || file.properties.hashtags || [],
                    objetos_recomendados: file.properties.objetos_recomendados || [],
                    tipo: file.properties.tipo || (file.isGLB ? 'modelo' : 'textura')
                }
            }));

            // Get temporary PBR configurations
            const pbrConfigs = {};
            if (window.tempPBRConfigs) {
                for (const [sku, config] of window.tempPBRConfigs.entries()) {
                    pbrConfigs[sku] = config;
                }
            }

            this.logger.log('Confirming materials:', 'info', { 
                materialsCount: materialsToConfirm.length,
                pbrConfigsCount: Object.keys(pbrConfigs).length
            });

            // Show loading state
            this.adminInterface.showNotification('Confirmando materiales...', 'info');
            
            // Send confirmation request
            const response = await fetch(AdminConfig.getApiUrl('/api/materials/confirm-materials'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    materials: materialsToConfirm,
                    pbrConfigs: pbrConfigs
                })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.logger.log('Materials confirmed successfully:', 'info', result);
                
                // Clear temporary data
                this.uploadHandler.clearUploadedFiles();
                
                // Clear temporary PBR configs
                if (window.tempPBRConfigs) {
                    window.tempPBRConfigs.clear();
                }
                
                // Show success message
                const confirmedCount = result.confirmed ? result.confirmed.length : 0;
                let message = `${confirmedCount} materiales guardados correctamente`;
                
                if (result.errors && result.errors.length > 0) {
                    message += `\n\nAdvertencias:\n${result.errors.join('\n')}`;
                    this.adminInterface.showNotification(message, 'warning');
                } else {
                    this.adminInterface.showNotification(message, 'success');
                }
                
                // Optionally redirect or refresh
                // window.location.reload(); // Uncomment if you want to refresh the page
                
            } else {
                throw new Error(result.error || 'Error desconocido al confirmar materiales');
            }

        } catch (error) {
            this.logger.log('Error saving materials:', 'error', error);
            this.adminInterface.showNotification(
                `Error guardando materiales: ${error.message}`, 
                'error'
            );
        }
    }
}
