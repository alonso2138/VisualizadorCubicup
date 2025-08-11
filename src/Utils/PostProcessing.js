import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export default class PostProcessing {
    constructor(renderer, scene, camera, config = {}) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // Configuration with defaults
        this.config = {
            ...config  // Merge with provided config
        };
        
        // Hover state tracking
        this.hoveredObject = null;
        
        // Model interaction activated
        this.enabled = true;

        // Selection state tracking
        this.selectedObjects = [];
        this.originalMaterials = new Map(); // Store original materials of selected objects
        
        // Create the selection material (green)
        this.selectionMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,  // Bright green for selection
            side: THREE.DoubleSide
        });
        
        // Create raycaster for object interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(-1, -1);
        
        // Add history tracking for undo functionality
        this.actionHistory = [];
        
        // Setup composer and passes
        this.setup();
        
        // Setup mouse event listeners for hover only
        window.addEventListener('mousemove', (event) => this.onMouseMove(event));
        
        // Setup keyboard listeners
        window.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    getActualMesh(){
        // Corremos el raycaster
        this.update(window.experience.model.model);
        // Devolvemos el mesh más cercano que detecte el rayo
        return this.currentIntersects[0];
    }
    
    setup() {
        // Create composer with same size as renderer
        this.composer = new EffectComposer(this.renderer.instance);
        
        // Add render pass - this renders the scene to a target
        const renderPass = new RenderPass(this.scene, this.camera.instance);
        this.composer.addPass(renderPass);
        
        // Add outline pass for hover effect only if enabled in config
        this.outlinePass = new OutlinePass(
            new THREE.Vector2(window.innerWidth, window.innerHeight), 
            this.scene, 
            this.camera.instance
        );
        
        // Configure outline appearance
        this.outlinePass.edgeStrength = 3.0;      // Strength of the outline
        this.outlinePass.edgeGlow = 0.0;          // Glow of the outline
        this.outlinePass.edgeThickness = 1.0;     // Thickness of the outline
        this.outlinePass.pulsePeriod = 0;         // Pulse effect (0 = no pulse)
        this.outlinePass.visibleEdgeColor.set(this.config.outlineColor);  // Use configured color
        this.outlinePass.hiddenEdgeColor.set('#190a05');   // Dark red for hidden parts
        
        if (this.config.useOutline) this.setOutlineVisibility(true);

        
        const saturationPass = new ShaderPass(ColorCorrectionShader);
        saturationPass.uniforms['powRGB'].value.set(2.3, 2.3, 2.3); // más saturación
        saturationPass.uniforms['mulRGB'].value.set(1, 1, 1); // más intensidad
        //saturationPass.uniforms['powRGB'].value.set(3.3, 3.3, 3.3); // más saturación
        //saturationPass.uniforms['mulRGB'].value.set(1, 1, 1); // más intensidad
        this.composer.addPass(saturationPass);

        const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.2,  // strength → prueba entre 0.1 y 0.4
            0.9,  // radius
            0.45  // threshold → qué tan brillante debe ser para hacer bloom
        );
            this.composer.addPass(bloomPass);

        // Add output pass to handle tone mapping
        const outputPass = new OutputPass();
        outputPass.toneMappingExposure = this.renderer.instance.toneMappingExposure;
        outputPass.toneMapping = this.renderer.instance.toneMapping;
        this.composer.addPass(outputPass);

        /*
        this.gui=window.experience.lighting.gui;

        const satFolder = this.gui.addFolder('Saturación');

        const params = {
            saturacion: saturationPass.uniforms['powRGB'].value.x,
            intensidad: saturationPass.uniforms['mulRGB'].value.x
        };

        satFolder.add(params, 'saturacion', 0, 5).name('Saturación').onChange((value) => {
            saturationPass.uniforms['powRGB'].value.set(value, value, value);
        });
        satFolder.add(params, 'intensidad', 0, 2).name('Intensidad').onChange((value) => {
            saturationPass.uniforms['mulRGB'].value.set(value, value, value);
        });

        satFolder.close();

        // Bloom como antes
        const bloomFolder = this.gui.addFolder('Bloom');
        bloomFolder.add(bloomPass, 'strength', 0, 1).name('Intensidad');
        bloomFolder.add(bloomPass, 'radius', 0, 2).name('Radio');
        bloomFolder.add(bloomPass, 'threshold', 0, 1).name('Umbral');

        bloomFolder.close();*/
    }

    setOutlineVisibility(visibility){
        if(visibility) this.composer.addPass(this.outlinePass);   
        else           this.composer.removePass(this.outlinePass);
    }
    
    onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    onKeyDown(event) {
        // Skip if not enabled
        if (!this.enabled) return;
        
        // Key 1: Select currently hovered object
        if (event.key === '1') {
            // Only proceed if we have a hovered object
            if (this.hoveredObject && !this.selectedObjects.includes(this.hoveredObject)) {
                this.selectObject(this.hoveredObject);
            }
        }
        // Key 2: Deselect all objects
        else if (event.key === '2') {
            this.deselectAll();
        }
        // Ctrl+Z: Undo
        else if (event.ctrlKey && event.key === 'z') {
            this.undo();
            event.preventDefault(); // Prevent browser's default undo
        }
    }
    
    undo() {
        // Check if we have actions to undo
        if (this.actionHistory.length === 0) return;
        
        // Get the last action
        const lastAction = this.actionHistory.pop();
        
        // Process based on action type
        if (lastAction.type === 'select') {
            // Undo a selection - deselect without recording history
            this.deselectObjectWithoutHistory(lastAction.object);
        } else if (lastAction.type === 'deselect') {
            // Undo a deselection - reselect without recording history
            this.selectObjectWithoutHistory(lastAction.object, lastAction.material);
        } else if (lastAction.type === 'deselectAll') {
            // Undo a deselect all - restore all objects
            lastAction.objects.forEach(obj => {
                this.selectObjectWithoutHistory(obj.object, obj.material);
            });
        }
    }
    
    selectObject(object) {
        // Store original material if not already selected
        if (!this.originalMaterials.has(object.uuid)) {
            const originalMaterial = object.material;
            this.originalMaterials.set(object.uuid, originalMaterial);
            
            // Record this action in history
            this.actionHistory.push({
                type: 'select',
                object: object,
                material: originalMaterial
            });
        }
        
        // Apply selection material
        object.material = this.selectionMaterial;
        
        // Add to selected objects array
        this.selectedObjects.push(object);

        let message;

        this.selectedObjects.forEach((key, index) =>{
            message += 
            `\n {\n "uuid": "${key.uuid}", \n "name": "${key.name}" \n},`;

            if(index==this.selectedObjects.length-1) message = message.substring(0, message.length - 1);
        });

        console.log(message)
        message="";
    }
    
    selectObjectWithoutHistory(object, material) {
        // Restore the saved material reference
        this.originalMaterials.set(object.uuid, material);
        
        // Apply selection material
        object.material = this.selectionMaterial;
        
        // Add to selected objects array
        this.selectedObjects.push(object);
    }
    
    deselectObject(object) {
        // Find object in selected array
        const index = this.selectedObjects.indexOf(object);
        
        if (index !== -1) {
            // Get the original material before removing
            const originalMaterial = this.originalMaterials.get(object.uuid);
            
            // Record this action in history
            this.actionHistory.push({
                type: 'deselect',
                object: object,
                material: originalMaterial
            });
            
            // Remove from selected array
            this.selectedObjects.splice(index, 1);
            
            // Restore original material
            if (this.originalMaterials.has(object.uuid)) {
                object.material = originalMaterial;
                this.originalMaterials.delete(object.uuid);
            }
        }
    }
    
    deselectObjectWithoutHistory(object) {
        // Find object in selected array
        const index = this.selectedObjects.indexOf(object);
        
        if (index !== -1) {
            // Remove from selected array
            this.selectedObjects.splice(index, 1);
            
            // Restore original material
            if (this.originalMaterials.has(object.uuid)) {
                object.material = this.originalMaterials.get(object.uuid);
                this.originalMaterials.delete(object.uuid);
            }
        }
    }
    
    deselectAll() {
        // Store information for undo
        const deselectedObjects = this.selectedObjects.map(obj => {
            return {
                object: obj,
                material: this.originalMaterials.get(obj.uuid)
            };
        });
        
        // Record this action in history if we have selected objects
        if (deselectedObjects.length > 0) {
            this.actionHistory.push({
                type: 'deselectAll',
                objects: deselectedObjects
            });
        }
        
        // Restore all materials and clear selection
        while (this.selectedObjects.length > 0) {
            const object = this.selectedObjects[0];
            this.deselectObjectWithoutHistory(object);
        }
    }
    
    /**
     * Synchronizes materials when selection is modified externally
     * @param {Array} newSelectedObjects - New array of selected objects (optional)
     */
    syncMaterials(newSelectedObjects = null) {
        // If new selection array is provided, replace the current one
        if (newSelectedObjects !== null) {
            // Store old selection for comparison
            const oldSelection = [...this.selectedObjects];
            
            // Replace selection array
            this.selectedObjects = newSelectedObjects;
            
            // Find objects that were in old selection but not in new (need restoration)
            oldSelection.forEach(oldObj => {
                if (!this.selectedObjects.includes(oldObj)) {
                    // Restore original material
                    if (this.originalMaterials.has(oldObj.uuid)) {
                        oldObj.material = this.originalMaterials.get(oldObj.uuid);
                        this.originalMaterials.delete(oldObj.uuid);
                    }
                }
            });
            
            // Find objects that are newly selected (need selection material)
            this.selectedObjects.forEach(newObj => {
                if (!oldSelection.includes(newObj) && !this.originalMaterials.has(newObj.uuid)) {
                    // Store original material
                    this.originalMaterials.set(newObj.uuid, newObj.material);
                    // Apply selection material
                    newObj.material = this.selectionMaterial;
                }
            });
            
            return;
        }
        
        // If no new array is provided, just sync existing selection
        // This handles cases where materials might be out of sync
        this.selectedObjects.forEach(obj => {
            if (obj.material !== this.selectionMaterial) {
                // Store original material if not already stored
                if (!this.originalMaterials.has(obj.uuid)) {
                    this.originalMaterials.set(obj.uuid, obj.material);
                }
                // Apply selection material
                obj.material = this.selectionMaterial;
            }
        });
    }
    
    update(model) {
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera.instance);

        // Find intercepted objects - only check model children if model exists
        let intersects = [];
        if (model && model.model) {
            const meshes = [];
            model.model.traverse((child) => {
                if (child.isMesh) {
                    meshes.push(child);
                }
            });

            intersects = this.raycaster.intersectObjects(meshes, true);
        }

        // Store intersects for potential use
        this.currentIntersects = intersects;

        // Update hover state
        if (intersects.length > 0) {
            this.hoveredObject = intersects[0].object;
        } else {
            this.hoveredObject = null;
        }
    }
    
    render() {
        // Render using composer
        this.composer.render();
    }
    
    resize() {
        if (this.composer) {
            this.composer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    dispose() {
        // Restore original materials for selected objects
        this.deselectAll();
        
        // Remove event listeners
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('keydown', this.onKeyDown);
        
        // Dispose materials
        if (this.selectionMaterial) {
            this.selectionMaterial.dispose();
        }
        
        // Dispose composer and passes
        if (this.composer) {
            this.composer.dispose();
        }
    }

    resetSelectionMaterials() {
        // Clear any highlight materials that might be applied
        if (this.selectedObjects.length > 0) {
            this.selectedObjects.forEach(object => {
                // If we stored the original material, restore it
                if (object._originalMaterial) {
                    object.material = object._originalMaterial;
                    delete object._originalMaterial;
                }
                
                // If we added any selection-specific properties, remove them
                if (object._isSelected) {
                    delete object._isSelected;
                }
            });
        }
        
        // Clear any temporary materials that might be in memory
        if (this.highlightMaterial) {
            this.highlightMaterial.dispose();
        }
        
        // Reset selection arrays
        this.hoveredObject = null;
        this.selectedObjects = [];
    }
}