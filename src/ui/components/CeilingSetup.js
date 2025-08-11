import * as THREE from 'three';

export default class CeilingSetup {
    constructor(adminInterface) {
        this.adminInterface = adminInterface;
        this.experience = adminInterface.experience;
        this.scene = this.experience.scene;
        
        // Keep track of our ceiling
        this.ceilingMesh = null;
        this.ceilingHeight = 0;
        this.ceilingHelper = null;
        
        // Store autodetect bound for reuse
        this.autodetectCeilingHeight = this.autodetectCeilingHeight.bind(this);
    }
    
    mount(container) {
        // Create container for ceiling setup
        this.container = document.createElement('div');
        this.container.style.marginTop = '15px';
        container.appendChild(this.container);
        
        // Explainer text
        const explainer = document.createElement('div');
        explainer.style.fontSize = '14px';
        explainer.style.marginBottom = '15px';
        explainer.style.color = '#aaa';
        explainer.innerHTML = `
            <p>Los modelos de casas normalmente vienen sin techo para poder ver el interior. 
            Para simular luz natural realista, necesitamos establecer un techo invisible que bloquee la luz.</p>
            <p>Ajusta la altura del techo para que cubra toda la casa pero no sea demasiado alta.</p>
        `;
        this.container.appendChild(explainer);
        
        // Ceiling height input with slider
        this.createHeightControl();
        
        // Auto-detect button
        const autoDetectBtn = document.createElement('button');
        autoDetectBtn.textContent = '📏 Autodetectar Altura';
        autoDetectBtn.style.padding = '10px 12px';
        autoDetectBtn.style.backgroundColor = '#2196F3';
        autoDetectBtn.style.color = 'white';
        autoDetectBtn.style.border = 'none';
        autoDetectBtn.style.borderRadius = '4px';
        autoDetectBtn.style.cursor = 'pointer';
        autoDetectBtn.style.width = '100%';
        autoDetectBtn.style.marginTop = '15px';
        autoDetectBtn.style.marginBottom = '15px';
        autoDetectBtn.style.fontSize = '14px';
        this.container.appendChild(autoDetectBtn);
        
        // Ceiling visibility toggle
        this.createVisibilityToggle();
        
        // Add event listener to autodetect button
        autoDetectBtn.addEventListener('click', this.autodetectCeilingHeight);
        
        // Try to autodetect on initial mount
        setTimeout(this.autodetectCeilingHeight, 500);
    }
    
    createHeightControl() {
        // Height control container
        const heightControl = document.createElement('div');
        heightControl.style.marginBottom = '15px';
        this.container.appendChild(heightControl);
        
        // Label
        const heightLabel = document.createElement('div');
        heightLabel.textContent = 'Altura del techo';
        heightLabel.style.marginBottom = '5px';
        heightLabel.style.display = 'flex';
        heightLabel.style.justifyContent = 'space-between';
        heightLabel.style.alignItems = 'center';
        heightControl.appendChild(heightLabel);
        
        // Value display
        this.heightValue = document.createElement('span');
        this.heightValue.textContent = '0 m';
        this.heightValue.style.fontWeight = 'bold';
        this.heightValue.style.color = '#4CAF50';
        heightLabel.appendChild(this.heightValue);
        
        // Create range input
        this.heightSlider = document.createElement('input');
        this.heightSlider.type = 'range';
        this.heightSlider.min = '0';
        this.heightSlider.max = '10';
        this.heightSlider.step = '0.1';
        this.heightSlider.value = '0';
        this.heightSlider.style.width = '100%';
        this.heightSlider.style.margin = '10px 0';
        heightControl.appendChild(this.heightSlider);
        
        // Add event listener
        this.heightSlider.addEventListener('input', (e) => {
            const height = parseFloat(e.target.value);
            this.updateCeilingHeight(height);
        });
        
        // Add fine-tuning controls
        const fineControlsContainer = document.createElement('div');
        fineControlsContainer.style.display = 'flex';
        fineControlsContainer.style.justifyContent = 'space-between';
        fineControlsContainer.style.gap = '10px';
        heightControl.appendChild(fineControlsContainer);
        
        // Decrease button
        const decreaseBtn = document.createElement('button');
        decreaseBtn.textContent = '− 0.1m';
        decreaseBtn.style.flex = '1';
        decreaseBtn.style.padding = '8px';
        decreaseBtn.style.backgroundColor = '#455A64';
        decreaseBtn.style.color = 'white';
        decreaseBtn.style.border = 'none';
        decreaseBtn.style.borderRadius = '4px';
        decreaseBtn.style.cursor = 'pointer';
        fineControlsContainer.appendChild(decreaseBtn);
        
        // Increase button
        const increaseBtn = document.createElement('button');
        increaseBtn.textContent = '+ 0.1m';
        increaseBtn.style.flex = '1';
        increaseBtn.style.padding = '8px';
        increaseBtn.style.backgroundColor = '#455A64';
        increaseBtn.style.color = 'white';
        increaseBtn.style.border = 'none';
        increaseBtn.style.borderRadius = '4px';
        increaseBtn.style.cursor = 'pointer';
        fineControlsContainer.appendChild(increaseBtn);
        
        // Event listeners for fine control buttons
        decreaseBtn.addEventListener('click', () => {
            const currentValue = parseFloat(this.heightSlider.value);
            const newValue = Math.max(0, currentValue - 0.1);
            this.heightSlider.value = newValue;
            this.updateCeilingHeight(newValue);
        });
        
        increaseBtn.addEventListener('click', () => {
            const currentValue = parseFloat(this.heightSlider.value);
            const newValue = Math.min(10, currentValue + 0.1);
            this.heightSlider.value = newValue;
            this.updateCeilingHeight(newValue);
        });
    }
    
