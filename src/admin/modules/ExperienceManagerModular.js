// ExperienceManager - Modular version
// Main coordinator for experience creation and management
// Refactored from monolithic 2699-line file into modular components

import { AdminConfig } from '../config.js';
import { UIComponents } from './UIComponents.js';
import { ModelViewer } from './experienceManager/ModelViewer.js';
import { FileUploadManager } from './experienceManager/FileUploadManager.js';
import { ExperienceRenderer } from './experienceManager/ExperienceRenderer.js';
import { ApiService } from './experienceManager/ApiService.js';
import { StepManager } from './experienceManager/StepManager.js';
import { MaterialsManager } from './experienceManager/MaterialsManager.js';
import { PresetsManager } from './PresetsManager.js';

export class ExperienceManager {
    constructor(adminInterface) {
        if (!adminInterface) {
            throw new Error('AdminInterface is required for ExperienceManager');
        }
        
        this.adminInterface = adminInterface;
        this.experiences = [];
        
        // Initialize modular components
        this.initializeModules();
    }

    initializeModules() {
        // Core modules
        this.modelViewer = new ModelViewer();
        this.fileUploadManager = new FileUploadManager();
        this.renderer = new ExperienceRenderer();
        this.apiService = new ApiService();
        this.materialsManager = new MaterialsManager();
        this.presetsManager = new PresetsManager();
        
        // Step manager coordinates the workflow
        this.stepManager = new StepManager(
            this.renderer,
            this.fileUploadManager,
            this.modelViewer,
            this.materialsManager,
            this.presetsManager
        );

        // Setup event listeners between modules
        this.setupModuleEventListeners();
        
        // Make materialsManager globally available for material actions
        window.materialsManager = this.materialsManager;
    }

    setupModuleEventListeners() {
        // Listen for file upload events
        const originalUploadFile = this.fileUploadManager.uploadFile.bind(this.fileUploadManager);
        this.fileUploadManager.uploadFile = async (file) => {
            const result = await originalUploadFile(file);
            this.stepManager.onFileUploaded(result);
            return result;
        };

        // Listen for file removal events
        const originalRemoveFile = this.fileUploadManager.removeSelectedFile.bind(this.fileUploadManager);
        this.fileUploadManager.removeSelectedFile = () => {
            originalRemoveFile();
            this.stepManager.onFileRemoved();
        };
    }

    // =====================================================
    // Experience Management (Main Interface)
    // =====================================================

    async loadExperiences() {
        try {
            this.experiences = await this.apiService.loadExperiences();
            this.renderExperiences();
        } catch (error) {
            console.error('Error loading experiences:', error);
            this.experiences = [];
            this.renderExperiences();
        }
    }

    renderExperiences() {
        const grid = document.getElementById('experiencesGrid');
        if (!grid) {
            console.error('experiencesGrid element not found');
            return;
        }
        
        grid.innerHTML = this.renderer.renderExperiencesList(this.experiences);
    }


    async showEditExperienceModal(experienceId) {
        const experience = this.experiences.find(exp => exp.id === experienceId);   
        if (!experience) {
            console.error('Experience not found:', experienceId);
            return;
        }

        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');
        if (!modal || !content) {
            console.error('Modal elements not found');
            return;
        }

        try {
            // Get detailed experience data
            const experienceDetails = await this.apiService.getExperienceDetails(experienceId);
            
            // Reset modules for editing experience
            this.resetModules();
            
            // Show modal with edit content
            content.innerHTML = this.renderer.renderEditExperienceModal(experienceDetails);
            modal.style.display = 'flex';
            modal.classList.add('active');
            
            // Load first step with existing data
            this.stepManager.loadStep(1, experienceDetails);
            
            // Setup modal event listeners for edit mode
            this.setupEditModalEventListeners(experienceDetails);
        } catch (error) {
            console.error('Error loading experience for editing:', error);
            this.adminInterface.showNotification('Error al cargar la experiencia para edición', 'error');
        }
    }       

    showExperienceDetails(experienceId) {
        const experience = this.experiences.find(exp => exp.id === experienceId);
        if (!experience) {
            console.error('Experience not found:', experienceId);
            return;
        }

        const container = document.getElementById('contentContainer');
        if (!container) return;

        container.innerHTML = this.renderer.renderExperienceDetails(experience);
    }

