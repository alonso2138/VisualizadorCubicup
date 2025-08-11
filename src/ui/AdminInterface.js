import * as THREE from 'three';
import PostProcessing from '../Utils/PostProcessing.js';
import Lightning from '../three/Lightning.js';
import Model from '../three/Model.js';
import Resources from '../Utils/Resources.js';
import MaterialToggler from './components/MaterialToggler.js';
import ModelUploader from './components/ModelUploader.js';
import GroupManager from './components/GroupManager.js';
import ProjectManager from './components/ProjectManager.js';
import CeilingSetup from './components/CeilingSetup.js';

export default class AdminInterface {
    constructor(experience) {
        this.experience = experience;
        
        // Project data to be passed between steps
        this.projectData = {
            modelPath: null,
            groups: [],
            ceilingHeight: null,
            name: 'Nuevo Proyecto'
        };
        
        // Step definitions
        this.steps = [
            { id: 'upload', title: 'Subir Modelo', description: 'Selecciona y sube un modelo 3D' },
            { id: 'groups', title: 'Crear Grupos', description: 'Crea grupos de objetos para personalización' },
            { id: 'ceiling', title: 'Configurar Techo', description: 'Ajusta la altura del techo para simular iluminación' },
            { id: 'confirm', title: 'Confirmar', description: 'Revisa y confirma la creación del proyecto' }
        ];
        
        // Current step index
        this.currentStepIndex = 0;
        
        // Component instances (initialized when needed)
        this.uploader = null;
        this.groupManager = null;
        this.ceilingSetup = null;
        this.projectManager = null;
        
        // Inicializar en modo admin
        if (window.location.pathname.includes('/admin')) {
            this.init();
        }
    }
    
    init() {
        // Crear contenedor principal
        //this.createMainContainer();
        
        // Start with the first step
        this.renderStep(this.currentStepIndex);
    }
    
    createMainContainer() {
        // Main container
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '10px';
        this.container.style.right = '10px';
        this.container.style.width = '350px';
        this.container.style.backgroundColor = 'rgba(33, 33, 33, 0.9)';
        this.container.style.color = 'white';
        this.container.style.borderRadius = '8px';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.zIndex = '1000';
        this.container.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.overflow = 'hidden';
        
        document.body.appendChild(this.container);
        
        // Panel header
        const header = document.createElement('div');
        header.style.padding = '15px';
        header.style.backgroundColor = '#1e88e5';
        header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        this.container.appendChild(header);
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'Creación de Proyecto';
        title.style.margin = '0';
        title.style.fontSize = '18px';
        title.style.fontWeight = 'bold';
        header.appendChild(title);
        
        // Step indicator container
        this.stepsContainer = document.createElement('div');
        this.stepsContainer.style.display = 'flex';
        this.stepsContainer.style.justifyContent = 'space-between';
        this.stepsContainer.style.padding = '10px 15px';
        this.stepsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        this.container.appendChild(this.stepsContainer);
        
        // Create step indicators
        this.renderStepIndicators();
        
        // Content container for the current step
        this.contentContainer = document.createElement('div');
        this.contentContainer.style.padding = '20px';
        this.contentContainer.style.flexGrow = '1';
        this.contentContainer.style.overflowY = 'auto';
        this.contentContainer.style.maxHeight = 'calc(70vh - 140px)';
        this.container.appendChild(this.contentContainer);
        
        // Navigation container
        this.navigationContainer = document.createElement('div');
        this.navigationContainer.style.display = 'flex';
        this.navigationContainer.style.justifyContent = 'space-between';
        this.navigationContainer.style.padding = '15px 20px';
        this.navigationContainer.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
        this.container.appendChild(this.navigationContainer);
        
        // Back button
        this.backButton = document.createElement('button');
        this.backButton.textContent = '« Atrás';
        this.backButton.style.padding = '8px 16px';
        this.backButton.style.backgroundColor = '#555';
        this.backButton.style.color = 'white';
        this.backButton.style.border = 'none';
        this.backButton.style.borderRadius = '4px';
        this.backButton.style.cursor = 'pointer';
        this.backButton.addEventListener('click', () => this.navigateStep(-1));
        this.navigationContainer.appendChild(this.backButton);
        
        // Continue button
        this.continueButton = document.createElement('button');
        this.continueButton.textContent = 'Continuar »';
        this.continueButton.style.padding = '8px 16px';
        this.continueButton.style.backgroundColor = '#4CAF50';
        this.continueButton.style.color = 'white';
        this.continueButton.style.border = 'none';
        this.continueButton.style.borderRadius = '4px';
        this.continueButton.style.cursor = 'pointer';
        this.continueButton.addEventListener('click', () => this.navigateStep(1));
        this.navigationContainer.appendChild(this.continueButton);
    }
    
