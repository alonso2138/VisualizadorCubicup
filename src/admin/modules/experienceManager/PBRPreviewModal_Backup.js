export class PBRPreviewModal {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.mesh = null;
        this.material = null;
        this.animateId = null;
        this.currentGeometry = 'sphere';
        this.materialOptions = {};
        this.sku = null;
        this.ground = null;
        this.mapToggles = {
            color: true,
            normal: true,
            roughness: true,
            metalness: true,
            ao: true
        };
    }

    show(materialId) {
        console.log(materialId);
        this.sku = materialId;
        this.createModal(materialId);
        const modal = document.getElementById('pbrPreviewModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
        this.initializePreview(materialId);
    }

    createModal(materialId) {
        // Eliminar modal existente si lo hay
        const existingModal = document.getElementById('pbrPreviewModal');
        if (existingModal) existingModal.remove();

        // Inyectar CSS moderno y comprimido solo una vez
        if (!document.getElementById('pbr-preview-modal-css')) {
            const style = document.createElement('style');
            style.id = 'pbr-preview-modal-css';
            style.textContent = `
            .pbr-modal-ovl {position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(30,34,44,0.18);z-index:10000;display:flex;align-items:center;justify-content:center;}
            .pbr-modal-main {background:#fff;border-radius:18px;box-shadow:0 8px 32px rgba(0,0,0,0.18);padding:0;display:flex;flex-direction:row;min-width:600px;max-width:900px;overflow:hidden;height:70vh;min-height:340px;}
            .pbr-modal-left {flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 8px 14px 14px;min-width:260px;}
            .pbr-modal-title {font-size:15px;font-weight:600;margin-bottom:6px;text-align:left;width:100%;color:#223;}
            .pbr-canvas-wrap {width:100%;height:100%;background:#f5f7fa;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.07);display:flex;align-items:center;justify-content:center;}
            .pbr-modal-right {width:150px;padding:14px 8px 14px 0;display:flex;flex-direction:column;gap:6px;}
            .pbr-close-btn {align-self:flex-end;background:none;border:none;font-size:16px;color:#888;cursor:pointer;margin-bottom:2px;transition:color .2s;}
            .pbr-close-btn:hover {color:#222;}
            .pbr-section {margin-bottom:4px;}
            .pbr-section label {font-weight:600;font-size:11px;display:block;margin-bottom:1px;}
            .pbr-slider-group {margin-bottom:2px;}
            .pbr-slider-group label {font-size:10px;font-weight:400;}
            .pbr-slider-group input[type=range] {width:100%;}
            .pbr-maps-list {display:flex;flex-direction:column;gap:1px;}
            .pbr-map-toggle {display:flex;align-items:center;gap:4px;font-size:10px;}
            .pbr-map-toggle input[type=checkbox] {accent-color:#2563eb;width:12px;height:12px;}
            .pbr-save-btn {margin-top:4px;background:#2563eb;color:#fff;font-weight:600;padding:5px 0;border-radius:5px;font-size:12px;border:none;cursor:pointer;transition:background .2s;}
            .pbr-save-btn:hover {background:#1741a6;}
            @media (max-width:900px) {.pbr-modal-main{flex-direction:column;min-width:0;max-width:98vw;height:auto;}.pbr-modal-left{min-width:0;width:100%;}.pbr-canvas-wrap{width:100%;height:100%;}}
            `;
            document.head.appendChild(style);
        }

        // HTML comprimido
        const modalHTML = `
            <div id="pbrPreviewModal" class="pbr-modal-ovl">
                <div class="pbr-modal-main">
                    <div class="pbr-modal-left">
                        <div class="pbr-modal-title">Vista previa PBR - <span style='font-weight:400;'>${materialId}</span></div>
                        <div class="pbr-canvas-wrap">
                            <div id="pbrThreejsContainer" style="width:100%;height:100%;"></div>
                        </div>
                    </div>
                    <div class="pbr-modal-right">
                        <button type="button" class="pbr-close-btn" id="closePBRModalBtn">&times;</button>
                        <div class="pbr-section">
                            <label>Iluminación:</label>
                            <select id="environmentSelect" style="width:100%;padding:2px 4px;border-radius:3px;border:1px solid #e0e0e0;">
                                <option value="studio">Estudio</option>
                            </select>
                        </div>
                        <div class="pbr-section">
                            <label>Geometría:</label>
                            <select id="geometrySelect" style="width:100%;padding:2px 4px;border-radius:3px;border:1px solid #e0e0e0;">
                                <option value="sphere">Esfera</option>
                                <option value="plane">Plano</option>
                                <option value="cube">Cubo</option>
                                <option value="cylinder">Cilindro</option>
                            </select>
                        </div>
                        <div class="pbr-section">
                            <label>Propiedades Material</label>
                            <div class="pbr-slider-group">
                                <label>Metalness: <span id="metalnessValue">0.50</span></label>
                                <input type="range" id="metalnessSlider" min="0" max="1" step="0.01" value="0.50">
                            </div>
                            <div class="pbr-slider-group">
                                <label>Roughness: <span id="roughnessValue">0.36</span></label>
                                <input type="range" id="roughnessSlider" min="0" max="1" step="0.01" value="0.36">
                            </div>
                            <div class="pbr-slider-group">
                                <label>Normal Scale: <span id="normalValue">1.0</span></label>
                                <input type="range" id="normalSlider" min="0" max="3" step="0.1" value="1.0">
                            </div>
                            <div class="pbr-slider-group">
                                <label>AO Intensity: <span id="aoValue">0.0</span></label>
                                <input type="range" id="aoSlider" min="0" max="2" step="0.1" value="0.0">
                            </div>
                        </div>
                        <div class="pbr-section">
                            <label>Mapas</label>
                            <div class="pbr-maps-list">
                                <label class="pbr-map-toggle"><input type="checkbox" id="toggleColor" checked> Color</label>
                                <label class="pbr-map-toggle"><input type="checkbox" id="toggleNormal" checked> Normal</label>
                                <label class="pbr-map-toggle"><input type="checkbox" id="toggleRoughness" checked> Roughness</label>
                                <label class="pbr-map-toggle"><input type="checkbox" id="toggleMetalness" checked> Metalness</label>
                                <label class="pbr-map-toggle"><input type="checkbox" id="toggleAO" checked> AO</label>
                            </div>
                        </div>
                        <button type="button" class="pbr-save-btn" id="saveConfigBtn">
                            <i class="fas fa-save"></i> Guardar Configuración
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    async initializePreview(materialId) {
        this.disposeThree();
        const container = document.getElementById('pbrThreejsContainer');
        if (!container) return;
        container.innerHTML = '';

        // 1. Llama SIEMPRE al endpoint para obtener la config más reciente
        let pbrSettings = null;
        try {
            const res = await fetch(`/api/materials/${materialId}/preview-config`);
            if (res.ok) {
                pbrSettings = await res.json();
            }
        } catch (e) { pbrSettings = null; }

        console.log(pbrSettings)

        // Esperar a que el DOM esté listo
        await new Promise(r => setTimeout(r, 0));

        // Inicializar sliders y toggles con los valores guardados o defaults
        const setOrDefault = (id, value, def) => {
            const el = document.getElementById(id);
            if (el) el.value = value !== undefined ? value : def;
        };
        const setCheckOrDefault = (id, value, def) => {
            const el = document.getElementById(id);
            if (el) el.checked = value !== undefined ? value : def;
        };

        setOrDefault('metalnessSlider', pbrSettings?.metalness, 0.5);
        setOrDefault('roughnessSlider', pbrSettings?.roughness, 0.36);
        setOrDefault('normalSlider', pbrSettings?.normalScale, 1.0);
        setOrDefault('aoSlider', pbrSettings?.aoIntensity, 0.0);
        setCheckOrDefault('toggleColor', pbrSettings?.enableColor, true);
        setCheckOrDefault('toggleNormal', pbrSettings?.enableNormal, true);
        setCheckOrDefault('toggleRoughness', pbrSettings?.enableRoughness, true);
        setCheckOrDefault('toggleMetalness', pbrSettings?.enableMetalness, true);
        setCheckOrDefault('toggleAO', pbrSettings?.enableAO, true);

        // Actualizar los valores visuales de los sliders
        const updateValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        updateValue('metalnessValue', document.getElementById('metalnessSlider')?.value);
        updateValue('roughnessValue', document.getElementById('roughnessSlider')?.value);
        updateValue('normalValue', document.getElementById('normalSlider')?.value);
        updateValue('aoValue', document.getElementById('aoSlider')?.value);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setClearColor(0xf5f7fa, 1);
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 0.1, 100);
        this.camera.position.set(0, 0, 3);

        // OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // Luz ambiente y direccional
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.50);
        this.scene.add(this.ambientLight);
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.85);
        this.directionalLight.position.set(4, 8, 4);
        this.directionalLight.castShadow = true;
        this.scene.add(this.directionalLight);

        // Plano de sombra/fondo
        const groundGeo = new THREE.PlaneGeometry(6, 6);
        const groundMat = new THREE.ShadowMaterial({ opacity: 0.18 });
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.position.y = -0.7;
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Cargar geometría y material
        await this.setGeometry('sphere');
        await this.setMaterial(materialId);

        // Listeners de controles
        this.setupEventListeners(materialId);

        window.addEventListener('resize', this.handleResize);
        this.animate();
    }

    async setMaterial(sku) {
        if (this.mesh && this.mesh.material) {
            this.mesh.material.dispose();
        }
        this.materialOptions = this.getMaterialOptionsFromUI();
        this.material = await this.createTexturedMaterial(`/materials/${sku}/${sku}_Color.png`, this.materialOptions, this.mapToggles);
        if (this.mesh) {
            this.mesh.material = this.material;
            this.mesh.material.needsUpdate = true;
        }
    }

    async setGeometry(type) {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
        }
        let geometry;
        switch (type) {
            case 'sphere':
                geometry = new THREE.SphereGeometry(0.7, 64, 64);
                break;
            case 'plane':
                geometry = new THREE.PlaneGeometry(1.2, 1.2, 2, 2);
                break;
            case 'cube':
                geometry = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(0.6, 0.6, 1, 48, 1);
                break;
            default:
                geometry = new THREE.SphereGeometry(0.7, 64, 64);
        }
        this.mesh = new THREE.Mesh(geometry, this.material || new THREE.MeshPhysicalMaterial({ color: 0xcccccc }));
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.position.y = 0;
        this.scene.add(this.mesh);
    }

    getMaterialOptionsFromUI() {
        return {
            metalness: parseFloat(document.getElementById('metalnessSlider')?.value || 0.5),
            roughness: parseFloat(document.getElementById('roughnessSlider')?.value || 0.36),
            normalScale: parseFloat(document.getElementById('normalSlider')?.value || 1.0),
            aoIntensity: parseFloat(document.getElementById('aoSlider')?.value || 0.0),
            loadPBR: true,
        };
    }

    setupEventListeners(materialId) {
        // Sliders
        const sliders = ['metalness', 'roughness', 'normal', 'ao'];
        sliders.forEach(slider => {
            const element = document.getElementById(`${slider}Slider`);
            const valueElement = document.getElementById(`${slider}Value`);
            if (element && valueElement) {
                element.addEventListener('input', async (e) => {
                    valueElement.textContent = parseFloat(e.target.value).toFixed(slider === 'normal' ? 1 : 2);
                    if (this.material) {
                        if (slider === 'normal') {
                            this.material.normalScale.set(parseFloat(e.target.value), parseFloat(e.target.value));
                        } else if (slider === 'ao') {
                            this.material.aoMapIntensity = parseFloat(e.target.value);
                        } else {
                            this.material[slider] = parseFloat(e.target.value);
                        }
                        this.material.needsUpdate = true;
                    }
                });
            }
        });
        // Geometry
        const geometrySelect = document.getElementById('geometrySelect');
        if (geometrySelect) {
            geometrySelect.addEventListener('change', async (e) => {
                await this.setGeometry(e.target.value);
                await this.setMaterial(this.sku);
            });
        }
        // Map toggles: actualizan this.mapToggles y recargan el material
        const mapKeys = ['Color', 'Normal', 'Roughness', 'Metalness', 'AO'];
        mapKeys.forEach(key => {
            const element = document.getElementById(`toggle${key}`);
            if (element) {
                element.addEventListener('change', async (e) => {
                    this.mapToggles[key.toLowerCase()] = !!e.target.checked;
                    await this.setMaterial(this.sku);
                });
            }
        });
        // Botón cerrar: limpiar Three.js
        const closeBtn = document.getElementById('closePBRModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.disposeThree();
                const modal = document.getElementById('pbrPreviewModal');
                if (modal) modal.remove();
            });
        }
        // Save config button
        const saveBtn = document.getElementById('saveConfigBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveConfiguration(materialId);
                this.disposeThree();
                const modal = document.getElementById('pbrPreviewModal');
                if (modal) modal.remove();
            });
        }
    }

    saveConfiguration(sku) {
        // Recoger los valores actuales de los sliders y toggles
        const pbrSettings = {
            metalness: parseFloat(document.getElementById('metalnessSlider')?.value || 0.5),
            roughness: parseFloat(document.getElementById('roughnessSlider')?.value || 0.5),
            normalScale: parseFloat(document.getElementById('normalSlider')?.value || 0.5),
            aoIntensity: parseFloat(document.getElementById('aoSlider')?.value || 0.5),
            enableNormal: !!document.getElementById('toggleNormal')?.checked,
            enableRoughness: !!document.getElementById('toggleRoughness')?.checked,
            enableMetalness: !!document.getElementById('toggleMetalness')?.checked,
            enableAO: !!document.getElementById('toggleAO')?.checked,
            enableColor: !!document.getElementById('toggleColor')?.checked,
            updatedAt: new Date().toISOString()
        };

        fetch('/api/materials/save-material-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: sku, pbrSettings })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.adminInterface.showNotification('Configuración guardada correctamente', 'success');
            } else {
                this.showNotification('Error al guardar configuración', 'error');
            }
        })
        .catch(() => {
            this.showNotification('Error al guardar configuración', 'error');
        });
    }

    animate = () => {
        this.animateId = requestAnimationFrame(this.animate);
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    handleResize = () => {
        const container = document.getElementById('pbrThreejsContainer');
        if (!container || !this.camera || !this.renderer) return;
        this.camera.aspect = container.offsetWidth / container.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
    }

    disposeThree() {
        if (this.animateId) cancelAnimationFrame(this.animateId);
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            this.scene && this.scene.remove(this.mesh);
            this.mesh = null;
        }
        if (this.ground) {
            if (this.ground.geometry) this.ground.geometry.dispose();
            if (this.ground.material) this.ground.material.dispose();
            this.scene && this.scene.remove(this.ground);
            this.ground = null;
        }
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            this.renderer = null;
        }
        this.scene = null;
        this.camera = null;
        window.removeEventListener('resize', this.handleResize);
    }

    // Modifica createTexturedMaterial para aceptar toggles y solo cargar los mapas activados
    async createTexturedMaterial(texturePath, options = {}, toggles = {}) {
        return new Promise((resolve, reject) => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(
                texturePath,
                async (texture) => {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                    const material = new THREE.MeshPhysicalMaterial({ map: toggles.color !== false ? texture : null });
                    if (material.map) material.map.encoding = THREE.sRGBEncoding;
                    texture.needsUpdate = true;
                    // PBR maps
                    if (options.loadPBR) {
                        const pbrMaps = [
                            { suffix: '_Normal.jpg', prop: 'normalMap', toggle: 'normal' },
                            { suffix: '_Roughness.jpg', prop: 'roughnessMap', toggle: 'roughness' },
                            { suffix: '_Metalness.jpg', prop: 'metalnessMap', toggle: 'metalness' },
                            { suffix: '_AmbientOcclusion.jpg', prop: 'aoMap', toggle: 'ao' }
                        ];
                        let textureDir = texturePath.substring(0, texturePath.lastIndexOf('/'));
                        let fileName = texturePath.substring(texturePath.lastIndexOf('/') + 1, texturePath.lastIndexOf('_'));
                        for (const map of pbrMaps) {
                            if (toggles[map.toggle] !== false) {
                                let mapPath = `${textureDir}/${fileName}${map.suffix}`;
                                try {
                                    const mapTexture = await new Promise((resolve, reject) => {
                                        textureLoader.load(
                                            mapPath,
                                            texture => resolve(texture),
                                            undefined,
                                            error => resolve(null)
                                        );
                                    });
                                    if (mapTexture) {
                                        mapTexture.wrapS = mapTexture.wrapT = THREE.RepeatWrapping;
                                        if (map.prop === 'aoMap') mapTexture.encoding = THREE.LinearEncoding;
                                        material[map.prop] = mapTexture;
                                    }
                                } catch (error) { }
                            }
                        }
                        material.aoMapIntensity = options.aoIntensity || 1.0;
                        material.metalness = options.metalness || 0.3;
                        material.roughness = options.roughness || 0.5;
                        material.normalScale = new THREE.Vector2(options.normalScale || 1, options.normalScale || 1);
                    }
                    resolve(material);
                },
                undefined,
                (err) => {
                    console.error(`Error loading base texture ${texturePath}:`, err);
                    resolve(new THREE.MeshPhysicalMaterial({ color: 0xcccccc }));
                }
            );
        });
    }

    makeWorldUVMaterial(baseMat, tileSize = 1, offset=0) {
      // 1. clonar y preparar RepeatWrapping
      const mat = baseMat.clone();
      ['map','normalMap','roughnessMap','metalnessMap','aoMap','displacementMap']
        .forEach(k => {
          if (mat[k]){
            mat[k].mapping = THREE.BoxUVReflectionMapping // o similar con `THREE.CubeUVRefractionMapping`
            mat[k].wrapS = mat[k].wrapT = THREE.RepeatWrapping;
            mat[k].repeat.set(tileSize, tileSize);
            mat[k].offset.set(offset, offset);
          }
        });


      return mat;
    }

    // Add this method to apply a texture to multiple meshes at once
    async applyTextureToMeshByUUID(UUID, sku, options = {}) {
        console.log(options)
      try {
        // Get mesh in question
        let mesh;
        this.loadedModel.children.forEach((child)=>{
            if(child.uuid && child.uuid == UUID) mesh=child;
        });

        if(!mesh) throw("No se ha encontrado en el modelo cargado el UUID del objeto objetivo")

        // Get texture path from sku
        let texturePath = `/materials/${sku}/${sku}_Color.png`

        // Default options
        options = {
          anchoMuestra: 0.6,  // Default 60cm
          tileWorldWidth: 1,  // Default 1 unit world width
          useTestTexture: false,
          loadPBR: true,      // Load PBR maps
          ...options
        };

        let baseMat = await this.createTexturedMaterial(texturePath, options);

        // Apply to each mesh in the group
        if(options.isGlass) mesh.castShadow = false;

        // Generamos un material “world‐space UV” escalable
        const tiling = options.tiling || 0.25
        const offset = options.offset || tiling*0.726
        const mat = this.makeWorldUVMaterial(baseMat,tiling, offset);
        
        // Apply material to mesh
        if (!mesh._originalMaterial) {
        mesh._originalMaterial = mesh.material;
        }

        mesh.material = mat;
        mesh.material.needsUpdate = true; 

      } catch (err) {
        console.error('Error applying texture to mesh:', err);
        return 0;
      }
    }
}