    createVisibilityToggle() {
        // Visibility container
        const visibilityContainer = document.createElement('div');
        visibilityContainer.style.display = 'flex';
        visibilityContainer.style.alignItems = 'center';
        visibilityContainer.style.marginTop = '15px';
        visibilityContainer.style.padding = '10px';
        visibilityContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        visibilityContainer.style.borderRadius = '4px';
        this.container.appendChild(visibilityContainer);
        
        // Checkbox
        this.visibilityToggle = document.createElement('input');
        this.visibilityToggle.type = 'checkbox';
        this.visibilityToggle.id = 'ceiling-visibility';
        this.visibilityToggle.checked = true;
        this.visibilityToggle.style.marginRight = '10px';
        visibilityContainer.appendChild(this.visibilityToggle);
        
        // Label
        const visibilityLabel = document.createElement('label');
        visibilityLabel.htmlFor = 'ceiling-visibility';
        visibilityLabel.textContent = 'Mostrar techo en la escena (solo para ajuste)';
        visibilityLabel.style.fontSize = '14px';
        visibilityLabel.style.cursor = 'pointer';
        visibilityContainer.appendChild(visibilityLabel);
        
        // Add event listener
        this.visibilityToggle.addEventListener('change', (e) => {
            if (this.ceilingMesh) {
                this.ceilingMesh.visible = e.target.checked;
                
                if (this.ceilingHelper) {
                    this.ceilingHelper.visible = e.target.checked;
                }
            }
        });
    }

    hideCeiling(){
        if (this.ceilingMesh) {
            this.ceilingMesh.visible = false;
            
            if (this.ceilingHelper) {
                this.ceilingHelper.visible = false;
            }
        }
    }
    
    autodetectCeilingHeight() {
        if (!this.experience.model || !this.experience.model.model) {
            console.warn('No model loaded to detect ceiling height');
            return;
        }
        
        // Create bounding box of the model
        const bbox = new THREE.Box3().setFromObject(this.experience.model.model);
        
        // Get maximum Y coordinate (height)
        const maxY = bbox.max.y;
        const suggestedHeight = Math.ceil(maxY * 10) / 10; // Round up to nearest 0.1
                
        // Update the UI and create the ceiling
        this.heightSlider.value = suggestedHeight;
        this.updateCeilingHeight(suggestedHeight);
        
        // Show confirmation
        this.adminInterface.showNotification(`Altura del techo autodetectada: ${suggestedHeight}m`, 'info');
    }
    
