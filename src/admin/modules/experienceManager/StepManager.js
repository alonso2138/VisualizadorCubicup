// StepManager - Handles step navigation and workflow logic
// Extracted from ExperienceManager for better modularity

export class StepManager {
    constructor(renderer, fileUploadManager, modelViewer, materialsManager = null, presetsManager = null) {
        this.currentStep = 1;
        this.renderer = renderer;
        this.fileUploadManager = fileUploadManager;
        this.modelViewer = modelViewer;
        this.materialsManager = materialsManager;
        this.presetsManager = presetsManager;
        this.maxSteps = 4;
    }

    loadStep(step) {
        const stepContent = document.getElementById('stepContent');
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        const finishBtn = document.getElementById('finishStep');

        if (!stepContent || !prevBtn || !nextBtn || !finishBtn) {
            console.error('Some step elements not found!');
            return;
        }

        this.currentStep = step;

        // Update step indicators
        this.renderer.updateStepIndicators(step);

        // Update button visibility
        this.renderer.updateButtonVisibility(step);

        // Make closed the preview and materials modals in preview 
        this.materialsManager.hideMaterialsModal();
        this.presetsManager.borrarUi();

        // Load step content
        switch(step) {
            case 1:
                stepContent.innerHTML = this.renderer.renderStep1();
                this.fileUploadManager.attachFileDropListeners();
                // Disable next button until file is uploaded
                nextBtn.disabled = true;
                break;
                
            case 2:
                stepContent.innerHTML = this.renderer.renderStep2();
                // Add a small delay to ensure DOM is ready and libraries are loaded
                setTimeout(() => {
                    this.initializeModelPreview();
                }, 100);
                break;
                
            case 3:
                stepContent.innerHTML = this.renderer.renderStep3();
                break;
                
            case 4:
                stepContent.innerHTML = this.renderer.renderStep4();
                this.setupStep4();
                break;
        }
    }

    async initializeModelPreview() {
        const container = document.getElementById('threeContainer');
        const filePath = this.fileUploadManager.getUploadedFilePath();
        
        if (!container || !filePath) {
            console.error('Cannot initialize model preview - missing container or file path');
            return;
        }

        const success = await this.modelViewer.initializeModelPreview(container, filePath);
        
        if (success) {
            this.setupModelViewerControls();
            // Setup materials modal if materialsManager is available
            if (this.materialsManager) {
                this.materialsManager.setupMaterialsModal();
            }

            if (this.presetsManager) {
                this.presetsManager.setupPresetsModal();
            }
        }
    }

    setupModelViewerControls() {
        const resetCameraBtn = document.getElementById('resetCameraBtn');
        const reloadModelBtn = document.getElementById('reloadModelBtn');

        if (resetCameraBtn) {
            resetCameraBtn.addEventListener('click', () => {
                this.modelViewer.resetCamera();
            });
        }

        if (reloadModelBtn) {
            reloadModelBtn.addEventListener('click', () => {
                const filePath = this.fileUploadManager.getUploadedFilePath();
                if (filePath) {
                    this.modelViewer.reloadModel(filePath);
                }
            });
        }
    }

