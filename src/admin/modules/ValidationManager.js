import { AdminConfig } from '../config.js';

export class ValidationManager {
    constructor() {
        this.rules = {};
        this.errors = {};
    }

    addRule(fieldName, ruleName, ruleFunction, errorMessage) {
        if (!this.rules[fieldName]) {
            this.rules[fieldName] = [];
        }
        
        this.rules[fieldName].push({
            name: ruleName,
            validate: ruleFunction,
            message: errorMessage
        });
    }

    addRequiredRule(fieldName, errorMessage = `${fieldName} es obligatorio`) {
        this.addRule(fieldName, 'required', (value) => {
            return value !== null && value !== undefined && value.toString().trim() !== '';
        }, errorMessage);
    }

    addLengthRule(fieldName, min, max, errorMessage = null) {
        if (!errorMessage) {
            errorMessage = `${fieldName} debe tener entre ${min} y ${max} caracteres`;
        }
        
        this.addRule(fieldName, 'length', (value) => {
            if (!value) return true; // Allow empty for optional fields
            const length = value.toString().length;
            return length >= min && length <= max;
        }, errorMessage);
    }

    addEmailRule(fieldName, errorMessage = `${fieldName} debe ser un email válido`) {
        this.addRule(fieldName, 'email', (value) => {
            if (!value) return true; // Allow empty for optional fields
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
        }, errorMessage);
    }

    addPatternRule(fieldName, pattern, errorMessage) {
        this.addRule(fieldName, 'pattern', (value) => {
            if (!value) return true; // Allow empty for optional fields
            return pattern.test(value);
        }, errorMessage);
    }

    addCustomRule(fieldName, ruleName, validator, errorMessage) {
        this.addRule(fieldName, ruleName, validator, errorMessage);
    }

    validate(data) {
        this.errors = {};
        let isValid = true;

        Object.keys(this.rules).forEach(fieldName => {
            const fieldRules = this.rules[fieldName];
            const fieldValue = data[fieldName];
            const fieldErrors = [];

            fieldRules.forEach(rule => {
                if (!rule.validate(fieldValue)) {
                    fieldErrors.push(rule.message);
                    isValid = false;
                }
            });

            if (fieldErrors.length > 0) {
                this.errors[fieldName] = fieldErrors;
            }
        });

        return isValid;
    }

    getErrors() {
        return this.errors;
    }

    getFieldErrors(fieldName) {
        return this.errors[fieldName] || [];
    }

    hasErrors() {
        return Object.keys(this.errors).length > 0;
    }

    clearErrors() {
        this.errors = {};
    }

    clearFieldErrors(fieldName) {
        delete this.errors[fieldName];
    }

    displayErrors(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        container.innerHTML = '';

        if (this.hasErrors()) {
            const errorList = document.createElement('div');
            errorList.className = 'validation-errors';
            
            Object.keys(this.errors).forEach(fieldName => {
                this.errors[fieldName].forEach(error => {
                    const errorItem = document.createElement('div');
                    errorItem.className = 'error-item';
                    errorItem.textContent = error;
                    errorList.appendChild(errorItem);
                });
            });

            container.appendChild(errorList);
        }
    }

