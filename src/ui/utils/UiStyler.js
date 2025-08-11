/**
 * Clase utilitaria para mantener estilos consistentes en la interfaz
 */
export default class UiStyler {
    /**
     * Crea una instancia del estilizador UI
     * @param {Object} theme - Tema personalizado (opcional)
     */
    constructor(theme = {}) {
        // Colores base del tema
        this.colors = {
            primary: '#2196F3',         // Azul
            secondary: '#9C27B0',       // Púrpura
            success: '#4CAF50',         // Verde
            danger: '#F44336',          // Rojo
            warning: '#FFC107',         // Amarillo
            info: '#03A9F4',            // Azul claro
            light: '#F5F5F5',           // Claro
            dark: '#212121',            // Oscuro
            background: '#333',         // Fondo
            surface: 'rgba(255, 255, 255, 0.1)', // Superficie
            overlay: 'rgba(0, 0, 0, 0.7)', // Overlay
            text: '#FFFFFF',            // Texto principal
            textSecondary: 'rgba(255, 255, 255, 0.7)', // Texto secundario
            border: 'rgba(255, 255, 255, 0.2)', // Borde
            ...theme.colors
        };
        
        // Dimensiones y espaciados
        this.spacing = {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px',
            ...theme.spacing
        };
        
        // Bordes
        this.border = {
            radius: {
                sm: '3px',
                md: '4px',
                lg: '8px',
                pill: '50px'
            },
            width: '1px',
            style: 'solid',
            ...theme.border
        };
        
        // Tipografía
        this.typography = {
            fontFamily: 'Arial, sans-serif',
            fontSize: {
                xs: '11px',
                sm: '12px',
                md: '14px',
                lg: '16px',
                xl: '18px',
                xxl: '24px'
            },
            fontWeight: {
                regular: '400',
                medium: '500',
                bold: '700'
            },
            ...theme.typography
        };
        
        // Sombras
        this.shadows = {
            sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
            md: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
            lg: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
            ...theme.shadows
        };
        
        // Transiciones
        this.transitions = {
            fast: 'all 0.2s ease',
            normal: 'all 0.3s ease',
            slow: 'all 0.5s ease',
            ...theme.transitions
        };
    }
    
    /**
     * Aplica estilos a un botón
     * @param {HTMLElement} button - Elemento HTML del botón
     * @param {string} variant - Variante del botón (primary, secondary, success, danger, etc.)
     * @param {Object} options - Opciones adicionales
     */
    applyButtonStyle(button, variant = 'primary', options = {}) {
        const color = this.colors[variant] || this.colors.primary;
        
        button.style.padding = `${options.paddingY || this.spacing.sm} ${options.paddingX || this.spacing.md}`;
        button.style.backgroundColor = color;
        button.style.color = this.colors.text;
        button.style.border = 'none';
        button.style.borderRadius = options.pill ? this.border.radius.pill : this.border.radius.md;
        button.style.cursor = 'pointer';
        button.style.fontFamily = this.typography.fontFamily;
        button.style.fontSize = this.typography.fontSize[options.size || 'md'];
        button.style.fontWeight = this.typography.fontWeight[options.weight || 'medium'];
        button.style.textAlign = 'center';
        button.style.transition = this.transitions.fast;
        
        if (options.width) button.style.width = options.width;
        if (options.margin) button.style.margin = options.margin;
        
        // Efecto hover
        button.onmouseenter = () => {
            button.style.filter = 'brightness(1.1)';
            button.style.transform = 'translateY(-1px)';
        };
        
        button.onmouseleave = () => {
            button.style.filter = 'brightness(1)';
            button.style.transform = 'translateY(0)';
        };
        
        // Efecto active
        button.onmousedown = () => {
            button.style.filter = 'brightness(0.9)';
            button.style.transform = 'translateY(1px)';
        };
        
        button.onmouseup = () => {
            button.style.filter = 'brightness(1.1)';
            button.style.transform = 'translateY(-1px)';
        };
    }
    
