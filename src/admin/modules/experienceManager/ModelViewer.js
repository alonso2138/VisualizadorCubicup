// ModelViewer - Three.js 3D model visualization and interaction
// Extracted from ExperienceManager for better modularity
 
export class ModelViewer {
    constructor() {
        this.previewScene = null;
        this.previewCamera = null;
        this.previewRenderer = null;
        this.previewControls = null;
        this.loadedModel = null;
        this.gltfData = null;
        this.modelInfo = null;
        this.materials = {};
        this.animationId = null;
        this.onWindowResize = null;
        this.selectionMode = false; // Flag to enable/disable selection mode
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    async initializeModelPreview(container, filePath) {
        if (!container) {
            console.error('Three.js container not found');
            return false;
        }

        if (!filePath) {
            console.error('No hay modelo cargado. filePath:', filePath);
            return false;
        }

        // Ensure container is ready for Three.js
        await this.ensureContainerReady(container);
        try {
            // Check if Three.js libraries are available
            if (!window.THREE) {
                throw new Error('THREE.js library not loaded');
            }
            
            // Check for OrbitControls availability
            if (!THREE.OrbitControls) {
                console.warn('OrbitControls not available, trying to load...');
                // Try different ways OrbitControls might be available
                if (window.THREE && window.THREE.OrbitControls) {
                    THREE.OrbitControls = window.THREE.OrbitControls;
                } else {
                    console.error('OrbitControls not found. Loading from alternative source...');
                    // We'll handle this in initThreeJS
                }
            }
            
            // Check for GLTFLoader availability
            if (!THREE.GLTFLoader) {
                console.warn('GLTFLoader not available, trying to load...');
                if (window.THREE && window.THREE.GLTFLoader) {
                    THREE.GLTFLoader = window.THREE.GLTFLoader;
                } else {
                    console.error('GLTFLoader not found. Loading from alternative source...');
                }
            }

            // Initialize Three.js scene
            this.initThreeJS(container);
            
            // Load the GLB model
            await this.loadGLBModel(filePath);

            return true;

        } catch (error) {
            console.error('Error initializing model preview:', error);
            // Show error in UI
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">
                    <div style="text-align: center;">
                        <p>❌ Error cargando el modelo</p>
                        <p style="font-size: 0.9em;">${error.message}</p>
                    </div>
                </div>
            `;
            return false;
        }
    }

    async ensureContainerReady(container) {
        return new Promise((resolve) => {
            // Wait for the container to be properly rendered
            const checkContainer = () => {
                if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                    resolve();
                } else {
                    // Force layout recalculation
                    container.style.display = 'block';
                    container.style.width = '100%';
                    container.style.height = '100%';
                    container.style.minHeight = '500px';
                    
                    requestAnimationFrame(() => {
                        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                            resolve();
                        } else {
                            setTimeout(checkContainer, 50);
                        }
                    });
                }
            };
            checkContainer();
        });
    }

    initThreeJS(container) {
        // Clean up previous instance
        this.cleanup();

        // Ensure container has proper dimensions
        if (container.clientWidth === 0 || container.clientHeight === 0) {
            // Force layout calculation
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.minHeight = '500px';
            
            // Use a small delay to ensure layout is complete
            setTimeout(() => {
                this.initThreeJS(container);
            }, 50);
            return;
        }

        // Create scene
        this.previewScene = new THREE.Scene();
        this.previewScene.background = new THREE.Color(0xf0f0f0);

        // Create camera
        const aspect = container.clientWidth / container.clientHeight;
        this.previewCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.previewCamera.position.set(5, 5, 5);
        this.previewCamera.lookAt(0, 0, 0);

        // Create renderer
        this.previewRenderer = new THREE.WebGLRenderer({ antialias: true });
        this.previewRenderer.setSize(container.clientWidth, container.clientHeight);
        this.previewRenderer.setPixelRatio(window.devicePixelRatio);
        this.previewRenderer.shadowMap.enabled = true;
        this.previewRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Clear container and add canvas
        container.innerHTML = '';
        container.appendChild(this.previewRenderer.domElement);

        // Add lighting
        this.setupLighting();

        // Add controls - with fallback if OrbitControls is not available
        this.setupControls();

        // Initialize raycaster and mouse vector once
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Initialize raycaster and mouse vector once
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.highlightedObject = null; // Add this to track highlighted object

        // Add event listener for mousemove
        document.addEventListener('mousemove', (event) => {
            // Check if selectionMode is active
            if (!this.selectionMode) return;

            event.preventDefault();

            // Get the canvas element to calculate correct mouse coordinates
            const canvas = this.previewRenderer.domElement;
            const rect = canvas.getBoundingClientRect();

            // Update mouse coordinates relative to the canvas
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Set raycaster from camera and mouse position
            this.raycaster.setFromCamera(this.mouse, this.previewCamera);

            // Reset previous highlights
            if (this.highlightedObject) {
                if (this.highlightedObject.material && this.highlightedObject.material.originalColor !== undefined) {
                    this.highlightedObject.material.color.setHex(this.highlightedObject.material.originalColor);
                }
                this.highlightedObject = null;
            }

            // Get intersected objects from the loaded model only
            if (this.loadedModel) {
                const intersects = this.raycaster.intersectObjects(this.loadedModel.children, true);

                // Highlight the first intersected mesh
                if (intersects.length > 0) {
                    const intersected = intersects[0].object;

                    // Ensure the object is a mesh and has a material
                    if (intersected.isMesh && intersected.material) {
                        // Save the original color if not already saved
                        if (intersected.material.originalColor === undefined) {
                            intersected.material.originalColor = intersected.material.color.getHex();
                        }

                        // Highlight the object in green
                        intersected.material.color.setHex(0x00ff00);

                        // Store the highlighted object for resetting later
                        this.highlightedObject = intersected;
                    }
                }
            }
        });

        // Add grid helper
        const gridHelper = new THREE.GridHelper(20, 20);
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.previewScene.add(gridHelper);

        // Start render loop
        this.startRenderLoop();

        // Handle window resize
        this.setupResizeHandler(container);
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.previewScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.previewScene.add(directionalLight);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight2.position.set(-10, 10, -5);
        directionalLight2.castShadow = true;
        directionalLight2.shadow.mapSize.width = 2048;
        directionalLight2.shadow.mapSize.height = 2048;
        this.previewScene.add(directionalLight2);
    }

    setupControls() {
        if (THREE.OrbitControls) {
            this.previewControls = new THREE.OrbitControls(this.previewCamera, this.previewRenderer.domElement);
            this.previewControls.enableDamping = true;
            this.previewControls.dampingFactor = 0.05;
            this.previewControls.enableZoom = true;
            this.previewControls.enableRotate = true;
            this.previewControls.enablePan = true;
        } else {
            console.warn('OrbitControls not available');
        }
    }

    setupResizeHandler(container) {
        this.onWindowResize = () => {
            const newAspect = container.clientWidth / container.clientHeight;
            this.previewCamera.aspect = newAspect;
            this.previewCamera.updateProjectionMatrix();
            this.previewRenderer.setSize(container.clientWidth, container.clientHeight);
        };
        
        window.addEventListener('resize', this.onWindowResize);
    }

    async loadGLBModel(filePath) {
        window.filePath = filePath;
                console.log(window.filePath)

        return new Promise((resolve, reject) => {
            // Check if GLTFLoader is available
            if (!THREE.GLTFLoader) {
                reject(new Error('GLTFLoader not available'));
                return;
            }
            
            const loader = new THREE.GLTFLoader();
                        
            loader.load(
                filePath,
                (gltf) => {
                    // Remove previous model if exists
                    if (this.loadedModel) {
                        this.previewScene.remove(this.loadedModel);
                    }

                    this.loadedModel = gltf.scene;
                    this.gltfData = gltf;

                    // Enable shadows
                    this.loadedModel.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    // Remove default model textures
                    this.cleanModel();

                    // Center and scale model
                    this.centerAndScaleModel(this.loadedModel);

                    // Add to scene
                    this.previewScene.add(this.loadedModel);

                    // Fit camera to model
                    this.fitCameraToModel(this.loadedModel);

                    resolve(gltf);
                },
                (progress) => {
                    const percentage = (progress.loaded / progress.total * 100);
                },
                (error) => {
                    console.error('Error loading GLB model:', error);
                    reject(error);
                }
            );
        });
    }

    cargarVinculos(vinculos){
        this.cleanModel();
        vinculos.forEach(vinculo=>{
            this.applyTextureToMeshByUUID(vinculo.uuid, vinculo.sku)
        });
    }

    cleanModel(){
        this.loadedModel.traverse((child) => {
            if (child.isMesh) {
                if(child.material){
                    child.material = new THREE.MeshPhysicalMaterial({color:'#00ffff'})
                }
            }
        });
    }

    centerAndScaleModel(model) {
        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center the model
        model.position.sub(center);

        // Scale model to fit in a reasonable size (max dimension of 5 units)
        const maxDimension = Math.max(size.x, size.y, size.z);
        if (maxDimension > 5) {
            const scale = 5 / maxDimension;
            model.scale.multiplyScalar(scale);
        }

        // Store model info
        this.modelInfo = {
            boundingBox: box,
            size: size,
            center: center,
            scale: model.scale.x
        };
    }

    fitCameraToModel(model) {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);

        // Position camera to see the whole model
        const distance = maxDimension * 2;
        this.previewCamera.position.set(distance, distance, distance);
        this.previewCamera.lookAt(0, 0, 0);
        if (this.previewControls) {
            this.previewControls.target.set(0, 0, 0);
            this.previewControls.update();
        }
    }

    startRenderLoop() {
        // Stop previous animation loop if exists
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        const animate = () => {
            if (this.previewControls) {
                this.previewControls.update();
            }
            
            if (this.previewRenderer && this.previewScene && this.previewCamera) {
                this.previewRenderer.render(this.previewScene, this.previewCamera);
            }
            
            // Continue animation loop if components exist (not dependent on modal)
            if (this.previewRenderer && this.previewScene && this.previewCamera) {
                this.animationId = requestAnimationFrame(animate);
            }
        };

        this.animationId = requestAnimationFrame(animate);
    }

    // Selection mode
    activateSelectionMode(){
        this.selectionMode = true;
    }

    deactivateSelectionMode(){
        this.selectionMode = false;
    }

    // Raycast click
    selectObject(){
        // Apply active material to it

        // Save action to presets manager
    }

    highlightIntersectedObject() {

    }

    // Public methods for external control
    resetCamera() {
        if (this.loadedModel) {
            this.fitCameraToModel(this.loadedModel);
        }
    }

    reloadModel(filePath) {
        if (filePath) {
            return this.loadGLBModel(filePath);
        }
    }

    // Cleanup method
    cleanup() {
        // Stop animation loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Stop render loop by setting renderer to null
        if (this.previewRenderer) {
            const container = this.previewRenderer.domElement.parentNode;
            if (container) {
                container.removeChild(this.previewRenderer.domElement);
            }
            this.previewRenderer.dispose();
            this.previewRenderer = null;
        }

        // Clean up controls
        if (this.previewControls) {
            this.previewControls.dispose();
            this.previewControls = null;
        }

        // Remove window resize listener
        if (this.onWindowResize) {
            window.removeEventListener('resize', this.onWindowResize);
            this.onWindowResize = null;
        }

        // Clean up scene objects
        if (this.previewScene) {
            this.previewScene.clear();
            this.previewScene = null;
        }

        this.previewCamera = null;
        this.loadedModel = null;
        this.gltfData = null;
        this.modelInfo = null;
    }

    // Getters for external access
    getLoadedModel() {
        return this.loadedModel;
    }

    getGltfData() {
        return this.gltfData;
    }

    getModelInfo() {
        return this.modelInfo;
    }

    getScene() {
        return this.previewScene;
    }

    getCamera() {
        return this.previewCamera;
    }

    getRenderer() {
        return this.previewRenderer;
    }

    /**
     * THREE MATERIAL APPLYING
    */
   
   // Add this method to the Model class
    createTexturedMaterial(texturePath, options = {}) {
      return new Promise((resolve, reject) => {
        if(options.isGlass){
          const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4,
            transmission: 1,
            thickness: 0.5,
            ior: 10,
          });
          resolve(material);
          return;
        }

        const textureLoader = new THREE.TextureLoader();        
        textureLoader.load(
          texturePath,
          async (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

            let textureDir = texturePath.substring(0, texturePath.lastIndexOf('/'));
            let fileName = texturePath.substring(texturePath.lastIndexOf('/') + 1, texturePath.lastIndexOf('_'));
            const material = new THREE.MeshPhysicalMaterial({
              map: texture,
            });
            if(material.map) material.map.encoding = THREE.sRGBEncoding;

            texture.needsUpdate = true;  

            // Load PBR maps only if enabled (default true)
            if (options.loadPBR) {
              // Define map names and their corresponding material properties
              const pbrMaps = [
                { suffix: '_Normal.jpg', prop: 'normalMap' },
                { suffix: '_Roughness.jpg', prop: 'roughnessMap' },
                { suffix: '_Metalness.jpg', prop: 'metalnessMap' },
                { suffix: '_Specular.jpg', prop: 'specularIntensityMap' },  // Added specular map
                { suffix: '_AmbientOcclusion.jpg', prop: 'aoMap' },
                { suffix: '_Displacement.jpg', prop: 'adisplacementMap' }
              ];
              

              // Load each map and assign to material if successful
              for (const map of pbrMaps) {
                let mapPath = `${textureDir}/${fileName}${map.suffix}`;
                try {
                  const mapTexture = await new Promise((resolve, reject) => {
                    textureLoader.load(
                      mapPath,
                      texture => resolve(texture),
                      undefined,
                      error => {
                        //console.warn(`PBR map ${map.prop} not found: ${error.message} at ${fileName}`);
                        resolve(null); // Resolve with null on error (missing map)
                      }
                    );
                  });
                  
                  if (mapTexture) {
                    mapTexture.wrapS = mapTexture.wrapT = THREE.RepeatWrapping;
                    
                    if (map.prop === 'aoMap') {
                      mapTexture.encoding = THREE.LinearEncoding;
                    }
                    
                    material[map.prop] = mapTexture;
                  }
                } catch (error) {
                  console.error(`Error loading ${map.suffix}:`, error);
                }
              }
              
              // Set material parameters for PBR
              material.aoMapIntensity = options.aoIntensity || 1.0;

              // Displacement
              material.displacementScale = options.displacementScale || -0.05;
              material.displacementBias = options.displacementBias || -0.05;

              // Normal
              const s = options.normalScale || 2;
              material.normalScale.set(s,-s);

              // Specular parameters (new)
              material.specularIntensity = options.specularIntensity || 1.0;
              material.specularColor = new THREE.Color(options.specularColor || 0xffffff);
              
              // Sheen (fabric-like effect)
              material.sheen = options.sheen || false;
              material.sheenColor = new THREE.Color(options.sheenColor || 0xffffff);
              material.sheenRoughness = options.sheenRoughness || 0.1;
            
              // Clearcoat parameters
              material.clearcoat = options.clearcoat || 0.0;
              material.clearcoatRoughness = options.clearcoatRoughness || 0.1;
              material.clearcoatNormalScale = new THREE.Vector2(1, 1);
              
              // Base parameters - these are used if maps aren't present
              material.metalness = options.metalness || 0.3;
              material.roughness = options.roughness || 0.5;
              material.transmission = options.transmission || 0.0;
              material.thickness = options.thickness || 0.0; 
            }

            // Save metadata in userData
            material.userData = {
              ...material.userData,
              texturePath,
              tileWorldWidth: options.tileWorldWidth || 1, // default 1 unit
              pbrMapsLoaded: options.loadPBR !== false
            };


            const key = options.id || `texture-${Object.keys(this.materials).length}`;
            this.materials[key] = material;
            resolve(material);
          },
          undefined,
          (err) => {
            console.error(`Error loading base texture ${texturePath}:`, err);
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
      try {
        // Get mesh in question
        let mesh;
        this.loadedModel.children.forEach((child)=>{
            if(child.name && child.name == UUID) mesh=child;
        });

        if(!mesh) throw("No se ha encontrado en el modelo cargado el UUID del objeto objetivo")

        // Get texture path from sku
        let texturePath = `/materials/${sku}/${sku}_Color.png`

        // Fetch configuración PBR y toggles del material
        let pbrSettings = {};
        try {
          const res = await fetch(`/api/materials/${sku}/preview-config`);
          if (res.ok) {
            const config = await res.json();
            if (config && config.pbrSettings) {
              pbrSettings = config.pbrSettings;
            } else if (config) {
              pbrSettings = config;
            }
          }
        } catch (e) { pbrSettings = {}; }

        // Default options
        options = {
          anchoMuestra: 0.6,  // Default 60cm
          tileWorldWidth: 1,  // Default 1 unit world width
          useTestTexture: false,
          loadPBR: true,      // Load PBR maps
          ...pbrSettings,
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
