import * as THREE from 'three';

export default class MaterialToggler {
    constructor(adminInterface) {
        this.adminInterface = adminInterface;
        this.experience = adminInterface.experience;
        this.postProcessing = adminInterface.postProcessing;
        
        // Estado para seguimiento de materiales
        this.materialsSimplified = false;
        this.originalSceneMaterials = new Map();
        
        // Crear materiales simplificados para visualización
        this.createSimpleMaterials();
    }
    
    createSimpleMaterials() {
        // Create the simpleMaterials object with different variants
        this.simpleMaterials = {
            default: new THREE.MeshNormalMaterial({ 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.9,
                flatShading: false
            })
        };
        
        // Create wireframe variants
        this.wireframeVariants = {
            default: new THREE.MeshNormalMaterial({
                wireframe: true,
                transparent: true,
                opacity: 0.5,
            }),
            standard: new THREE.MeshNormalMaterial({
                wireframe: false,
                transparent: true,
                opacity: 0.9,
            })
        };
    }
    
    mount(container) {
        // Crear contenedor
        this.container = document.createElement('div');
        this.container.style.marginTop = '15px';
        container.appendChild(this.container);
        
        // Main toggle button
        this.toggleButton = document.createElement('button');
        this.toggleButton.textContent = 'Ver normales';
        this.toggleButton.style.padding = '8px 12px';
        this.toggleButton.style.backgroundColor = '#9C27B0';
        this.toggleButton.style.color = 'white';
        this.toggleButton.style.border = 'none';
        this.toggleButton.style.borderRadius = '4px';
        this.toggleButton.style.cursor = 'pointer';
        this.toggleButton.style.width = '100%';
        this.container.appendChild(this.toggleButton);
        
        // Options container
        const optionsContainer = document.createElement('div');
        optionsContainer.style.display = 'flex';
        optionsContainer.style.justifyContent = 'space-between';
        optionsContainer.style.marginTop = '5px';
        this.container.appendChild(optionsContainer);
        
        // Wireframe toggle
        const wireframeBtn = document.createElement('button');
        wireframeBtn.textContent = 'Wireframe';
        wireframeBtn.style.padding = '4px 8px';
        wireframeBtn.style.backgroundColor = '#555';
        wireframeBtn.style.color = 'white';
        wireframeBtn.style.border = 'none';
        wireframeBtn.style.borderRadius = '2px';
        wireframeBtn.style.fontSize = '11px';
        wireframeBtn.style.cursor = 'pointer';
        wireframeBtn.style.flex = '1';
        wireframeBtn.style.margin = '0 2px';
        optionsContainer.appendChild(wireframeBtn);
        
        // Flat shading toggle
        const flatBtn = document.createElement('button');
        flatBtn.textContent = 'Flat';
        flatBtn.style.padding = '4px 8px';
        flatBtn.style.backgroundColor = '#555';
        flatBtn.style.color = 'white';
        flatBtn.style.border = 'none';
        flatBtn.style.borderRadius = '2px';
        flatBtn.style.fontSize = '11px';
        flatBtn.style.cursor = 'pointer';
        flatBtn.style.flex = '1';
        flatBtn.style.margin = '0 2px';
        optionsContainer.appendChild(flatBtn);
        
        // Configurar eventos
        this.toggleButton.addEventListener('click', () => this.toggleMaterials());
        
        // Track wireframe state
        this.wireframeEnabled = false;
        wireframeBtn.addEventListener('click', () => {
            this.wireframeEnabled = !this.wireframeEnabled;
            wireframeBtn.style.backgroundColor = this.wireframeEnabled ? '#4CAF50' : '#555';
            
            // If materials are simplified, update them
            if (this.materialsSimplified) {
                this.applySimplifiedMaterials();
            }
        });
        
        // Track flat shading state
        this.flatShadingEnabled = false;
        flatBtn.addEventListener('click', () => {
            this.flatShadingEnabled = !this.flatShadingEnabled;
            flatBtn.style.backgroundColor = this.flatShadingEnabled ? '#4CAF50' : '#555';
            
            // If materials are simplified, update them
            if (this.materialsSimplified) {
                this.applySimplifiedMaterials();
            }
        });
        
        // Agregar información de uso
        const infoText = document.createElement('div');
        infoText.textContent = 'Facilita la selección de objetos';
        infoText.style.fontSize = '12px';
        infoText.style.opacity = '0.7';
        infoText.style.textAlign = 'center';
        infoText.style.marginTop = '5px';
        this.container.appendChild(infoText);
    }
    
    toggleMaterials() {
        // Verificar si hay un modelo cargado
        if (!this.experience.model || !this.experience.model.model) {
            console.warn('No hay modelo para cambiar materiales');
            return;
        }
        
        // Cambiar estado
        this.materialsSimplified = !this.materialsSimplified;
        
        // Actualizar texto del botón
        this.toggleButton.textContent = this.materialsSimplified ? 
            'Restaurar materiales' : 'Ver normales';
        
        // Cambiar color del botón para indicar estado
        this.toggleButton.style.backgroundColor = this.materialsSimplified ? 
            '#FF5722' : '#9C27B0';
        
        if (this.materialsSimplified) {
            this.applySimplifiedMaterials();
        } else {
            this.restoreOriginalMaterials();
        }
    }

    applySimplifiedMaterials() {
        // Obtener UUIDs de objetos seleccionados como referencia
        const selectedUUIDs = this.postProcessing.selectedObjects.map(obj => obj.uuid);
        
        this.experience.model.model.traverse((child) => {
            // Saltar objetos seleccionados
            if (child.isMesh && !selectedUUIDs.includes(child.uuid)) {
                // Almacenar material original si no está ya guardado
                if (!this.originalSceneMaterials.has(child.uuid)) {
                    this.originalSceneMaterials.set(child.uuid, child.material);
                }

                // Create a new instance of the material for each mesh
                let baseMaterial = new THREE.MeshNormalMaterial({ 
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.9,
                    flatShading: this.flatShadingEnabled,
                    wireframe: this.wireframeEnabled
                });
                
                // Aplicar el material
                child.material = baseMaterial;
            }
        });
    }

    restoreOriginalMaterials() {
        // Obtener UUIDs de objetos seleccionados
        const selectedUUIDs = this.postProcessing.selectedObjects.map(obj => obj.uuid);
        
        // Restaurar materiales originales
        this.experience.model.model.traverse((child) => {
            // Saltar objetos seleccionados
            if (child.isMesh && !selectedUUIDs.includes(child.uuid)) {
                // Restaurar material original si lo tenemos guardado
                if (this.originalSceneMaterials.has(child.uuid)) {
                    child.material = this.originalSceneMaterials.get(child.uuid);
                }
            }
        });
    }
    
    destroy() {
        // Restaurar materiales originales si están simplificados
        if (this.materialsSimplified) {
            this.restoreOriginalMaterials();
        }
        
        // Liberar materiales simplificados
        if (this.simpleMaterials) {
            Object.values(this.simpleMaterials).forEach(material => {
                if (material && typeof material.dispose === 'function') {
                    material.dispose();
                }
            });
        }
        
        if (this.wireframeVariants) {
            Object.values(this.wireframeVariants).forEach(material => {
                if (material && typeof material.dispose === 'function') {
                    material.dispose();
                }
            });
        }
        
        // Limpiar referencias
        this.originalSceneMaterials.clear();
        
        // Eliminar contenedor
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}