    /**
     * Aplica estilos a un contenedor
     * @param {HTMLElement} container - Elemento HTML del contenedor
     * @param {Object} options - Opciones de estilo
     */
    applyContainerStyle(container, options = {}) {
        container.style.backgroundColor = options.background || this.colors.surface;
        container.style.borderRadius = this.border.radius[options.radius || 'md'];
        container.style.padding = options.padding || this.spacing.md;
        container.style.color = options.color || this.colors.text;
        
        if (options.margin) container.style.margin = options.margin;
        if (options.width) container.style.width = options.width;
        if (options.maxHeight) container.style.maxHeight = options.maxHeight;
        if (options.overflow) container.style.overflow = options.overflow;
        
        if (options.shadow) {
            container.style.boxShadow = this.shadows[options.shadow] || options.shadow;
        }
        
        if (options.border) {
            container.style.border = `${this.border.width} ${this.border.style} ${this.colors.border}`;
        }
    }
    
    /**
     * Aplica estilos a un input
     * @param {HTMLElement} input - Elemento HTML del input
     * @param {Object} options - Opciones de estilo
     */
    applyInputStyle(input, options = {}) {
        input.style.width = options.width || '100%';
        input.style.padding = options.padding || `${this.spacing.sm} ${this.spacing.md}`;
        input.style.backgroundColor = options.background || 'rgba(255, 255, 255, 0.1)';
        input.style.border = options.noBorder ? 'none' : `${this.border.width} ${this.border.style} ${this.colors.border}`;
        input.style.borderRadius = this.border.radius[options.radius || 'md'];
        input.style.color = this.colors.text;
        input.style.fontFamily = this.typography.fontFamily;
        input.style.fontSize = this.typography.fontSize[options.size || 'md'];
        input.style.transition = this.transitions.fast;
        input.style.boxSizing = 'border-box';
        
        if (options.margin) input.style.margin = options.margin;
        
        // Focus style
        input.onfocus = () => {
            input.style.outline = 'none';
            input.style.borderColor = this.colors.primary;
            input.style.boxShadow = `0 0 0 2px ${this.colors.primary}33`;
        };
        
        input.onblur = () => {
            input.style.borderColor = this.colors.border;
            input.style.boxShadow = 'none';
        };
    }
    
    /**
     * Aplica estilos a un texto
     * @param {HTMLElement} element - Elemento HTML
     * @param {string} variant - Tipo de texto (title, subtitle, body, caption, etc.)
     * @param {Object} options - Opciones adicionales
     */
    applyTextStyle(element, variant = 'body', options = {}) {
        let fontSize, fontWeight, margin;
        
        switch(variant) {
            case 'title':
                fontSize = this.typography.fontSize.xxl;
                fontWeight = this.typography.fontWeight.bold;
                margin = `0 0 ${this.spacing.md} 0`;
                break;
            case 'subtitle':
                fontSize = this.typography.fontSize.xl;
                fontWeight = this.typography.fontWeight.medium;
                margin = `0 0 ${this.spacing.sm} 0`;
                break;
            case 'section':
                fontSize = this.typography.fontSize.lg;
                fontWeight = this.typography.fontWeight.bold;
                margin = `${this.spacing.md} 0 ${this.spacing.sm} 0`;
                break;
            case 'caption':
                fontSize = this.typography.fontSize.xs;
                fontWeight = this.typography.fontWeight.regular;
                margin = `${this.spacing.xs} 0`;
                break;
            case 'body':
            default:
                fontSize = this.typography.fontSize.md;
                fontWeight = this.typography.fontWeight.regular;
                margin = `0 0 ${this.spacing.sm} 0`;
        }
        
        element.style.fontFamily = this.typography.fontFamily;
        element.style.fontSize = options.size || fontSize;
        element.style.fontWeight = options.weight || fontWeight;
        element.style.margin = options.margin || margin;
        element.style.color = options.color || this.colors.text;
        
        if (options.align) element.style.textAlign = options.align;
        if (options.opacity) element.style.opacity = options.opacity;
        if (options.transform) element.style.textTransform = options.transform;
    }
    
    /**
     * Aplica estilos a un separador
     * @param {HTMLElement} element - Elemento HTML
     * @param {Object} options - Opciones de estilo
     */
    applySeparatorStyle(element, options = {}) {
        element.style.margin = options.margin || `${this.spacing.md} 0`;
        element.style.border = '0';
        element.style.height = '0';
        element.style.borderTop = `1px ${options.style || 'solid'} ${options.color || this.colors.border}`;
        
        if (options.width) element.style.width = options.width;
    }
    
