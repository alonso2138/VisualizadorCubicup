import * as THREE from 'three';
import Lightning from '../../three/Lightning.js';
import Model from '../../three/Model.js';
import Resources from '../../Utils/Resources.js';
import PopupCreator from './PopupCreator.js';

export default class ProjectManager {
    constructor(adminInterface) {
        this.adminInterface = adminInterface;
        this.experience = adminInterface.experience;
        
        // Project data from workflow
        this.projectData = this.adminInterface.projectData;
        
        // Reference to container for cleanup
        this.container = null;
        this.projectsContainer = null;
    }
    
    /**
     * Mount component for the confirmation step
     * Shows project summary and save functionality
     */
    mount(container) {
        // Crear contenedor principal
        this.container = document.createElement('div');
        container.appendChild(this.container);
        
        // Show project summary/confirmation
        this.createProjectSummary();
    }
    
    /**
     * Create project summary view for confirmation step
     */
    createProjectSummary() {
        // Project confirmation section
        const summarySection = document.createElement('div');
        summarySection.style.padding = '15px';
        summarySection.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        summarySection.style.borderRadius = '5px';
        summarySection.style.marginBottom = '20px';
        this.container.appendChild(summarySection);
        
        // Project name
        const nameHeading = document.createElement('h3');
        nameHeading.textContent = `Proyecto: ${this.projectData.name || 'Sin nombre'}`;
        nameHeading.style.margin = '0 0 15px 0';
        nameHeading.style.fontSize = '18px';
        summarySection.appendChild(nameHeading);
        
        // Model info
        if (this.projectData.modelPath) {
            const modelInfo = document.createElement('div');
            modelInfo.textContent = `Modelo: ${this.projectData.modelPath.split('/').pop()}`;
            modelInfo.style.marginBottom = '10px';
            summarySection.appendChild(modelInfo);
        }
        
        // Groups info
        const groupsInfo = document.createElement('div');
        const groupCount = this.projectData.groups ? this.projectData.groups.length : 0;
        groupsInfo.textContent = `Grupos: ${groupCount}`;
        groupsInfo.style.marginBottom = '10px';
        summarySection.appendChild(groupsInfo);
        
        // Ceiling height
        if (this.projectData.ceilingHeight !== undefined) {
            const ceilingInfo = document.createElement('div');
            ceilingInfo.textContent = `Altura del techo: ${this.projectData.ceilingHeight.toFixed(2)}m`;
            ceilingInfo.style.marginBottom = '10px';
            summarySection.appendChild(ceilingInfo);
        }
        
        // Create project button
        const createBtn = document.createElement('button');
        createBtn.textContent = 'Guardar proyecto';
        createBtn.style.backgroundColor = '#4CAF50';
        createBtn.style.color = 'white';
        createBtn.style.border = 'none';
        createBtn.style.padding = '10px 15px';
        createBtn.style.borderRadius = '4px';
        createBtn.style.cursor = 'pointer';
        createBtn.style.display = 'block';
        createBtn.style.margin = '20px auto';
        createBtn.style.fontWeight = 'bold';
        createBtn.addEventListener('click', () => this.createProject(createBtn));
        this.container.appendChild(createBtn);
    }
    
