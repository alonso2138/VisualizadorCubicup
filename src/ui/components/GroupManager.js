import * as THREE from 'three';

export default class GroupManager {
    constructor(adminInterface) {
        this.adminInterface = adminInterface;
        this.experience = adminInterface.experience;
        
        // Almacenar datos de grupos
        this.groups = [];
        
        // Selection indicator text
        this.selectionInfo = null;
    }
    
    /**
     * Mount component to container and initialize UI
     */
    mount(container) {
        // Crear contenedor para el administrador de grupos
        this.container = document.createElement('div');
        this.container.style.marginTop = '15px';
        container.appendChild(this.container);
        
        // Heading
        const heading = document.createElement('h3');
        heading.textContent = 'Grupos de Materiales';
        heading.style.fontSize = '16px';
        heading.style.marginBottom = '15px';
        this.container.appendChild(heading);
        
        // Selection info text
        this.selectionInfo = document.createElement('div');
        this.selectionInfo.textContent = 'Ningún grupo seleccionado';
        this.selectionInfo.style.fontSize = '14px';
        this.selectionInfo.style.marginBottom = '15px';
        this.selectionInfo.style.color = '#aaa';
        this.container.appendChild(this.selectionInfo);
        
        // Create groups container
        this.groupsContainer = document.createElement('div');
        this.groupsContainer.style.marginBottom = '15px';
        this.groupsContainer.style.maxHeight = '200px';
        this.groupsContainer.style.overflowY = 'auto';
        this.container.appendChild(this.groupsContainer);
        
        // Create New Group button
        const createGroupBtn = document.createElement('button');
        createGroupBtn.textContent = '+ Crear nuevo grupo';
        createGroupBtn.style.width = '100%';
        createGroupBtn.style.padding = '8px';
        createGroupBtn.style.backgroundColor = '#4CAF50';
        createGroupBtn.style.border = 'none';
        createGroupBtn.style.borderRadius = '4px';
        createGroupBtn.style.color = 'white';
        createGroupBtn.style.cursor = 'pointer';
        createGroupBtn.style.fontWeight = 'bold';
        createGroupBtn.style.marginTop = '10px';
        createGroupBtn.addEventListener('click', () => this.createGroupPopup());
        this.container.appendChild(createGroupBtn);
        
        // Initialize empty state element
        this.initializeEmptyStateElement();
        this.groupsContainer.appendChild(this.emptyStateElement);

        // Initialize UI with any existing groups
        this.groupElements = [];
        
        // Restore any groups from project data
        if (this.adminInterface.projectData.groups && this.adminInterface.projectData.groups.length > 0) {
            this.refreshUI();
        }
    }
    
    updateSelectionInfo() {
        if (!this.selectionInfo) return;
        
        const count = this.experience.postProcessing?.selectedObjects?.length || 0;
        
        if (count === 0) {
            this.selectionInfo.textContent = 'Selección: Ningún objeto seleccionado';
            this.selectionInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        } else {
            this.selectionInfo.textContent = `Selección: ${count} objeto${count !== 1 ? 's' : ''} seleccionado${count !== 1 ? 's' : ''}`;
            this.selectionInfo.style.backgroundColor = 'rgba(33, 150, 243, 0.2)';
        }
        
        // Update group button state
        if (this.groupButton) {
            if (count === 0) {
                this.groupButton.disabled = true;
                this.groupButton.style.opacity = '0.5';
                this.groupButton.style.cursor = 'not-allowed';
            } else {
                this.groupButton.disabled = false;
                this.groupButton.style.opacity = '1';
                this.groupButton.style.cursor = 'pointer';
            }
        }
    }
    
