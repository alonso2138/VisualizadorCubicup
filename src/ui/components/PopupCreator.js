/**
 * Utilidad para crear y gestionar ventanas emergentes (popups) en la interfaz
 */
export default class PopupCreator {
    /**
     * Crea una instancia del creador de popups
     * @param {Object} options - Opciones de configuración
     * @param {boolean} options.closeOnOverlayClick - Si el popup debe cerrarse al hacer clic fuera (default: true)
     * @param {string} options.overlayColor - Color del fondo (default: 'rgba(0, 0, 0, 0.7)')
     * @param {string} options.backgroundColor - Color del popup (default: '#333')
     * @param {number} options.zIndex - Índice Z para el popup (default: 2000)
     */
    constructor(options = {}) {
        this.options = {
            closeOnOverlayClick: true,
            overlayColor: 'rgba(0, 0, 0, 0.7)',
            backgroundColor: '#333',
            zIndex: 2000,
            ...options
        };
        
        this.activePopups = new Set();
    }
    
    /**
     * Crea un nuevo popup
     * @param {Object} options - Opciones específicas para este popup
     * @returns {Object} - Objeto con referencias al popup y métodos para manipularlo
     */
    create(options = {}) {
        // Fusionar opciones con las predeterminadas
        const popupOptions = {
            ...this.options,
            ...options
        };
        
        // Crear fondo oscuro (overlay)
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = popupOptions.overlayColor;
        overlay.style.zIndex = popupOptions.zIndex.toString();
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease';
        
        // Crear contenedor del popup
        const popup = document.createElement('div');
        popup.style.backgroundColor = popupOptions.backgroundColor;
        popup.style.borderRadius = '5px';
        popup.style.padding = '20px';
        popup.style.minWidth = '300px';
        popup.style.maxWidth = '90%';
        popup.style.maxHeight = '90vh';
        popup.style.overflowY = 'auto';
        popup.style.color = 'white';
        popup.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.5)';
        popup.style.transform = 'scale(0.8)';
        popup.style.transition = 'transform 0.2s ease';
        overlay.appendChild(popup);
        
        // Variables para seguimiento
        let isShown = false;
        let closeHandlers = [];
        
        // Método para cerrar el popup
        const close = () => {
            if (!isShown) return;
            
            // Animación de cierre
            overlay.style.opacity = '0';
            popup.style.transform = 'scale(0.8)';
            
            // Remover después de la animación
            setTimeout(() => {
                if (overlay.parentNode) {
                    document.body.removeChild(overlay);
                }
                this.activePopups.delete(popupInstance);
                
                // Ejecutar handlers de cierre
                closeHandlers.forEach(handler => handler());
            }, 200);
            
            isShown = false;
        };
        