    /**
     * Create new project on the server or update existing one
     */
    async createProject(createBtn) {
        if (!this.projectData.name || !this.projectData.modelPath) {
            this.adminInterface.showNotification('El proyecto debe tener un nombre y un modelo', 'error');
            return;
        }

        // Disable button while processing
        createBtn.disabled = true;
        createBtn.textContent = 'Guardando...';

        try {
            // Add groups and ceiling height to project data
            const projectData = {
                ...this.projectData,
                date: new Date().toISOString()
            };

            // Send project data to the server
            // DEV: http://localhost:3000/api/projects
            const response = await fetch(window.SERVER_URL+'/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ projectData })
            });

            if (!response.ok) {
                throw new Error(`Error al guardar: ${response.statusText}`);
            }

            const result = await response.json();

            // Update button
            createBtn.textContent = '¡Guardado!';
            setTimeout(() => {
                createBtn.textContent = 'Guardar proyecto';
                createBtn.disabled = false;
            }, 2000);

            // Show success message
            this.adminInterface.showNotification('Proyecto guardado correctamente', 'success');

            // Show share dialog
            this.showShareDialog(`/viewer?project=${result.project.id}`, this.projectData.modelPath);
        } catch (error) {
            console.error('Error saving project:', error);
            this.adminInterface.showNotification(`Error: ${error.message}`, 'error');

            // Reset button
            createBtn.textContent = 'Guardar proyecto';
            createBtn.disabled = false;
        }
    }
    
    /**
     * Show project sharing dialog
     */
    showShareDialog(shareURL, modelPath) {
        // Create popup for share link
        const baseURL = window.location.origin;
        const fullShareURL = `${baseURL}${shareURL}`;
        
        // Create popup creator if needed
        if (!this.popupCreator) {
            this.popupCreator = new PopupCreator();
        }
        
        // Create share popup
        const popup = this.popupCreator.create({
            title: 'Compartir proyecto',
            content: `
                <p>Tu proyecto ha sido guardado. Comparte este enlace para que otros puedan verlo:</p>
                <div style="display: flex; margin: 15px 0;">
                    <input id="share-url" type="text" value="${fullShareURL}" 
                           style="flex: 1; padding: 8px; border-radius: 4px 0 0 4px; border: 1px solid #ddd;" readonly>
                    <button id="copy-btn" style="padding: 8px 12px; background: #2196F3; color: white; border: none; border-radius: 0 4px 4px 0; cursor: pointer;">Copiar</button>
                </div>
                <p>El proyecto incluye:</p>
                <ul>
                    <li>Modelo: ${modelPath.split('/').pop()}</li>
                    <li>Grupos: ${this.projectData.groups ? this.projectData.groups.length : 0}</li>
                    ${this.projectData.ceilingHeight ? `<li>Altura del techo: ${this.projectData.ceilingHeight.toFixed(2)}m</li>` : ''}
                </ul>
            `,
            width: '500px'
        });

        alert()

        // Add copy functionality
        setTimeout(() => {
            const copyBtn = document.getElementById('copy-btn');
            const shareUrlInput = document.getElementById('share-url');
            
            if (copyBtn && shareUrlInput) {
                copyBtn.addEventListener('click', () => {
                    shareUrlInput.select();
                    document.execCommand('copy');
                    copyBtn.textContent = '¡Copiado!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copiar';
                    }, 2000);
                });
            }
        }, 100);
    }
    
    /**
     * Load projects from server and render in container
     * This method is now used from the Upload step
     */
    async loadProjects(container) {
        try {
            // Store reference to container
            this.projectsContainer = container;
            
            // Add loading message
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #aaa;">Cargando proyectos...</div>';
            
            // Fetch projects from server
            // DEV: http://localhost:3000/api/projects
            const response = await fetch(window.SERVER_URL+'/api/projects');
            
            if (!response.ok) {
                throw new Error(`Error cargando proyectos: ${response.statusText}`);
            }
            
            const projects = await response.json();
            
            // Render projects
            this.renderProjects(projects, container);
        } catch (error) {
            console.error('Error loading projects:', error);
            container.innerHTML = `<div style="text-align: center; padding: 20px; color: #f44336;">Error: ${error.message}</div>`;
        }
    }
    
    /**
     * Render project list in container
     * @param {Array} projects - Projects data from server
     * @param {HTMLElement} container - Container to render in
     */
    renderProjects(projects, container) {
        // Clear container
        container.innerHTML = '';
        
        if (!projects || projects.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #aaa;">No hay proyectos guardados</div>';
            return;
        }
        
        // Sort projects by date (newest first)
        projects.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Create list
        const projectsList = document.createElement('div');
        projectsList.style.maxHeight = '300px';
        projectsList.style.overflowY = 'auto';
        container.appendChild(projectsList);
        
        // Add each project
        projects.forEach(project => {
            const projectElement = document.createElement('div');
            projectElement.style.padding = '10px';
            projectElement.style.margin = '0 0 10px 0';
            projectElement.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            projectElement.style.borderRadius = '4px';
            projectElement.style.position = 'relative';
            
            // Project name and date
            const nameElement = document.createElement('div');
            nameElement.style.fontWeight = 'bold';
            nameElement.style.marginBottom = '5px';
            nameElement.textContent = project.name || 'Proyecto sin nombre';
            projectElement.appendChild(nameElement);
            
            // Create date
            if (project.date) {
                const date = new Date(project.date);
                const dateElement = document.createElement('div');
                dateElement.style.fontSize = '12px';
                dateElement.style.color = '#aaa';
                dateElement.style.marginBottom = '5px';
                dateElement.textContent = `Creado: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                projectElement.appendChild(dateElement);
            }
            
            // Action buttons container
            const actionsContainer = document.createElement('div');
            actionsContainer.style.display = 'flex';
            actionsContainer.style.justifyContent = 'space-between';
            actionsContainer.style.marginTop = '10px';
            projectElement.appendChild(actionsContainer);
            
            // Load button
            const loadBtn = document.createElement('button');
            loadBtn.textContent = 'Cargar';
            loadBtn.style.padding = '5px 10px';
            loadBtn.style.backgroundColor = '#2196F3';
            loadBtn.style.color = 'white';
            loadBtn.style.border = 'none';
            loadBtn.style.borderRadius = '3px';
            loadBtn.style.cursor = 'pointer';
            loadBtn.addEventListener('click', () => this.loadProject(project));
            actionsContainer.appendChild(loadBtn);
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Borrar';
            deleteBtn.style.padding = '5px 10px';
            deleteBtn.style.backgroundColor = '#f44336';
            deleteBtn.style.color = 'white';
            deleteBtn.style.border = 'none';
            deleteBtn.style.borderRadius = '3px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.addEventListener('click', () => this.deleteProject(project.id, projectElement));
            actionsContainer.appendChild(deleteBtn);
            
            // View link
            const viewBtn = document.createElement('button');
            viewBtn.textContent = 'Link de experiencia';
            viewBtn.style.padding = '5px 10px';
            viewBtn.style.backgroundColor = '#4CAF50';
            viewBtn.style.color = 'white';
            viewBtn.style.border = 'none';
            viewBtn.style.borderRadius = '3px';
            viewBtn.style.cursor = 'pointer';
            viewBtn.addEventListener('click', () => {
                const baseURL = window.location.origin;
                const viewURL = `${baseURL}/viewer?project=${project.id}`;
                window.open(viewURL, '_blank');
            });
            actionsContainer.appendChild(viewBtn);
            
            projectsList.appendChild(projectElement);
        });
    }
    
    /**
     * Load a project into the admin workflow
     */
    loadProject(project) {
        if (!project || !project.path) {
            this.adminInterface.showNotification('Proyecto inválido o incompleto', 'error');
            return;
        }
        
        // Call AdminInterface's project loader
        this.adminInterface.loadProject(project);
    }
    
    /**
     * Delete a project from the server
     */
    async deleteProject(projectId, projectElement) {
        if (!projectId) return;
        
        if (!confirm('¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            // Disable the element while deleting
            projectElement.style.opacity = '0.5';
            projectElement.style.pointerEvents = 'none';
            
            // Send delete request
            // DEV: http://localhost:3000/api/projects/${projectId}
            const response = await fetch(window.SERVER_URL+'/api/projects/${projectId}', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error al eliminar: ${response.statusText}`);
            }
            
            // Remove from UI
            projectElement.remove();
            
            // Show success message
            this.adminInterface.showNotification('Proyecto eliminado correctamente', 'success');
            
            // Refresh projects list if empty
            if (this.projectsContainer && this.projectsContainer.children.length === 0) {
                this.loadProjects(this.projectsContainer);
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            this.adminInterface.showNotification(`Error: ${error.message}`, 'error');
            
            // Restore element
            projectElement.style.opacity = '1';
            projectElement.style.pointerEvents = 'auto';
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}