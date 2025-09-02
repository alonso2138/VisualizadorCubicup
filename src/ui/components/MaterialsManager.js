// MaterialsManager - Handles the materials modal and selection
// Extracted from ExperienceManager for better modularity

import { PBRPreviewModal } from '../../admin/modules/experienceManager/PBRPreviewModal.js';

export class MaterialsManager {
    constructor() {
        this.selectedMaterials = new Set();
        this.currentMaterials = [];
        this.modalResizeHandler = null;
        this.pbrPreviewModal = new PBRPreviewModal();
        // Track selected style filter (Calacatas, TextureColors, Neutrals, RawColors)
        this.selectedStyle = null;
        this.injectStyles();
    }

    setupMaterialsModal() {
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
            
            <!-- Presets toolbar: keep existing styles and content -->
            <div class="preset-toolbar" id="presetToolbar"></div>

            <!-- New style filters row (above search) -->
            <div class="style-filters-toolbar" id="styleFiltersToolbar"></div>
            
            <div class="materials-floating-search">
                <div class="search-container">
                    <input type="text" id="materialSearchFloating" placeholder="🔍    Buscar materiales..." class="search-input">
                    <button id="clearSearchBtn" class="search-clear-btn" title="Borrar filtros" aria-label="Borrar filtros">🗑️</button>
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

        // Build the style filters buttons
        this.setupStyleFiltersUI();
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
                            onclick="event.stopPropagation(); window.materialsManager?.showMaterialInfo('${sku}')" 
                            title="Ver información">
                        ℹ️ Info
                    </button>
                    <button class="btn-material-action btn-preview" 
                            onclick="event.stopPropagation(); window.materialsManager?.showMaterialPreview('${sku}')" 
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
                        window.adminInterface.experienceManager.presetsManager.addVinculo(window.adminInterface.experienceManager.modelViewer.highlightedObject.uuid, card.getAttribute("sku"));
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
            // typing removes style selection
            this.updateStyleSelection(null);
            this._applyFilter(searchTerm);
        });

        const clearBtn = document.getElementById('clearSearchBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.updateStyleSelection(null);
                // Prefer the global manager path requested by you
                const mgr = window.experience?.clientInterface?.materialsManager;
                if (mgr && typeof mgr.filterMaterials === 'function') {
                    mgr.filterMaterials('');
                } else {
                    this.filterMaterials('');
                }
            });
        }
    }

    filterMaterials(searchTerm) {
        if (!searchTerm) {
            this.renderMaterials(this.currentMaterials);
            this.updateMaterialsCount(this.currentMaterials.length);
            return;
        }

        const filtered = this.currentMaterials.filter(([sku, material]) => {
            console.log(material)
            // Helper function to recursively search through object properties
            const searchInObject = (obj, term) => {
                if (obj === null || obj === undefined) return false;
                
                if (typeof obj === 'string') {
                    return obj.toLowerCase().includes(term);
                }
                
                if (typeof obj === 'number') {
                    return obj.toString().includes(term);
                }
                
                if (Array.isArray(obj)) {
                    return obj.some(item => searchInObject(item, term));
                }
                
                if (typeof obj === 'object') {
                    return Object.values(obj).some(value => searchInObject(value, term));
                }
                
                return false;
            };

            // Search in SKU first
            if (sku.toLowerCase().includes(searchTerm)) {
                return true;
            }

            // Search recursively through all material properties
            return searchInObject(material, searchTerm);
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

    // Build the style filters row (Calacatas, Colors & Textures, Neutrals, Raw Colors)
    setupStyleFiltersUI() {
        const host = document.getElementById('styleFiltersToolbar');
        if (!host) return;

        const styles = [
            { key: 'Calacatas', label: 'Calacatas', img: '/materiales/Ambientes/Calacatas.png', icon: '🪨' },
            { key: 'TextureColors', label: 'Colors & Textures', img: '/materiales/Ambientes/TextureColors_Color.png', icon: '🎨' },
            { key: 'Neutrals', label: 'Neutrals', img: '/materiales/Ambientes/Neutrals_Color.png', icon: '⚪' },
            { key: 'RawColors', label: 'Raw Colors', img: '/materiales/Ambientes/RawColors_Color.png', icon: '🌈' }
        ];

        host.innerHTML = `
            <div class="style-filters" role="group" aria-label="Filtros de estilos">
                ${styles.map(s => `
                    <button class="style-btn" type="button" data-style="${s.key}" title="${s.label}" aria-pressed="false" style="background-image:url('${s.img}');">
                        <span class="style-icon" aria-hidden="true">${s.icon}</span>
                        <span class="sr-only">${s.label}</span>
                    </button>
                `).join('')}
            </div>
        `;

        host.querySelectorAll('.style-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-style');
                if (this.selectedStyle === key) {
                    this.updateStyleSelection(null);
                    this._applyFilter('');
                } else {
                    this.updateStyleSelection(key);
                    const input = document.getElementById('materialSearchFloating');
                    if (input) input.value = '';
                    this._applyFilter(key.toLowerCase());
                }
            });
        });
    }

    updateStyleSelection(styleKey) {
        this.selectedStyle = styleKey;
        const host = document.getElementById('styleFiltersToolbar');
        if (!host) return;
        host.querySelectorAll('.style-btn').forEach(b => {
            const selected = b.getAttribute('data-style') === styleKey && styleKey !== null;
            b.classList.toggle('selected', selected);
            b.setAttribute('aria-pressed', String(selected));
        });
    }

    _applyFilter(term) {
        const mgr = window.experience?.clientInterface?.materialsManager;
        const txt = String(term || '').toLowerCase();
        if (mgr && typeof mgr.filterMaterials === 'function' && mgr !== this) {
            mgr.filterMaterials(txt);
        } else {
            this.filterMaterials(txt);
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
        this.selectedStyle = null;
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

    // Modern styles injector for MaterialsManager UI (function-based)
    injectStyles() {
        if (document.getElementById('materials-manager-styles')) return;
        const style = document.createElement('style');
        style.id = 'materials-manager-styles';
        style.textContent = `
:root {
  --mm-bg: #0b0f14;
  --mm-surface: #0f151c;
  --mm-panel: rgba(22, 28, 36, 0.72);
  --mm-panel-solid: #161c24;
  --mm-border: rgba(255,255,255,0.08);
  --mm-border-strong: rgba(255,255,255,0.14);
  --mm-text: #e6e9ef;
  --mm-text-dim: #b5bcc6;
  --mm-primary: #7c3aed;
  --mm-primary-2: #a78bfa;
  --mm-accent: #22d3ee;
  --mm-danger: #ef4444;
  --mm-success: #22c55e;
  --mm-shadow: 0 8px 24px rgba(0,0,0,0.35);
  --mm-radius: 14px;
  --mm-radius-sm: 10px;
  --mm-radius-xs: 8px;
  --materials-modal-width: 380px;
}

.no-materials{
    color: white;
    width: 100%;
    text-align: center;
}

/* Drawer modal (Materials) anchored left */
#materialsFloatingModal.materials-floating-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--materials-modal-width);
  max-width: 92vw;
  height: 100vh;
  background: var(--mm-panel);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-right: 1px solid var(--mm-border);
  box-shadow: var(--mm-shadow);
  display: flex;
  flex-direction: column;
  z-index: 900;
  /* slide-in animation */
  transform: translateX(0);
  transition: transform .3s cubic-bezier(0.22, 1, 0.36, 1), opacity .2s ease;
  will-change: transform;
}

/* hidden state slides the drawer off-canvas instead of removing it */
.materials-floating-modal.hidden { 
  opacity: 0; 
  transform: translateX(-110%); 
  pointer-events: none; 
  visibility: hidden; 
}

/* Toggle button visual state */
#showMaterialsBtn[aria-pressed="true"],
#showMaterialsBtn.active {
  filter: brightness(1.05);
  box-shadow: 0 10px 20px rgba(124,58,237,0.25);
}

.materials-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--mm-border);
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0));
}

.materials-header-content h4 {
  margin: 0;
  color: var(--mm-text);
  font-weight: 700;
  letter-spacing: 0.2px;
}

.materials-count {
  display: inline-block;
  margin-top: 4px;
  color: var(--mm-text-dim);
  font-size: 12px;
}

.materials-header-actions { display: flex; gap: 6px; }
.materials-close-btn {
  appearance: none;
  border: 1px solid var(--mm-border);
  background: transparent;
  color: var(--mm-text);
  width: 32px; height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: grid; place-items: center;
  transition: border-color .2s ease, background .2s ease, transform .08s ease;
}
.materials-close-btn:hover { border-color: var(--mm-border-strong); background: rgba(255,255,255,0.06); }
.materials-close-btn:active { transform: scale(0.96); }

.materials-floating-search { padding: 12px 14px; border-bottom: 1px solid var(--mm-border); }
.search-container { position: relative; }
.search-input {
  width: 100%; height: 40px;
  padding: 0 44px 0 40px;
  color: var(--mm-text);
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--mm-border);
  border-radius: 10px;
  outline: none;
  transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
}
.search-input::placeholder { color: #8a93a0; }
.search-input:focus { border-color: var(--mm-primary-2); background: rgba(124,58,237,0.12); box-shadow: 0 0 0 3px rgba(124,58,237,0.2); }
.search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: var(--mm-text-dim);
  pointer-events: none;
}
.search-clear-btn {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid var(--mm-border);
  background: rgba(255,255,255,0.04);
  color: var(--mm-text-dim);
  display: grid; place-items: center;
  cursor: pointer;
  transition: border-color .2s ease, background .2s ease, transform .08s ease;
}
.search-clear-btn:hover { background: rgba(255,255,255,0.08); border-color: var(--mm-border-strong); }
.search-clear-btn:active { transform: scale(0.96); }

/* Preset toolbar styles */
.preset-toolbar { 
  display: flex; 
  gap: 8px; 
  padding: 8px 14px; 
  border-bottom: 1px solid var(--mm-border);
  overflow-x: auto; 
}
.preset-button { 
  display: inline-flex; 
  align-items: center; 
  gap: 8px; 
  padding: 6px 8px; 
  border-radius: 8px; 
  border: 1px solid var(--mm-border); 
  background: rgba(255,255,255,0.04); 
  color: var(--mm-text); 
  cursor: pointer; 
  white-space: nowrap; 
  font-size: 12px; 
  transition: border-color .2s ease, background .2s ease, transform .08s ease; 
}
.preset-button:hover { background: rgba(124,58,237,0.12); border-color: var(--mm-primary-2); }
.preset-button.selected { border-color: var(--mm-primary-2); background: rgba(124,58,237,0.18); }
.preset-thumb { width: 28px; height: 28px; border-radius: 6px; background: #0d1117; overflow: hidden; }
.preset-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

.materials-floating-content { flex: 1; overflow: auto; padding: 14px; }
.materials-floating-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
@media (min-width: 520px) {
  .materials-floating-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 680px) {
  .materials-floating-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

.material-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  border: 1px solid var(--mm-border);
  border-radius: var(--mm-radius-sm);
  overflow: hidden;
  box-shadow: 0 1px 0 rgba(255,255,255,0.04);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  cursor: pointer;
}
.material-card:hover {
  transform: translateY(-3px);
  border-color: var(--mm-border-strong);
  box-shadow: 0 10px 24px rgba(0,0,0,0.35);
}
.material-card.active { outline: 2px solid var(--mm-primary-2); box-shadow: 0 0 0 4px rgba(124,58,237,0.18); }
.material-preview { aspect-ratio: 16/10; background: #0d1117; display: grid; place-items: center; }
.material-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.material-info { padding: 10px 10px 6px; }
.material-info h5 { margin: 0 0 4px; font-size: 14px; color: var(--mm-text); font-weight: 600; }
.material-sku { margin: 0; color: var(--mm-text-dim); font-size: 12px; }
.material-color { margin: 4px 0 0; color: var(--mm-text-dim); font-size: 12px; }
.material-actions { display: flex; gap: 8px; padding: 10px; padding-top: 2px; }

.btn-material-action {
  flex: 1;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--mm-border);
  background: rgba(255,255,255,0.04);
  color: var(--mm-text);
  font-size: 12px;
  cursor: pointer;
  transition: border-color .2s ease, background .2s ease, transform .08s ease;
}
.btn-material-action:hover { background: rgba(124,58,237,0.12); border-color: var(--mm-primary-2); }
.btn-material-action:active { transform: translateY(1px); }

.loading-materials { display: grid; place-items: center; padding: 40px 0; color: var(--mm-text-dim); }
.loading-spinner {
  width: 28px; height: 28px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.15);
  border-top-color: var(--mm-accent);
  animation: mm-spin 1s linear infinite; margin: 0 auto 10px;
}
@keyframes mm-spin { to { transform: rotate(360deg); } }

/* Application layout interaction for left drawer */
.three-container-fullwidth { transition: width .25s ease, margin-left .25s ease; }
.three-container-with-materials { width: calc(100% - var(--materials-modal-width)); margin-left: var(--materials-modal-width); }
@media (max-width: 900px) {
  .three-container-with-materials { width: 100%; margin-left: 0; }
  #materialsFloatingModal.materials-floating-modal { width: 100vw; }
}

/* Generic overlay modal (Info/Preview) */
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(2,6,12,0.55);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  display: grid; place-items: center;
  opacity: 0; pointer-events: none; transition: opacity .2s ease;
}
.modal-overlay.active { opacity: 1; pointer-events: auto; }

.modal-content {
  width: min(920px, 92vw);
  max-height: 86vh;
  background: linear-gradient(180deg, rgba(22,28,36,0.92), rgba(15,21,28,0.96));
  color: var(--mm-text);
  border: 1px solid var(--mm-border);
  border-radius: var(--mm-radius);
  box-shadow: var(--mm-shadow);
  overflow: hidden;
  display: flex; flex-direction: column;
}

.material-info-modal .modal-header,
.modern-edit-modal .modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--mm-border);
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0));
}
.modal-title-section h3 { margin: 0; font-weight: 700; letter-spacing: .2px; }
.modal-subtitle { margin: 4px 0 0; color: var(--mm-text-dim); font-size: 13px; }
.modal-close {
  appearance: none; border: 1px solid var(--mm-border); background: transparent; color: var(--mm-text);
  width: 34px; height: 34px; border-radius: 10px; cursor: pointer; display: grid; place-items: center;
  transition: border-color .2s ease, background .2s ease, transform .08s ease;
}
.modal-close:hover { border-color: var(--mm-border-strong); background: rgba(255,255,255,0.06); }
.modal-close:active { transform: scale(0.96); }

.modal-body { padding: 16px; overflow: auto; }
.material-info-container { display: grid; grid-template-columns: 1.1fr 1fr; gap: 16px; }
@media (max-width: 820px) { .material-info-container { grid-template-columns: 1fr; } }

.material-basic-info, .material-form-section {
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--mm-border);
  border-radius: var(--mm-radius-sm);
  padding: 12px;
}
.material-basic-info .info-item { display: grid; grid-template-columns: 100px 1fr; gap: 8px; padding: 6px 0; align-items: center; }
.material-basic-info .info-item + .info-item { border-top: 1px dashed var(--mm-border); }
.material-basic-info label { color: var(--mm-text-dim); font-size: 12px; }

.material-form-section h4 { margin: 0 0 10px; font-weight: 700; }
.form-group { display: grid; gap: 6px; margin-bottom: 12px; }
.form-group input[type="text"] {
  height: 38px; padding: 0 12px; color: var(--mm-text); background: rgba(255,255,255,0.06);
  border: 1px solid var(--mm-border); border-radius: 8px; outline: none;
  transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
}
.form-group input[type="text"]::placeholder { color: #8892a0; }
.form-group input[type="text"]:focus { border-color: var(--mm-primary-2); background: rgba(124,58,237,0.12); box-shadow: 0 0 0 3px rgba(124,58,237,0.2); }
.form-help { color: var(--mm-text-dim); font-size: 12px; }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--mm-border); background: linear-gradient(0deg, rgba(255,255,255,0.04), rgba(255,255,255,0)); }

.btn { height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--mm-border); background: rgba(255,255,255,0.04); color: var(--mm-text); cursor: pointer; transition: border-color .2s ease, background .2s ease, transform .08s ease; }
.btn:hover { border-color: var(--mm-border-strong); background: rgba(255,255,255,0.08); }
.btn:active { transform: translateY(1px); }
.btn-primary { border-color: rgba(124,58,237,0.45); background: linear-gradient(180deg, rgba(124,58,237,0.35), rgba(124,58,237,0.22)); }
.btn-primary:hover { border-color: rgba(124,58,237,0.75); }
.btn-secondary { }

/* Simple loading container inside preview modal */
.loading-container { color: var(--mm-text-dim); }

/* Utility */
.blur-12 { -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
@keyframes mm-spin { to { transform: rotate(360deg); } }

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  #materialsFloatingModal.materials-floating-modal, .three-container-fullwidth { transition: none !important; }
}

/* New style filters row */
.style-filters-toolbar { padding: 8px 14px; border-bottom: 1px solid var(--mm-border); }
.style-filters { display: flex; gap: 8px; overflow-x: auto; }
.style-btn { position: relative; flex: 0 0 78px; height: 36px; border-radius: 8px; border: 1px solid var(--mm-border); background-color: rgba(255,255,255,0.04); background-size: cover; background-position: center; background-repeat: no-repeat; cursor: pointer; outline: none; transition: border-color .2s ease, background .2s ease, transform .08s ease, box-shadow .2s ease; }
.style-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.25)); border-radius: 8px; }
.style-btn:hover { background-color: rgba(124,58,237,0.12); border-color: var(--mm-primary-2); }
.style-btn.selected { border-color: var(--mm-primary-2); background-color: rgba(124,58,237,0.18); box-shadow: none; }
.style-icon { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 14px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 1px, 1px); white-space: nowrap; border: 0; }
    `;
        document.head.appendChild(style);
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
                    <div class="error-container"    e="text-align: center; padding: 2rem;">
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


