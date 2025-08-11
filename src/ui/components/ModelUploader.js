import ModelLoader from '../utils/ModelLoader.js';
import ProjectManager from './ProjectManager.js';

export default class ModelUploader {
    constructor(adminInterface) {
        this.adminInterface = adminInterface;
        this.experience = adminInterface.experience;
        this.modelLoader = new ModelLoader(this.experience);
        
        // Track the selected file for delayed upload
        this.selectedFile = null;
        this.modelLoaded = false;
        
        // Reference to ProjectManager for project list
        this.projectManager = null;
    }
    
    mount(container) {
        // Crear contenedor
        this.container = document.createElement('div');
        container.appendChild(this.container);
        
        // Project name input section
        this.createProjectNameInput();
        
        // Upload section
        this.setupUpload();
        
        // Check if model is already loaded in workflow
        if (this.adminInterface.projectData.modelPath) {
            this.modelLoaded = true;
            this.updateStatusForLoadedModel(this.adminInterface.projectData.modelPath);
        }
    }
    
    createProjectNameInput() {
        const nameSection = document.createElement('div');
        nameSection.style.marginBottom = '20px';
        this.container.appendChild(nameSection);
        
        // Label
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Nombre del proyecto:';
        nameLabel.style.display = 'block';
        nameLabel.style.marginBottom = '8px';
        nameLabel.style.color = '#e0e0e0';
        nameSection.appendChild(nameLabel);
        
        // Input
        this.nameInput = document.createElement('input');
        this.nameInput.type = 'text';
        this.nameInput.placeholder = 'Introduce un nombre para el proyecto';
        this.nameInput.style.width = '100%';
        this.nameInput.style.padding = '8px';
        this.nameInput.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        this.nameInput.style.borderRadius = '4px';
        this.nameInput.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        this.nameInput.style.color = '#fff';
        this.nameInput.style.boxSizing = 'border-box';
        
        // If we have a name in project data, use it
        if (this.adminInterface.projectData.name) {
            this.nameInput.value = this.adminInterface.projectData.name;
        }
        
        // Update project data when name changes
        this.nameInput.addEventListener('input', () => {
            this.adminInterface.projectData.name = this.nameInput.value;
        });
        
        nameSection.appendChild(this.nameInput);
    }
    
    setupUpload() {
        // Title
        const uploadTitle = document.createElement('h3');
        uploadTitle.textContent = 'Subir modelo 3D';
        uploadTitle.style.fontSize = '16px';
        uploadTitle.style.marginBottom = '15px';
        this.container.appendChild(uploadTitle);
        
        // Drop area for files
        this.dropArea = document.createElement('div');
        this.dropArea.style.border = '2px dashed #aaa';
        this.dropArea.style.borderRadius = '5px';
        this.dropArea.style.padding = '25px';
        this.dropArea.style.textAlign = 'center';
        this.dropArea.style.marginBottom = '15px';
        this.dropArea.style.cursor = 'pointer';
        this.dropArea.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        this.dropArea.style.transition = 'all 0.3s ease';
        
        // Dropzone content
        const dropContent = document.createElement('div');
        
        // Upload icon
        const uploadIcon = document.createElement('div');
        uploadIcon.innerHTML = `
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15V3M12 3L8 7M12 3L16 7" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L2.621 19.485C2.72915 19.9177 2.97882 20.3018 3.33033 20.5763C3.68184 20.8508 4.11501 21.0001 4.561 21H19.439C19.885 21.0001 20.3182 20.8508 20.6697 20.5763C21.0212 20.3018 21.2708 19.9177 21.379 19.485L22 17" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        dropContent.appendChild(uploadIcon);
        
        // Text
        const dropText = document.createElement('div');
        dropText.textContent = 'Arrastra un archivo GLB o GLTF aquí';
        dropText.style.marginTop = '10px';
        dropText.style.color = '#aaa';
        dropContent.appendChild(dropText);
        
        // Sub text
        const dropSubText = document.createElement('div');
        dropSubText.textContent = 'o haz clic para seleccionar un archivo';
        dropSubText.style.fontSize = '12px';
        dropSubText.style.marginTop = '5px';
        dropSubText.style.color = '#888';
        dropContent.appendChild(dropSubText);
        
        // Add content to dropzone
        this.dropArea.appendChild(dropContent);
        
        // Create file input (hidden)
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.glb,.gltf';
        this.fileInput.style.display = 'none';
        
        // Add event listeners
        this.dropArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelected(e));
        
        // Drag and drop listeners
        this.dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropArea.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            this.dropArea.style.borderColor = '#2196F3';
        });
        
        this.dropArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dropArea.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            this.dropArea.style.borderColor = '#aaa';
        });
        
        this.dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropArea.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            this.dropArea.style.borderColor = '#aaa';
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this.fileInput.files = e.dataTransfer.files;
                this.handleFileSelected({ target: this.fileInput });
            }
        });
        
        this.container.appendChild(this.dropArea);
        this.container.appendChild(this.fileInput);
        
        // Status section
        this.statusContainer = document.createElement('div');
        this.statusContainer.style.marginTop = '15px';
        this.statusContainer.style.padding = '10px';
        this.statusContainer.style.borderRadius = '4px';
        this.statusContainer.style.display = 'none';
        this.container.appendChild(this.statusContainer);
    }
    
    
    async handleFileSelected(event) {
        const file = event.target.files[0];

        if (!file) return;

        // Check if it's a GLB/GLTF file
        if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
            this.adminInterface.showNotification('Por favor, selecciona un archivo GLB o GLTF válido', 'error');
            return;
        }

        // Delete the previously uploaded file (if any)
        if (this.adminInterface.projectData.modelPath) {
            const previousFile = this.adminInterface.projectData.modelPath.split('/').pop();
            await fetch(window.SERVER_URL+'/api/delete-temp-file/${previousFile}', { method: 'DELETE' });
        }

        // Upload the new file
        const formData = new FormData();
        formData.append('model', file);

        const response = await fetch(window.SERVER_URL+'/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Error en la subida: ${response.statusText}`);
        }

        const result = await response.json();

        // Temporarily store the path in project data
        this.adminInterface.projectData.modelPath = result.path;

        // Load the model in the scene
        await this.adminInterface.loadGLBModel(result.path);
        
        // Update status
        this.modelLoaded = true;
        this.updateStatusForLoadedModel(result.path);

        // Show success message
        this.adminInterface.showNotification('Modelo cargado correctamente', 'success');
    }
    
    updateStatusForLoadedModel(modelPath) {
        // Get filename from path
        const filename = modelPath.split('/').pop();
        
        // Update status container
        this.statusContainer.style.display = 'block';
        this.statusContainer.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
        this.statusContainer.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div style="flex-grow: 1;">
                    <div style="margin-bottom: 5px; font-weight: bold;">Modelo cargado: ${filename}</div>
                    <div>El modelo está listo para configurar</div>
                </div>
                <div style="color: #4CAF50;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        `;
        
        // Update drop area to indicate a model is already loaded
        this.dropArea.style.opacity = '0.7';
        
        // Change dropzone text to indicate replacing
        const dropText = this.dropArea.querySelector('div:nth-child(2)');
        if (dropText) {
            dropText.textContent = 'Arrastra un nuevo modelo para reemplazar';
        }
    }
    
    destroy() {
        // Remove container if exists
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}