    highlightFieldErrors(formSelector) {
        const form = document.querySelector(formSelector);
        if (!form) return;

        // Clear previous error highlighting
        form.querySelectorAll('.field-error').forEach(el => {
            el.classList.remove('field-error');
        });

        form.querySelectorAll('.field-error-message').forEach(el => {
            el.remove();
        });

        // Add error highlighting for fields with errors
        Object.keys(this.errors).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"], [data-property="${fieldName}"]`);
            if (field) {
                field.classList.add('field-error');
                
                // Add error message below field
                const errorMessage = document.createElement('div');
                errorMessage.className = 'field-error-message';
                errorMessage.textContent = this.errors[fieldName][0]; // Show first error
                
                field.parentNode.insertBefore(errorMessage, field.nextSibling);
            }
        });
    }

    static createMaterialValidator() {
        const validator = new ValidationManager();
        
        // Required fields
        validator.addRequiredRule('nombre', 'El nombre del material es obligatorio');
        validator.addRequiredRule('color', 'El color del material es obligatorio');
        validator.addRequiredRule('tipo', 'El tipo de material es obligatorio');
        
        // Length validations
        validator.addLengthRule('nombre', 2, 100, 'El nombre debe tener entre 2 y 100 caracteres');
        validator.addLengthRule('color', 2, 50, 'El color debe tener entre 2 y 50 caracteres');
        
        // Custom validations
        validator.addCustomRule('tipo', 'validType', (value) => {
            return ['textura', 'modelo'].includes(value);
        }, 'El tipo debe ser "textura" o "modelo"');
        
        validator.addCustomRule('formato', 'validFormat', (value) => {
            if (!value) return true; // Optional field
            // Pattern for format like "60x60cm", "90x20cm", etc.
            const formatPattern = /^\d+x\d+cm$/i;
            return formatPattern.test(value);
        }, 'El formato debe seguir el patrón "60x60cm"');
        
        return validator;
    }

    static createExperienceValidator() {
        const validator = new ValidationManager();
        
        validator.addRequiredRule('name', 'El nombre de la experiencia es obligatorio');
        validator.addLengthRule('name', 3, 100, 'El nombre debe tener entre 3 y 100 caracteres');
        
        validator.addCustomRule('file', 'hasFile', (value) => {
            return value instanceof File;
        }, 'Debe seleccionar un archivo GLB válido');
        
        validator.addCustomRule('file', 'validExtension', (value) => {
            if (!value) return false;
            const fileName = value.name.toLowerCase();
            return fileName.endsWith('.glb') || fileName.endsWith('.gltf');
        }, 'El archivo debe tener extensión .glb o .gltf');
        
        return validator;
    }

    static validateFileUpload(file, allowedTypes = [], maxSize = 50 * 1024 * 1024) {
        const errors = [];
        
        if (!file) {
            errors.push('No se ha seleccionado ningún archivo');
            return { isValid: false, errors };
        }
        
        // Check file size
        if (file.size > maxSize) {
            errors.push(`El archivo es demasiado grande. Tamaño máximo: ${this.formatBytes(maxSize)}`);
        }
        
        // Check file type
        if (allowedTypes.length > 0) {
            const isValidType = allowedTypes.some(type => {
                if (type.startsWith('.')) {
                    return file.name.toLowerCase().endsWith(type);
                } else {
                    return file.type.startsWith(type);
                }
            });
            
            if (!isValidType) {
                errors.push(`Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(', ')}`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static debounceValidation(validationFunction, delay = 300) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => validationFunction.apply(this, args), delay);
        };
    }

    static validateSKU(sku) {
        // SKU should be alphanumeric and underscores, 3-20 characters
        const skuPattern = /^[A-Z0-9_]{3,20}$/;
        return {
            isValid: skuPattern.test(sku),
            message: skuPattern.test(sku) ? '' : 'SKU debe tener 3-20 caracteres alfanuméricos y guiones bajos'
        };
    }

    static validateHashtags(hashtagsString) {
        if (!hashtagsString || hashtagsString.trim() === '') {
            return { isValid: true, hashtags: [] };
        }
        
        const hashtags = hashtagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
        const invalidTags = hashtags.filter(tag => {
            // Each hashtag should be 2-30 characters, no special characters except hyphen
            return !/^[a-zA-Z0-9\-áéíóúñü\s]{2,30}$/i.test(tag);
        });
        
        return {
            isValid: invalidTags.length === 0,
            hashtags: hashtags,
            invalidTags: invalidTags,
            message: invalidTags.length > 0 ? `Hashtags inválidos: ${invalidTags.join(', ')}` : ''
        };
    }

    static async validateDuplicateSKU(sku) {
        try {
            const response = await fetch(AdminConfig.getApiUrl(`/api/materials/check/${sku}`));
            if (response.ok) {
                const result = await response.json();
                return {
                    isValid: !result.exists,
                    message: result.exists ? 'Este SKU ya existe' : ''
                };
            }
        } catch (error) {
            console.error('Error checking SKU:', error);
            return {
                isValid: true,
                message: 'No se pudo verificar duplicados'
            };
        }
        
        return { isValid: true, message: '' };
    }

    static createRealTimeValidator(inputElement, validator, fieldName) {
        let timeoutId;
        
        const validateField = () => {
            const value = inputElement.value;
            const data = { [fieldName]: value };
            
            // Clear previous errors for this field
            validator.clearFieldErrors(fieldName);
            
            // Validate only this field
            const fieldRules = validator.rules[fieldName] || [];
            const fieldErrors = [];
            
            fieldRules.forEach(rule => {
                if (!rule.validate(value)) {
                    fieldErrors.push(rule.message);
                }
            });
            
            // Update field appearance
            inputElement.classList.remove('field-error', 'field-valid');
            
            const existingErrorMessage = inputElement.parentNode.querySelector('.field-error-message');
            if (existingErrorMessage) {
                existingErrorMessage.remove();
            }
            
            if (fieldErrors.length > 0) {
                inputElement.classList.add('field-error');
                validator.errors[fieldName] = fieldErrors;
                
                const errorMessage = document.createElement('div');
                errorMessage.className = 'field-error-message';
                errorMessage.textContent = fieldErrors[0];
                inputElement.parentNode.insertBefore(errorMessage, inputElement.nextSibling);
            } else {
                inputElement.classList.add('field-valid');
            }
        };
        
        const debouncedValidate = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(validateField, 300);
        };
        
        inputElement.addEventListener('input', debouncedValidate);
        inputElement.addEventListener('blur', validateField);
        
        return {
            validate: validateField,
            destroy: () => {
                inputElement.removeEventListener('input', debouncedValidate);
                inputElement.removeEventListener('blur', validateField);
                clearTimeout(timeoutId);
            }
        };
    }
}