    createGroupPopup() {
        // Verificar si hay objetos seleccionados
        if (!this.experience.postProcessing.selectedObjects || this.experience.postProcessing.selectedObjects.length === 0) {
            this.adminInterface.showNotification('Selecciona al menos un objeto para crear un grupo', 'warning');
            return;
        }
        
        // Crear fondo oscuro
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
        document.body.appendChild(overlay);
        
        // Crear popup
        const popup = document.createElement('div');
        popup.style.backgroundColor = '#333';
        popup.style.borderRadius = '5px';
        popup.style.padding = '20px';
        popup.style.width = '320px';
        popup.style.color = 'white';
        popup.style.maxWidth = '90%';
        overlay.appendChild(popup);
        
        // Título del popup
        const title = document.createElement('h3');
        title.textContent = 'Crear Nuevo Grupo';
        title.style.margin = '0 0 15px 0';
        title.style.fontSize = '18px';
        popup.appendChild(title);
        
        // Campo para nombre del grupo
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Nombre del grupo:';
        nameLabel.style.display = 'block';
        nameLabel.style.marginBottom = '5px';
        popup.appendChild(nameLabel);
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Ej: Paredes, Cocina, Baño, etc.';
        nameInput.style.width = '100%';
        nameInput.style.padding = '8px';
        nameInput.style.marginBottom = '15px';
        nameInput.style.boxSizing = 'border-box';
        nameInput.style.backgroundColor = '#444';
        nameInput.style.border = '1px solid #555';
        nameInput.style.color = 'white';
        nameInput.style.borderRadius = '3px';
        popup.appendChild(nameInput);
        
        // Lista de familias de materiales predefinidas
        const familyLabel = document.createElement('label');
        familyLabel.textContent = 'Familia de materiales:';
        familyLabel.style.display = 'block';
        familyLabel.style.marginBottom = '5px';
        popup.appendChild(familyLabel);
        
        const familySelect = document.createElement('select');
        familySelect.style.width = '100%';
        familySelect.style.padding = '8px';
        familySelect.style.marginBottom = '15px';
        familySelect.style.boxSizing = 'border-box';
        familySelect.style.backgroundColor = '#444';
        familySelect.style.border = '1px solid #555';
        familySelect.style.color = 'white';
        familySelect.style.borderRadius = '3px';
        popup.appendChild(familySelect);

        // Poblar selector de materiales
        this.CargarMats(familySelect);
        
        // Mostrar objetos seleccionados
        const selectedLabel = document.createElement('div');
        selectedLabel.textContent = `Objetos seleccionados: ${this.experience.postProcessing.selectedObjects.length}`;
        selectedLabel.style.marginBottom = '10px';
        popup.appendChild(selectedLabel);
        
        // Botones de acción
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'space-between';
        buttonsContainer.style.marginTop = '20px';
        popup.appendChild(buttonsContainer);
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancelar';
        cancelButton.style.padding = '8px 15px';
        cancelButton.style.backgroundColor = '#777';
        cancelButton.style.color = 'white';
        cancelButton.style.border = 'none';
        cancelButton.style.borderRadius = '3px';
        cancelButton.style.cursor = 'pointer';
        buttonsContainer.appendChild(cancelButton);
        
        const createButton = document.createElement('button');
        createButton.textContent = 'Crear Grupo';
        createButton.style.padding = '8px 15px';
        createButton.style.backgroundColor = '#4CAF50';
        createButton.style.color = 'white';
        createButton.style.border = 'none';
        createButton.style.borderRadius = '3px';
        createButton.style.cursor = 'pointer';
        buttonsContainer.appendChild(createButton);
        
        // Eventos
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        createButton.addEventListener('click', () => {
            const name = nameInput.value.trim();
            const family = familySelect.value;
            
            if (!name) {
                alert('Por favor ingresa un nombre para el grupo');
                return;
            }
            
            this.createGroup(name, family, [...this.experience.postProcessing.selectedObjects]);
            document.body.removeChild(overlay);
            this.adminInterface.showNotification(`Grupo "${name}" creado correctamente`, 'success');
        });
        
        // Auto-focus on name input
        setTimeout(() => nameInput.focus(), 100);
    }
    
