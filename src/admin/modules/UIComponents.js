export class UIComponents {
    static showNotification(message, type = 'info') {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Show notification with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    static getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    static createModal(title, content, actions = []) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${actions.map(action => `
                        <button class="btn ${action.class || 'btn-secondary'}" 
                                onclick="${action.onclick || 'this.closest(\'.modal-overlay\').remove()'}">
                            ${action.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);
        
        return modal;
    }

    static closeModal() {
        const modal = document.getElementById('modalOverlay');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            // Limpiar el contenido del modal
            const modalContent = document.getElementById('modalContent');
            if (modalContent) {
                modalContent.innerHTML = '';
            }
        }
        
        // Close materials modal if open
        const materialsModal = document.getElementById('materialsFloatingModal');
        if (materialsModal && !materialsModal.classList.contains('hidden')) {
            materialsModal.classList.add('hidden');
        }
        
        // Close any other floating modals
        const pbrModal = document.getElementById('pbrPreviewModal');
        if (pbrModal) {
            // Cleanup PBR scene if it exists
            if (window.adminInterface && window.adminInterface.experienceManager) {
                window.adminInterface.experienceManager.cleanupPBRScene();
            }
            pbrModal.remove();
        }
        
        const infoModal = document.getElementById('materialInfoModal');
        if (infoModal) {
            infoModal.remove();
        }
        
        // Modal cleanup - no longer needed with modular system
    }

    static showModal() {
        const modal = document.getElementById('modalOverlay');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    }

    static createLoadingSpinner(container, message = 'Cargando...') {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <div class="spinner-animation"></div>
            <p>${message}</p>
        `;
        
        if (container) {
            container.innerHTML = '';
            container.appendChild(spinner);
        }
        
        return spinner;
    }

    static createFileDropZone(id, accept = '*', multiple = false) {
        const dropZone = document.createElement('div');
        dropZone.className = 'file-drop-zone';
        dropZone.id = id;
        dropZone.innerHTML = `
            <div class="drop-content">
                <div class="upload-icon">📁</div>
                <p>Arrastra archivos aquí o haz clic para seleccionar.</p>
                <input type="file" accept="${accept}" ${multiple ? 'multiple' : ''} style="display: none;">
            </div>
        `;
        
        const fileInput = dropZone.querySelector('input[type="file"]');
        
        // Add event listeners
        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const event = new CustomEvent('filesDropped', { 
                detail: { files: e.dataTransfer.files } 
            });
            dropZone.dispatchEvent(event);
        });
        
        fileInput.addEventListener('change', (e) => {
            const event = new CustomEvent('filesSelected', { 
                detail: { files: e.target.files } 
            });
            dropZone.dispatchEvent(event);
        });
        
        return dropZone;
    }

    static createProgressBar(progress = 0, text = '') {
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.innerHTML = `
            <div class="progress-fill" style="width: ${progress}%"></div>
            <span class="progress-text">${text}</span>
        `;
        
        return progressBar;
    }

    static updateProgressBar(progressBar, progress, text = '') {
        const fill = progressBar.querySelector('.progress-fill');
        const textSpan = progressBar.querySelector('.progress-text');
        
        if (fill) fill.style.width = `${progress}%`;
        if (textSpan) textSpan.textContent = text;
    }

    static createTabNavigation(tabs) {
        const tabNav = document.createElement('div');
        tabNav.className = 'tab-navigation';
        
        tabs.forEach(tab => {
            const button = document.createElement('button');
            button.className = `tab-button ${tab.active ? 'active' : ''}`;
            button.dataset.tab = tab.id;
            button.innerHTML = `
                ${tab.icon ? `<i class="${tab.icon}"></i>` : ''} 
                ${tab.label}
            `;
            tabNav.appendChild(button);
        });
        
        return tabNav;
    }

    static createFormGroup(label, input, required = false) {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.innerHTML = `
            <label>${label}${required ? '*' : ''}</label>
            ${input}
            ${required ? '<span class="required-indicator">*</span>' : ''}
        `;
        
        return group;
    }

    static createButton(text, className = 'btn', onclick = null) {
        const button = document.createElement('button');
        button.className = className;
        button.textContent = text;
        if (onclick) button.addEventListener('click', onclick);
        
        return button;
    }

    static createCard(title, content, actions = []) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <h4>${title}</h4>
            </div>
            <div class="card-content">
                ${content}
            </div>
            ${actions.length > 0 ? `
                <div class="card-actions">
                    ${actions.map(action => `
                        <button class="btn ${action.class || 'btn-secondary'}" 
                                onclick="${action.onclick || ''}">
                            ${action.text}
                        </button>
                    `).join('')}
                </div>
            ` : ''}
        `;
        
        return card;
    }

    static createTable(headers, rows) {
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        rows.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(cell => {
                const td = document.createElement('td');
                td.innerHTML = cell;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        return table;
    }

    static createSearchBox(placeholder = 'Buscar...', onSearch = null) {
        const searchBox = document.createElement('div');
        searchBox.className = 'search-box';
        searchBox.innerHTML = `
            <i class="fas fa-search"></i>
            <input type="text" placeholder="${placeholder}">
        `;
        
        const input = searchBox.querySelector('input');
        if (onSearch) {
            input.addEventListener('input', (e) => onSearch(e.target.value));
        }
        
        return searchBox;
    }

    static createCheckbox(label, checked = false, onChange = null) {
        const checkbox = document.createElement('label');
        checkbox.className = 'checkbox-label';
        checkbox.innerHTML = `
            <input type="checkbox" ${checked ? 'checked' : ''}>
            <span>${label}</span>
        `;
        
        const input = checkbox.querySelector('input');
        if (onChange) {
            input.addEventListener('change', onChange);
        }
        
        return checkbox;
    }

    static createSelectDropdown(options, selected = '', onChange = null) {
        const select = document.createElement('select');
        select.className = 'form-select';
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            optionElement.selected = option.value === selected;
            select.appendChild(optionElement);
        });
        
        if (onChange) {
            select.addEventListener('change', onChange);
        }
        
        return select;
    }

    static createBadge(text, type = 'default') {
        const badge = document.createElement('span');
        badge.className = `badge badge-${type}`;
        badge.textContent = text;
        
        return badge;
    }

    static createTooltip(element, text) {
        element.title = text;
        element.classList.add('tooltip');
        
        return element;
    }

    static showConfirmDialog(message, onConfirm = null, onCancel = null) {
        const modal = this.createModal(
            'Confirmar acción',
            `<p>${message}</p>`,
            [
                {
                    text: 'Cancelar',
                    class: 'btn-secondary',
                    onclick: () => {
                        modal.remove();
                        if (onCancel) onCancel();
                    }
                },
                {
                    text: 'Confirmar',
                    class: 'btn-primary',
                    onclick: () => {
                        modal.remove();
                        if (onConfirm) onConfirm();
                    }
                }
            ]
        );
        
        return modal;
    }

    static createEmptyState(icon, title, description, action = null) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <div class="empty-icon">${icon}</div>
            <h3>${title}</h3>
            <p>${description}</p>
            ${action ? `<button class="btn btn-primary" onclick="${action.onclick}">${action.text}</button>` : ''}
        `;
        
        return emptyState;
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validateRequired(value) {
        return value && value.toString().trim() !== '';
    }

    static validateLength(value, min = 0, max = Infinity) {
        const length = value ? value.toString().length : 0;
        return length >= min && length <= max;
    }
}
