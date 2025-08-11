// MaterialsManager - Handles the materials modal and selection
// Extracted from ExperienceManager for better modularity

import { PBRPreviewModal } from './PBRPreviewModal.js';

export class MaterialsManager {
    constructor() {
        this.selectedMaterials = new Set();
        this.currentMaterials = [];
        this.modalResizeHandler = null;
        this.pbrPreviewModal = new PBRPreviewModal();
    }

    setupMaterialsModal() {
        console.log("Hola")
        // Create floating materials modal
        this.createMaterialsFloatingModal();
        
        // Setup show materials button
        const showMaterialsBtn = document.getElementById('showMaterialsBtn');
        if (showMaterialsBtn) {
            showMaterialsBtn.addEventListener('click', () => {
                this.showMaterialsModal();
            });
        }
        
        // Setup window resize handler for modal layout
        this.setupModalLayoutHandler();
    }

    createMaterialsFloatingModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('materialsFloatingModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create new modal
        const modal = document.createElement('div');
        modal.id = 'materialsFloatingModal';
        modal.className = 'materials-floating-modal hidden';
        
        modal.innerHTML = `
            <div class="materials-modal-header">
                <div class="materials-header-content">
                    <h4>📚 Materiales</h4>
                    <span class="materials-count" id="materialsCount">0 materiales</span>
                </div>
                <div class="materials-header-actions">
                    <button class="materials-close-btn" id="closeMaterialsModal">×</button>
                </div>
            </div>
            
            <div class="materials-floating-search">
                <div class="search-container">
                    <input type="text" id="materialSearchFloating" placeholder="🔍    Buscar materiales..." class="search-input">
                </div>
            </div>
            
            <div class="materials-floating-content">
                <div class="materials-floating-grid" id="materialsGridFloating">
                    <div class="loading-materials">
                        <div class="loading-spinner"></div>
                        <p>Cargando materiales...</p>
                    </div>
                </div>
            </div>
        `;

        // Append to modal overlay instead of body
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.appendChild(modal);
        } else {
            document.body.appendChild(modal);
        }

        // Setup event listeners
        this.setupModalEventListeners();
        