    async deleteExperience(id) {
        try {
            await this.apiService.deleteExperience(id);
            this.experiences = this.experiences.filter(exp => exp.id !== id);
            this.renderExperiences();
            this.adminInterface.showNotification('Experiencia eliminada correctamente', 'success');
        } catch (error) {
            console.error('Error deleting experience:', error);
            this.adminInterface.showNotification('Error al eliminar la experiencia', 'error');
        }
    }

    // =====================================================
    // Experience Creation Modal
    // =====================================================

    showCreateExperienceModal() {
        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');
        
        if (!modal || !content) {
            console.error('Modal elements not found');
            return;
        }

        // Reset modules for new experience
        this.resetModules();

        // Show modal with initial content
        content.innerHTML = this.renderer.renderCreateExperienceModal();
        modal.style.display = 'flex';
        modal.classList.add('active');

        // Load first step
        this.stepManager.loadStep(1);

        // Setup modal event listeners
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        // Step navigation buttons
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        const finishBtn = document.getElementById('finishStep');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.stepManager.handleStepNavigation('prev-step');
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.stepManager.handleStepNavigation('next-step');
            });
        }

        if (finishBtn) {
            finishBtn.addEventListener('click', () => {
                this.adminInterface.UIComponents.closeModal();
            });
        }
    }

    // =====================================================
    // Step Navigation (Delegated to StepManager)
    // =====================================================

    handleStepNavigation(action, element) {
        // Delegate to step manager
        this.stepManager.handleStepNavigation(action);
    }

    // =====================================================
    // Experience Creation Workflow
    // =====================================================

    async finishExperience() {
        try {
            // Collect experience data
            const experienceData = this.collectExperienceData();
            
            // Create experience via API
            const result = await this.apiService.createExperience(experienceData);
            
            if (result.success) {
                // Update final step with actual link
                this.updateFinalStepLink(result.experienceId);
                
                // Refresh experiences list
                await this.loadExperiences();
                
                // Show success notification
                this.adminInterface.showNotification('Experiencia creada correctamente', 'success');
            } else {
                throw new Error(result.message || 'Error creating experience');
            }
        } catch (error) {
            console.error('Error finishing experience:', error);
            this.adminInterface.showNotification('Error al crear la experiencia', 'error');
        }
    }

    collectExperienceData() {
        const object =  {
            name: `Experience_${Date.now()}`,
            model: this.fileUploadManager.getUploadedFilePath(),
            file: this.fileUploadManager.getSelectedFile()?.name,
            date: new Date().toISOString(),
            step: this.stepManager.getCurrentStep()
        };

        console.log(object)
        return object;
    }

    updateFinalStepLink(experienceId) {
        const linkInput = document.getElementById('generatedExperienceLink');
        if (linkInput && experienceId) {
            const experienceUrl = `http://localhost:5173/viewer?project=${experienceId}`;
            linkInput.value = experienceUrl;
        }
    }

    // =====================================================
    // Utility Methods
    // =====================================================

    copyLink(linkType, element) {
        let inputId = '';
        
        switch(linkType) {
            case 'copy-link':
                inputId = 'experienceLink';
                break;
            case 'copy-generated-link':
                inputId = 'generatedExperienceLink';
                break;
        }

        const input = document.getElementById(inputId);
        if (input) {
            input.select();
            document.execCommand('copy');
            this.adminInterface.showNotification('Enlace copiado al portapapeles', 'success');
        }
    }

    resetModules() {
        this.stepManager.reset();
        // Other modules are reset through stepManager
    }

    // =====================================================
    // Cleanup and Lifecycle
    // =====================================================

    cleanup() {
        this.modelViewer.cleanup();
        this.fileUploadManager.reset();
        this.stepManager.reset();
        if (this.materialsManager) {
            this.materialsManager.cleanup();
        }
        
        // Clean up global reference
        if (window.materialsManager === this.materialsManager) {
            delete window.materialsManager;
        }
    }

    // =====================================================
    // Legacy Methods (for backward compatibility)
    // =====================================================

    // These methods maintain compatibility with existing code
    // They delegate to the appropriate modular components

    initializeModelPreview() {
        // Delegate to step manager
        return this.stepManager.initializeModelPreview();
    }

    setupPreviewControls() {
        // Delegate to step manager
        this.stepManager.setupModelViewerControls();
    }

    cleanupThreeJS() {
        // Delegate to model viewer
        this.modelViewer.cleanup();
    }

    // =====================================================
    // Debug and Development Methods
    // =====================================================

    getModuleStatus() {
        return {
            stepManager: this.stepManager.getStepSummary(),
            fileUpload: {
                hasFile: this.fileUploadManager.hasUploadedFile(),
                filePath: this.fileUploadManager.getUploadedFilePath()
            },
            modelViewer: {
                hasModel: !!this.modelViewer.getLoadedModel(),
                modelInfo: this.modelViewer.getModelInfo()
            },
            experiences: {
                count: this.experiences.length,
                loaded: !!this.experiences
            }
        };
    }

    // PBR Preview compatibility method for MaterialUploader integration
    async showPBRPreview(materialId, materialData = null) {        
        // Use the advanced PBR preview modal from MaterialsManager
        if (this.materialsManager && this.materialsManager.pbrPreviewModal) {
            try {
                await this.materialsManager.pbrPreviewModal.show(materialId, materialData);
            } catch (error) {
                console.error('Error showing PBR preview:', error);
                
                // Fallback to simple preview
                if (this.materialsManager.createMaterialPreviewModal) {
                    this.materialsManager.createMaterialPreviewModal(materialId, materialData);
                } else {
                    if (this.adminInterface && this.adminInterface.showNotification) {
                        this.adminInterface.showNotification(
                            'Error al cargar vista previa avanzada. Sistema no disponible.', 
                            'error'
                        );
                    }
                }
            }
        } else {
            // Fallback notification
            if (this.adminInterface && this.adminInterface.showNotification) {
                this.adminInterface.showNotification(
                    'Vista previa de material disponible desde el modal de materiales.', 
                    'info'
                );
            }
        }
    }

    setupEditModalEventListeners(experience) {
        // Step navigation buttons
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        const finishBtn = document.getElementById('finishStep');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.stepManager.handleStepNavigation('prev-step');
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.stepManager.handleStepNavigation('next-step');
            });
        }

        if (finishBtn) {
            finishBtn.addEventListener('click', async () => {
                await this.updateExperience(experience);
            });
        }
    }

    async updateExperience(experience) {
        try {
            // Collect updated experience data
            const updateData = this.collectUpdateExperienceData(experience);
            
            // Update experience via API
            const result = await this.apiService.updateExperience(experience.id, updateData);
            
            if (result.success) {
                // Move to final step
                this.stepManager.loadStep(4, experience);
                
                // Refresh experiences list
                await this.loadExperiences();
                
                // Show success notification
                this.adminInterface.showNotification('Experiencia actualizada correctamente', 'success');
            } else {
                throw new Error(result.message || 'Error updating experience');
            }
        } catch (error) {
            console.error('Error updating experience:', error);
            this.adminInterface.showNotification('Error al actualizar la experiencia', 'error');
        }
    }

    collectUpdateExperienceData(experience) {
        const baseData = {
            id: experience.id,
            name: experience.name,
            date: new Date().toISOString(), // Update modification date
            step: this.stepManager.getCurrentStep()
        };

        // If model was replaced, include new model data
        if (this.stepManager.hasModelBeenReplaced()) {
            baseData.model = this.fileUploadManager.getUploadedFilePath();
            baseData.file = this.fileUploadManager.getSelectedFile()?.name;
        }

        // Include presets if available
        if (this.presetsManager && this.presetsManager.Presets) {
            baseData.presets = this.presetsManager.Presets;
        }

        // Include materials configuration if available
        if (this.materialsManager) {
            // TODO: Get materials configuration from materialsManager
            // baseData.materials = this.materialsManager.getCurrentMaterials();
        }

        console.log('Update data collected:', baseData);
        return baseData;
    }
}
