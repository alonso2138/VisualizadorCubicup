import * as THREE from 'three';
import Sizes from './Utils/Sizes.js';
import Time from './Utils/Time.js';
import Resources from './Utils/Resources.js';
import Renderer from './three/Renderer.js';
import Camera from './three/Camera.js';
import Lightning from './three/Lightning.js';
import Model from './three/Model.js';
import Image from './three/Image.js';
import EventEmitter from './Utils/EventEmitter.js';
import ClientInterface from './ui/ClientInterface.js';
import { fill } from 'three/src/extras/TextureUtils.js';
import PropiedadesMateriales from './ui/PropiedadesMateriales.js';
import Presets from './Utils/Presets.js';
import AmbientLoader from './ui/AmbientLoader.js';
import PostProcessing from './Utils/PostProcessing.js';

export default class Experience extends EventEmitter{
    constructor(canvas) {
        super();

        // Global access
        window.experience = this;

        // Options
        this.canvas = canvas;

        // Setup
        this.sizes = new Sizes();
        this.time = new Time();
        this.scene = new THREE.Scene();

        // Raycaster setup
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(-1, -1);
        this.hoveredObject = null;
        
        // Listen for mouse movement
        window.addEventListener('mousemove', (event) => this.onMouseMove(event));
        
        // Setup cámara
        this.camera = new Camera({
            fov: 15, // 30,
            nearPlane: 0,
            farPlane: 1000,
            orbitControls: true,
            damping: true, 
            dampingFactor: 0.05,
            maxDistance: 50,
            position: { x:4 , y: 2, z: 0 },
            enableDamping: true,  // Already set via your damping property
            dampingFactor: 0.05,  // Already set
            autoRotate: false,    // Set to true for subtle continuous rotation
            autoRotateSpeed: 0.5, // Speed for auto rotation if enabled
            minDistance: 1,       // Minimum zoom distance
            minPolarAngle: 0.1,   // Limit how high user can orbit (in radians)
            maxPolarAngle: Math.PI - 0.1, // Limit how low user can orbit
            screenSpacePanning: true, // More intuitive panning - camera pans parallel to screen
            rotateSpeed: 0.8,     // Lower value for slower, smoother rotation (default is 1.0)
            zoomSpeed: 0.8,       // Controls zoom sensitivity (default is 1.0)
            panSpeed: 0.5,        // Controls panning speed (default is 1.0)
        });

        // Primero crear el renderer
        this.renderer = new Renderer({
            canvas: this.canvas,
            antialias: true,
            shadows: true,
            physicallyCorrectLights: true,
            outputEncoding: THREE.sRGBEncoding,
            clearColor: 0xececec,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1
        });

        this.postProcessing = new PostProcessing(
            this.renderer, 
            this.scene, 
            this.camera, 
            { 
                useOutline: false,
                outlineColor: '#ff0000',  // Red color for outline
            }
        );

        // Si no entra en modo admin entra en modo usuario
        this.lighting = new Lightning(
            this.scene, 
            this.renderer, 
            this.resources, 
            {
                quality: 'low',
                shadows: true,
                helpers: false,

                environmentMap: false,
                envMapIntensity: 0.1, // Intensity of the HDRI environment map

                ambientLight: true,
                ambientIntensity:1.6,

                pointLights: true,
                pointLightIntensity: 0.4,
                pointLightDecay: 0.2,   
                pointLightColor: 0xFFFFFF,

                // Key (Main) SpotLight - narrow and lateral
                mainLight: true,
                mainLightColor: 0xFFFFFF,
                mainLightIntensity: 300,
                mainLightPosition: { x: 2*5.67, y: 2*5.67, z: 1*5.67 },
                mainLightAngle: Math.PI/8,        // Narrow spot
                mainLightPenumbra: 0.3,           // Soft edge
                mainLightDecay: 2,                // Physical decay
                mainLightDistance: 40,            // Limited distance
                mainLightTarget: { x: 0, y: 0, z: 0 },
                mainLightRotate: false,
                mainLightRotationSpeed: 0.08,
                mainLightRadius: 10,

                // Fill SpotLight - very soft, to fill
                fillLight: false,
                fillLightColor: 0xE8F0FF,
                fillLightIntensity: 150,
                fillLightPosition: { x: -1*5.67, y: 1*5.67, z: 0.5*5.67 },
                fillLightAngle: Math.PI/6,
                fillLightPenumbra: 0.5,
                fillLightDecay: 2,
                fillLightDistance: 150,
                fillLightTarget: { x: 0, y: 0, z: 0 },

                // Rim SpotLight - profile behind/above
                rimLight: false,
                rimLightColor: 0xFFF5E8,
                rimLightIntensity: 11,
                rimLightPosition: { x: -0.1, y: 0, z: -1 },
                rimLightAngle: Math.PI/12,        // Very narrow spotlight
                rimLightPenumbra: 0.2,
                rimLightDecay: 2,
                rimLightDistance: 150,
                rimLightTarget: { x: 0, y: 0, z: 0 },
            }
        );
        
        // Configurar OrbitControls
        this.camera.setOrbitControls(this.renderer.instance);

        // Setup eventos de tiempo y tamaño
        this.time.on('tick', () => {
            this.update();
        });
        
        // Resize event
        this.sizes.on('resize', () => {
            this.resize();
        }); 

        this.clientInterface = new ClientInterface(this, {PropiedadesMateriales:true});

        // Aparece pantalla de carga
        this.clientInterface.createLoadingScreen();
        window.updateMessage("Conectando al servidor...")

        this.clientInterface.loadConfigFromJson()
            .then(configData => {
                this.resources = new Resources(configData, this.renderer);

                this.model = new Model(this.scene, this.resources);

                this.model.on('loaded', ()=>{
                    // Cargar HDRI
                    //this.image = new Image(this.scene, this.resources, this.renderer, 0.1);  

                    // Cargar texturas
                    this.clientInterface.loadGroupsAndMaterials();
                    //this.ambientLoader = new AmbientLoader();


                    this.clientInterface.on('loaded', () => {
                        // Corregir ilminación HDRI tras cargar texturas
                        //this.image.updateEnvironmentMapIntensity(this.image.skyboxIntensity);

                        // Cargar presets
                        this.presets = new Presets(this.clientInterface.groupsData  );

                        // Cargar en segundo plano el resto de ambientes

                        // Quitar pantalla de carga
                        this.clientInterface.removeLoadingScreen();
                    });
                });
            });    
    }
    
    onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    resize() {
        // Actualizar cámara
        this.camera.resize();

        // Update post-processing if it exists
        if(this.postProcessing) {
            this.postProcessing.resize();
        }else{
            // Actualizar renderer
            this.renderer.resize();
        }
    }
    
    update(){        
        // Actualizar cámara (controles)
        this.camera.update();
        
        // Update the lightning - pass time from this.time
        if(this.lighting) this.lighting.update(this.time.elapsed);
        
        // Update post-processing
        if(this.clientInterface) if(this.clientInterface.postProcessing) {
            // Render with post-processing
            this.clientInterface.postProcessing.render();
        }if(this.postProcessing) {
            // Update raycaster with current model
            this.postProcessing.update(this.model);
            
            // Render with post-processing
            this.postProcessing.render();
        } else {
            // Fallback to normal rendering
            this.renderer.render(this.scene, this.camera.instance);
        }        
    }
    
    // Métodos para manipular materiales
    setMaterial(meshName, materialName) {
        if (this.model) {
            this.model.setMaterial(meshName, materialName);
        }
    }
    
    createMaterial(name, options) {
        if (this.model) {
            return this.model.createPBRMaterial(name, options);
        }
        return null;
    }
    
    // Método para cambiar textura
    changeTexture(materialName, textureType, texturePath) {
        if (!this.model) return;
        
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(texturePath, (texture) => {
            this.model.setTexture(materialName, textureType, texture);
        });
    }
    
    // Método para destruir la experiencia y liberar recursos
    destroy() {
        // Detener animaciones
        this.time.stop();
        
        // Remove UI
        if(this.adminUI) this.adminUI.destroy();
        if(this.clientUI) this.clientUI.destroy();

        // Remover eventos
        this.sizes.off('resize');
        this.time.off('tick');
        
        // Dispose post-processing
        if(this.adminUI.postProcessing) {
            this.adminUI.postProcessing.dispose();
        }
        
        // Destruir cámara
        this.camera.controls.dispose();
        
        // Destruir renderer
        this.renderer.dispose();
        
        // Limpiar escena
        this.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                
                for (const key in child.material) {
                    const value = child.material[key];
                    if (value && typeof value.dispose === 'function') {
                        value.dispose();
                    }
                }
                
                child.material.dispose();
            }
        });
    }
    
    // Métodos para mostrar/ocultar pantalla de carga
    showLoadingScreen() {
        // Si existe un elemento con clase loading-screen, mostrar
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }
    
    hideLoadingScreen() {
        // Ocultar pantalla de carga
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }
}