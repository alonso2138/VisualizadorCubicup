// ExperienceRenderer - HTML templates and rendering for experience creation steps
// Extracted from ExperienceManager for better modularity

export class ExperienceRenderer {
    constructor() {
        // This class handles all HTML template generation
    }

    renderStep1() {
        return `
            <div class="step-1">
                <h4>Deja tu archivo aquí (glb)</h4>
                <div class="file-drop-zone" id="fileDropZone">
                    <div class="drop-content">
                        <div class="upload-icon">📁</div>
                        <p>Arrastra tu archivo GLB aquí o haz clic para seleccionar</p>
                        <p class="file-hint">Archivos soportados: .glb (máximo 100MB)</p>
                    </div>
                </div>
                
                <div class="file-info" id="fileInfo" style="display: none;">
                    <div class="file-details">
                        <div class="file-icon">📦</div>
                        <div class="file-meta">
                            <p class="file-name" id="fileName"></p>
                            <p class="file-size" id="fileSize"></p>
                        </div>
                        <button class="btn-remove" id="removeFileBtn" title="Eliminar archivo">🗑️</button>
                    </div>
                    
                    <div class="upload-progress" id="uploadProgress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill"></div>
                        </div>
                        <p class="progress-text" id="progressText">Subiendo...</p>
                    </div>
                </div>
                
                <div class="file-error" id="fileError" style="display: none;"></div>
                
                <input type="file" id="fileInput" accept=".glb" style="display: none;">
            </div>
        `;
    }

    renderStep2() {
        return `
            <div class="step-2">
                <div class="model-viewer-fullwidth">
                    <div class="viewer-header">
                        <h4>Vista previa del modelo</h4>
                        <div class="viewer-controls">
                            <button class="btn btn-sm" id="showMaterialsBtn">📚 Mostrar Materiales</button>
                            <button class="btn btn-sm" id="showPresetsBtn">📚 Mostrar Presets</button>
                            <button class="btn btn-sm" id="resetCameraBtn">↻ Reset Camera</button>
                            <button class="btn btn-sm" id="reloadModelBtn">🔄 Recargar</button>
                        </div>
                    </div>
                    
                    <div id="threeContainer" class="three-container-fullwidth">
                        <!-- Three.js will be rendered here -->
                    </div>
                </div>
            </div>
        `;
    }

    renderStep3() {
        return `
            <div class="step-3">
                <h4>Vista previa experiencia</h4>
                <div class="preview-summary">
                    <p><strong>Configuraciones:</strong> 1</p>
                    <p><strong>Archivo base:</strong> archivo.glb</p>
                </div>
                <div class="preview-placeholder large">
                    <div class="model-icon">🏠</div>
                    <p>Vista previa final</p>
                </div>
            </div>
        `;
    }

    renderStep4() {
        return `
            <div class="step-4">
                <h4>🎉 Experiencia creada con éxito</h4>
                
                <div class="success-content">
                    <div class="success-icon">✅</div>
                    <p class="success-message">Tu experiencia ha sido creada y está disponible en línea</p>
                    
                    <div class="generated-link">
                        <label>Link de la experiencia:</label>
                        <div class="link-container">
                            <input type="text" readonly value="" id="generatedExperienceLink">
                            <button class="btn btn-sm" data-action="copy-generated-link" title="Copiar enlace">📋</button>
                        </div>
                    </div>
                    
                    <div class="success-actions">
                        <button class="btn btn-primary" data-action="back-to-dashboard">
                            Volver al Dashboard
                        </button>
                        <button class="btn btn-secondary" onclick="window.open('', '_blank')">
                            Abrir Experiencia
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderExperiencesList(experiences) {
        if (!experiences || experiences.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <p>No hay experiencias creadas</p>
                </div>
            `;
        }

        return experiences.map(exp => `
            <div class="experience-card" data-id="${exp.id}">
                <div class="experience-header">
                    <h3>${exp.name || exp.id}</h3>
                    <span class="experience-date">${new Date(exp.date).toLocaleDateString()}</span>
                </div>
                <div class="experience-actions">
                    <button class="btn-icon" data-action="view-experience" data-id="${exp.id}" title="Ver detalles">
                        👁️
                    </button>
                    <button class="btn-icon" data-action="edit-experience" data-id="${exp.id}" title="Editar">
                        ✏️
                    </button>
                    <button class="btn-icon btn-danger" data-action="delete-experience" data-id="${exp.id}" title="Eliminar">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderExperienceDetails(experience) {
        return `
            <div class="experience-details">
                <div class="details-header">
                    <button class="btn-back" data-action="back-to-dashboard">
                        ← Volver a experiencias
                    </button>
                    <h2>${experience.name || experience.id}</h2>
                </div>

                <div class="details-content">
                    <div class="detail-item">
                        <label>Creado el:</label>
                        <span>${new Date(experience.date).toLocaleDateString()}</span>
                    </div>
                    <div class="detail-item">
                        <label>Link de experiencia:</label>
                        <div class="link-container">
                            <input type="text" readonly value="http://localhost:5173/viewer?project=${experience.id}" id="experienceLink">
                            <button class="btn btn-sm" data-action="copy-link">📋</button>
                        </div>
                    </div>
                    <div class="detail-item">
                        <label>Estado:</label>
                        <span class="status-badge active">Activa</span>
                    </div>
                </div>

                <div class="details-actions">
                    <button class="btn btn-primary" onclick="window.open('http://localhost:5173/viewer?project=${experience.id}', '_blank')">
                        Abrir Experiencia
                    </button>
                    <button class="btn btn-danger" data-action="delete-experience" data-id="${experience.id}">
                        Eliminar Experiencia
                    </button>
                </div>
            </div>
        `;
    }

    renderCreateExperienceModal() {
        return `
            <div class="modal-header">
                <h3>Crear nueva experiencia</h3>
                <button class="modal-close" data-action="close-modal">×</button>
            </div>
            
            <div class="modal-body">
                <div class="step-container">
                    <div class="step-header">
                        <div class="step-indicators">
                            <div class="step active" data-step="1">1</div>
                            <div class="step" data-step="2">2</div>
                            <div class="step" data-step="3">3</div>
                            <div class="step" data-step="4">4</div>
                        </div>
                    </div>
                    
                    <div class="step-content" id="stepContent">
                        <!-- Dynamic step content -->
                    </div>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn btn-secondary" id="prevStep" style="display: none;">
                    Anterior
                </button>
                <button class="btn btn-primary" id="nextStep" disabled>
                    Siguiente
                </button>
                <button class="btn btn-success" id="finishStep" style="display: none;" data-action="finish-experience">
                    Finalizar
                </button>
            </div>
        `;
    }

    // Utility methods for rendering dynamic content
    updateStepIndicators(currentStep) {
        document.querySelectorAll('.step').forEach((el, index) => {
            el.classList.toggle('active', index + 1 <= currentStep);
        });
    }

    updateButtonVisibility(step) {
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        const finishBtn = document.getElementById('finishStep');

        if (prevBtn) prevBtn.style.display = step > 1 ? 'block' : 'none';
        if (nextBtn) nextBtn.style.display = step < 4 ? 'block' : 'none';
        if (finishBtn) finishBtn.style.display = step === 4 ? 'block' : 'none';
    }

    showLoadingState(container, message = 'Cargando...') {
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    showErrorState(container, error) {
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <p>Error: ${error}</p>
                    <button class="btn btn-sm" onclick="location.reload()">Reintentar</button>
                </div>
            `;
        }
    }
}
