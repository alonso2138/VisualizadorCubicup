import * as THREE from 'three';

export default class SendProjectData {
    constructor(clientInterface) {
        this.clientInterface = clientInterface;
        this.currentData = {
            code: "",
            siteName: "",
            items: []
        };
        
        this.createButton();
        this.createModal();
    }
    
    createButton() {
        // Crear botón flotante para enviar datos del proyecto
        const sendDataBtn = document.createElement('button');
        sendDataBtn.id = 'sendProjectDataBtn';
        sendDataBtn.className = 'floating-send-data-btn';
        sendDataBtn.innerHTML = '📤 Enviar Proyecto';
        sendDataBtn.title = 'Enviar datos del proyecto actual';
        
        // Estilo del botón
        sendDataBtn.style.position = 'fixed';
        sendDataBtn.style.top = '140px';  // Debajo del botón PBR
        sendDataBtn.style.right = '20px';
        sendDataBtn.style.zIndex = '1000';
        sendDataBtn.style.padding = '12px 20px';
        sendDataBtn.style.background = 'var(--mm-primary, #007acc)';
        sendDataBtn.style.color = 'white';
        sendDataBtn.style.border = 'none';
        sendDataBtn.style.borderRadius = '25px';
        sendDataBtn.style.cursor = 'pointer';
        sendDataBtn.style.fontSize = '14px';
        sendDataBtn.style.fontWeight = 'bold';
        sendDataBtn.style.boxShadow = '0 4px 12px rgba(0, 122, 204, 0.3)';
        sendDataBtn.style.transition = 'all 0.3s ease';
        
        // Efectos hover
        sendDataBtn.addEventListener('mouseenter', () => {
            sendDataBtn.style.transform = 'translateY(-2px)';
            sendDataBtn.style.boxShadow = '0 6px 16px rgba(0, 122, 204, 0.4)';
        });
        
        sendDataBtn.addEventListener('mouseleave', () => {
            sendDataBtn.style.transform = 'translateY(0)';
            sendDataBtn.style.boxShadow = '0 4px 12px rgba(0, 122, 204, 0.3)';
        });

        sendDataBtn.addEventListener("click", () => {
            this.showModal();
        });
        
        document.body.appendChild(sendDataBtn);
        this.sendDataBtn = sendDataBtn;
    }
    