    renderStepIndicators() {
        // Clear existing indicators
        this.stepsContainer.innerHTML = '';
        
        // Create indicator for each step
        this.steps.forEach((step, index) => {
            const indicatorContainer = document.createElement('div');
            indicatorContainer.style.display = 'flex';
            indicatorContainer.style.flexDirection = 'column';
            indicatorContainer.style.alignItems = 'center';
            indicatorContainer.style.flex = '1';
            indicatorContainer.style.position = 'relative';
            indicatorContainer.style.cursor = 'pointer';
            indicatorContainer.addEventListener('click', () => this.attemptStepNavigation(index));
            
            // Circle indicator
            const indicator = document.createElement('div');
            indicator.style.width = '30px';
            indicator.style.height = '30px';
            indicator.style.borderRadius = '50%';
            indicator.style.backgroundColor = index === this.currentStepIndex ? '#4CAF50' : 
                                              index < this.currentStepIndex ? '#8bc34a' : '#757575';
            indicator.style.color = 'white';
            indicator.style.display = 'flex';
            indicator.style.justifyContent = 'center';
            indicator.style.alignItems = 'center';
            indicator.style.fontWeight = 'bold';
            indicator.style.zIndex = '1';
            indicator.style.transition = 'background-color 0.3s ease';
            indicator.textContent = (index + 1).toString();
            indicatorContainer.appendChild(indicator);
            
            // Step name
            const stepName = document.createElement('div');
            stepName.textContent = step.title;
            stepName.style.fontSize = '12px';
            stepName.style.marginTop = '5px';
            stepName.style.color = index === this.currentStepIndex ? '#fff' : '#aaa';
            stepName.style.fontWeight = index === this.currentStepIndex ? 'bold' : 'normal';
            indicatorContainer.appendChild(stepName);
            
            // Connecting line (except for last step)
            if (index < this.steps.length - 1) {
                const line = document.createElement('div');
                line.style.position = 'absolute';
                line.style.top = '15px';
                line.style.left = '50%';
                line.style.width = '100%';
                line.style.height = '2px';
                line.style.backgroundColor = index < this.currentStepIndex ? '#8bc34a' : '#757575';
                line.style.zIndex = '0';
                indicatorContainer.appendChild(line);
            }
            
            this.stepsContainer.appendChild(indicatorContainer);
        });
    }
    
    attemptStepNavigation(targetIndex) {
        // Only allow navigation to completed steps or the next step
        if (targetIndex < this.currentStepIndex) {
            this.goToStep(targetIndex);
        } else if (targetIndex === this.currentStepIndex + 1) {
            // Validate current step before allowing next step
            this.validateCurrentStep().then(isValid => {
                if (isValid) {
                    this.goToStep(targetIndex);
                } else {
                    // Visual feedback that validation failed
                    const targetIndicator = this.stepsContainer.children[this.currentStepIndex].querySelector('div');
                    const originalColor = targetIndicator.style.backgroundColor;
                    targetIndicator.style.backgroundColor = '#f44336';
                    
                    setTimeout(() => {
                        targetIndicator.style.backgroundColor = originalColor;
                    }, 300);
                }
            });
        } else {
            // Visual feedback that step is not accessible yet
            const targetIndicator = this.stepsContainer.children[targetIndex].querySelector('div');
            const originalColor = targetIndicator.style.backgroundColor;
            targetIndicator.style.backgroundColor = '#f44336';
            
            setTimeout(() => {
                targetIndicator.style.backgroundColor = originalColor;
            }, 300);
        }
    }
    
    goToStep(stepIndex) {
        if (stepIndex >= 0 && stepIndex < this.steps.length) {
            // Clear any selections in the current step
            this.clearSelections();
            
            this.currentStepIndex = stepIndex;
            this.renderStep(stepIndex);
            this.renderStepIndicators();
        }
    }

