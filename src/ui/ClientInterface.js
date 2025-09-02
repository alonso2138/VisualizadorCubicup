import * as THREE from 'three';
import ModelLoader from './utils/ModelLoader.js';
import EventEmitter from '../Utils/EventEmitter.js';
import PropiedadesMateriales from './PropiedadesMateriales.js';
import { MaterialsManager } from './components/MaterialsManager.js';
import SendProjectData from './components/SendProjectData.js';

export default class ClientInterface extends EventEmitter {
    constructor(experience, options = {}) {
        super();
        this.options = options;
        
        this.experience = experience;
        this.modelLoader = new ModelLoader(this.experience);
        if(this.options.PropiedadesMateriales) this.PropiedadesMateriales = new PropiedadesMateriales();
        
        this.selection = [];

        this.configDir = new URLSearchParams(window.location.search).get('project')
        this.mainContainers = [];

        this.initiated = false;
        this.init();

        this.ceilingOverlay = false;

        // Add this to the constructor
        this.allMaterialFamilies = {}; // Store all material families by configDir
        
        // Initialize MaterialsManager for client interface
        this.materialsManager = new MaterialsManager();
        this.setupMaterialsIntegration();
        
        // Initialize SendProjectData component
        this.sendProjectData = new SendProjectData(this);
        
        // Undo system
        this.actionHistory = [];
        this.maxHistorySize = 20;
        this.setupUndoSystem();
        
        // PBR state flag for performance control
        this.pbrEnabled = false;
        
        // Material history tracking for PBR control
        this.appliedMaterialsHistory = [];
    }

    setupMaterialsIntegration() {
        // Make materialsManager globally accessible for the modal buttons
        window.materialsManager = this.materialsManager;
        
        // Make setPBR globally accessible for debugging
        window.setPBR = (state) => this.setPBR(state);
        window.togglePBR = () => this.togglePBR();
        
        // Setup the materials modal
        this.materialsManager.setupMaterialsModal();
        
        // Create materials button in the UI
        this.createMaterialsButton();
        
        // Override material application to work with ClientInterface
        this.customizeMaterialsManagerForClient();

        // Load materials
        this.materialsManager.loadMaterials();
    }

    
    createMaterialsButton() {
        // Create floating button for materials
        const materialsBtn = document.createElement('button');
        materialsBtn.id = 'showMaterialsBtn';
        materialsBtn.className = 'floating-materials-btn';
        materialsBtn.innerHTML = '📚 Materiales';
        materialsBtn.title = 'Abrir catálogo de materiales';
        
        // Style the button
        materialsBtn.style.position = 'fixed';
        materialsBtn.style.top = '20px';
        materialsBtn.style.right = '20px';
        materialsBtn.style.zIndex = '1000';
        materialsBtn.style.padding = '12px 20px';
        materialsBtn.style.background = 'var(--mm-panel)';
        materialsBtn.style.color = 'white';
        materialsBtn.style.border = 'none';
        materialsBtn.style.borderRadius = '25px';
        materialsBtn.style.cursor = 'pointer';
        materialsBtn.style.fontSize = '14px';
        materialsBtn.style.fontWeight = 'bold';
        materialsBtn.style.boxShadow = '0 4px 12px rgba(143, 92, 255, 0.3)';
        materialsBtn.style.transition = 'all 0.3s ease';
        
        // Add hover effects
        materialsBtn.addEventListener('mouseenter', () => {
            materialsBtn.style.background = 'var(--mm-panel)';
            materialsBtn.style.transform = 'translateY(-2px)';
            materialsBtn.style.boxShadow = '0 6px 16px rgba(143, 92, 255, 0.4)';
        });
        
        materialsBtn.addEventListener('mouseleave', () => {
            materialsBtn.style.background = 'var(--mm-panel)';
            materialsBtn.style.transform = 'translateY(0)';
            materialsBtn.style.boxShadow = '0 4px 12px rgba(143, 92, 255, 0.3)';
        });

        materialsBtn.addEventListener("click", () => {
            document.getElementById("materialsFloatingModal").classList.toggle("hidden")
        });
        
        document.body.appendChild(materialsBtn);
        
        // Create PBR toggle button
        this.createPBRToggleButton();
    }
    
    createPBRToggleButton() {
        // Create floating button for PBR toggle
        const pbrBtn = document.createElement('button');
        pbrBtn.id = 'togglePBRBtn';
        pbrBtn.className = 'floating-pbr-btn';
        pbrBtn.innerHTML = this.pbrEnabled ? '✨ PBR ON' : '⚡ PBR OFF';
        pbrBtn.title = 'Alternar PBR (Physically Based Rendering)';
        
        // Style the button
        pbrBtn.style.position = 'fixed';
        pbrBtn.style.top = '80px';  // Below the materials button
        pbrBtn.style.right = '20px';
        pbrBtn.style.zIndex = '1000';
        pbrBtn.style.padding = '12px 20px';
        pbrBtn.style.background = this.pbrEnabled ? 'var(--mm-success, #4CAF50)' : 'var(--mm-warning, #FF9800)';
        pbrBtn.style.color = 'white';
        pbrBtn.style.border = 'none';
        pbrBtn.style.borderRadius = '25px';
        pbrBtn.style.cursor = 'pointer';
        pbrBtn.style.fontSize = '14px';
        pbrBtn.style.fontWeight = 'bold';
        pbrBtn.style.boxShadow = this.pbrEnabled ? 
            '0 4px 12px rgba(76, 175, 80, 0.3)' : 
            '0 4px 12px rgba(255, 152, 0, 0.3)';
        pbrBtn.style.transition = 'all 0.3s ease';
        
        // Add hover effects
        pbrBtn.addEventListener('mouseenter', () => {
            pbrBtn.style.transform = 'translateY(-2px)';
            pbrBtn.style.boxShadow = this.pbrEnabled ? 
                '0 6px 16px rgba(76, 175, 80, 0.4)' : 
                '0 6px 16px rgba(255, 152, 0, 0.4)';
        });
        
        pbrBtn.addEventListener('mouseleave', () => {
            pbrBtn.style.transform = 'translateY(0)';
            pbrBtn.style.boxShadow = this.pbrEnabled ? 
                '0 4px 12px rgba(76, 175, 80, 0.3)' : 
                '0 4px 12px rgba(255, 152, 0, 0.3)';
        });

        pbrBtn.addEventListener("click", () => {
            this.togglePBR();
        });
        
        document.body.appendChild(pbrBtn);
        
        // Store reference for updates
        this.pbrToggleBtn = pbrBtn;
    }
    
    togglePBR() {
        const newState = !this.pbrEnabled;
        this.setPBR(newState);
        this.updatePBRButtonUI();
    }
    
    updatePBRButtonUI() {
        if (!this.pbrToggleBtn) return;
        
        const btn = this.pbrToggleBtn;
        btn.innerHTML = this.pbrEnabled ? '✨ PBR ON' : '⚡ PBR OFF';
        btn.style.background = this.pbrEnabled ? 'var(--mm-success, #4CAF50)' : 'var(--mm-warning, #FF9800)';
        btn.style.boxShadow = this.pbrEnabled ? 
            '0 4px 12px rgba(76, 175, 80, 0.3)' : 
            '0 4px 12px rgba(255, 152, 0, 0.3)';
    }
    