    createModal() {
        // Crear modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'sendProjectDataModal';
        modalOverlay.className = 'send-data-modal-overlay';
        modalOverlay.style.display = 'none';
        modalOverlay.style.position = 'fixed';
        modalOverlay.style.top = '0';
        modalOverlay.style.left = '0';
        modalOverlay.style.width = '100%';
        modalOverlay.style.height = '100%';
        modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modalOverlay.style.zIndex = '10000';
        modalOverlay.style.display = 'flex';
        modalOverlay.style.justifyContent = 'center';
        modalOverlay.style.alignItems = 'center';
        
        // Crear contenedor del modal
        const modalContainer = document.createElement('div');
        modalContainer.className = 'send-data-modal-container';
        modalContainer.style.background = 'white';
        modalContainer.style.borderRadius = '12px';
        modalContainer.style.padding = '24px';
        modalContainer.style.width = '400px';
        modalContainer.style.maxWidth = '90vw';
        modalContainer.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
        modalContainer.style.transform = 'scale(0.9)';
        modalContainer.style.transition = 'transform 0.3s ease';
        
        // Título
        const title = document.createElement('h2');
        title.textContent = 'Enviar Datos del Proyecto';
        title.style.margin = '0 0 20px 0';
        title.style.color = '#333';
        title.style.fontSize = '20px';
        title.style.fontWeight = 'bold';
        modalContainer.appendChild(title);
        
        // Campo código del proyecto
        const codeLabel = document.createElement('label');
        codeLabel.textContent = 'Código del Proyecto:';
        codeLabel.style.display = 'block';
        codeLabel.style.marginBottom = '8px';
        codeLabel.style.fontWeight = '600';
        codeLabel.style.color = '#555';
        modalContainer.appendChild(codeLabel);
        
        const codeInput = document.createElement('input');
        codeInput.type = 'text';
        codeInput.id = 'projectCodeInput';
        codeInput.placeholder = 'Ej: ES-V-25-281';
        codeInput.style.width = '100%';
        codeInput.style.padding = '12px';
        codeInput.style.marginBottom = '16px';
        codeInput.style.border = '2px solid #ddd';
        codeInput.style.borderRadius = '8px';
        codeInput.style.fontSize = '14px';
        codeInput.style.boxSizing = 'border-box';
        modalContainer.appendChild(codeInput);
        
        // Campo nombre de la estancia
        const siteLabel = document.createElement('label');
        siteLabel.textContent = 'Nombre de la Estancia:';
        siteLabel.style.display = 'block';
        siteLabel.style.marginBottom = '8px';
        siteLabel.style.fontWeight = '600';
        siteLabel.style.color = '#555';
        modalContainer.appendChild(siteLabel);
        
        const siteInput = document.createElement('input');
        siteInput.type = 'text';
        siteInput.id = 'siteNameInput';
        siteInput.placeholder = 'Ej: Baño 1, Cocina Principal';
        siteInput.style.width = '100%';
        siteInput.style.padding = '12px';
        siteInput.style.marginBottom = '24px';
        siteInput.style.border = '2px solid #ddd';
        siteInput.style.borderRadius = '8px';
        siteInput.style.fontSize = '14px';
        siteInput.style.boxSizing = 'border-box';
        modalContainer.appendChild(siteInput);
        
        // Contenedor de botones
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '12px';
        buttonsContainer.style.justifyContent = 'flex-end';
        
        // Botón cerrar
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Cerrar';
        closeBtn.style.padding = '10px 20px';
        closeBtn.style.border = '2px solid #ddd';
        closeBtn.style.borderRadius = '6px';
        closeBtn.style.background = 'white';
        closeBtn.style.color = '#666';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '14px';
        closeBtn.style.fontWeight = '600';
        closeBtn.style.transition = 'all 0.2s ease';
        
        closeBtn.addEventListener('click', () => this.hideModal());
        
        // Botón enviar
        const sendBtn = document.createElement('button');
        sendBtn.textContent = 'Enviar';
        sendBtn.style.padding = '10px 20px';
        sendBtn.style.border = 'none';
        sendBtn.style.borderRadius = '6px';
        sendBtn.style.background = 'var(--mm-primary, #007acc)';
        sendBtn.style.color = 'white';
        sendBtn.style.cursor = 'pointer';
        sendBtn.style.fontSize = '14px';
        sendBtn.style.fontWeight = '600';
        sendBtn.style.transition = 'all 0.2s ease';
        
        sendBtn.addEventListener('click', () => this.handleSendData());
        
        buttonsContainer.appendChild(closeBtn);
        buttonsContainer.appendChild(sendBtn);
        modalContainer.appendChild(buttonsContainer);
        
        modalOverlay.appendChild(modalContainer);
        document.body.appendChild(modalOverlay);
        
        // Cerrar modal al hacer clic fuera
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.hideModal();
            }
        });
        
        // Guardar referencias
        this.modal = modalOverlay;
        this.modalContainer = modalContainer;
        this.codeInput = codeInput;
        this.siteInput = siteInput;
        this.sendBtn = sendBtn;
        
        // Inicialmente oculto
        modalOverlay.style.display = 'none';
    }
    
    showModal() {
        this.modal.style.display = 'flex';
        // Animar entrada
        setTimeout(() => {
            this.modalContainer.style.transform = 'scale(1)';
        }, 10);
        
        // Focus en el primer campo
        this.codeInput.focus();
    }
    
    hideModal() {
        this.modalContainer.style.transform = 'scale(0.9)';
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
    }
    
    handleSendData() {
        const code = this.codeInput.value.trim();
        const siteName = this.siteInput.value.trim();
        
        // Validación
        if (!code) {
            this.showError('Por favor, introduce el código del proyecto');
            this.codeInput.focus();
            return;
        }
        
        if (!siteName) {
            this.showError('Por favor, introduce el nombre de la estancia');
            this.siteInput.focus();
            return;
        }
        
        // Actualizar datos y enviar
        this.currentData.code = code;
        this.currentData.siteName = siteName;
        
        this.mandarDatos();
    }
    
    actualizarDatos(datos) {
        // Actualizar el array de items con los datos recibidos
        if (Array.isArray(datos)) {
            this.currentData.items = datos.map(item => ({
                sku: item.sku || ""
            }));
            
            console.log('Datos del proyecto actualizados:', this.currentData.items.length, 'elementos');
        }
    }

    async mandarDatos() {
        try {
            // Mostrar estado de carga
            this.sendBtn.textContent = 'Enviando...';
            this.sendBtn.disabled = true;
            
            const dataToSend = {
                code: this.currentData.code,
                siteName: this.currentData.siteName,
                items: this.currentData.items
            };
            
            console.log('Enviando datos del proyecto:', dataToSend);
            
            // TODO: Reemplazar con la URL real cuando esté disponible
            const response = await fetch('/api/project-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSend)
            });
            
            if (response.ok) {
                this.showSuccess('Datos del proyecto enviados correctamente');
                this.hideModal();
                // Limpiar campos
                this.codeInput.value = '';
                this.siteInput.value = '';
            } else {
                throw new Error(`Error del servidor: ${response.status}`);
            }
            
        } catch (error) {
            console.error('Error al enviar datos del proyecto:', error);
            this.showError('Error al enviar los datos. Por favor, inténtalo de nuevo.');
        } finally {
            // Restaurar botón
            this.sendBtn.textContent = 'Enviar';
            this.sendBtn.disabled = false;
        }
    }
    
    // Métodos de notificación (usando el sistema de la ClientInterface si está disponible)
    showError(message) {
        if (this.clientInterface && this.clientInterface.showError) {
            this.clientInterface.showError(message);
        } else {
            alert(message);
        }
    }
    
    showSuccess(message) {
        if (this.clientInterface && this.clientInterface.showSuccess) {
            this.clientInterface.showSuccess(message);
        } else {
            alert(message);
        }
    }
    
    // Método para obtener los datos actuales (útil para debugging)
    getCurrentData() {
        return { ...this.currentData };
    }
    
    // Método para destruir la instancia y limpiar el DOM
    destroy() {
        if (this.sendDataBtn) {
            this.sendDataBtn.remove();
        }
        if (this.modal) {
            this.modal.remove();
        }
    }
}