    clearSelections() {
        // Clear group manager selections if we're leaving the groups step
        if (this.steps[this.currentStepIndex].id === 'groups' && this.groupManager) {
            this.groupManager.clearSelection();
        }
        
        // Reset outline effect
        if (this.experience.postProcessing && this.experience.postProcessing.outlinePass) {
            this.experience.postProcessing.selectedObjects = [];
        }
    }
    
    async navigateStep(direction) {
        // Validate current step before proceeding
        if (direction > 0) {
            const isValid = await this.validateCurrentStep();
            if (!isValid) return;
        }
        
        const newIndex = this.currentStepIndex + direction;
        if (newIndex >= 0 && newIndex < this.steps.length) {
            this.goToStep(newIndex);
        }
    }
    
    async validateCurrentStep() {
        // Perform validation based on current step
        switch (this.steps[this.currentStepIndex].id) {
            case 'upload':
                if (!this.projectData.modelPath) {
                    this.showNotification('Por favor, selecciona y carga un modelo primero.', 'error');
                    return false;
                }
                return true;
                
            case 'groups':
                if (!this.groupManager || this.groupManager.groups.length === 0) {
                    this.showNotification('Por favor, crea al menos un grupo.', 'error');
                    return false;
                }
                
                // Save groups data
                this.projectData.groups = this.groupManager.groups;
                return true;
                
            case 'ceiling':
                if (this.ceilingSetup && this.ceilingSetup.ceilingMesh) {
                    // Save ceiling height
                    this.projectData.ceilingHeight = this.ceilingSetup.ceilingHeight;
                    return true;
                }
                this.showNotification('Por favor, configura el techo primero.', 'error');
                return false;
                
            case 'confirm':
                // Confirmation step doesn't need validation
                return true;
                
            default:
                return true;
        }
    }
    
    renderStep(stepIndex) {
        // Clear the content container
        this.contentContainer.innerHTML = '';
        
        // Get the current step
        const currentStep = this.steps[stepIndex];
        
        // Add step title and description
        const stepHeader = document.createElement('h3');
        stepHeader.textContent = currentStep.title;
        stepHeader.style.margin = '0 0 5px 0';
        stepHeader.style.fontSize = '16px';
        this.contentContainer.appendChild(stepHeader);
        
        const stepDescription = document.createElement('p');
        stepDescription.textContent = currentStep.description;
        stepDescription.style.margin = '0 0 20px 0';
        stepDescription.style.fontSize = '14px';
        stepDescription.style.color = '#aaa';
        this.contentContainer.appendChild(stepDescription);
        
        // Render the appropriate component for the current step
        switch (currentStep.id) {
            case 'upload':
                this.renderUploadStep();
                break;
                
            case 'groups':
                this.renderGroupsStep();
                break;
                
            case 'ceiling':
                this.renderCeilingStep();
                break;
                
            case 'confirm':
                this.renderConfirmStep();
                break;
        }
        
        // Update navigation buttons
        this.updateNavigationButtons();
    }
    
    updateNavigationButtons() {
        // Hide/show back button based on current step
        this.backButton.style.visibility = this.currentStepIndex === 0 ? 'hidden' : 'visible';
        
        // Update continue button text for the last step
        if (this.currentStepIndex === this.steps.length - 1) {
            this.continueButton.textContent = '';
            this.continueButton.style.backgroundColor = 'rgba(255,255,255,0)';
        } else {
            this.continueButton.textContent = 'Continuar »';
            this.continueButton.style.backgroundColor = '#2196F3';
        }
    }
    
    renderUploadStep() {
        // Initialize model uploader if not already
        if (!this.uploader) {
            this.uploader = new ModelUploader(this);
        }
        
        // Mount to the content container
        this.uploader.mount(this.contentContainer);
        
        // Create project list section
        const projectListSection = document.createElement('div');
        projectListSection.style.marginTop = '30px';
        projectListSection.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
        projectListSection.style.paddingTop = '20px';
        this.contentContainer.appendChild(projectListSection);
        
        // Title for project list
        const projectsTitle = document.createElement('h3');
        projectsTitle.textContent = 'Proyectos existentes';
        projectsTitle.style.margin = '0 0 15px 0';
        projectsTitle.style.fontSize = '16px';
        projectListSection.appendChild(projectsTitle);
        
        // Container for projects
        const projectsContainer = document.createElement('div');
        projectListSection.appendChild(projectsContainer);
        
        // Load projects from server
        this.loadExistingProjects(projectsContainer);
    }
    