    customizeMaterialsManagerForClient() {
        // Store reference to original renderMaterials method
        const originalRenderMaterials = this.materialsManager.renderMaterials.bind(this.materialsManager);
        
        // Override renderMaterials to add client-specific click behavior
        this.materialsManager.renderMaterials = (materials) => {
            originalRenderMaterials(materials);
            
            // Add client-specific behavior to material cards
            this.setupClientMaterialCardBehavior();
        };
    }
    
    setupClientMaterialCardBehavior() {
        const materialCards = document.querySelectorAll('.material-card');
        
        materialCards.forEach(card => {
            // Remove existing click listeners
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            // Add client-specific click behavior
            newCard.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Clear any active selection
                this.clearActiveSelection();
                
                // Set up material selection mode
                const sku = newCard.getAttribute('sku');
                this.setupMaterialSelection(sku, newCard);
            });
        });
    }
    
    async setupMaterialSelection(sku, materialCard) {
        try {
            // Get material data
            const response = await fetch(`/api/materials/${sku}`);
            if (!response.ok) {
                throw new Error('Material not found');
            }
            
            const materialData = await response.json();
            
            // Visual feedback
            materialCard.classList.add('selecting');
            document.body.style.cursor = 'crosshair';
            
            // Store active selection
            this.activeSelection = {
                sku: sku,
                materialData: materialData,
                materialCard: materialCard
            };
            
            // Create next click handler
            const nextClickHandler = (event) => {
                event.stopPropagation();
                this.handleMaterialApplication(event);
            };
            
            // Add event listener
            document.addEventListener('click', nextClickHandler, { once: true });
            this.activeSelection.nextClickHandler = nextClickHandler;
            
        } catch (error) {
            console.error('Error setting up material selection:', error);
            this.showError('Error cargando material: ' + error.message);
        }
    }
    
    handleMaterialApplication(event) {
        try {
            // Check if we have a hovered object to apply material to
            if (this.experience.postProcessing && this.experience.postProcessing.hoveredObject) {
                const targetMeshes = Array.isArray(this.experience.postProcessing.hoveredObject) 
                    ? this.experience.postProcessing.hoveredObject 
                    : [this.experience.postProcessing.hoveredObject];
                
                // Apply material using the same method as the original ClientInterface
                this.applyMaterialToHoveredObject(targetMeshes);
                
            } else {
                console.warn('No hay objeto seleccionado para aplicar el material');
                this.showWarning('Selecciona un objeto primero haciendo hover sobre él');
            }
        } catch (error) {
            console.error('Error aplicando material:', error);
            this.showError('Error aplicando material: ' + error.message);
        } finally {
            this.clearActiveSelection();
        }
    }
    
    applyMaterialToHoveredObject(targetMeshes) {
        if (!this.activeSelection || !this.activeSelection.materialData) {
            return;
        }
        
        this.applySkuToMeshByUUID(this.activeSelection.sku,targetMeshes[0].name)

        const materialData = this.activeSelection.materialData;
        const materialCard = this.activeSelection.materialCard;

        // Update UI
        const allCards = document.querySelectorAll('.material-card');
        allCards.forEach(card => card.classList.remove('selected'));
        materialCard.classList.add('selected');
        
        // Show properties if available
        if (this.PropiedadesMateriales) {
            this.PropiedadesMateriales.showPropertyBox(this.activeSelection.sku);
        }
        
        // Show success feedback
        this.showSuccess(`Material ${materialData.nombre || this.activeSelection.sku} aplicado`);
    }

    // Apply a material by SKU to a mesh identified by UUID
    async applySkuToMeshByUUID(sku, uuid, optionsOverride = {}) {
        try {
            if (!sku) throw new Error('SKU es requerido');
            const modelRoot = this.experience?.model?.model;
            if (!modelRoot) throw new Error('Modelo no disponible');
            // 1) Mapear todos los objetos (meshes) en escena y sus hijos
            const allMeshes = [];
            modelRoot.traverse((obj) => {
                if (obj && obj.isMesh) allMeshes.push(obj);
            });

            // 2) Intentar localizar por UUID primero
            let mesh = null;
            if (uuid) {
                mesh = allMeshes.find(m => m.name === uuid) || null;
            }

            // 3) Si no hay UUID válido o no se encontró, contrastar por SKU
            //    Heurísticas: userData.sku, nombre del mesh, nombre del material
            if (!mesh) {
                const skuLower = String(sku).toLowerCase();
                const skuMatches = allMeshes.filter(m => {
                    const userDataSku = (m.userData && (m.userData.sku || m.userData.SKU)) ? String(m.userData.sku || m.userData.SKU).toLowerCase() : '';
                    const nameStr = m.name ? String(m.name).toLowerCase() : '';
                    const matName = m.material && m.material.name ? String(m.material.name).toLowerCase() : '';
                    return (
                        userDataSku === skuLower ||
                        nameStr.includes(skuLower) ||
                        matName.includes(skuLower)
                    );
                });

                if (skuMatches.length > 0) {
                    mesh = skuMatches[0];
                }
            }

            if (!mesh || !mesh.isMesh) throw new Error('No se encontró un mesh que coincida con el UUID/SKU proporcionado');

            // 4) Obtener info del material por SKU
            const res = await fetch(`/api/materials/${sku}`);
            if (!res.ok) throw new Error(`Material ${sku} no encontrado`);
            const materialData = await res.json();

            // 5) Construir path y opciones
            const texturePath = `/materials/${sku}/${materialData.files?.color || sku + '.png'}`;
            const options = { 
                ...(this.getMaterialOptions(materialData) || {}), 
                ...(optionsOverride || {}),
                loadPBR: this.pbrEnabled  // Ensure PBR flag is respected
            };

            // 6) Guardar para undo
            const previousMaterial = mesh.material ? mesh.material.clone() : null;

            // 7) Aplicar usando el pipeline existente (array de un solo item)
            await this.experience.model.applyTextureToGroup([mesh], texturePath, options);

            // 8) Registrar acción
            this.recordAction({
                type: 'textureApplication',
                meshes: [mesh],
                previousMaterials: [previousMaterial],
                material: { id: sku, name: materialData.nombre || sku },
                materialPath: texturePath,
                options
            });

            // 9) Mostrar propiedades opcionalmente
            if (this.PropiedadesMateriales) {
                this.PropiedadesMateriales.showPropertyBox(sku);
            }

            // 10) Guardar vinculación de SKU a UUID

            // Verificar si ese objeto ya tiene un vinculo con algun material
            const existingLink = this.selection.find(link => link.uuid === uuid);
            if (existingLink) {
                // Si ya existe, actualizar el SKU
                existingLink.sku = sku;
            } else {
                // Si no existe, agregar nuevo vínculo
                this.selection.push({ sku, uuid });
            }

            console.log(this.selection);
            
            // Actualizar datos del proyecto cuando se modifica la escena
            if (this.sendProjectData) {
                this.sendProjectData.actualizarDatos(this.selection);
            }

            return true;
        } catch (err) {
            console.error('Error aplicando SKU a UUID:', err);
            this.showError(err.message || 'Error aplicando material');
            return false;
        }
    }

        /**
     * Controls PBR (Physically Based Rendering) state for performance optimization
     * @param {boolean} state - true to enable PBR, false to disable for better performance
     */
    setPBR(state) {
        this.pbrEnabled = state;
        
        if (!this.experience.model || !this.experience.model.model) {
            console.warn('No model loaded to apply PBR changes');
            return;
        }
        
        this.selection.forEach(link => {
            this.applySkuToMeshByUUID(link.sku, link.uuid);
        });

        if (state === false) {
            // Disable PBR: Remove PBR maps from all materials
            this.experience.lighting.setQuality('low'); // Set lighting quality to low for performance
        } else {
            // Enable PBR: Try to reload PBR maps for materials that had them
            this.experience.lighting.setQuality('high'); // Set lighting quality to high for quality
        }

        this.showSuccess(`PBR ${state ? 'activado' : 'desactivado'} - ${state ? 'Calidad visual mejorada' : 'Rendimiento optimizado'}`);
    }

    /**
     * Disable PBR maps on meshes for better performance
     * @param {Array} meshes - Array of mesh objects
     */
    disablePBROnMeshes(meshes) {
        meshes.forEach(mesh => {
            const material = mesh.material;
            if (!material) return;

            // Store original PBR maps in userData for later restoration
            if (!material.userData.originalPBRMaps) {
                material.userData.originalPBRMaps = {
                    normalMap: material.normalMap,
                    roughnessMap: material.roughnessMap,
                    metalnessMap: material.metalnessMap,
                    specularIntensityMap: material.specularIntensityMap,
                    aoMap: material.aoMap,
                    displacementMap: material.displacementMap,
                    // Store original values too
                    normalScale: material.normalScale ? material.normalScale.clone() : null,
                    aoMapIntensity: material.aoMapIntensity,
                    displacementScale: material.displacementScale,
                    displacementBias: material.displacementBias,
                    specularIntensity: material.specularIntensity,
                    clearcoat: material.clearcoat,
                    clearcoatRoughness: material.clearcoatRoughness
                };
            }

            // Remove PBR maps (keep only the diffuse/color map)
            material.normalMap = null;
            material.roughnessMap = null;
            material.metalnessMap = null;
            material.specularIntensityMap = null;
            material.aoMap = null;
            material.displacementMap = null;

            // Reset PBR values to simple defaults
            if (material.normalScale) material.normalScale.set(0, 0);
            material.aoMapIntensity = 0;
            material.displacementScale = 0;
            material.displacementBias = 0;
            material.specularIntensity = 0;
            material.clearcoat = 0;
            material.clearcoatRoughness = 0;

            // Set simple base values for basic shading
            material.metalness = 0.1;
            material.roughness = 0.8;

            material.needsUpdate = true;
        });
    }

    /**
     * Enable PBR maps on meshes for better visual quality
     * @param {Array} meshes - Array of mesh objects
     */
    enablePBROnMeshes(meshes) {
        meshes.forEach(mesh => {
            const material = mesh.material;
            if (!material || !material.userData.originalPBRMaps) return;

            const originalMaps = material.userData.originalPBRMaps;

            // Restore original PBR maps if they existed
            material.normalMap = originalMaps.normalMap;
            material.roughnessMap = originalMaps.roughnessMap;
            material.metalnessMap = originalMaps.metalnessMap;
            material.specularIntensityMap = originalMaps.specularIntensityMap;
            material.aoMap = originalMaps.aoMap;
            material.displacementMap = originalMaps.displacementMap;

            // Restore original PBR values
            if (originalMaps.normalScale) {
                material.normalScale.copy(originalMaps.normalScale);
            }
            material.aoMapIntensity = originalMaps.aoMapIntensity || 1.0;
            material.displacementScale = originalMaps.displacementScale || -0.05;
            material.displacementBias = originalMaps.displacementBias || -0.05;
            material.specularIntensity = originalMaps.specularIntensity || 1.0;
            material.clearcoat = originalMaps.clearcoat || 0.0;
            material.clearcoatRoughness = originalMaps.clearcoatRoughness || 0.1;

            material.needsUpdate = true;
        });
    }

    /**
     * Get material options with PBR flag consideration
     * @param {Object} materialData - Material data object
     * @returns {Object} Material options
     */
    getMaterialOptions(materialData) {
        const options = {
            id: materialData.nombre,
            name: materialData.nombre,
            repeat: 1.0,
            metalness: materialData.pbrSettings?.metalness || 0.3,
            roughness: materialData.pbrSettings?.roughness || 0.5,
            anchoMuestra: 0.6,
            tiling: undefined,
            isGlass: false,
            loadPBR: this.pbrEnabled  // Use the PBR state flag
        };

        // Aplicar configuraciones específicas por material
        switch(materialData.nombre) {
            case 'Cristal':
                options.isGlass = true;
                break;

            default: 
                break;
        }

        return options;
    }

    setupUndoSystem() {
        // Add keyboard listener for Ctrl+Z and PBR toggle
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                this.undo();
            }
            // Add P key for PBR toggle
            if (event.key === 'p' || event.key === 'P') {
                event.preventDefault();
                this.togglePBR();
            }
        });
    }

    recordAction(action) {
        // Add action to history
        this.actionHistory.push({
            ...action,
            timestamp: Date.now()
        });
        
        // Limit history size
        if (this.actionHistory.length > this.maxHistorySize) {
            this.actionHistory.shift();
        }
    }

    undo() {
        if (this.actionHistory.length === 0) {
            console.log('No hay acciones para deshacer');
            return;
        }
        
        const lastAction = this.actionHistory.pop();
        console.log('Deshaciendo:', lastAction.type);
        
        try {
            switch (lastAction.type) {
                case 'textureApplication':
                    this.revertTextureApplication(lastAction);
                    this.showUndoFeedback('Textura revertida');
                    break;
                default:
                    console.warn('Tipo de acción no soportado para deshacer:', lastAction.type);
                    break;
            }
        } catch (error) {
            console.error('Error al deshacer acción:', error);
            this.showUndoFeedback('Error al deshacer');
        }
    }

    revertTextureApplication(action) {
        if (!action.meshes || !action.previousMaterials) {
            console.warn('Datos insuficientes para revertir la aplicación de textura');
            return;
        }
        
        // Restore previous materials to meshes
        action.meshes.forEach((mesh, index) => {
            if (mesh && action.previousMaterials[index]) {
                try {
                    mesh.material = action.previousMaterials[index];
                    console.log('Material revertido para mesh:', mesh.name || mesh.uuid);
                } catch (error) {
                    console.error('Error revirtiendo material para mesh:', mesh.name || mesh.uuid, error);
                }
            }
        });
        
        // Update UI if needed - remove selection from material items
        if (action.materialItem) {
            action.materialItem.classList.remove('selected');
        }
        
        // Hide properties panel if it was shown
        if (this.PropiedadesMateriales && action.showedProperties) {
            this.PropiedadesMateriales.hidePropertyBox();
        }
        
        console.log('Textura revertida exitosamente');
   }

    // Método para obtener información sobre el historial de acciones
    getUndoInfo() {
        return {
            canUndo: this.actionHistory.length > 0,
            historySize: this.actionHistory.length,
            lastAction: this.actionHistory.length > 0 ? this.actionHistory[this.actionHistory.length - 1] : null
        };
    }
    
    // Método para limpiar el historial (útil para reiniciar el estado)
    clearHistory() {
        this.actionHistory = [];
        console.log('Historial de acciones limpiado');
    }
    
    // Método para mostrar un mensaje temporal de undo
    showUndoFeedback(message = 'Acción deshecha') {
        // Crear elemento de feedback
        const feedback = document.createElement('div');
        feedback.style.position = 'fixed';
        feedback.style.top = '20px';
        feedback.style.right = '20px';
        feedback.style.background = 'rgba(76, 175, 80, 0.9)';
        feedback.style.color = 'white';
        feedback.style.padding = '12px 20px';
        feedback.style.borderRadius = '8px';
        feedback.style.fontSize = '14px';
        feedback.style.fontWeight = 'bold';
        feedback.style.zIndex = '2000';
        feedback.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        feedback.style.transform = 'translateX(100%)';
        feedback.style.transition = 'transform 0.3s ease';
        feedback.innerHTML = `↶ ${message}`;
        
        document.body.appendChild(feedback);
        
        // Animar entrada
        setTimeout(() => {
            feedback.style.transform = 'translateX(0)';
        }, 10);
        
        // Animar salida y remover
        setTimeout(() => {
            feedback.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (feedback.parentNode) {
                    document.body.removeChild(feedback);
                }
            }, 300);
        }, 2000);
    }

    
    init() {
        function loadStylesheet(url) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            document.head.appendChild(link);
        }

        // Al arrancar la aplicación
        loadStylesheet('/estilo_config.css');        
    }

    async loadConfigFromJson() {
        // Mostrar pantalla de carga si existe
        //this.showLoadingScreen();
        try{
            // Cargar el archivo JSON desde la carpeta uploads (verificar formato correcto)
            // DEPLOY: /api/projects/${encodeURIComponent(configDir)}
            // DEV: http://localhost:3000/api/projects/${encodeURIComponent(configDir)}
            const response = await fetch(window.SERVER_URL+`/api/projects/${encodeURIComponent(this.configDir)}`);

            if (!response.ok) {
                throw new Error(`Error cargando configuración: ${response.statusText}`);
            }

            // Convertir la respuesta a JSON
            this.groupsData = response.json();

            // Configurar recursos para el modelo
            const configData = [
                {
                    name: "modeloBase",
                    type: "gltfModel",
                    path:  `/projects/${this.configDir}/model.glb`
                },
                {
                    name: "sky",
                    type: "hdri",
                    path: './sky.hdr'
                }
            ];
            return configData;
        }catch{}
    }

    async loadProject(){
        const projectId = new URLSearchParams(window.location.search).get('project');
    }
    
    async loadFromUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // In client mode, we prioritize loading experiences/projects
        const projectId = urlParams.get('project');
        const modelPath = urlParams.get('model');
        
        if (projectId) {
            try {
                // Get project details from API
                // DEV: http://localhost:3000/api/projects/${projectId}
                // DEPLOY: /api/projects/${projectId}
                const response = await fetch(window.SERVER_URL+'/api/projects/${projectId}');
                if (!response.ok) {
                    throw new Error(`Failed to fetch project: ${response.statusText}`);
                }
                
                const project = await response.json();
                if (project && project.modelPath) {
                    // Load the project's model using the modelLoader
                    await this.modelLoader.loadModel(project.modelPath, {
                        showLoadingScreen: true,
                        loadGroups: true
                    });
                } else {
                    throw new Error('Invalid project data');
                }
            } catch (error) {
                console.error("Error loading project:", error);
                this.showError(`Error loading project: ${error.message}`);
            }
        } 
        else if (modelPath) {
            try {
                // Use the modelLoader to load the model directly
                await this.modelLoader.loadModel(modelPath, {
                    showLoadingScreen: true,
                    loadGroups: true
                });
            } catch (error) {
                console.error("Error loading model:", error);
                this.showError(`Error loading model: ${error.message}`);
            }
        } 
        else {
            // Load default experience if needed
            try {
                // You could load a default model here if needed
                // await this.modelLoader.loadModel('/path/to/default/model.glb');
            } catch (error) {
                console.error("Error loading default experience:", error);
            }
        }
    }

    createLoadingScreen() {


        if (!window.updateProgress && !window.updateMessage) {
            // Funciones globales para actualizar el loader
            window.updateProgress = function (percentage) {
                const loaderBarFill = document.getElementById('loader-bar-fill');
                if (loaderBarFill) {
                    loaderBarFill.style.width = `${percentage}%`;
                }
            };
        
            window.updateMessage = function (message) {
                const loaderMessage = document.getElementById('loader-message');
                if (loaderMessage) {
                    loaderMessage.textContent = message;
                }
            };
        }


        // Crear el overlay del loader
        const loaderOverlay = document.createElement('div');
        loaderOverlay.id = 'loader-overlay';
        loaderOverlay.style.position = 'fixed';
        loaderOverlay.style.top = '0';
        loaderOverlay.style.left = '0';
        loaderOverlay.style.width = '100vw';
        loaderOverlay.style.height = '100vh';
        loaderOverlay.style.backgroundColor = 'rgba(11,35,63,1)';
        loaderOverlay.style.transition = 'all 1s';
        loaderOverlay.style.zIndex = '9999';
        loaderOverlay.style.display = 'flex';
        loaderOverlay.style.flexDirection = 'column';
        loaderOverlay.style.justifyContent = 'center';
        loaderOverlay.style.alignItems = 'center';
        loaderOverlay.style.fontFamily = 'Montserrat, sans-serif';
    
        // Crear el logo giratorio
        const loaderLogo = document.createElement('img');
        loaderLogo.id = 'loader-logo';
        loaderLogo.src = '/logo.png';
        loaderLogo.alt = 'Loading logo';
        loaderLogo.style.width = '120px';
        loaderLogo.style.height = '120px';
        loaderLogo.style.transition = 'all 1s';
        loaderLogo.style.animation = 'spin 10s linear infinite';
        loaderOverlay.appendChild(loaderLogo);
    
        // Crear la barra de progreso
        const loaderBar = document.createElement('div');
        loaderBar.id = 'loader-bar';
        loaderBar.style.width = '300px';
        loaderBar.style.height = '4px';
        loaderBar.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        loaderBar.style.borderRadius = '2px';
        loaderBar.style.marginTop = '1rem';
        loaderBar.style.overflow = 'hidden';
    
        const loaderBarFill = document.createElement('div');
        loaderBarFill.id = 'loader-bar-fill';
        loaderBarFill.style.width = '0%';
        loaderBarFill.style.height = '100%';
        loaderBarFill.style.backgroundColor = 'white';
        loaderBarFill.style.transition = 'width 0.2s ease';
        loaderBar.appendChild(loaderBarFill);
        loaderOverlay.appendChild(loaderBar);
    
        // Crear el mensaje
        const loaderMessage = document.createElement('div');
        loaderMessage.id = 'loader-message';
        loaderMessage.setAttribute('aria-live', 'polite');
        loaderMessage.style.marginTop = '0.5rem';
        loaderMessage.style.fontSize = '14px';
        loaderMessage.style.fontWeight = '500';
        loaderMessage.style.color = 'white';
        loaderMessage.style.textAlign = 'center';
        loaderMessage.textContent = 'Cargando...';
        loaderOverlay.appendChild(loaderMessage);
    
        // Agregar el loader al DOM
        document.body.appendChild(loaderOverlay);
    
        // Definir animación de rotación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    removeLoadingScreen() {
        const loaderOverlay = document.getElementById('loader-overlay');
        if (!loaderOverlay) return;
    
        const loaderLogo = document.getElementById('loader-logo');
        const loaderBar = document.getElementById('loader-bar');
        const loaderMessage = document.getElementById('loader-message');
    
        // Step 1: Fade out the overlay background and opacity
        loaderOverlay.style.transition = 'background-color 1s ease, opacity 1s ease';
        loaderOverlay.style.opacity = '1';
        loaderLogo.style.transition = 'background-color 1s ease, opacity 1s ease';
        loaderLogo.style.opacity = '1';

        setTimeout(() => {
            loaderOverlay.style.opacity = '0';
            loaderLogo.style.opacity = '0';
            loaderBar.style.opacity = '0';
            loaderMessage.style.opacity = '0';

        }, 50); // Matches the overlay's transition duration

        setTimeout(() => {
            loaderOverlay.remove();
            loaderLogo.remove();
            loaderBar.remove();
            loaderMessage.remove();

        }, 1000); // Matches the overlay's transition duration
    }
    
    createAllContainer() {
        this.allContainer = document.createElement('div');
        this.allContainer.classList.add('all-container');
        document.body.appendChild(this.allContainer);
        
        // Create tabs container if we have multiple containers
        if (this.mainContainers.length > 1) {
            const tabsContainer = document.createElement('div');
            tabsContainer.classList.add('tabs-container');
            this.allContainer.appendChild(tabsContainer);
            
            // Create tab buttons
            const tabButtons = [];
            const tabs = this.mainContainers.map(containerInfo => containerInfo.container);
            
            // Create a button for each tab/container
            this.mainContainers.forEach((containerInfo, index) => {
                const { container, id } = containerInfo;
                
                // Create tab button
                const tabButton = document.createElement('button');
                tabButton.classList.add('tab-button');
                tabButton.textContent = id; // Use a more user-friendly label if available
                tabButtons.push(tabButton);
                tabsContain-er.appendChild(tabButton);
                
                // Set first tab as active by default
                if (index === 0) {
                    tabButton.classList.add('active');
                    container.classList.add('active');
                } else {
                    container.classList.remove('active');
                }
                
                // Add click event
                tabButton.addEventListener('click', () => {
                    // Hide all tab contents
                    tabs.forEach(t => {
                        t.classList.remove('active');
                    });
                    
                    // Hide all tab buttons
                    tabButtons.forEach(tb => {
                        tb.classList.remove('active');
                    });
                    
                    // Show selected tab and make button active
                    container.classList.add('active');
                    tabButton.classList.add('active');
                    
                    // Update the current configDir
                    this.configDir = id;
                    
                    // Refresh presets for this tab
                    this.refreshPresetsForCurrentTab(id);
                });
            });
        }
    }

    createMainContainer(configDir=this.configDir) {
        // contenedor global
        const container = document.createElement('div');
        container.classList.add('config-panel');
        container.classList.add('custom');  
        
        container.id = configDir;
        this.allContainer.appendChild(container);

        this.mainContainers.push({container:container, id:container.id});

        // Add logo
        const logo = document.createElement('img');

        // Try to load the specific image first
        logo.src = "materiales/Ambientes/"+configDir+".png";

        // Add error handling for when the image fails to load
        logo.onerror = function() {
            logo.src = 'logo.png'; // Path to your fallback/default image
            this.onerror = null;
        };        

        logo.alt = 'Logo';
        logo.classList.add('panel-logo');
        container.appendChild(logo);

        
        // Add title
        const title = document.createElement('h1');
        title.innerText = configDir;                 
        title.classList.add('title');
        container.appendChild(title);
        
        // Aquí van las secciones
        const groupsContainer = document.createElement('div');
        groupsContainer.id = 'groups-container';
        groupsContainer.classList.add('groups-container');
        container.appendChild(groupsContainer);
      
        // tras crear el panel y el logo...
        container.classList.add('collapsed');
        
        // Evento de click
        title.addEventListener('click', () => {
             container.classList.toggle('collapsed');
             if(this.experience.ambientLoader) this.experience.ambientLoader.hideOthers(configDir);
             if(this.PropiedadesMateriales) this.PropiedadesMateriales.hidePropertyBox();
        });

        // Mensaje de carga
        const loadingMessage = document.createElement('div');
        loadingMessage.textContent = 'Cargando grupos y materiales...';
        loadingMessage.style.textAlign = 'center';
        loadingMessage.style.padding = '12px 0';
        loadingMessage.style.color = '#ccc';
        groupsContainer.appendChild(loadingMessage);

        
    }

    createModelOverlayPlane(height) {   
        // Calculate bounding box
        const boundingBox = new THREE.Box3().setFromObject(this.experience.model.model);
        const size = boundingBox.getSize(new THREE.Vector3());
        const center = boundingBox.getCenter(new THREE.Vector3());
                
        // Create plane geometry that matches the X and Z dimensions
        const planeGeometry = new THREE.PlaneGeometry(size.x, size.z);
        
        // Create material for the plane
        const planeMaterial = new THREE.ShadowMaterial({
            side: THREE.DoubleSide
        });
                        
        // Create the mesh
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);    
        plane.rotation.x = -Math.PI / 2;
        plane.castShadow = true;

        // Position at the center of the model's x/z coordinates
        // and at the specified height (default: bottom of the model)
        plane.position.set(
            center.x, 
            height,
            center.z
        );
        
        // Add to scene
        this.experience.scene.add(plane);
    }

    async loadGroupsAndMaterials(configDir=this.configDir) {
        if (!this.experience.model) {
            this.showError('No hay modelo cargado');
            return;
        }
        
        try {            
            // Make sure allMaterialFamilies exists
            if (!this.allMaterialFamilies) {
                this.allMaterialFamilies = {};
            }
            
            // First load the material families
            this.materialFamilies = await this.loadMaterialFamilies(configDir);
            
            // Then render the groups once materials are loaded
            this.renderGroups(this.groupsData.groups, this.materialFamilies, configDir);
            
            // Only get presets AFTER materials are fully loaded
            if (this.experience.presets) {
                await this.experience.presets.getPresets(configDir);
            }
        } catch (error) {
            console.error(`Error loading groups for ${configDir}:`, error);
        }
    }

    // Modify the loadMaterialFamilies method to ensure we're using the right API endpoint
    async loadMaterialFamilies(configDir) {
        try {
            const response = await fetch(window.SERVER_URL + `/api/texture-materials/${configDir}`);
            if (!response.ok) throw new Error('Failed to load material families');
            
            const data = await response.json();
            
            // Store materials by configDir for future reference
            this.allMaterialFamilies[configDir] = data.families || [];
            
            // Also set as current material families
            this.materialFamilies = data.families || [];
            return this.materialFamilies;
        } catch (error) {
            console.error('Error loading material families:', error);
            return [];
        }
    }
    
        renderGroups(groups, materialFamilies, configDir) {
            // Clear loading message

            /*
            const container = (this.mainContainers.find(item => item.id === configDir) || this.mainContainers[0])?.container;   

            if(container) container.querySelector('#groups-container').innerHTML = '';

            if (!groups || groups.length === 0) {
                this.showMessage('No hay grupos configurados para este modelo');
                return;
            }
            
            // Add each group as a section with material selector
            groups.forEach(group => {
                this.createGroupSection(group, materialFamilies, container);
            });*/

            // Fin de la carga
            if(!this.initiated) this.initiated=true, this.trigger('loaded');
        }
    
    createGroupSection(group, materialFamilies, container) {
        // Filter material families based on group family if specified
        let filteredFamilies = materialFamilies;
        if (group.family) {
          filteredFamilies = materialFamilies.filter(family => 
            family.id.toLowerCase() === group.family.toLowerCase() || 
            family.name.toLowerCase() === group.family.toLowerCase()
          );
            
          if (filteredFamilies.length === 0) {
            // If no matches found, fallback to all families
            //filteredFamilies = materialFamilies;
          }
        }
      
        const excludedTerms = [
          'normal', 'Normal',
          'roughness', 'Roughness',
          'metalness', 'Metalness',
          'specular','Specular',
          'displacement', 'Displacement',
          'AmbientOcclusion'
        ];        

        if(filteredFamilies[0]){
          //this.applyTextureToGroup(group, filteredFamilies[0].materials[0]);        
          if(filteredFamilies[0].materials.filter(material => material.path && !excludedTerms.some(term => material.path.includes(term))).length <= 1) {
            return;
          }
        } else {
          return;
        }

        // Section wrapper
        const section = document.createElement('div');
        section.classList.add('panel-section');
        
        container.querySelector('#groups-container').appendChild(section);

        // Título de grupo
        const gTitle = document.createElement('h3');
        gTitle.classList.add('section-title');
        gTitle.textContent = group.name;
        section.appendChild(gTitle);
      
        // Grid de materiales
        const grid = document.createElement('div');
        grid.classList.add('materials-grid');
        section.appendChild(grid);
      
        // Only show the first applicable family
        if (filteredFamilies.length > 0) {
          const family = filteredFamilies[0];
          
          // tiles…
          family.materials.forEach(material => {
            // filtra normals, etc.
            if (material.id && !excludedTerms.some(term => material.id.includes(term))) {
              const item = document.createElement('div');
              item.classList.add('material-item');
              item.dataset.materialId = material.id;
              item.dataset.texturePath = material.path;
      
              // thumbnail
              const thumb = document.createElement('img');
              thumb.src = material.thumbnail;
              thumb.alt = material.name;
              thumb.style.pointerEvents= "none";
              item.appendChild(thumb);

      
              // tooltip
              const tip = document.createElement('div');
              tip.classList.add('material-tooltip');
              tip.textContent = material.name;
              item.appendChild(tip);

              grid.appendChild(item);
      
              // MÉTODO ANTERIOR POR GRUPOS PREDEFINIDOS
              /*
              // click: aplica selección + textura
              item.addEventListener('click', () => {
                // deseleccionar todos
                grid.querySelectorAll('.material-item').forEach(x => x.classList.remove('selected'));
                // seleccionar este
                item.classList.add('selected');

                if(this.experience.postProcessing.selectedObjects){
                    console.log(material)
                    this.experience.model.applyTextureToGroup(this.experience.postProcessing.selectedObjects, material.path);
                    return;
                }

                this.applyTextureToGroup(group, material);
                // mostrar propiedades
                if(this.PropiedadesMateriales) this.PropiedadesMateriales.showPropertyBox(material.id);
              });*/

              // MÉTODO CLICK-CLICK 
              
              // Hacemos click para seleccionar la textura 
              item.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Verificar si ya hay una selección activa
                if (this.activeSelection) {
                    this.clearActiveSelection();
                }
                
                // Estilo de selección
                item.classList.add("selecting");
                document.body.style.cursor = "crosshair";
                this.activeSelection = {
                    item: item,
                    material: material,
                    group: group,
                    grid: grid
                };

                // Crear handler para el próximo click
                const nextClickHandler = (event) => {
                    event.stopPropagation();
                    
                    try {
                        // Verificar si tenemos objeto sobre el que hacer hover
                        if (this.experience.postProcessing && this.experience.postProcessing.hoveredObject) {
                            // Obtener meshes objetivo
                            const targetMeshes = Array.isArray(this.experience.postProcessing.hoveredObject) 
                                ? this.experience.postProcessing.hoveredObject 
                                : [this.experience.postProcessing.hoveredObject];
                            
                            // Guardar materiales anteriores para undo
                            const previousMaterials = targetMeshes.map(mesh => mesh.material ? mesh.material.clone() : null);
                            
                            // Aplicar textura al objeto que estamos sobrevolando
                            const options = this.getMaterialOptions(material);
                            this.experience.model.applyTextureToGroup(
                                targetMeshes, 
                                material.path, 
                                options
                            );
                            
                            // Registrar acción para undo
                            this.recordAction({
                                type: 'textureApplication',
                                meshes: targetMeshes,
                                previousMaterials: previousMaterials,
                                material: material,
                                materialPath: material.path,
                                options: options,
                                materialItem: item,
                                showedProperties: this.PropiedadesMateriales ? true : false
                            });
                            
                            // Actualizar estado visual
                            grid.querySelectorAll('.material-item').forEach(x => x.classList.remove('selected'));
                            item.classList.add('selected');
                            
                            // Mostrar propiedades si está disponible
                            if(this.PropiedadesMateriales) {
                                this.PropiedadesMateriales.showPropertyBox(material.id);
                            }
                        } else {
                            console.warn('No hay objeto seleccionado para aplicar la textura');
                        }
                    } catch (error) {
                        console.error('Error aplicando textura:', error);
                    } finally {
                        // Limpiar selección activa
                        this.clearActiveSelection();
                    }
                };

                // Agregar el event listener con referencia para poder removerlo
                document.addEventListener("click", nextClickHandler, { once: true });
                
                // Guardar referencia del handler para limpieza manual si es necesario
                this.activeSelection.nextClickHandler = nextClickHandler;
              });           
            }
          });
        
        } else {
          // No applicable material families found
          const noMaterials = document.createElement('div');
          noMaterials.textContent = 'No hay materiales disponibles para este grupo';
          noMaterials.style.textAlign = 'center';
          noMaterials.style.padding = '15px';
          noMaterials.style.color = '#ccc';
          grid.appendChild(noMaterials);
        }
    }

    

    async applyTextureToGroup(group, material) {
        if (!material || !material.path || !this.experience.model) return;

        // Track applied materials for later URL sharing
        if (!this.appliedMaterials) {
            this.appliedMaterials = {};
        }
        this.appliedMaterials[group.id] = material.path;
        
        // Find objects in the group
        const objects = group.objects || [];
        const meshes = [];

        objects.forEach(obj => {
            // Try to find the mesh in the model by UUID or name
            this.experience.model.model.traverse(child => {
                if (child.isMesh) {
                    try{
                        if (child.uuid == obj.uuid || child.name == obj.name) {
                            meshes.push(child);
                        }
                    }catch(e){
                        throw e;
                    }
                }
            });
        });
        
        if (meshes.length == 0) {
            throw new Error("No hay objetos seleccionados para aplicarles txt");
            return; // Status messages disabled, so no warning shown
        }
        
        try {
            // Guardar materiales anteriores para undo
            const previousMaterials = meshes.map(mesh => mesh.material ? mesh.material.clone() : null);
            
            // Apply texture to all meshes in the group
            const options = {
                id: material.id,
                name: material.name,
                repeat: 1.0,
                metalness: 0.0,
                roughness: 0.6,
                anchoMuestra: 0.6,
                tiling: undefined,
                isGlass: false,
                loadPBR: this.pbrEnabled  // Use the PBR state flag
            };

                switch(material.name){
                case 'Cristal':
                    options.isGlass = true;
                    break;

                default: break;
            }
            console.log(material)
            await this.experience.model.applyTextureToGroup(meshes, material.path, options);
            
            // Record material applications in the new tracking system
            meshes.forEach(mesh => {
                this.recordMaterialApplication(
                    mesh.name,
                    mesh.uuid,
                    material.id,
                    material.path,
                    options
                );
            });
            
            // Registrar acción para undo
            this.recordAction({
                type: 'textureApplication',
                meshes: meshes,
                previousMaterials: previousMaterials,
                material: material,
                materialPath: material.path,
                options: options,
                group: group
            });
            
            // Status messages disabled, so no success message shown
            
            // Actualizar datos del proyecto cuando se modifica la escena
            if (this.sendProjectData) {
                this.sendProjectData.actualizarDatos(this.selection);
            }
        } catch (error) {
            console.error('Error applying texture:', error);
            // Status messages disabled, so no error shown
        }
    }

    highlightGroup(group) {
        if (!this.experience.model) return;
        
        // Create a temporary highlight effect
        const objects = group.objects || [];
        const highlightedMeshes = [];
        
        objects.forEach(obj => {
            this.experience.model.model.traverse(child => {
                if (child.isMesh && (child.uuid === obj.uuid || child.name === obj.name)) {
                    // Store original material
                    const original = child.material;
                    
                    // Apply highlight material
                    child.material = new THREE.MeshBasicMaterial({
                        color: 0x2196F3,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.8
                    });
                    
                    // Store for restoration
                    highlightedMeshes.push({
                        mesh: child,
                        original: original
                    });
                }
            });
        });
        
        // Reset highlight after a timeout
        setTimeout(() => {
            highlightedMeshes.forEach(item => {
                item.mesh.material = item.original;
            });
        }, 1500);
    }
    
    formatMaterialName(name) {
        // Convert camelCase or snake_case to Title Case with spaces
        return name
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/_/g, ' ')         // Replace underscores with spaces
            .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
    }
    
    async shareCurrentExperience() {
        // Get the current model path
        const modelPath = this.experience.resources.items.modeloBase?.userData?.path || '';
        
        if (!modelPath) {
            this.showError('No hay modelo cargado para compartir');
            return;
        }
        
        try {
            // Create a URL with the model parameter
            const url = new URL(window.location.origin + window.location.pathname);
            
            // Clear existing parameters
            url.search = '';
            
            // Add model parameter
            url.searchParams.append('model', modelPath);
            
            // If there are applied materials, add them to the URL
            if (this.appliedMaterials && Object.keys(this.appliedMaterials).length > 0) {
                url.searchParams.append('materials', encodeURIComponent(JSON.stringify(this.appliedMaterials)));
            }
            
            // Copy to clipboard
            await navigator.clipboard.writeText(url.toString());
            
            // Show confirmation
            this.showSuccess('¡Enlace copiado al portapapeles!');
            
            // Show sharing dialog
            this.showShareDialog(url.toString());
            
        } catch (error) {
            console.error('Error creating shareable link:', error);
            this.showError(`Error: ${error.message}`);
        }
    }
    
    showShareDialog(url) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.zIndex = '2000';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        
        // Create dialog box
        const dialog = document.createElement('div');
        dialog.style.width = '90%';
        dialog.style.maxWidth = '500px';
        dialog.style.background = 'rgba(18, 18, 18, 0.9)';
        dialog.style.backdropFilter = 'blur(12px)';
        dialog.style.WebkitBackdropFilter = 'blur(12px)';
        dialog.style.borderRadius = '16px';
        dialog.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        dialog.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
        dialog.style.padding = '20px';
        dialog.style.color = '#fff';
        
        // Create title
        const title = document.createElement('h3');
        title.textContent = 'Compartir experiencia';
        title.style.margin = '0 0 15px 0';
        title.style.textAlign = 'center';
        title.style.color = '#8f5cff';
        dialog.appendChild(title);
        
        // Create URL display
        const urlBox = document.createElement('div');
        urlBox.style.width = '100%';
        urlBox.style.padding = '10px';
        urlBox.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        urlBox.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        urlBox.style.borderRadius = '8px';
        urlBox.style.marginBottom = '15px';
        urlBox.style.wordBreak = 'break-all';
        urlBox.style.color = '#fff';
        urlBox.textContent = url;
        dialog.appendChild(urlBox);
        
        // Create button row
        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'flex';
        buttonRow.style.justifyContent = 'space-between';
        dialog.appendChild(buttonRow);
        
        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Copiar';
        copyBtn.style.padding = '8px 15px';
        copyBtn.style.backgroundColor = '#8f5cff';
        copyBtn.style.color = 'white';
        copyBtn.style.border = 'none';
        copyBtn.style.borderRadius = '8px';
        copyBtn.style.cursor = 'pointer';
        copyBtn.style.flex = '1';
        copyBtn.style.marginRight = '5px';
        copyBtn.style.transition = 'all 0.2s ease';
        
        copyBtn.addEventListener('mouseover', () => {
            copyBtn.style.backgroundColor = '#a67aff';
        });
        
        copyBtn.addEventListener('mouseout', () => {
            copyBtn.style.backgroundColor = '#8f5cff';
        });
        
        copyBtn.addEventListener('click', async () => {
            await navigator.clipboard.writeText(url);
            copyBtn.textContent = '✓ Copiado';
            setTimeout(() => {
                copyBtn.textContent = '📋 Copiar';
            }, 2000);
        });
        
        buttonRow.appendChild(copyBtn);
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Cerrar';
        closeBtn.style.padding = '8px 15px';
        closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '8px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.flex = '1';
        closeBtn.style.marginLeft = '5px';
        closeBtn.style.transition = 'all 0.2s ease';
        
        closeBtn.addEventListener('mouseover', () => {
            closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        });
        
        closeBtn.addEventListener('mouseout', () => {
            closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        buttonRow.appendChild(closeBtn);
        
        // Add dialog to overlay
        overlay.appendChild(dialog);
        
        // Add overlay to body
        document.body.appendChild(overlay);
        
        // Close when clicking outside
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }
    
    // Add this new method
refreshPresetsForCurrentTab(configDir) {
    if (this.experience.presets) {
        // First ensure we have presets for this tab by loading them if needed
        this.experience.presets.getPresets(configDir).then(() => {
            // Then find and apply the selected preset after presets are loaded
            const presetSections = document.querySelectorAll('.panel-section.preset');
            presetSections.forEach(section => {
                if (section.dataset.configDir === configDir) {
                    const selectedItem = section.querySelector('.material-item.selected');
                    if (selectedItem) {
                        // Find the index of the selected item
                        const index = Array.from(selectedItem.parentNode.children).indexOf(selectedItem);
                        if (index >= 0) {
                            // Apply the preset corresponding to this index+1 (presets are 1-indexed)
                            this.experience.presets.applyPreset(index + 1, configDir);
                        }
                    }
                }
            });
        });
    }
}
    
    // UI message helpers
    showMessage(message) {
        this.showNotification(message, 'info');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showWarning(message) {
        this.showNotification(message, 'warning');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Set styles based on type
        const styles = {
            info: { background: 'rgba(33, 150, 243, 0.9)', color: 'white' },
            success: { background: 'rgba(76, 175, 80, 0.9)', color: 'white' },
            warning: { background: 'rgba(255, 152, 0, 0.9)', color: 'white' },
            error: { background: 'rgba(244, 67, 54, 0.9)', color: 'white' }
        };
        
        const style = styles[type] || styles.info;
        
        // Apply styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%) translateY(-100%)',
            backgroundColor: style.background,
            color: style.color,
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: '2000',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'transform 0.3s ease',
            maxWidth: '400px',
            textAlign: 'center'
        });
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);
        
        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateX(-50%) translateY(-100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    destroy() {
        // Clear active selection
        this.clearActiveSelection();
        
        // Clear undo system
        this.actionHistory = [];
        
        // Cleanup MaterialsManager
        if (this.materialsManager) {
            this.materialsManager.cleanup();
        }
        
        // Remove materials button
        const materialsBtn = document.getElementById('showMaterialsBtn');
        if (materialsBtn && materialsBtn.parentNode) {
            materialsBtn.parentNode.removeChild(materialsBtn);
        }
        
        // Remove PBR toggle button
        const pbrBtn = document.getElementById('togglePBRBtn');
        if (pbrBtn && pbrBtn.parentNode) {
            pbrBtn.parentNode.removeChild(pbrBtn);
        }
        
        // Cleanup SendProjectData
        if (this.sendProjectData) {
            this.sendProjectData.destroy();
        }
        
        // Clear global reference
        if (window.materialsManager === this.materialsManager) {
            window.materialsManager = null;
        }
        
        // Clear PBR global references
        if (window.setPBR) {
            window.setPBR = null;
        }
        if (window.togglePBR) {
            window.togglePBR = null;
        }
        
        // Remove keyboard event listeners (note: we can't remove specific listeners easily, 
        // but they will be garbage collected when the instance is destroyed)
        
        // Remove container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // Remove share button if it exists
        const shareBtn = document.querySelector('button[textContent="📤 Compartir"]');
        if (shareBtn && shareBtn.parentNode) {
            shareBtn.parentNode.removeChild(shareBtn);
        }
    }

    clearActiveSelection() {
        if (this.activeSelection) {
            // Remove event listener if exists
            if (this.activeSelection.nextClickHandler) {
                document.removeEventListener("click", this.activeSelection.nextClickHandler);
            }
            
            // Clear visual styles
            if (this.activeSelection.item) {
                this.activeSelection.item.classList.remove('selecting');
            }
            
            if (this.activeSelection.materialCard) {
                this.activeSelection.materialCard.classList.remove('selecting');
            }
            
            if (this.activeSelection.grid) {
                this.activeSelection.grid.querySelectorAll('.material-item').forEach(x => x.classList.remove('selecting'));
            }
            
            // Clear material cards from MaterialsManager modal
            const materialCards = document.querySelectorAll('.material-card');
            materialCards.forEach(card => card.classList.remove('selecting'));
            
            // Reset cursor
            document.body.style.cursor = "default";
            
            // Clear reference
            this.activeSelection = null;
        }
    }
    
    /**
     * Clears all materials from the scene and resets material tracking
     * This should be used instead of manually setting material = null for each object
     */
    clearAllMaterials() {
        if (!this.experience.model || !this.experience.model.model) {
            console.warn('No model loaded to clear materials from');
            return;
        }

        const modelRoot = this.experience.model.model;
        const clearedMeshes = [];
        
        // Traverse and clear all materials
        modelRoot.traverse((obj) => {
            if (obj && obj.isMesh && obj.material) {
                // Store reference for logging
                clearedMeshes.push({
                    name: obj.name,
                    uuid: obj.uuid,
                    previousMaterial: obj.material
                });
                
                // Clear the material
                obj.material = null;
            }
        });
        
        // Clear the material history tracking
        this.appliedMaterialsHistory = [];
        
        // Clear undo history since materials are reset
        this.clearHistory();
        
        console.log(`Cleared materials from ${clearedMeshes.length} meshes and reset tracking`);
        
        return clearedMeshes;
    }
    
    /**
     * Records a material application for PBR state management
     * @param {string} meshName - Name of the mesh
     * @param {string} meshUuid - UUID of the mesh  
     * @param {string} sku - Material SKU
     * @param {string} materialPath - Path to the material
     * @param {Object} options - Material application options
     */
    recordMaterialApplication(meshName, meshUuid, sku, materialPath, options) {
        // Remove any existing entry for this mesh (by name or UUID)
        this.appliedMaterialsHistory = this.appliedMaterialsHistory.filter(
            entry => entry.meshName !== meshName && entry.meshUuid !== meshUuid
        );
        
        // Add new entry
        this.appliedMaterialsHistory.push({
            meshName: meshName,
            meshUuid: meshUuid,
            sku: sku,
            materialPath: materialPath,
            originalOptions: { ...options }, // Store original options
            timestamp: Date.now()
        });
        
        console.log(`Recorded material application: ${sku} on ${meshName} (${meshUuid})`);
    }
    
    /**
     * Finds a mesh by name or UUID in the model
     * @param {string} identifier - Mesh name or UUID
     * @returns {Object|null} Found mesh or null
     */
    findMeshByIdentifier(identifier) {
        if (!this.experience.model || !this.experience.model.model) {
            return null;
        }
        
        let foundMesh = null;
        this.experience.model.model.traverse((obj) => {
            if (obj && obj.isMesh && (obj.name === identifier || obj.uuid === identifier)) {
                foundMesh = obj;
            }
        });
        
        return foundMesh;
    }
    


    /**
     * Toggles PBR state
     */
    togglePBR() {
        const newState = !this.pbrEnabled;
        this.setPBR(newState);
        this.updatePBRButtonUI();
    }

    /**
     * Updates the PBR toggle button UI
     */
    updatePBRButtonUI() {
        if (!this.pbrToggleBtn) return;
        
        const btn = this.pbrToggleBtn;
        btn.innerHTML = this.pbrEnabled ? '✨ PBR ON' : '⚡ PBR OFF';
        btn.style.background = this.pbrEnabled ? 'var(--mm-success, #4CAF50)' : 'var(--mm-warning, #FF9800)';
        btn.style.boxShadow = this.pbrEnabled ? 
            '0 4px 12px rgba(76, 175, 80, 0.3)' : 
            '0 4px 12px rgba(255, 152, 0, 0.3)';
    }
    
    /**
     * Method to be called when applying presets that replace all materials
     * This clears the scene and resets tracking, then applies preset materials
     * @param {Array} presetMaterials - Array of preset material applications
     */
    async applyPresetMaterials(presetMaterials) {
        // Clear all existing materials and reset tracking
        this.clearAllMaterials();
        
        console.log('Applying preset with', presetMaterials.length, 'materials');
        
        // Apply each preset material and track it
        for (const presetMaterial of presetMaterials) {
            try {
                const mesh = this.findMeshByIdentifier(presetMaterial.meshName) || 
                           this.findMeshByIdentifier(presetMaterial.meshUuid);
                
                if (mesh && presetMaterial.materialPath) {
                    const options = {
                        ...presetMaterial.options,
                        loadPBR: this.pbrEnabled // Respect current PBR setting
                    };
                    
                    await this.experience.model.applyTextureToGroup([mesh], presetMaterial.materialPath, options);
                    
                    // Track the application
                    this.recordMaterialApplication(
                        mesh.name,
                        mesh.uuid,
                        presetMaterial.sku || 'preset-material',
                        presetMaterial.materialPath,
                        options
                    );
                }
            } catch (error) {
                console.warn('Failed to apply preset material:', error);
            }
        }
        
        console.log('Preset applied successfully. Tracking', this.appliedMaterialsHistory.length, 'materials');
    }
}

