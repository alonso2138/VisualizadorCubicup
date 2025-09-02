import { MaterialUploader } from './modules/MaterialUploader.js';
import { ExperienceManager } from './modules/ExperienceManagerModular.js';
import { UIComponents } from './modules/UIComponents.js';

export default class AdminInterface {
    constructor() {
        this.currentView = 'dashboard';
        this.materialUploader = null;
        this.experienceManager = null;
        this.UIComponents = UIComponents;
        this.init();
    }

    init() {
        try {
            this.clearDocument();
            this.loadBaseStructure();
            
            // Initialize managers BEFORE loading dashboard
            this.experienceManager = new ExperienceManager(this);
            
            this.loadDashboard();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error initializing AdminInterface:', error);
        }
    }

    clearDocument() {
        // Limpiar completamente el documento
        document.head.innerHTML = `
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Panel de Administrador</title>
            <link rel="stylesheet" href="/admin/styles.css">
        `;
        document.body.innerHTML = '';
        document.body.className = 'admin-body';
    }

    loadBaseStructure() {
        document.body.innerHTML = `
            <div class="admin-container">
                <header class="admin-header">
                    <div class="header-content">
                        <div class="logo-section">
                            <div class="logo-icon">⚙️</div>
                            <h1>Panel de administrador</h1>
                        </div>
                        <div class="header-actions">
                            <button class="btn btn-primary" data-action="create-experience">
                                Subir modelo
                            </button>
                            <button class="btn btn-secondary" data-action="material-uploader">
                                Subir materiales
                            </button>
                        </div>
                    </div>
                </header>

                <main class="admin-main">
                    <div class="content-container" id="contentContainer">
                        <!-- El contenido dinámico va aquí -->
                    </div>
                </main>

                <!-- Modal Container -->
                <div class="modal-overlay" id="modalOverlay">
                    <div class="modal-content" id="modalContent">
                        <!-- Contenido del modal -->
                    </div>
                </div>
            </div>
        `;
    }

    loadDashboard() {
        const container = document.getElementById('contentContainer');
        if (!container) {
            console.error('contentContainer element not found');
            return;
        }
        
        container.innerHTML = `
            <div class="dashboard">
                <div class="dashboard-header">
                    <h2>Modelos en línea</h2>
                </div>

                <div class="experiences-grid" id="experiencesGrid">
                    <!-- Las experiencias se cargarán aquí -->
                </div>
            </div>
        `;
        
        // Only load experiences if manager is available
        if (this.experienceManager) {
            this.experienceManager.loadExperiences();
        } else {
            console.error('ExperienceManager not initialized');
        }
    }

    attachEventListeners() {
        // Remove any existing listeners to prevent duplicates
        const existingHandler = document._adminClickHandler;
        if (existingHandler) {
            document.removeEventListener('click', existingHandler);
        }
        
        const clickHandler = (e) => {
            const action = e.target.dataset.action;
            
            switch(action) {
                case 'create-experience':
                    if (this.experienceManager) {
                        this.experienceManager.showCreateExperienceModal();
                    } else {
                        console.error('ExperienceManager not available');
                    }
                    break;
                    
                case 'material-uploader':
                    this.showMaterialUploader();
                    break;
                    
                case 'view-experience':
                    this.experienceManager.showExperienceDetails(e.target.dataset.id);
                    break;
         
                case 'edit-experience':
                    this.experienceManager.showEditExperienceModal(e.target.dataset.id);
                    break;
                    
                case 'back-to-dashboard':
                    this.loadDashboard();
                    break;
                    
                case 'close-modal':
                    this.UIComponents.closeModal(); 
                    break;
                    
                case 'next-step':
                case 'prev-step':
                case 'remove-file':
                case 'finish-experience':
                    if (this.experienceManager) {
                        this.experienceManager.handleStepNavigation(action, e.target);
                    }
                    break;
                    
                case 'copy-link':
                case 'copy-generated-link':
                    if (this.experienceManager) {
                        this.experienceManager.copyLink(action, e.target);
                    }
                    break;
                    
                case 'delete-experience':
                    if (confirm('¿Estás seguro de que quieres eliminar esta experiencia?')) {
                        this.experienceManager.deleteExperience(e.target.dataset.id);
                    }
                    break;
            }
        };
        
        // Store reference to handler and add listener
        document._adminClickHandler = clickHandler;
        document.addEventListener('click', clickHandler);
    }

    showMaterialUploader() {
        const container = document.getElementById('contentContainer');
        
        // Initialize MaterialUploader if not already done
        if (!this.materialUploader) {
            this.materialUploader = new MaterialUploader(this);
        }
        
        container.innerHTML = this.materialUploader.render();
        this.materialUploader.initializeAfterRender();
    }

    showNotification(message, type = 'info') {
        this.UIComponents.showNotification(message, type);
    }
}

// Initialize admin interface and make it globally available
window.adminInterface = new AdminInterface();