        // Evento de clic en overlay
        if (popupOptions.closeOnOverlayClick) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    close();
                }
            });
        }
        
        // Objeto que representa la instancia del popup
        const popupInstance = {
            overlay,
            popup,
            
            /**
             * Muestra el popup
             * @returns {Object} - La instancia del popup (para encadenar)
             */
            show() {
                if (isShown) return this;
                
                // Añadir al DOM
                document.body.appendChild(overlay);
                
                // Forzar reflow para que la animación funcione
                void overlay.offsetWidth;
                
                // Animar apertura
                overlay.style.opacity = '1';
                popup.style.transform = 'scale(1)';
                
                isShown = true;
                this.activePopups.add(popupInstance);
                
                return this;
            },
            
            /**
             * Cierra el popup
             */
            close,
            
            /**
             * Añade un título al popup
             * @param {string} text - El texto del título
             * @returns {Object} - La instancia del popup (para encadenar)
             */
            setTitle(text) {
                const title = document.createElement('h3');
                title.textContent = text;
                title.style.margin = '0 0 15px 0';
                title.style.fontSize = '18px';
                title.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
                title.style.paddingBottom = '10px';
                
                // Insertar al inicio
                if (popup.firstChild) {
                    popup.insertBefore(title, popup.firstChild);
                } else {
                    popup.appendChild(title);
                }
                
                return this;
            },
            
            /**
             * Añade contenido HTML al popup
             * @param {string} html - El contenido HTML
             * @returns {Object} - La instancia del popup (para encadenar)
             */
            setContent(html) {
                const content = document.createElement('div');
                content.innerHTML = html;
                popup.appendChild(content);
                return this;
            },
            
            /**
             * Añade un elemento DOM al popup
             * @param {HTMLElement} element - El elemento a añadir
             * @returns {Object} - La instancia del popup (para encadenar)
             */
            addElement(element) {
                popup.appendChild(element);
                return this;
            },
            
            /**
             * Crea y añade un campo de entrada con etiqueta
             * @param {Object} options - Opciones para el campo
             * @returns {HTMLInputElement} - El elemento input creado
             */
            addInput(options = {}) {
                const container = document.createElement('div');
                container.style.marginBottom = '15px';
                
                if (options.label) {
                    const label = document.createElement('label');
                    label.textContent = options.label;
                    label.style.display = 'block';
                    label.style.marginBottom = '5px';
                    container.appendChild(label);
                }
                
                const input = document.createElement('input');
                input.type = options.type || 'text';
                input.value = options.value || '';
                input.placeholder = options.placeholder || '';
                
                if (options.required) {
                    input.required = true;
                }
                
                // Estilos
                input.style.width = '100%';
                input.style.padding = '8px';
                input.style.boxSizing = 'border-box';
                input.style.backgroundColor = '#444';
                input.style.border = '1px solid #555';
                input.style.color = 'white';
                input.style.borderRadius = '3px';
                
                container.appendChild(input);
                popup.appendChild(container);
                
                return input;
            },
            
            /**
             * Añade un área de botones al popup
             * @param {Object[]} buttons - Array de configuraciones de botones
             * @returns {Object} - La instancia del popup (para encadenar)
             */
            addButtons(buttons) {
                const buttonsContainer = document.createElement('div');
                buttonsContainer.style.display = 'flex';
                buttonsContainer.style.justifyContent = 'flex-end';
                buttonsContainer.style.gap = '10px';
                buttonsContainer.style.marginTop = '20px';
                
                buttons.forEach(btnConfig => {
                    const button = document.createElement('button');
                    button.textContent = btnConfig.text || 'Button';
                    button.style.padding = '8px 15px';
                    
                    // Estilos según el tipo de botón
                    if (btnConfig.type === 'primary') {
                        button.style.backgroundColor = btnConfig.color || '#4CAF50';
                    } else if (btnConfig.type === 'danger') {
                        button.style.backgroundColor = btnConfig.color || '#F44336';
                    } else {
                        button.style.backgroundColor = btnConfig.color || '#777';
                    }
                    
                    button.style.color = 'white';
                    button.style.border = 'none';
                    button.style.borderRadius = '3px';
                    button.style.cursor = 'pointer';
                    
                    // Evento de clic
                    button.addEventListener('click', () => {
                        if (typeof btnConfig.onClick === 'function') {
                            btnConfig.onClick(popupInstance);
                        }
                        
                        if (btnConfig.closeOnClick !== false) {
                            close();
                        }
                    });
                    
                    buttonsContainer.appendChild(button);
                });
                
                popup.appendChild(buttonsContainer);
                return this;
            },
            
            /**
             * Registra un callback para cuando se cierre el popup
             * @param {Function} handler - Función a ejecutar al cerrar
             * @returns {Object} - La instancia del popup (para encadenar)
             */
            onClose(handler) {
                if (typeof handler === 'function') {
                    closeHandlers.push(handler);
                }
                return this;
            }
        };
        
        return popupInstance;
    }
    
    /**
     * Crea un popup de confirmación con botones Aceptar/Cancelar
     * @param {string} message - Mensaje a mostrar
     * @param {Function} onConfirm - Callback cuando se confirma
     * @param {Object} options - Opciones adicionales
     * @returns {Object} - La instancia del popup
     */
    confirm(message, onConfirm, options = {}) {
        const popup = this.create(options);
        
        if (options.title) {
            popup.setTitle(options.title);
        }
        
        const content = document.createElement('div');
        content.textContent = message;
        content.style.marginBottom = '20px';
        popup.addElement(content);
        
        popup.addButtons([
            {
                text: options.cancelText || 'Cancelar',
                type: 'secondary',
                onClick: options.onCancel
            },
            {
                text: options.confirmText || 'Aceptar',
                type: 'primary',
                onClick: onConfirm
            }
        ]);
        
        return popup.show();
    }
    
    /**
     * Crea un popup de alerta con un solo botón
     * @param {string} message - Mensaje a mostrar
     * @param {Object} options - Opciones adicionales
     * @returns {Object} - La instancia del popup
     */
    alert(message, options = {}) {
        const popup = this.create(options);
        
        if (options.title) {
            popup.setTitle(options.title);
        }
        
        const content = document.createElement('div');
        content.textContent = message;
        content.style.marginBottom = '20px';
        popup.addElement(content);
        
        popup.addButtons([
            {
                text: options.okText || 'Aceptar',
                type: options.type || 'primary',
                onClick: options.onOk
            }
        ]);
        
        return popup.show();
    }
    
    /**
     * Crea un popup para formularios
     * @param {Object} options - Opciones del formulario
     * @returns {Object} - La instancia del popup
     */
    form(options = {}) {
        const popup = this.create(options);
        
        if (options.title) {
            popup.setTitle(options.title);
        }
        
        // Crear formulario
        const form = document.createElement('form');
        form.onsubmit = (e) => {
            e.preventDefault();
            
            const formData = {};
            options.fields.forEach(field => {
                if (field.input && field.name) {
                    formData[field.name] = field.input.value;
                }
            });
            
            if (typeof options.onSubmit === 'function') {
                options.onSubmit(formData, popup);
            }
            
            if (options.closeOnSubmit !== false) {
                popup.close();
            }
        };
        popup.addElement(form);
        
        // Añadir campos
        if (Array.isArray(options.fields)) {
            options.fields.forEach(field => {
                field.input = popup.addInput({
                    label: field.label,
                    type: field.type || 'text',
                    value: field.value || '',
                    placeholder: field.placeholder || '',
                    required: field.required
                });
                // Mover el input al formulario
                form.appendChild(field.input.parentNode);
            });
        }
        
        // Añadir botones
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'flex-end';
        buttonsContainer.style.gap = '10px';
        buttonsContainer.style.marginTop = '20px';
        
        // Botón cancelar
        if (options.showCancel !== false) {
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button'; // No envía el formulario
            cancelButton.textContent = options.cancelText || 'Cancelar';
            cancelButton.style.padding = '8px 15px';
            cancelButton.style.backgroundColor = '#777';
            cancelButton.style.color = 'white';
            cancelButton.style.border = 'none';
            cancelButton.style.borderRadius = '3px';
            cancelButton.style.cursor = 'pointer';
            
            cancelButton.addEventListener('click', () => {
                if (typeof options.onCancel === 'function') {
                    options.onCancel(popup);
                }
                popup.close();
            });
            
            buttonsContainer.appendChild(cancelButton);
        }
        
        // Botón enviar
        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.textContent = options.submitText || 'Guardar';
        submitButton.style.padding = '8px 15px';
        submitButton.style.backgroundColor = options.submitColor || '#4CAF50';
        submitButton.style.color = 'white';
        submitButton.style.border = 'none';
        submitButton.style.borderRadius = '3px';
        submitButton.style.cursor = 'pointer';
        
        buttonsContainer.appendChild(submitButton);
        form.appendChild(buttonsContainer);
        
        return popup.show();
    }
    
    /**
     * Cierra todos los popups activos
     */
    closeAll() {
        this.activePopups.forEach(popup => {
            popup.close();
        });
    }
}