    async setupStep4() {
        // Cannot go back no more
        document.getElementById("prevStep").disabled = true;
        
        // Generate and display the experience link
        const linkInput = document.getElementById('generatedExperienceLink');
        // Extract filename from window.filePath or fileUploadManager
        let tempModelPath = null;
        if (window.filePath) {
            tempModelPath = window.filePath.split('/').pop();
        } else {
            tempModelPath = this.fileUploadManager.getUploadedFilePath();
            if (tempModelPath) tempModelPath = tempModelPath.split('/').pop();
        }
        // Extract experienceId (original file name, e.g. "Neutrals")
        let experienceId = 'experience';
        if (tempModelPath) {
            const match = tempModelPath.match(/temp_\d+_(.+)\.glb$/i);
            if (match && match[1]) {
                experienceId = match[1];
            }
        }
        let experienceUrl = `http://localhost:5173/viewer?project=${experienceId}`;
        if (linkInput) linkInput.value = experienceUrl;

        const presets = this.presetsManager ? this.presetsManager.Presets : {};
        const metadata = {
            createdBy: 'user',
            createdAt: new Date().toISOString(),
        };

        try {
            const res = await fetch('/api/projects/create-experience', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ experienceId, presets, metadata, tempModelPath })
            });
            const result = await res.json();
            if (result.success) {
                experienceUrl = `http://localhost:5173/viewer?project=${experienceId}`;
                if (linkInput) linkInput.value = experienceUrl;
            } else {
                if (linkInput) linkInput.value = 'Error creating experience';
            }
        } catch (err) {
            if (linkInput) linkInput.value = 'Server error';
        }
    }

    handleStepNavigation(action) {
        switch(action) {
            case 'next-step':
                if (this.canGoToNextStep()) {
                    this.nextStep();
                }
                break;
                
            case 'prev-step':
                if (this.canGoToPrevStep()) {
                    this.prevStep();
                }
                break;
                
            case 'remove-file':
                this.fileUploadManager.removeSelectedFile();
                this.updateNextButtonState();
                break;
        }
    }

    nextStep() {
        if (this.currentStep < this.maxSteps) {
            this.loadStep(this.currentStep + 1);
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.loadStep(this.currentStep - 1);
        }
    }

    canGoToNextStep() {
        switch(this.currentStep) {
            case 1:
                // Can proceed if file is uploaded
                return this.fileUploadManager.hasUploadedFile();
            case 2:
                // Can proceed if model is loaded
                return this.modelViewer.getLoadedModel() !== null;
            case 3:
                // Can always proceed from step 3
                return true;
            default:
                return false;
        }
    }

    canGoToPrevStep() {
        return this.currentStep > 1;
    }

    updateNextButtonState() {
        const nextBtn = document.getElementById('nextStep');
        if (nextBtn) {
            nextBtn.disabled = !this.canGoToNextStep();
        }
    }

    // File upload event handlers
    onFileUploaded(uploadResult) {
        if (uploadResult.success) {
            this.updateNextButtonState();
            
            // Auto-advance to next step after successful upload
            setTimeout(() => {
                if (this.canGoToNextStep()) {
                    this.nextStep();
                }
            }, 1500);
        }
    }

    onFileRemoved() {
        this.updateNextButtonState();
        
        // Cleanup model viewer if we're on step 2
        if (this.currentStep === 2) {
            this.modelViewer.cleanup();
        }
    }

    // Reset step manager state
    reset() {
        this.currentStep = 1;
        this.fileUploadManager.reset();
        this.modelViewer.cleanup();
        if (this.materialsManager) {
            this.materialsManager.cleanup();
        }
    }

    // Getters
    getCurrentStep() {
        return this.currentStep;
    }

    isFirstStep() {
        return this.currentStep === 1;
    }

    isLastStep() {
        return this.currentStep === this.maxSteps;
    }

    // Utility methods
    generateTempId() {
        return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getStepProgress() {
        return {
            current: this.currentStep,
            total: this.maxSteps,
            percentage: Math.round((this.currentStep / this.maxSteps) * 100)
        };
    }

    // Validation for each step
    validateStep(step) {
        switch(step) {
            case 1:
                return this.fileUploadManager.hasUploadedFile();
            case 2:
                return this.modelViewer.getLoadedModel() !== null;
            case 3:
                return true; // No validation needed for preview step
            case 4:
                return true; // No validation needed for completion step
            default:
                return false;
        }
    }

    // Get step summary for debugging
    getStepSummary() {
        return {
            currentStep: this.currentStep,
            canGoNext: this.canGoToNextStep(),
            canGoPrev: this.canGoToPrevStep(),
            hasFile: this.fileUploadManager.hasUploadedFile(),
            hasModel: this.modelViewer.getLoadedModel() !== null,
            progress: this.getStepProgress()
        };
    }
}
