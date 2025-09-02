// UI Templates for MaterialUploader
export class UITemplates {
    static renderMainContainer() {
        return `
            <div class="material-uploader">
                <div class="uploader-header">
                    <button class="btn-back" data-action="back-to-dashboard">
                        ← Volver al dashboard
                    </button>
                    <h2><i class="fas fa-cube"></i>Materiales</h2>
                </div>

                <div class="tab-navigation">
                    <button class="tab-button active" data-tab="upload">
                        <i class="fas fa-upload"></i> Subir Materiales
                    </button>
                    <button class="tab-button" data-tab="manage">
                        <i class="fas fa-cogs"></i> Gestionar Materiales
                    </button>
                </div>

                <div class="uploader-content">
                    <div id="upload-tab" class="tab-content active">
                        ${this.renderUploadTab()}
                    </div>
                    <div id="manage-tab" class="tab-content">
                        ${this.renderManageTab()}
                    </div>
                </div>

                ${this.renderEditModal()}
            </div>
        `;
    }

    static renderUploadTab() {
        return `
            <div class="upload-section">
                <div class="file-drop-zone" id="materialUploadArea" style="
                    border: 2px dashed #ccc;
                    border-radius: 8px;
                    padding: 40px;
                    text-align: center;
                    cursor: pointer;
                    background-color: #f9f9f9;
                    transition: all 0.3s ease;
                    min-height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                " onmouseover="this.style.borderColor='#007bff'; this.style.backgroundColor='#f0f8ff';" 
                   onmouseout="this.style.borderColor='#ccc'; this.style.backgroundColor='#f9f9f9';">

                <style>
                    .file-drop-zone.drag-over {
                        border-color: #007bff !important;
                        background-color: #e3f2fd !important;
                        transform: scale(1.02);
                    }
                </style>
                    <div class="drop-content">
                        <div class="upload-icon" style="font-size: 48px; margin-bottom: 16px;">☁️</div>
                        <h3 style="margin: 16px 0; color: #333;">Arrastra archivos aquí o haz clic para seleccionar</h3>
                        <p style="margin: 8px 0; color: #666;">Soporta: JPG, PNG, JPEG, WEBP (texturas) y GLB (modelos 3D)</p>
                        <p class="supported-formats" style="margin: 8px 0; color: #999; font-size: 14px;">Tamaño máximo: 50MB por archivo</p>
                    </div>
                    <input type="file" id="materialFileInput" multiple accept="image/*,.glb" style="display: none;">
                </div>
            </div>

            <div id="materialPreviewSection" class="preview-section" style="display: none;">
                <h3>Vista previa de materiales</h3>
                <div id="materialPreviewContainer" class="material-preview-container"></div>
                
                <div class="action-buttons">
                    <button id="validateMaterialsBtn" class="btn btn-primary" disabled>
                        ✅ Validar Materiales
                    </button>
                    <button id="saveAllMaterialsBtn" class="btn btn-success" style="display: none;" disabled>
                        💾 Subir materiales
                    </button>
                </div>
            </div>
        `;
    }

    static renderManageTab() {
        return `
            <div class="materials-container">
                <div class="materials-header">
                    <h3>Gestión de Materiales</h3>
                    <div class="materials-controls">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="materialSearchInput" placeholder="Buscar por SKU, nombre o color...">
                        </div>
                        <select class="filter-select" id="typeFilter">
                            <option value="">Todos los tipos</option>
                            <option value="textura">Textura</option>
                            <option value="modelo">Modelo</option>
                        </select>
                        <button class="btn btn-secondary" id="refreshMaterialsBtn">
                            <i class="fas fa-sync-alt"></i> Actualizar
                        </button>
                    </div>
                </div>
                
                <div class="materials-list" id="materialsGrid">
                    <!-- Los materiales se cargarán aquí -->
                </div>
            </div>
        `;
    }

