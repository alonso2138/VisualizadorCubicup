// FileUploadManager - Handles file uploads, validation and drag & drop
// Extracted from ExperienceManager for better modularity

export class FileUploadManager {
    constructor() {
        this.selectedFile = null;
        this.uploadedFilePath = null;
    }

    attachFileDropListeners() {
        const dropZone = document.getElementById('fileDropZone');
        const fileInput = document.getElementById('fileInput');
        const removeBtn = document.getElementById('removeFileBtn');

        if (dropZone && fileInput) {
            // Drag and drop events
            dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
            dropZone.addEventListener('drop', this.handleDrop.bind(this));
            
            // Click to select file
            dropZone.addEventListener('click', () => fileInput.click());
            
            // File input change
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelect(e.target.files[0]);
                }
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', this.removeSelectedFile.bind(this));
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        const dropZone = e.currentTarget;
        dropZone.classList.add('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const dropZone = e.currentTarget;
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect(files[0]);
        }
    }

    handleFileSelect(file) {
        // Clear any previous errors
        this.clearError();

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.glb')) {
            this.showError('Por favor, selecciona un archivo GLB válido.');
            return;
        }

        // Validate file size (minimum check)
        const minSize = 1024; // 1KB minimum
        const maxSize = 100 * 1024 * 1024; // 100MB maximum

        if (file.size < minSize) {
            this.showError('El archivo es demasiado pequeño. Mínimo 1KB requerido.');
            return;
        }

        if (file.size > maxSize) {
            this.showError('El archivo es demasiado grande. Máximo 100MB permitido.');
            return;
        }

        // Store selected file
        this.selectedFile = file;

        // Update UI
        this.updateFileDisplay(file);

        // Upload file
        this.uploadFile(file);
    }

    updateFileDisplay(file) {
        const dropZone = document.getElementById('fileDropZone');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');

        if (dropZone && fileInfo && fileName && fileSize) {
            // Update file information
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);

            // Show file info and hide drop zone
            dropZone.style.display = 'none';
            fileInfo.style.display = 'block';
        }
    }

    async uploadFile(file) {
        const uploadProgress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const nextBtn = document.getElementById('nextStep');

        try {
            // Show progress
            if (uploadProgress && progressFill && progressText) {
                uploadProgress.style.display = 'block';
                progressFill.style.width = '0%';
                progressText.textContent = 'Subiendo archivo...';
            }

            const formData = new FormData();
            formData.append('model', file);

            const response = await fetch('/api/upload-temp-model', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Error al subir el archivo');
            }

            // Update progress to complete
            if (progressFill && progressText) {
                progressFill.style.width = '100%';
                progressText.textContent = 'Archivo subido correctamente';
            }

            // Store the uploaded file path
            this.uploadedFilePath = result.filePath;

            // Hide progress after a brief delay
            setTimeout(() => {
                if (uploadProgress) {
                    uploadProgress.style.display = 'none';
                }
            }, 1000);

            // Enable next button
            if (nextBtn) {
                nextBtn.disabled = false;
            }

            return {
                success: true,
                filePath: this.uploadedFilePath,
                file: file
            };

        } catch (error) {
            console.error('Upload error:', error);
            
            // Hide progress
            if (uploadProgress) {
                uploadProgress.style.display = 'none';
            }
            
            // Show error
            this.showError(`Error al subir el archivo: ${error.message}`);
            
            // Keep next button disabled
            if (nextBtn) {
                nextBtn.disabled = true;
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    removeSelectedFile() {
        const dropZone = document.getElementById('fileDropZone');
        const fileInfo = document.getElementById('fileInfo');
        const fileInput = document.getElementById('fileInput');
        const nextBtn = document.getElementById('nextStep');

        if (dropZone && fileInfo && fileInput) {
            // Reset UI
            dropZone.style.display = 'flex';
            fileInfo.style.display = 'none';
            fileInput.value = '';

            // Clear file data
            this.selectedFile = null;
            this.uploadedFilePath = null;

            // Disable next button
            if (nextBtn) {
                nextBtn.disabled = true;
            }

            // Clear any errors
            this.clearError();
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        const errorElement = document.getElementById('fileError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    clearError() {
        const errorElement = document.getElementById('fileError');
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
    }

    // Validation methods
    validateFileType(file) {
        const allowedExtensions = ['.glb'];
        const fileName = file.name.toLowerCase();
        return allowedExtensions.some(ext => fileName.endsWith(ext));
    }

    validateFileSize(file, minSize = 1024, maxSize = 100 * 1024 * 1024) {
        return file.size >= minSize && file.size <= maxSize;
    }

    // Getters
    getSelectedFile() {
        return this.selectedFile;
    }

    getUploadedFilePath() {
        return this.uploadedFilePath;
    }

    hasUploadedFile() {
        return !!this.uploadedFilePath;
    }

    // Reset method
    reset() {
        this.selectedFile = null;
        this.uploadedFilePath = null;
        this.clearError();
    }
}