    renderGroupsStep() {
        // Initialize group manager if not already
        if (!this.groupManager) {
            this.groupManager = new GroupManager(this);
        }

        // Mount to the content container
        this.groupManager.mount(this.contentContainer);
    }
    
    renderCeilingStep() {
        // Initialize ceiling setup if not already
        if (!this.ceilingSetup) {
            this.ceilingSetup = new CeilingSetup(this);
        }
        
        // Mount to the content container
        this.ceilingSetup.mount(this.contentContainer);
    }
    
    renderConfirmStep() {
        // Hide ceiling shi
        this.ceilingSetup.hideCeiling();
        
        // Initialize project manager if not already
        if (!this.projectManager) {
            this.projectManager = new ProjectManager(this);
        }
        
        // Mount to the content container
        this.projectManager.mount(this.contentContainer);
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.color = 'white';
        notification.style.fontWeight = 'bold';
        notification.style.zIndex = '2000';
        notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
        
        // Set background color based on type
        switch (type) {
            case 'error':
                notification.style.backgroundColor = '#f44336';
                break;
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ff9800';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
        }
        
        // Add to body
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }
    
    // Sets model path and updates project data
    setModelPath(path) {
        this.projectData.modelPath = path;
    }
    
    // Existing method needed for model loading
    async loadGLBModel(modelPath, resetGroups = true) {
        // Reset groups if required
        if (resetGroups && this.groupManager) {
            this.groupManager.clearGroups();
        }

        const resourceConfig = [
            {
                name: "modeloBase",
                type: "gltfModel",
                path: modelPath
            }
        ];

        this.experience.resources = new Resources(resourceConfig);

        return new Promise((resolve, reject) => {
            this.experience.resources.on('ready', () => {
                this.experience.model = new Model(this.experience.scene, this.experience.resources);
                resolve(this.experience.model);
            });

            this.experience.resources.on('error', (error) => {
                reject(error);
            });
        });
    }
    
    async loadProject(project) {
        try {
            this.showNotification(`Cargando proyecto: ${project.name}`, 'info');
            
            // Update project data
            this.projectData = {
                ...project,
                modelPath: project.path
            };
            
            // Load the model
            await this.loadGLBModel(project.path, false);
            
            // Update UI components with project data
            this.updateComponentsFromProjectData();
            
            this.showNotification(`Proyecto cargado: ${project.name}`, 'success');
        } catch (error) {
            console.error('Error loading project:', error);
            this.showNotification(`Error cargando proyecto: ${error.message}`, 'error');
        }
    }

    updateComponentsFromProjectData() {
        // Update project name in uploader if exists
        if (this.uploader && this.uploader.nameInput) {
            this.uploader.nameInput.value = this.projectData.name || '';
        }
        
        // Update groups in group manager if exists
        if (this.groupManager && this.projectData.groups) {
            this.groupManager.restoreGroups(this.projectData.groups, this.experience.model.model);
        }
        
        // Update ceiling height if exists
        if (this.ceilingSetup && this.projectData.ceilingHeight) {
            this.ceilingSetup.updateCeilingHeight(this.projectData.ceilingHeight);
        }
    }
    
    /**
     * Load existing projects and display them in the container
     * @param {HTMLElement} container - Container to render projects
     */
    loadExistingProjects(container) {
        // Initialize ProjectManager if needed
        if (!this.projectManager) {
            this.projectManager = new ProjectManager(this);
        }
        
        // Use the ProjectManager to load and display projects
        this.projectManager.loadProjects(container);
    }
    
    destroy() {
        // Clean up all components
        if (this.uploader) {
            this.uploader.destroy();
        }
        
        if (this.groupManager) {
            this.groupManager.destroy();
        }
        
        if (this.ceilingSetup) {
            this.ceilingSetup.destroy();
        }
        
        if (this.projectManager) {
            this.projectManager.destroy();
        }
        
        // Dispose post-processing
        if(this.experience.postProcessing) {
            this.experience.postProcessing.dispose();
        }
        
        // Remove container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}