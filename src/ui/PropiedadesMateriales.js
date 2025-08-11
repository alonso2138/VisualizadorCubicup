import EventEmitter from '../Utils/EventEmitter.js';

export default class PropiedadesMateriales extends EventEmitter {
    constructor() {
        super();
        this.data = null;
        this.box = null;
        this.injectPropertyBoxCSS();
        this.createPropertyBox();
        this.init();
    }

    async init() {
        // Cargamos JSON del servidor
        const response = await fetch(window.SERVER_URL + '/api/libro-azul');
        this.data = await response.json();
    }

    showPropertyBox(sku) {
        return;
        
        if (!this.box) this.createPropertyBox();

        if (!this.data || !this.data[sku]) {
            this.hidePropertyBox();
            return;
        }

        this.box.style.opacity = 0;
        this.box.style.display = 'block';
        setTimeout(() => {
            this.box.style.opacity = 1;
        }, 200);

        this.updatePropertyBox(sku);
    }

    hidePropertyBox() {
        console.log('hide')
        if (!this.box) return;

        this.box.style.opacity = 0;
        /*setTimeout(() => {
            this.box.style.display = 'none';
        }, 200);*/
    }

    createPropertyBox() {
        // Si ya existe, no lo crees de nuevo
        if (document.getElementById('material-property-box')) return;

        const box = document.createElement('div');
        box.id = 'material-property-box';
        box.className = 'material-glass-box';
        box.innerHTML = '<span style="color: #aaa">Selecciona un material</span>';
        document.body.appendChild(box);
        this.box = box;
    }

    updatePropertyBox(sku) {
        const mat = this.data[sku];
        this.box.innerHTML = `
            <button class="close-btn">&times;</button>
            <h3>${mat.MODELO} (${sku})</h3>
            <p><b>Marca:</b> ${mat.MARCA}</p>
            <p><b>Gama:</b> ${mat.GAMA}</p>
            <p><b>Acabado:</b> ${mat.ACABADO}</p>
            <p><b>Formato:</b> ${mat['CARACT. 1 (formato)'] || ''}</p>
            <p><b>Estilo:</b> ${mat['CARACT.3 (estilo)'] || ''}</p>
            <p><b>Uso:</b> ${mat['CARACT. 2 (uso)'] || ''}</p>
            <p><b>PVP:</b> ${mat['PVP (p)'] || ''}</p>
        `;

        // Call hidePropertyBox on close btn click
        const closeBtn = this.box.querySelector('.close-btn');
        closeBtn.onclick = () => this.hidePropertyBox();    
    }

    injectPropertyBoxCSS() {
        if (document.getElementById('material-glass-style')) return;
        const css = `
        #material-property-box.material-glass-box {
            position: fixed;
            top: 10px;
            right: 32px;
            min-width: 320px;
            max-width: 380px;
            padding: 16px;
            border-radius: 16px;
            background: rgba(18, 18, 18, 0.6);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.22);
            backdrop-filter: blur(13px) saturate(130%);
            -webkit-backdrop-filter: blur(13px) saturate(130%);
            border: 1px solid rgba(255,255,255,0.12);
            color: #fafafa;
            z-index: 1000;
            transition: all 0.2s;
            font-family: 'Inter', Arial, sans-serif;
            display: none;
        }
        #material-property-box h3 {
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 0.7em;
            font-weight: 700;
            color: #fff;
            letter-spacing: 0.01em;
        }
        #material-property-box p {
            margin: 0 0 6px 0;
            font-size: 0.6em;
            color: #e5e5e5;
        }
        #material-property-box .close-btn {
            position: absolute;
            top: 18px;
            right: 18px;
            background: transparent;
            border: none;
            font-size: 1.6em;
            color: #ddd;
            cursor: pointer;
            transition: color 0.1s;
            z-index: 10001;
        }
        #material-property-box .close-btn:hover {
            color: #ff6363;
        }

        @media (max-width: 600px) {
            #material-property-box.material-glass-box{
                top: 10px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
            }
        }

        `;
        const style = document.createElement('style');
        style.id = 'material-glass-style';
        style.innerHTML = css;
        document.head.appendChild(style);
    }
}