        // Setup search functionality
        this.setupFloatingMaterialSearch();
    }

    setupModalEventListeners() {
        // Setup close button
        const closeBtn = document.getElementById('closeMaterialsModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideMaterialsModal();
            });
        }

        // Close modal on overlay click
        const modal = document.getElementById('materialsFloatingModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideMaterialsModal();
                }
            });
        }

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideMaterialsModal();
            }
        });
    }

    setupModalLayoutHandler() {
        // Remove existing handler if present
        if (this.modalResizeHandler) {
            window.removeEventListener('resize', this.modalResizeHandler);
        }
        
        this.modalResizeHandler = () => {
            const materialsModal = document.getElementById('materialsFloatingModal');
            const isOpen = materialsModal && !materialsModal.classList.contains('hidden');
            if (isOpen) {
                this.adjustModalLayout(true);
            }
        };
        
        window.addEventListener('resize', this.modalResizeHandler);
    }

    async showMaterialsModal() {
        const modal = document.getElementById('materialsFloatingModal');
        if (!modal) {
            console.error('Materials modal not found');
            return;
        }

        // Show modal
        modal.classList.remove('hidden');
        
        // Adjust layout
        this.adjustModalLayout(true);
        
        // Load materials
        await this.loadMaterials();
    }

    hideMaterialsModal() {
        const modal = document.getElementById('materialsFloatingModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // Adjust layout when modal is hidden
        this.adjustModalLayout(false);
    }

    adjustModalLayout(isModalOpen) {
        const threeContainer = document.querySelector('.three-container-fullwidth');
        
        if (!threeContainer) return;

        if (isModalOpen) {
            // Add class to adjust Three.js container width
            threeContainer.classList.add('three-container-with-materials');
        } else {
            // Remove class to restore full width
            threeContainer.classList.remove('three-container-with-materials');
        }
    }

    async loadMaterials() {
        try {
            console.log('🔄 Loading materials from server...');
            const response = await fetch('/api/available-materials');
            if (!response.ok) {
                throw new Error('Failed to load materials');
            }

            const data = await response.json();
            console.log('📦 Materials loaded:', data);
            
            // Convert the materials array back to entries format
            this.currentMaterials = data.materials.map(material => [material.id, material]);
            
            this.renderMaterials(this.currentMaterials);
            this.updateMaterialsCount(this.currentMaterials.length);
            
        } catch (error) {
            console.error('❌ Error loading materials:', error);
            this.showMaterialsError('Error al cargar materiales');
        }
    }

    renderMaterials(materials) {
        const grid = document.getElementById('materialsGridFloating');
        if (!grid) return;

        if (materials.length === 0) {
            grid.innerHTML = `
                <div class="no-materials">
                    <p>No se encontraron materiales</p>
                </div>
            `;
            return;
        }   

        grid.innerHTML = materials.map(([sku, material]) => 
            `
            <div class="material-card" sku="${sku}">
                <div class="material-preview">
                    <img src="${material.files.color}" 
                        alt="${material.name || material.nombre}" 
                        onerror="this.src='/placeholder-material.svg'">
                </div>
                <div class="material-info">
                    <h5>${material.name || material.nombre}</h5>
                    <p class="material-sku">${sku}</p>
                    <p class="material-color">${material.color || ''}</p>
                </div>
                <div class="material-actions">
                    <button class="btn-material-action btn-preview" 
                            onclick="window.materialsManager?.showMaterialInfo('${sku}')" 
                            title="Ver información">
                        ℹ️ Info
                    </button>
                    <button class="btn-material-action btn-preview" 
                            onclick="window.materialsManager?.showMaterialPreview('${sku}')" 
                            title="Vista previa">
                        👁️ Preview
                    </button>
                </div>
            </div>
        `).join('');

        // Agregar evento de clic a cada tarjeta
        const materialCards = document.querySelectorAll('.material-card');
        materialCards.forEach(card => {
            card.addEventListener('click', () => {
                // Remover la clase 'active' de todas las tarjetas
                materialCards.forEach(c => c.classList.remove('active'));
                // Añadir la clase 'active' a la tarjeta actual
                card.classList.add('active');
                window.adminInterface.experienceManager.modelViewer.selectionMode = true;

                // Capturar el siguiente clic
                const handleNextClick = (event) => {
                    const threeContainer = document.querySelector('canvas');
                    if (threeContainer && threeContainer.contains(event.target)) {
                        // Deseleccionar la tarjeta y desactivar el modo de selección
                        card.classList.remove('active');
                        window.adminInterface.experienceManager.modelViewer.selectionMode = false;

                        // Aquí puedes llamar a la función que maneja el raycasting
                        window.adminInterface.experienceManager.presetsManager.addVinculo(window.adminInterface.experienceManager.modelViewer.highlightedObject.name, card.getAttribute("sku"));
                    } else if (card.contains(event.target)) {
                        // Si el clic ocurre dentro de la tarjeta activa, no hacer nada
                        return;
                    } else {
                        // Deseleccionar la tarjeta y desactivar el modo de selección
                        card.classList.remove('active');
                        window.adminInterface.experienceManager.modelViewer.selectionMode = false;
                    }

                    // Eliminar el evento después de ejecutarse
                    document.removeEventListener('click', handleNextClick);
                };

                // Eliminar cualquier evento previo para evitar duplicados
                document.removeEventListener('click', handleNextClick);

                // Escuchar el siguiente clic en todo el documento
                document.addEventListener('click', handleNextClick);
            });
        });
    }

    setupFloatingMaterialSearch() {
        const searchInput = document.getElementById('materialSearchFloating');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.filterMaterials(searchTerm);
        });
    }

    filterMaterials(searchTerm) {
        if (!searchTerm) {
            this.renderMaterials(this.currentMaterials);
            return;
        }

        const filtered = this.currentMaterials.filter(([sku, material]) => {
            return sku.toLowerCase().includes(searchTerm) ||
                   material.nombre?.toLowerCase().includes(searchTerm) ||
                   material.color?.toLowerCase().includes(searchTerm);
        });

        this.renderMaterials(filtered);
        this.updateMaterialsCount(filtered.length, this.currentMaterials.length);
    }

    updateMaterialsCount(showing, total = null) {
        const countElement = document.getElementById('materialsCount');
        if (countElement) {
            if (total && showing !== total) {
                countElement.textContent = `${showing} de ${total} materiales`;
            } else {
                countElement.textContent = `${showing} materiales`;
            }
        }
    }

    showMaterialsError(message) {
        const grid = document.getElementById('materialsGridFloating');
        if (grid) {
            grid.innerHTML = `
                <div class="materials-error">
                    <p>❌ ${message}</p>
                    <button onclick="window.materialsManager?.loadMaterials()">Reintentar</button>
                </div>
            `;
        }
    }

    // Material info and preview methods
    cleanup() {
        if (this.modalResizeHandler) {
            window.removeEventListener('resize', this.modalResizeHandler);
            this.modalResizeHandler = null;
        }

        const modal = document.getElementById('materialsFloatingModal');
        if (modal) {
            modal.remove();
        }

        this.selectedMaterials.clear();
        this.currentMaterials = [];
    }

    // Getters
    getSelectedMaterials() {
        return Array.from(this.selectedMaterials);
    }

    getCurrentMaterials() {
        return this.currentMaterials;
    }

    // Material info and preview methods
    async showMaterialInfo(sku) {
        console.log('🔍 Opening material info modal for SKU:', sku);
        // Simply call the modal creation function, it will handle the fetch
        await this.createMaterialInfoModal(sku);
    }

    async showMaterialPreview(sku) {        
        try {
            // Create and show a Three.js-based material preview modal
            await this.createThreeJSPreviewModal(sku);
        } catch (error) {
            console.error('Error with Three.js preview:', error);
            // Fallback to simple preview modal (now loads data automatically)
            this.createSimplePreviewModal(sku);
        }
    }

    async createMaterialInfoModal(sku) {
        const existingModal = document.getElementById('materialInfoModal');
        if (existingModal) {
            existingModal.remove();
        }

        let materialData;

        try {
            console.log('🔍 Fetching material info for:', sku);
            const response = await fetch(`/api/materials/${sku}`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            materialData = await response.json();
            console.log('📦 Material data loaded:', materialData);
            
        } catch (error) {
            console.error('❌ Error loading material data:', error);
            alert('Error al cargar información del material: ' + error.message);
            return;
        }
        

        // Render etiquetas como string separado por coma
        const etiquetasStr = Array.isArray(materialData.etiquetas)
            ? materialData.etiquetas.join(', ')
            : '';

        const modal = document.createElement('div');
        modal.id = 'materialInfoModal';
        modal.className = 'modal-overlay';

        modal.innerHTML = `
            <div class="modal-content material-info-modal">
                <div class="modal-header">
                    <div class="modal-title-section">
                        <h3>ℹ️ Información del Material</h3>
                        <p class="modal-subtitle">${materialData.nombre || sku}</p>
                    </div>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="material-info-container">
                        <div class="material-basic-info">
                            <div class="info-item">
                                <label>SKU:</label>
                                <span>${sku}</span>
                            </div>
                            <div class="info-item">
                                <label>Tipo:</label>
                                <span>${materialData.tipo || 'textura'}</span>
                            </div>
                            ${materialData.color ? `
                                <div class="info-item">
                                    <label>Color:</label>
                                    <span>${materialData.color}</span>
                                </div>
                            ` : ''}
                            ${materialData.formato ? `
                                <div class="info-item">
                                    <label>Formato:</label>
                                    <span>${materialData.formato}</span>
                                </div>
                            ` : ''}
                            ${etiquetasStr ? `
                                <div class="info-item">
                                    <label>Etiquetas:</label>
                                    <span>${etiquetasStr}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="material-form-section">
                            <h4>✏️ Editar Información</h4>
                            
                            <div class="form-group">
                                <label for="modal-nombre">Nombre del Material</label>
                                <input type="text" id="modal-nombre" value="${materialData.nombre || sku}" 
                                       placeholder="Ingrese el nombre del material" />
                            </div>
                            
                            <div class="form-group">
                                <label for="modal-formato">Formato/Dimensiones</label>
                                <input type="text" id="modal-formato" value="${materialData.formato || ''}" 
                                       placeholder="Ej: 60x60, 120x60, etc." />
                            </div>
                            
                            <div class="form-group">
                                <label for="modal-etiquetas">Etiquetas (separadas por coma)</label>
                                <input type="text" id="modal-etiquetas" value="${etiquetasStr}" 
                                       placeholder="Ej: baño, cocina, decorativo..." />
                                <small class="form-help">Use comas para separar múltiples etiquetas</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cancelar
                    </button>
                    <button class="btn btn-primary" id="modal-save-btn">
                        💾 Guardar Cambios
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);

        // Setup save button handler
        this.setupSaveButtonHandler(modal, sku);
    }

    setupSaveButtonHandler(modal, sku) {
        const saveBtn = document.getElementById('modal-save-btn');
        if (!saveBtn) return;
        
        saveBtn.onclick = async () => {
            const originalText = saveBtn.textContent;
            
            try {
                saveBtn.textContent = '💾 Guardando...';
                saveBtn.disabled = true;
                
                const nuevoNombre = document.getElementById('modal-nombre').value;
                const nuevoFormato = document.getElementById('modal-formato').value;
                const nuevasEtiquetas = document.getElementById('modal-etiquetas').value.split(',').map(e => e.trim()).filter(e => e);

                await this.saveMaterialInfo(sku, {
                    nombre: nuevoNombre,
                    formato: nuevoFormato,
                    etiquetas: nuevasEtiquetas
                });

                // Show success message
                if (window.adminInterface && window.adminInterface.showNotification) {
                    window.adminInterface.showNotification('Material actualizado correctamente', 'success');
                }

                modal.remove();
                
                // Refresh materials list if needed
                if (document.getElementById('materialsFloatingModal') && !document.getElementById('materialsFloatingModal').classList.contains('hidden')) {
                    await this.loadMaterials();
                }
                
            } catch (error) {
                console.error('Error saving material info:', error);
                
                if (window.adminInterface && window.adminInterface.showNotification) {
                    window.adminInterface.showNotification('Error al guardar: ' + error.message, 'error');
                } else {
                    alert('Error al guardar: ' + error.message);
                }
                
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            }
        };
    }

    createMaterialPreviewModal(sku) {
        // Use the advanced PBR preview modal
        try {
            this.pbrPreviewModal.show(sku);
        } catch (error) {
            console.error('Error showing PBR preview:', error);
            
            // Fallback to simple modal if PBR preview fails
            this.createSimplePreviewModal(sku);
        }
    }

    async createSimplePreviewModal(sku) {
        // Remove existing modal if present
        const existingModal = document.getElementById('materialPreviewModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create loading modal first
        const modal = document.createElement('div');
        modal.id = 'materialPreviewModal';
        modal.className = 'modal-overlay';
        
        modal.innerHTML = `
            <div class="modal-content modern-edit-modal">
                <div class="modal-header">
                    <div class="modal-title-section">
                        <h3>👁️ Vista Previa del Material</h3>
                        <p class="modal-subtitle">Cargando...</p>
                    </div>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="loading-container" style="text-align: center; padding: 2rem;">
                        <div class="loading-spinner"></div>
                        <p>Cargando información del material...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);

        try {
            // Fetch material data from server
            const response = await fetch(`/api/materials/${sku}`);
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const materialData = await response.json();
            
            // Update modal content with real data
            const modalContent = modal.querySelector('.modal-content');
            modalContent.innerHTML = `
                <div class="modal-header">
                    <div class="modal-title-section">
                        <h3>👁️ Vista Previa del Material</h3>
                        <p class="modal-subtitle">${materialData.nombre || sku}</p>
                    </div>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="preview-container-large">
                        <div class="material-preview-large">
                            <img src="/materials/${sku}/${materialData.files?.color || sku + '.png'}" 
                                 alt="${materialData.nombre}" 
                                 onerror="this.src='/placeholder-material.svg'"
                                 class="preview-image-large">
                        </div>
                        
                        <div class="material-details">
                            <h4>📋 Detalles</h4>
                            <div class="detail-item">
                                <label>SKU:</label>
                                <span>${sku}</span>
                            </div>
                            <div class="detail-item">
                                <label>Nombre:</label>
                                <span>${materialData.nombre || 'Sin nombre'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Formato:</label>
                                <span>${materialData.formato || 'No especificado'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Color:</label>
                                <span>${materialData.color || 'No especificado'}</span>
                            </div>
                            ${materialData.etiquetas && materialData.etiquetas.length > 0 ? `
                                <div class="detail-item">
                                    <label>Etiquetas:</label>
                                    <span>${materialData.etiquetas.join(', ')}</span>
                                </div>
                            ` : ''}
                            
                            ${materialData.files ? `
                                <h4>📁 Archivos PBR</h4>
                                <div class="pbr-files">
                                    ${Object.entries(materialData.files).map(([type, file]) => `
                                        <div class="pbr-file">
                                            <span class="pbr-type">${type}</span>
                                            <span class="pbr-status">✅</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cerrar
                    </button>
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
                        Usar Material
                    </button>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading material data:', error);
            
            // Show error state
            const modalContent = modal.querySelector('.modal-content');
            modalContent.innerHTML = `
                <div class="modal-header">
                    <div class="modal-title-section">
                        <h3>❌ Error</h3>
                        <p class="modal-subtitle">No se pudo cargar el material</p>
                    </div>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="error-container" style="text-align: center; padding: 2rem;">
                        <p style="color: #dc2626; margin-bottom: 1rem;">
                            Error al cargar la información del material: ${error.message}
                        </p>
                        <button class="btn btn-primary" onclick="window.materialsManager?.createSimplePreviewModal('${sku}')">
                            Reintentar
                        </button>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cerrar
                    </button>
                </div>
            `;
        }
    }

    async createThreeJSPreviewModal(sku, materialData) {
        // Use the dedicated PBR Preview Modal class
        if (!this.pbrPreviewModal) {
            console.error('PBRPreviewModal not initialized');
            return;
        }
        
        try {
            await this.pbrPreviewModal.show(sku, materialData);

        } catch (error) {
            console.error('Error showing PBR preview:', error);
            // Fallback to simple notification
            if (window.adminInterface && window.adminInterface.showNotification) {
                window.adminInterface.showNotification('Error al cargar vista previa: ' + error.message, 'error');
            }
        }
    }

    async saveMaterialInfo(sku, materialInfo) {
        try {
            // Send data using the correct field name
            const apiPayload = {
                nombre: materialInfo.nombre,
                formato: materialInfo.formato || '',
                etiquetas: materialInfo.etiquetas || []
            };

            const response = await fetch(`/api/materials/${sku}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(apiPayload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('Error saving material info:', error);
            throw error;
        }
    }
}