    updateCeilingHeight(height) {
        // Update height value
        this.ceilingHeight = height;
        
        // Update display
        this.heightValue.textContent = `${height.toFixed(1)} m`;
        
        // Check if we need to create or update the ceiling
        if (!this.ceilingMesh) {
            this.createCeiling(height);
        } else {
            // Update existing ceiling position
            this.ceilingMesh.position.y = height;
            
            // Update helper line if it exists
            if (this.ceilingHelper) {
                this.ceilingHelper.position.y = height / 2;
                this.ceilingHelper.scale.y = height;
            }
        }
    }
    
    createCeiling(height) {
        if (!this.experience.model || !this.experience.model.model) {
            console.warn('No model loaded to create ceiling');
            return;
        }
        
        // Remove existing ceiling if any
        this.removeCeiling();
        
        // Create a bounding box from the model
        const bbox = new THREE.Box3().setFromObject(this.experience.model.model);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());
        
        // Create a plane that covers the entire model footprint and place it at the specified height
        const planeGeometry = new THREE.PlaneGeometry(size.x * 1.5, size.z * 1.5);
        const planeMaterial = new THREE.MeshStandardMaterial({
            color: 0xB0BEC5,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        // Create ceiling mesh and rotate it to be horizontal
        this.ceilingMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        this.ceilingMesh.rotation.x = Math.PI / 2; // Rotate to be horizontal
        this.ceilingMesh.position.set(center.x, height, center.z); // Position above model
        this.ceilingMesh.receiveShadow = true; // Allow shadows on ceiling
        this.ceilingMesh.name = 'ceiling-plane';
        
        // Add to scene
        this.scene.add(this.ceilingMesh);
        
        // Create a helper object to visualize the ceiling height
        this.createHeightHelper(center, height);
    }
    
    createHeightHelper(center, height) {
        // Create a line to show the ceiling height
        const material = new THREE.LineBasicMaterial({ 
            color: 0x4CAF50,
            linewidth: 2
        });
        
        // Create a vertical line from the ground to the ceiling height
        const points = [];
        points.push(new THREE.Vector3(center.x, 0, center.z));
        points.push(new THREE.Vector3(center.x, height, center.z));
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.ceilingHelper = new THREE.Line(geometry, material);
        this.scene.add(this.ceilingHelper);
        
        // Also add a horizontal line at the ceiling level for better visualization
        const horizontalPoints = [];
        const lineLength = 1; // 1 meter horizontal line
        horizontalPoints.push(new THREE.Vector3(center.x - lineLength/2, height, center.z));
        horizontalPoints.push(new THREE.Vector3(center.x + lineLength/2, height, center.z));
        
        const horizontalGeometry = new THREE.BufferGeometry().setFromPoints(horizontalPoints);
        const horizontalLine = new THREE.Line(horizontalGeometry, material);
        this.scene.add(horizontalLine);
        
        // Group them together
        this.ceilingHelper = new THREE.Group();
        this.ceilingHelper.add(new THREE.Line(geometry, material));
        this.ceilingHelper.add(horizontalLine);
        this.scene.add(this.ceilingHelper);
    }
    
    removeCeiling() {
        // Remove ceiling mesh if it exists
        if (this.ceilingMesh) {
            this.scene.remove(this.ceilingMesh);
            this.ceilingMesh.geometry.dispose();
            this.ceilingMesh.material.dispose();
            this.ceilingMesh = null;
        }
        
        // Remove helper if it exists
        if (this.ceilingHelper) {
            this.scene.remove(this.ceilingHelper);
            this.ceilingHelper = null;
        }
    }
    
    destroy() {
        // Remove ceiling mesh when component is destroyed
        this.removeCeiling();
        
        // Clean up event listeners
        if (this.heightSlider) {
            this.heightSlider.removeEventListener('input', this.updateCeilingHeight);
        }
        
        if (this.visibilityToggle) {
            this.visibilityToggle.removeEventListener('change', this.toggleCeilingVisibility);
        }
        
        // Remove the container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
    
    // Returns ceiling data for saving in project
    getCeilingData() {
        return {
            height: this.ceilingHeight,
            visible: false // Always set to false for final project
        };
    }
}