    createGroup(name, family, objects, id = null) {
        // Generate a unique ID if not provided
        const groupId = id || Date.now().toString();
        
        // Guardar datos del grupo
        const groupData = {
            id: groupId,
            name: name,
            family: family,
            objects: objects.map(obj => ({
                uuid: obj.uuid,
                name: obj.name || `Objeto ${obj.uuid.substring(0, 8)}`
            }))
        };
        
        // Añadir a nuestro array de grupos
        this.groups.push(groupData);
        
        // Crear elemento visual
        this.createGroupElement(groupData);
        
        // Remove empty state if this is the first group
        if (this.groups.length === 1 && this.emptyStateElement.parentNode) {
            this.emptyStateElement.parentNode.removeChild(this.emptyStateElement);
        }
    }
    
    createGroupElement(groupData) {
        // Crear contenedor del grupo
        const groupDiv = document.createElement('div');
        groupDiv.id = `group-${groupData.id}`;
        groupDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        groupDiv.style.padding = '10px';
        groupDiv.style.marginBottom = '10px';
        groupDiv.style.borderRadius = '4px';
        
        // Encabezado del grupo con funcionalidad de toggle
        const groupHeader = document.createElement('div');
        groupHeader.style.display = 'flex';
        groupHeader.style.justifyContent = 'space-between';
        groupHeader.style.alignItems = 'center';
        groupHeader.style.cursor = 'pointer';
        groupDiv.appendChild(groupHeader);
        
        // Info del grupo
        const groupInfo = document.createElement('div');
        groupInfo.style.flexGrow = '1';
        groupHeader.appendChild(groupInfo);
        
        const groupName = document.createElement('strong');
        groupName.textContent = groupData.name;
        groupInfo.appendChild(groupName);
        
        const groupFamily = document.createElement('div');
        groupFamily.textContent = `Familia: ${this.formatFamilyName(groupData.family)}`;
        groupFamily.style.fontSize = '12px';
        groupFamily.style.opacity = '0.8';
        groupInfo.appendChild(groupFamily);
        
        // Objeto count
        const objectCount = document.createElement('div');
        objectCount.textContent = `${groupData.objects.length} objeto${groupData.objects.length !== 1 ? 's' : ''}`;
        objectCount.style.fontSize = '12px';
        objectCount.style.opacity = '0.8';
        groupInfo.appendChild(objectCount);
        
        // Contenedor de acciones
        const actionsContainer = document.createElement('div');
        actionsContainer.style.display = 'flex';
        actionsContainer.style.alignItems = 'center';
        actionsContainer.style.gap = '10px';
        groupHeader.appendChild(actionsContainer);
        
        // Botón de seleccionar todos
        const selectButton = document.createElement('button');
        selectButton.textContent = 'Seleccionar';
        selectButton.style.padding = '4px 8px';
        selectButton.style.backgroundColor = '#2196F3';
        selectButton.style.color = 'white';
        selectButton.style.border = 'none';
        selectButton.style.borderRadius = '3px';
        selectButton.style.fontSize = '12px';
        selectButton.style.cursor = 'pointer';
        actionsContainer.appendChild(selectButton);
        
        // Botón de editar
        const editButton = document.createElement('button');
        editButton.textContent = 'Editar';
        editButton.style.padding = '4px 8px';
        editButton.style.backgroundColor = '#FF9800';
        editButton.style.color = 'white';
        editButton.style.border = 'none';
        editButton.style.borderRadius = '3px';
        editButton.style.fontSize = '12px';
        editButton.style.cursor = 'pointer';
        actionsContainer.appendChild(editButton);
        
        // Botón de eliminar
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '✕';
        deleteButton.style.padding = '4px 8px';
        deleteButton.style.backgroundColor = 'transparent';
        deleteButton.style.color = '#f44336';
        deleteButton.style.border = '1px solid #f44336';
        deleteButton.style.borderRadius = '3px';
        deleteButton.style.fontSize = '12px';
        deleteButton.style.cursor = 'pointer';
        actionsContainer.appendChild(deleteButton);
        
        // Icono de toggle
        const toggleIcon = document.createElement('div');
        toggleIcon.textContent = '▼';
        toggleIcon.style.marginLeft = '10px';
        toggleIcon.style.transition = 'transform 0.3s';
        actionsContainer.appendChild(toggleIcon);
        
        // Lista de objetos (inicialmente oculta)
        const objectsList = document.createElement('ul');
        objectsList.style.listStyle = 'none';
        objectsList.style.padding = '0';
        objectsList.style.margin = '10px 0 0 0';
        objectsList.style.maxHeight = '0';
        objectsList.style.overflow = 'hidden';
        objectsList.style.transition = 'max-height 0.3s ease';
        groupDiv.appendChild(objectsList);
        
        // Añadir objetos a la lista
        groupData.objects.forEach(obj => {
            const listItem = document.createElement('li');
            listItem.textContent = obj.name;
            listItem.style.padding = '4px 0';
            listItem.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
            listItem.style.fontSize = '12px';
            objectsList.appendChild(listItem);
        });
        
        // Estado inicial
        let isOpen = false;
        
        // Funcionalidad de toggle - solo para el icono y el nombre
        const toggleElements = [toggleIcon, groupInfo];
        toggleElements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                
                isOpen = !isOpen;
                if (isOpen) {
                    objectsList.style.maxHeight = `${groupData.objects.length * 30}px`;
                    toggleIcon.style.transform = 'rotate(180deg)';
                } else {
                    objectsList.style.maxHeight = '0';
                    toggleIcon.style.transform = 'rotate(0)';
                }
            });
        });
        
        // Funcionalidad del botón de seleccionar
        selectButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Primero deseleccionamos todo
            this.experience.postProcessing.deselectAll();
            
            // Encontrar los objetos en la escena por UUID
            const sceneObjects = [];
            
            if (this.experience.model && this.experience.model.model) {
                this.experience.model.model.traverse((child) => {
                    if (child.isMesh) {
                        // Comprobar si este objeto está en nuestro grupo
                        const isInGroup = groupData.objects.some(obj => obj.uuid === child.uuid);
                        if (isInGroup) {
                            sceneObjects.push(child);
                        }
                    }
                });
            }
            
            // Seleccionar todos los objetos encontrados
            sceneObjects.forEach(obj => {
                this.experience.postProcessing.selectObject(obj);
            });
            
            // Feedback visual
            selectButton.style.backgroundColor = '#4CAF50';
            setTimeout(() => {
                selectButton.style.backgroundColor = '#2196F3';
            }, 500);
            
            // Update selection info immediately
            this.updateSelectionInfo();
        });
        
        // Functionality for edit button
        editButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editGroupPopup(groupData);
        });
        
        // Functionality for delete button
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Ask for confirmation
            if (confirm(`¿Estás seguro de eliminar el grupo "${groupData.name}"?`)) {
                this.deleteGroup(groupData.id);
            }
        });
        
        // Añadir al contenedor de grupos
        this.groupsContainer.appendChild(groupDiv);
    }
    
    editGroupPopup(groupData) {
        // Crear fondo oscuro
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
        document.body.appendChild(overlay);
        
        // Crear popup
        const popup = document.createElement('div');
        popup.style.backgroundColor = '#333';
        popup.style.borderRadius = '5px';
        popup.style.padding = '20px';
        popup.style.width = '320px';
        popup.style.color = 'white';
        popup.style.maxWidth = '90%';
        overlay.appendChild(popup);
        
        // Título del popup
        const title = document.createElement('h3');
        title.textContent = 'Editar Grupo';
        title.style.margin = '0 0 15px 0';
        title.style.fontSize = '18px';
        popup.appendChild(title);
        
        // Campo para nombre del grupo
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Nombre del grupo:';
        nameLabel.style.display = 'block';
        nameLabel.style.marginBottom = '5px';
        popup.appendChild(nameLabel);
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = groupData.name;
        nameInput.style.width = '100%';
        nameInput.style.padding = '8px';
        nameInput.style.marginBottom = '15px';
        nameInput.style.boxSizing = 'border-box';
        nameInput.style.backgroundColor = '#444';
        nameInput.style.border = '1px solid #555';
        nameInput.style.color = 'white';
        nameInput.style.borderRadius = '3px';
        popup.appendChild(nameInput);
        
        // Lista de familias de materiales predefinidas
        const familyLabel = document.createElement('label');
        familyLabel.textContent = 'Familia de materiales:';
        familyLabel.style.display = 'block';
        familyLabel.style.marginBottom = '5px';
        popup.appendChild(familyLabel);
        
        const familySelect = document.createElement('select');
        familySelect.style.width = '100%';
        familySelect.style.padding = '8px';
        familySelect.style.marginBottom = '15px';
        familySelect.style.boxSizing = 'border-box';
        familySelect.style.backgroundColor = '#444';
        familySelect.style.border = '1px solid #555';
        familySelect.style.color = 'white';
        familySelect.style.borderRadius = '3px';
        popup.appendChild(familySelect);
        
        // Poblar selector de materiales
        this.CargarMats(familySelect, groupData);
        
        // Mostrar objetos en el grupo
        const objectsLabel = document.createElement('div');
        objectsLabel.textContent = `Objetos en este grupo: ${groupData.objects.length}`;
        objectsLabel.style.marginBottom = '10px';
        popup.appendChild(objectsLabel);
        
        // Botones de acción
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'space-between';
        buttonsContainer.style.marginTop = '20px';
        popup.appendChild(buttonsContainer);
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancelar';
        cancelButton.style.padding = '8px 15px';
        cancelButton.style.backgroundColor = '#777';
        cancelButton.style.color = 'white';
        cancelButton.style.border = 'none';
        cancelButton.style.borderRadius = '3px';
        cancelButton.style.cursor = 'pointer';
        buttonsContainer.appendChild(cancelButton);
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Guardar Cambios';
        saveButton.style.padding = '8px 15px';
        saveButton.style.backgroundColor = '#4CAF50';
        saveButton.style.color = 'white';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '3px';
        saveButton.style.cursor = 'pointer';
        buttonsContainer.appendChild(saveButton);
        
        // Eventos
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        saveButton.addEventListener('click', () => {
            const name = nameInput.value.trim();
            const family = familySelect.value;
            
            if (!name) {
                alert('Por favor ingresa un nombre para el grupo');
                return;
            }
            
            // Update group data
            groupData.name = name;
            groupData.family = family;
            
            // Update UI
            this.refreshUI();
            
            document.body.removeChild(overlay);
            this.adminInterface.showNotification(`Grupo "${name}" actualizado correctamente`, 'success');
        });
        
        // Auto-focus on name input
        setTimeout(() => nameInput.focus(), 100);
    }

    async CargarMats(familySelect, groupData){
        try {
            // Fetch texture-based materials from server
            // DEV: http://localhost:3000/api/texture-materials
            // DEPLOY: /api/texture-materials
            console.log("Cargando materiales desde el servidor...");
            const response = await fetch(window.SERVER_URL+'/api/texture-materials');
            
            if (!response.ok) {
                throw new Error(`Error cargando materiales: ${response.statusText}`);
            }
            
            const materialsData = await response.json();
            console.log(materialsData)
            materialsData.forEach(family => {
                const option = document.createElement('option');
                option.value = family;
                option.textContent = family;

                if(groupData){
                    if (family === groupData.family) {
                        option.selected = true;
                    }
                }

                familySelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error fetching materials:', error);
            console.log("server dont have mats")
        }
    }
    
    deleteGroup(groupId) {
        // Find group index
        const index = this.groups.findIndex(g => g.id === groupId);
        if (index === -1) return;
        
        // Remove from array
        this.groups.splice(index, 1);
        
        // Remove from DOM
        const groupElement = document.getElementById(`group-${groupId}`);
        if (groupElement) {
            // Animate removal
            groupElement.style.transition = 'all 0.3s ease';
            groupElement.style.opacity = '0';
            groupElement.style.transform = 'translateX(20px)';
            
            setTimeout(() => {
                if (groupElement.parentNode) {
                    groupElement.parentNode.removeChild(groupElement);
                }
                
                // Show empty state if no groups left
                if (this.groups.length === 0) {
                    this.groupsContainer.appendChild(this.emptyStateElement);
                }
            }, 300);
        }
        
        this.adminInterface.showNotification('Grupo eliminado correctamente', 'success');
    }
    
    formatFamilyName(familyId) {
        const familyMap = {
            'metales': 'Metales',
            'madera': 'Madera',
            'ladrillo': 'Ladrillo',
            'plastico': 'Plástico',
            'ceramica': 'Cerámica',
            'vidrio': 'Vidrio',
            'otro': 'Otro'
        };
        
        return familyMap[familyId] || familyId;
    }
    
    clearGroups() {
        // Reset groups array
        this.groups = [];
        
        // Clear the groups container
        if (this.groupsContainer) {
            while (this.groupsContainer.firstChild) {
                this.groupsContainer.removeChild(this.groupsContainer.firstChild);
            }
            
            // Show empty state
            this.initializeEmptyStateElement();
            this.groupsContainer.appendChild(this.emptyStateElement);
        }
    }

    /**
     * Completely refresh the groups UI from stored data
     * Ensures the UI matches the actual data when navigating between steps
     */
    refreshUI() {
        // Clear the container first
        if (this.groupsContainer) {
            this.groupsContainer.innerHTML = '';
            this.groupElements = [];
        }
        
        // Regenerate group elements from data
        if (this.adminInterface.projectData.groups && this.adminInterface.projectData.groups.length > 0) {
            // Sort groups by name for consistent display
            const sortedGroups = [...this.adminInterface.projectData.groups].sort((a, b) => a.name.localeCompare(b.name));
            

            sortedGroups.forEach(group => {
                const groupElement = this.createGroupElement(group);
                //this.groupsContainer.appendChild(groupElement);
                this.groupElements.push(groupElement);
            });
            
            // Update selection info
            this.updateSelectionInfo();
        } else {
            // Show message if no groups exist
            const noGroupsMsg = document.createElement('div');
            this.initializeEmptyStateElement();
            this.groupsContainer.appendChild(noGroupsMsg);
        }
    }
    
    initializeEmptyStateElement() {
        if (!this.emptyStateElement) {
            this.emptyStateElement = document.createElement('div');
            this.emptyStateElement.textContent = 'No hay grupos creados.';
            this.emptyStateElement.style.fontSize = '14px';
            this.emptyStateElement.style.color = '#aaa';
            this.emptyStateElement.style.textAlign = 'center';
        }
    }

    destroy() {
        // Clear selection update interval
        if (this.selectionUpdateInterval) {
            clearInterval(this.selectionUpdateInterval);
        }
        
        // Clear any event listeners
        if (this.groupButton) {
            this.groupButton.removeEventListener('click', this.createGroupPopup);
        }
        
        // Limpieza de elementos
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    /**
     * Restore saved groups to a newly loaded model
     * @param {Array} groupsData - The saved groups data
     * @param {THREE.Object3D} model - The loaded model
     */
    restoreGroups(groupsData, model) {
        if (!groupsData || !Array.isArray(groupsData) || !model) {
            console.warn('Cannot restore groups: Invalid groups data or model');
            return;
        }
        
        // Store the groups in the project data
        this.adminInterface.projectData.groups = [...groupsData];
        
        // Refresh the UI to show restored groups
        this.refreshUI();
        
        console.log(`Restored ${groupsData.length} groups from saved data`);
    }

    /**
     * Clear any active selections and visual highlighting
     */
    clearSelection() {
        // Remove visual highlighting from all group elements
        if (this.groupElements && this.groupElements.length) {
            this.groupElements.forEach(element => {
                if (element) {
                    element.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    element.style.borderLeft = '3px solid transparent';
                }
            });
        }
        
        // Clear selection in 3D view using post-processing
        if (this.adminInterface.postProcessing && this.adminInterface.postProcessing.outlinePass) {
            this.adminInterface.postProcessing.outlinePass.selectedObjects = [];
        }
        
        // Reset selection state
        this.selectedGroupId = null;
        this.selectedObjects = [];

        // Deselec all
        this.experience.postProcessing.deselectAll();
        
        // Update selection info text
        if (this.selectionInfo) {
            this.selectionInfo.textContent = 'Ningún grupo seleccionado';
        }
    }
}