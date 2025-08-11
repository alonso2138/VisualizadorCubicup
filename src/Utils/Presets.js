export default class Presets {
    constructor(projectOrPromise) {
        if (Presets.instance) return Presets.instance;
        Presets.instance = this;

        this.project = null;
        this.presets = [];
        this.initialized = false;
        this.toolbarEl = null;

        // Kick off async init
        this._init(projectOrPromise);
    }

    // Backwards compatibility for old code paths that expect getPresets(configDir)
    async getPresets() {
        // Ensure toolbar exists and is rendered
        this.renderPresetToolbar();
        if (this.presets.length && !this.initialized) {
            this.initialized = true;
            setTimeout(() => this.applyPresetByIndex(0), 200);
        }
    }

    async _init(projectOrPromise) {
        try {
            // Resolve project whether it's a Promise or a plain object
            this.project = typeof projectOrPromise?.then === 'function'
                ? await projectOrPromise
                : projectOrPromise;

            // Extract presets
            this.presets = this._extractPresets(this.project);

            // Render toolbar in the materials modal
            this.renderPresetToolbar();

            // Auto-apply first preset if available
            if (this.presets.length && !this.initialized) {
                this.initialized = true;
                // Small delay to ensure model/material systems are ready
                setTimeout(() => this.applyPresetByIndex(0), 200);
            }
        } catch (err) {
            console.error('Error initializing Presets:', err);
        }
    }

    _extractPresets(project) {
        if (!project) return [];

        // New structure: an array of presets, each preset is an array of { uuid, sku }
        if (Array.isArray(project.presets)) {
            return project.presets.filter(p => Array.isArray(p));
        }

        // Legacy fallback: project.Presets is an object { "1": [ { targetTxt, objects:[{uuid,...}] } ] }
        if (project.Presets && typeof project.Presets === 'object') {
            // Keep original structure as-is to be handled by legacy applier
            const sortedKeys = Object.keys(project.Presets).sort((a, b) => Number(a) - Number(b));
            return sortedKeys.map(k => project.Presets[k]);
        }

        return [];
    }

    getToolbarElement() {
        // Prefer the dedicated toolbar in the materials modal
        let el = document.getElementById('presetToolbar');
        if (el) return el;

        // Fallback: create it after the search bar inside the materials modal
        const modal = document.getElementById('materialsFloatingModal');
        const search = modal?.querySelector('.materials-floating-search');
        if (modal && search) {
            el = document.createElement('div');
            el.id = 'presetToolbar';
            el.className = 'preset-toolbar';
            search.insertAdjacentElement('afterend', el);
            return el;
        }

        return null;
    }

    renderPresetToolbar() {
        const toolbar = this.getToolbarElement();
        if (!toolbar) return;

        // Clear previous
        toolbar.innerHTML = '';

        if (!this.presets.length) {
            // No presets available
            return;
        }

        const configDir = window.experience?.clientInterface?.configDir;

        this.presets.forEach((preset, idx) => {
            const btn = document.createElement('button');
            btn.className = 'preset-button';
            btn.type = 'button';
            btn.setAttribute('data-index', String(idx));

            // Optional thumbnail support
            const thumbWrapper = document.createElement('span');
            thumbWrapper.className = 'preset-thumb';

            const addImg = (src) => {
                const img = document.createElement('img');
                img.src = src;
                img.alt = `Preset ${idx + 1}`;
                img.onerror = () => { img.style.display = 'none'; };
                thumbWrapper.appendChild(img);
            };

            if (preset.thumbnail) {
                addImg(preset.thumbnail);
            } else if (configDir) {
                // Conventional path: materiales/thumbnails/<configDir><n>.png
                addImg(`materiales/thumbnails/${configDir}${idx + 1}.png`);
            }

            btn.appendChild(thumbWrapper);

            const label = document.createElement('span');
            label.textContent = `Preset ${idx + 1}`;
            btn.appendChild(label);

            btn.addEventListener('click', async () => {
                // Update selected state
                toolbar.querySelectorAll('.preset-button').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                await this.applyPresetByIndex(idx);
            });

            toolbar.appendChild(btn);
        });

        // Select first by default in UI
        const firstBtn = toolbar.querySelector('.preset-button');
        if (firstBtn) firstBtn.classList.add('selected');
    }

    async applyPresetByIndex(index) {
        const preset = this.presets[index];
        if (!preset) return;

        // Detect structure
        const isNewStructure = Array.isArray(preset) && preset.length && preset[0].uuid && preset[0].sku;
        await this.applyPreset(preset);
    }

    async applyPreset(presetArray) {
        // Clean all materials from scene
        const modelRoot = window.experience?.model?.model;

        let blank = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        if (modelRoot) {
            modelRoot.traverse((child) => {
                if (child.isMesh && child.material) {
                    // Preserve original material's onBeforeRender function if it exists
                    const originalOnBeforeRender = child.material.onBeforeRender;
                    child.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
                    if (originalOnBeforeRender) {
                        child.material.onBeforeRender = originalOnBeforeRender;
                    }
                }
            });
        }

        // Group uuids by sku to reduce fetch calls
        const mapBySku = new Map();
        presetArray.forEach(({ uuid, sku }) => {
            if (!uuid || !sku) return;
            if (!mapBySku.has(sku)) mapBySku.set(sku, []);
            mapBySku.get(sku).push(uuid);
            window.experience.clientInterface.applySkuToMeshByUUID(sku, uuid);
        });

        // Resolve model reference
        if (!modelRoot) return;

        // For each sku, fetch material and apply to meshes
        for (const [sku, uuids] of mapBySku.entries()) {
            try {
                const materialData = await this._fetchMaterial(sku);
                const path = `/materials/${sku}/${materialData.files?.color || sku + '.png'}`;

                const meshes = uuids
                    .map(u => modelRoot.getObjectByProperty('uuid', u))
                    .filter(m => m && m.isMesh);

                if (!meshes.length) continue;

                const options = this._getMaterialOptions(materialData);
                await window.experience.model.applyTextureToGroup(meshes, path, options);
            } catch (err) {
                console.warn('Preset application skipped for sku', sku, err?.message || err);
            }
        }
    }

    async _fetchMaterial(sku) {
        const res = await fetch(`/api/materials/${sku}`);
        if (!res.ok) throw new Error(`Material ${sku} not found`);
        return res.json();
    }

    _getMaterialOptions(materialData) {
        // Basic options; extend if materialData carries hints
        const opts = {};
        // Example: if material is glass based on tags or name
        const etiquetas = Array.isArray(materialData.etiquetas) ? materialData.etiquetas.map(e => (e || '').toLowerCase()) : [];
        const nombre = (materialData.nombre || '').toLowerCase();
        if (etiquetas.includes('cristal') || etiquetas.includes('vidrio') || nombre.includes('cristal') || nombre.includes('vidrio')) {
            opts.isGlass = true;
        }
        return opts;
    }
}