    static renderEditModal() {
        return `
            <div class="modal-overlay" id="editMaterialModal">
                <div class="modal-content modern-edit-modal">
                    <div class="modal-header">
                        <div class="modal-title-section">
                            <h3>✏️ Editar Material</h3>
                            <p class="modal-subtitle">Modifica las propiedades del material</p>
                        </div>
                        <button class="modal-close" data-action="close-edit-modal">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="edit-content-grid">
                            <div class="material-preview-section">
                                <div class="preview-container">
                                    <div class="preview-image" id="editPreviewImage">
                                        <div class="preview-placeholder">
                                            <span class="preview-icon">🎨</span>
                                            <p>Vista previa del material</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="material-form-section">
                                <form id="editMaterialForm">
                                    <input type="hidden" id="editSku">
                                    
                                    <div class="form-section">
                                        <h4 class="section-title">Información básica</h4>
                                        
                                        <div class="form-group">
                                            <label for="editNombre">Nombre del material <span class="required">*</span></label>
                                            <input type="text" id="editNombre" required placeholder="Nombre descriptivo del material">
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="editFormato">Formato/Dimensiones</label>
                                            <input type="text" id="editFormato" placeholder="ej: 60x60cm, 30x90cm">
                                        </div>
                                    </div>
                                    
                                    <div class="form-section">
                                        <h4 class="section-title">Propiedades adicionales</h4>
                                        
                                        <div class="form-group">
                                            <label for="editHashtags">Tags/Etiquetas <span class="required">*</span></label>
                                            <input type="text" id="editHashtags" required placeholder="moderno, minimalista, elegante">
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="editAcabado">Acabado</label>
                                            <input type="text" id="editAcabado" placeholder="ej: Mate, Brillo, Satinado">
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer modern-footer">
                        <div class="footer-actions">
                            <div class="pbr-actions">
                                <button type="button" class="btn btn-info" data-action="generate-pbr" id="generatePbrBtn">
                                    <span class="icon">🔧</span> Generar PBR
                                </button>
                                <button type="button" class="btn btn-primary" data-action="preview-pbr" id="previewPbrBtn">
                                    <span class="icon">👁️</span> Preview PBR
                                </button>
                            </div>
                            <div class="main-actions">
                                <button type="button" class="btn btn-secondary" data-action="close-edit-modal">
                                    <span class="icon">❌</span> Cancelar
                                </button>
                                <button type="button" class="btn btn-success" data-action="save-material">
                                    <span class="icon">💾</span> Guardar cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static createPreviewItem(fileData, index) {
        const isModelFile = fileData.isGLB;
        const isTexture = fileData.isTexture;
        const autoFilledClass = fileData.properties.isAutoFilled ? 'auto-filled' : 'manual-entry';
        
        let previewContent = '';
        if (fileData.isGLB) {
            previewContent = `
                <div class="preview-model">
                    <i class="fas fa-cube model-icon"></i>
                    <span>Modelo 3D</span>
                </div>
            `;
        } else {
            let imagePath = fileData.path;

            previewContent = `
                <div class="preview-image">
                    <img src="${imagePath}" alt="${fileData.originalName}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="image-placeholder" style="display: none;">
                        <i class="fas fa-image"></i>
                        <p>Imagen no disponible</p>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="material-preview-item ${autoFilledClass}" data-index="${index}">
                <div class="preview-layout">
                    <div class="preview-image-section">
                        ${previewContent}
                        <div class="file-info">
                            <h4>${fileData.originalName}</h4>
                            <div class="file-meta">
                                <span class="file-type ${fileData.fileType}">${fileData.fileType}</span>
                                <span class="file-size">${(fileData.size / 1024 / 1024).toFixed(2)} MB</span>
                                ${fileData.properties.isAutoFilled ? 
                                    '<span class="auto-fill-badge">Auto</span>' : 
                                    '<span class="manual-badge">Manual</span>'
                                }
                            </div>
                        </div>
                        ${isTexture && fileData.canGeneratePBR ? `
                            <div class="pbr-section">
                                <label class="pbr-checkbox-label">
                                    <input type="checkbox" class="pbr-checkbox" data-index="${index}" 
                                           ${fileData.properties.generatePBR ? 'checked' : ''}>
                                    <span class="pbr-text">Generar PBR</span>
                                </label>
                                ${fileData.pbrStatus === 'generating' ? `
                                    <div class="auto-generation-notice">
                                        <div class="generation-spinner">⚡</div>
                                        <span>Generando PBR automáticamente...</span>
                                    </div>
                                ` : ''}
                                <div class="pbr-actions">
                                    <button class="btn-pbr-generate" data-action="generate-pbr" data-index="${index}"
                                            id="generatePBR-${index}" ${fileData.pbrStatus === 'generating' ? 'disabled' : ''}>
                                        ${fileData.pbrStatus === 'generating' ? '⏳ Generando automáticamente...' : 
                                          fileData.pbrStatus === 'ready' ? '✅ PBR Generado' : '🔧 Generar PBR'}
                                    </button>
                                    <button class="btn-pbr-preview" data-action="preview-pbr" data-index="${index}"
                                            id="previewPBR-${index}" ${fileData.pbrStatus !== 'ready' ? 'disabled style="opacity: 0.5;"' : ''}>
                                        👁️ Preview PBR
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="preview-properties-section">
                        <div class="properties-grid">
                            <div class="property-row">
                                <div class="property-group">
                                    <label>SKU*</label>
                                    <input type="text" class="property-input required" data-property="nombre" data-index="${index}"
                                           value="${fileData.properties.nombre || fileData.sku}" 
                                           placeholder="SKU del material">
                                </div>
                                <div class="property-group">
                                    <label>Formato</label>
                                    <input type="text" class="property-input" data-property="formato" data-index="${index}"
                                           value="${fileData.properties.formato || ''}" 
                                           placeholder="60x60cm, 90x20cm">
                                </div>
                            </div>
                            
                            <div class="property-row">
                                <div class="property-group">
                                    <label>Hashtags</label>
                                    <input type="text" class="property-input" data-property="hashtags" data-index="${index}"
                                           value="${fileData.properties.hashtags ? fileData.properties.hashtags.join(', ') : ''}" 
                                           placeholder="suelo, paredes, baño...">
                                </div>
                                <div class="property-group property-type-display">
                                    <label>Tipo (auto)</label>
                                    <span class="type-indicator ${fileData.fileType}">${fileData.fileType}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="preview-actions">
                        <button class="btn-remove" onclick="materialUploader.removeFile(${index})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    static renderMaterialItem(material) {
        return `
            <div class="material-item" data-material-id="${material.id}">
                <div class="material-preview">
                    <img src="/materials/${material.id}/${material.id}_Color.png" 
                         alt="${material.nombre || material.id}"
                         onerror="this.src='/materials/${material.id}/${material.id}_Color.jpg'; this.onerror=null;">
                </div>
                <div class="material-info">
                    <h4>${material.nombre || material.id}</h4>
                    <p class="material-type">${material.tipo || 'textura'}</p>
                </div>
                <div class="material-actions">
                    <button class="btn btn-sm btn-primary" onclick="materialUploader.previewMaterial3D('${material.id}')">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="materialUploader.editMaterial('${material.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="materialUploader.deleteMaterial('${material.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }

    static renderEmptyState(message = 'No hay materiales disponibles') {
        return `
            <div class="empty-state">
                <i class="fas fa-box"></i>
                <h3>${message}</h3>
                <p>Sube algunos materiales para comenzar</p>
            </div>
        `;
    }

    static renderPreviewPlaceholder() {
        return `
            <div class="preview-placeholder">
                <span class="preview-icon">🎨</span>
                <p>Sin imagen de vista previa</p>
            </div>
        `;
    }
}