    /**
     * Crea un elemento con los estilos aplicados
     * @param {string} tagName - Tipo de elemento HTML
     * @param {Object} styleOptions - Opciones de estilo
     * @param {Object} attributes - Atributos del elemento
     * @returns {HTMLElement} - El elemento creado
     */
    createElement(tagName, styleOptions = {}, attributes = {}) {
        const element = document.createElement(tagName);
        
        // Aplicar atributos
        Object.entries(attributes).forEach(([attr, value]) => {
            if (attr === 'textContent') {
                element.textContent = value;
            } else if (attr === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(attr, value);
            }
        });
        
        // Aplicar estilo según el tipo de elemento
        if (tagName === 'button') {
            this.applyButtonStyle(element, styleOptions.variant, styleOptions);
        } else if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
            this.applyInputStyle(element, styleOptions);
        } else if (tagName === 'div' || tagName === 'section') {
            this.applyContainerStyle(element, styleOptions);
        } else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'p' || tagName === 'span') {
            this.applyTextStyle(element, styleOptions.variant, styleOptions);
        } else if (tagName === 'hr') {
            this.applySeparatorStyle(element, styleOptions);
        }
        
        return element;
    }
    
    /**
     * Crea un botón con estilos
     * @param {string} text - Texto del botón
     * @param {string} variant - Variante de color
     * @param {Object} options - Opciones adicionales
     * @returns {HTMLButtonElement} - El botón creado
     */
    createButton(text, variant = 'primary', options = {}) {
        const button = this.createElement('button', 
            { variant, ...options }, 
            { textContent: text }
        );
        return button;
    }
    
    /**
     * Crea un contenedor
     * @param {Object} options - Opciones de estilo
     * @returns {HTMLDivElement} - El contenedor creado
     */
    createContainer(options = {}) {
        return this.createElement('div', options);
    }
    
    /**
     * Crea un input estilizado
     * @param {Object} options - Opciones y atributos
     * @returns {HTMLInputElement} - El input creado
     */
    createInput(options = {}) {
        const { type, placeholder, value, name, ...styleOptions } = options;
        
        return this.createElement('input', 
            styleOptions, 
            { type: type || 'text', placeholder, value, name }
        );
    }
    
    /**
     * Crea un título
     * @param {string} text - Texto del título
     * @param {string} level - Nivel del título (1-6)
     * @param {Object} options - Opciones adicionales
     * @returns {HTMLHeadingElement} - El título creado
     */
    createHeading(text, level = 3, options = {}) {
        const tagName = `h${level}`;
        const variant = level <= 2 ? 'title' : level === 3 ? 'subtitle' : 'section';
        
        return this.createElement(tagName, 
            { variant, ...options }, 
            { textContent: text }
        );
    }
    
    /**
     * Genera una combinación de color para hover/focus
     * @param {string} baseColor - Color base en hexadecimal
     * @param {number} factor - Factor de luminosidad (1.1 = 10% más brillante)
     * @returns {string} - Color resultante
     */
    adjustColor(baseColor, factor = 1.1) {
        // Convertir hex a RGB
        let r = parseInt(baseColor.substring(1, 3), 16);
        let g = parseInt(baseColor.substring(3, 5), 16);
        let b = parseInt(baseColor.substring(5, 7), 16);
        
        // Ajustar brillo
        r = Math.min(255, Math.round(r * factor));
        g = Math.min(255, Math.round(g * factor));
        b = Math.min(255, Math.round(b * factor));
        
        // Convertir de nuevo a hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    /**
     * Aplica un tema oscuro o claro
     * @param {boolean} isDark - Si debe aplicar tema oscuro
     */
    applyTheme(isDark = true) {
        if (isDark) {
            this.colors = {
                ...this.colors,
                background: '#333',
                surface: 'rgba(255, 255, 255, 0.1)',
                text: '#FFFFFF',
                textSecondary: 'rgba(255, 255, 255, 0.7)',
                border: 'rgba(255, 255, 255, 0.2)'
            };
        } else {
            this.colors = {
                ...this.colors,
                background: '#F5F5F5',
                surface: 'white',
                text: '#212121',
                textSecondary: 'rgba(0, 0, 0, 0.6)',
                border: 'rgba(0, 0, 0, 0.12)'
            };
        }
    }
}