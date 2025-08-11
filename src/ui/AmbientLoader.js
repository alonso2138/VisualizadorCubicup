export default class AmbientLoader {
    constructor() {
        // Todas las fuentes a cargar
        this.fontConfig = {
            Calacatas: {
                font: 'Playfair Display',
                url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&display=swap'
            },
            TextureColors: {
                font: 'Fredoka',
                url: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&display=swap'
            },
            RawColors: {
                font: 'Roboto Mono',
                url: 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap'
            },
            Neutrals: {
                font: 'Work Sans',
                url: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600&display=swap'
            }
        };

        // Cargar fuentes y estilos (incluye Neutrals)
        this.loadFontsAndStyles();

        // Cargar solo los ambientes que gestiona esta clase

        this.ambientes = ["Neutrals", "Calacatas", "TextureColors", "RawColors"];

        this.ambientes.forEach(ambiente => this.cargarAmbiente(ambiente));

        this.ambientes.forEach(nombre => {
        const panel = document.getElementById(nombre);
        if (panel) {
            panel.style.setProperty("--image-url", `url('materiales/Ambientes/${nombre}.png')`);
        }
        });
    }

    hideOthers(configDir, isExpanding) {
        console.log("Toggling visibility for " + configDir);
        
        // Get the clicked tab element
        const clickedPanel = document.getElementById(configDir);
        
        // If isExpanding is not provided, determine it based on current display state
        if (isExpanding === undefined && clickedPanel) {
            // If display is 'none' or '', we're expanding; if 'block', we're collapsing
            isExpanding = clickedPanel.style.display !== 'block';
        }
        
        this.ambientes.forEach(ambiente => {
            const panel = document.getElementById(ambiente);
            if (panel) {
                if (ambiente === configDir) {
                    // Always toggle the clicked tab
                    panel.style.display = isExpanding ? 'block' : '';
                } else {
                    // For other tabs: hide when expanding the clicked tab, show when collapsing
                    panel.style.display = isExpanding ? 'none' : '';
                }
            }
        });
    }

    cargarAmbiente(ambiente) {
        window.experience.clientInterface.createMainContainer(ambiente);
        window.experience.clientInterface.loadGroupsAndMaterials(ambiente);
    }

    loadFontsAndStyles() {
        const style = document.createElement('style');
        let cssRules = '';

        for (const [ambiente, data] of Object.entries(this.fontConfig)) {
            // Cargar fuente desde Google Fonts
            const link = document.createElement('link');
            link.href = data.url;
            link.rel = 'stylesheet';
            document.head.appendChild(link);

            // Aplicar regla CSS
            cssRules += `
            #${ambiente} { 
                font-family: '${data.font}', sans-serif; \n
            }
            `;
        }

        style.textContent = cssRules;
        document.head.appendChild(style);
    }
}
