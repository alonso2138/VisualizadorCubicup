/**
 * Utilidad para cargar modelos 3D en la experiencia
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Resources from '../../Utils/Resources.js';
import Lightning from '../../three/Lightning.js';
import Model from '../../three/Model.js';

export default class ModelLoader {
    /**
     * Crea una instancia del cargador de modelos
     * @param {Object} experience - Instancia de la experiencia principal
     */
    constructor(experience) {
        this.experience = experience;
        this.scene = this.experience.scene;
        this.resources = this.experience.resources;
        
        // Keep track of current model
        this.currentModel = null;
        this.isLoading = false;
    }
    
    /**
     * Carga un modelo en la escena
     * @param {string} modelPath - Ruta del archivo GLB/GLTF
     * @param {Object} options - Opciones de carga
     * @returns {Promise} - Promesa que resuelve cuando el modelo está cargado
     */
    async loadModel(modelPath, options = {}) {
        if (!modelPath) {
            throw new Error('Path to model is required');
        }
        
        // Set loader state
        this.isLoading = true;
        
        // Default options
        const defaultOptions = {
            showLoadingScreen: false,
            loadGroups: false,
            resetScene: true,
            resetGroups: true
        };
        
        // Merge options
        const mergedOptions = { ...defaultOptions, ...options };
        
        // Show loading screen if requested
        if (mergedOptions.showLoadingScreen && this.experience.loadingScreen) {
            this.experience.loadingScreen.show('Cargando modelo...');
        }
        
        try {
            // Clear scene if requested
            if (mergedOptions.resetScene) {
                this.clearCurrentModel();
            }
            
            // Load the model
            console.log(`Loading model from path: ${modelPath}`);
            
            // Create a resource configuration for this model
            const resourceConfig = [{
                name: 'model',
                type: 'gltfModel',
                path: modelPath
            }];
            
            // Load resources if they don't exist yet
            if (!this.resources) {
                // Create new resources if they don't exist
                this.experience.resources = new Resources(resourceConfig, this.experience.renderer);
                this.resources = this.experience.resources;
            } else {
                // Add the model to existing resources
                await this.resources.load(resourceConfig);
            }
            
            // Create model if it doesn't exist
            if (!this.experience.model) {
                this.experience.model = new Model(this.scene, this.resources);
            } else {
                // Update existing model with new resources
                await this.experience.model.updateModel(this.resources.items.model);
            }
            
            // Store current model reference
            this.currentModel = this.experience.model.model;
            
            // Update project data
            if (this.experience.adminInterface) {
                this.experience.adminInterface.projectData.modelPath = modelPath;
            }
            
            // Load groups if requested and available
            if (mergedOptions.loadGroups && 
                this.experience.adminInterface && 
                this.experience.adminInterface.groupManager &&
                this.experience.adminInterface.projectData.groups) {
                
                // Wait for the model to be fully loaded before restoring groups
                await new Promise(resolve => {
                    if (this.experience.model.isLoaded) {
                        resolve();
                    } else {
                        this.experience.model.once('loaded', () => resolve());
                    }
                });
                
                // Restore groups from project data
                if (!mergedOptions.resetGroups) {
                    this.experience.adminInterface.groupManager.restoreGroups(
                        this.experience.adminInterface.projectData.groups,
                        this.currentModel
                    );
                }
            }
                        
            // Reset loading state
            this.isLoading = false;
            
            // Return the loaded model
            return this.currentModel;
            
        } catch (error) {
            console.error('Error loading model:', error);
            
            // Hide loading screen if it was shown
            if (mergedOptions.showLoadingScreen && this.experience.loadingScreen) {
                this.experience.loadingScreen.hide();
            }
            
            // Reset loading state
            this.isLoading = false;
            
            // Re-throw the error
            throw error;
        }
    }
    
    /**
     * Clears the current model from the scene
     */
    clearCurrentModel() {
        if (this.currentModel) {
            // Remove from scene
            this.scene.remove(this.currentModel);
            
            // Dispose geometries and materials
            this.currentModel.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    
                    if (child.material) {
                        // If material is an array, dispose each
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => {
                                disposeMaterial(material);
                            });
                        } else {
                            disposeMaterial(child.material);
                        }
                    }
                }
            });
            
            // Helper function to dispose material and its textures
            function disposeMaterial(material) {
                // Dispose textures
                for (const key in material) {
                    if (material[key] && material[key].isTexture) {
                        material[key].dispose();
                    }
                }
                
                // Dispose material
                material.dispose();
            }
            
            // Reset reference
            this.currentModel = null;
        }
    }
    
    /**
     * Check if a model is currently loaded
     * @returns {boolean} - True if a model is loaded
     */
    hasLoadedModel() {
        return !!this.currentModel && !this.isLoading;
    }
    
    /**
     * Get the current model
     * @returns {Object|null} - The current model or null if none is loaded
     */
    getCurrentModel() {
        return this.currentModel;
    }
}