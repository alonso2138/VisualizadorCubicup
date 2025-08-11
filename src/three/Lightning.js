import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { PMREMGenerator } from 'three';
import GUI from 'lil-gui'; // <-- Add this
import { materialAO } from 'three/tsl';

export default class Lightning {
  constructor(scene, renderer, resources, options = {}) {
    this.scene = scene;
    this.renderer = renderer;
    this.resources = resources; // Añadir referencia a los recursos
    
    // Opciones por defecto para iluminación hiperrealista
    this.options = {
      // Configuración general
      quality: options.quality || 'high', // 'low', 'medium', 'high', 'ultra'
      
      // Main Light (Key light)
      mainLight: options.mainLight !== undefined ? options.mainLight : true,
      mainLightColor: options.mainLightColor || 0xFFFFFF,
      mainLightIntensity: options.mainLightIntensity || 5,
      mainLightPosition: options.mainLightPosition || { x: 2, y: 2, z: 1 },
      mainLightAngle: options.mainLightAngle || Math.PI/8, // narrow spotlight
      mainLightPenumbra: options.mainLightPenumbra || 0.3,
      mainLightDecay: options.mainLightDecay || 2,
      mainLightDistance: options.mainLightDistance || 12,
      mainLightTarget: options.mainLightTarget || { x: 0, y: 0, z: 0 },
      mainLightRotate: options.mainLightRotate !== undefined ? options.mainLightRotate : false,
      mainLightRotationSpeed: options.mainLightRotationSpeed || 0.08,
      mainLightRadius: options.mainLightRadius || 10,
      
      // Fill Light
      fillLight: options.fillLight !== undefined ? options.fillLight : true,
      fillLightColor: options.fillLightColor || 0xE8F0FF,
      fillLightIntensity: options.fillLightIntensity || 0.15,
      fillLightPosition: options.fillLightPosition || { x: -1, y: 1, z: 0.5 },
      fillLightAngle: options.fillLightAngle || Math.PI/6,
      fillLightPenumbra: options.fillLightPenumbra || 0.5,
      fillLightDecay: options.fillLightDecay || 2,
      fillLightDistance: options.fillLightDistance || 15,
      fillLightTarget: options.fillLightTarget || { x: 0, y: 0, z: 0 },
      
      // Rim Light
      rimLight: options.rimLight !== undefined ? options.rimLight : true,
      rimLightColor: options.rimLightColor || 0xFFF5E8,
      rimLightIntensity: options.rimLightIntensity || 13  ,
      rimLightPosition: options.rimLightPosition || { x: -0.1, y: 0, z: -1.1 },
      rimLightAngle: options.rimLightAngle || Math.PI/12, // very narrow spotlight
      rimLightPenumbra: options.rimLightPenumbra || 0.2,
      rimLightDecay: options.rimLightDecay || 2,
      rimLightDistance: options.rimLightDistance || 15,
      rimLightTarget: options.rimLightTarget || { x: 0, y: 0, z: 0 },
      
      // Iluminación ambiental
      ambientLight: options.ambientLight !== undefined ? options.ambientLight : true,
      ambientIntensity: options.ambientIntensity || 0.4,
      ambientColor: options.ambientColor || 0xFFFFFF,
      
      // Environment map (Cubemap o HDRI)
      environmentMap: options.environmentMap !== undefined ? options.environmentMap : false,
      envMapName: options.envMapName || 'sky', // Nombre del recurso de cubemap
      hdriPath: options.hdriPath || '/sky.hdr', // Solo si useHDRI es true
      envMapIntensity: options.envMapIntensity !== undefined ? options.envMapIntensity : 0,
      
      // Sombras
      shadows: options.shadows !== undefined ? options.shadows : true,
      shadowMapSize: options.shadowMapSize || 2048,
      softShadows: options.softShadows !== undefined ? options.softShadows : true,
      
      // Point lights
      pointLights: options.pointLights !== undefined ? options.pointLights : true,
      pointLightCount: options.pointLightCount || 4,
      pointLightColor: options.pointLightColor || 0x8c8c8c,
      pointLightIntensity: options.pointLightIntensity || 2,
      pointLightDistance: options.pointLightDistance || 15,
      pointLightDecay: options.pointLightDecay || 1,
      pointLightPositions: options.pointLightPositions || [
        { x: -0.15, y: 1.18, z: -0.96 },
        { x: 0.15, y: 1.18, z: -0.96 },
        { x: 0.15, y: 1.18, z: 0.96 },
        { x: -0.15, y: 1.18, z: 0.96 }
      ],      
      // Helpers (para desarrollo)
      helpers: options.helpers !== undefined ? options.helpers : false
    };
    
    // Colecciones para almacenar luces
    this.lights = {
      main: null,
      fill: null,
      rim: null,
      ambient: null,
      environment: null,
      points: [] // Array to hold multiple point lights
    };

    this._initialize();
  }

  updateLights() {
    // Handle main light
    if (this.options.mainLight) {
      if (!this.lights.main) {
        this._createMainLight();
      } else {
        this.lights.main.color.set(this.options.mainLightColor);
        this.lights.main.intensity = this.options.mainLightIntensity;
        this.lights.main.distance = this.options.mainLightDistance;
        this.lights.main.angle = this.options.mainLightAngle;
        this.lights.main.penumbra = this.options.mainLightPenumbra;
        this.lights.main.decay = this.options.mainLightDecay;
        
        this.lights.main.position.set(
          this.options.mainLightPosition.x,
          this.options.mainLightPosition.y,
          this.options.mainLightPosition.z
        );
        
        this.lights.main.target.position.set(
          this.options.mainLightTarget.x,
          this.options.mainLightTarget.y,
          this.options.mainLightTarget.z
        );
      }
    } else if (this.lights.main) {
      this.scene.remove(this.lights.main.target);
      this.scene.remove(this.lights.main);
      this.lights.main = null;
    }
    
    // Handle fill light
    if (this.options.fillLight) {
      if (!this.lights.fill) {
        this._createFillLight();
      } else {
        this.lights.fill.color.set(this.options.fillLightColor);
        this.lights.fill.intensity = this.options.fillLightIntensity;
        this.lights.fill.distance = this.options.fillLightDistance;
        this.lights.fill.angle = this.options.fillLightAngle;
        this.lights.fill.penumbra = this.options.fillLightPenumbra;
        this.lights.fill.decay = this.options.fillLightDecay;
        
        this.lights.fill.position.set(
          this.options.fillLightPosition.x,
          this.options.fillLightPosition.y,
          this.options.fillLightPosition.z
        );
        
        this.lights.fill.target.position.set(
          this.options.fillLightTarget.x,
          this.options.fillLightTarget.y,
          this.options.fillLightTarget.z
        );
      }
    } else if (this.lights.fill) {
      this.scene.remove(this.lights.fill.target);
      this.scene.remove(this.lights.fill);
      this.lights.fill = null;
    }
    
    // Handle rim light
    if (this.options.rimLight) {
      if (!this.lights.rim) {
        this._createRimLight();
      } else {
        this.lights.rim.color.set(this.options.rimLightColor);
        this.lights.rim.intensity = this.options.rimLightIntensity;
        this.lights.rim.distance = this.options.rimLightDistance;
        this.lights.rim.angle = this.options.rimLightAngle;
        this.lights.rim.penumbra = this.options.rimLightPenumbra;
        this.lights.rim.decay = this.options.rimLightDecay;
        
        this.lights.rim.position.set(
          this.options.rimLightPosition.x,
          this.options.rimLightPosition.y,
          this.options.rimLightPosition.z
        );
        
        this.lights.rim.target.position.set(
          this.options.rimLightTarget.x,
          this.options.rimLightTarget.y,
          this.options.rimLightTarget.z
        );
      }
    } else if (this.lights.rim) {
      this.scene.remove(this.lights.rim.target);
      this.scene.remove(this.lights.rim);
      this.lights.rim = null;
    }
    
    // Handle ambient light
    if (this.options.ambientLight) {
      if (!this.lights.ambient) {
        this._createAmbientLight();
      } else {
        this.lights.ambient.color.set(this.options.ambientColor);
        this.lights.ambient.intensity = this.options.ambientIntensity;
      }
    } else if (this.lights.ambient) {
      this.scene.remove(this.lights.ambient);
      this.lights.ambient = null;
    }

    // Handle Point lights
    if (this.options.pointLights) {
      if (this.lights.points.length === 0) {
        this._createPointLights();

      } else {
        // Update existing point lights
        for (let i = 0; i < this.lights.points.length; i++) {
          const light = this.lights.points[i];
          const pos = this.options.pointLightPositions[i];
          
          light.color.set(this.options.pointLightColor);
          light.intensity = this.options.pointLightIntensity;
          light.distance = this.options.pointLightDistance;
          light.decay = this.options.pointLightDecay;
          light.position.set(pos.x, pos.y, pos.z);
        }
      }
    } else if (this.lights.points.length > 0) {
      // Remove all point lights if disabled
      for (const light of this.lights.points) {
        this.scene.remove(light);
      }
      this.lights.points = [];
    }
    
    // Update environment map
    if (this.options.environmentMap && !this.scene.environment) {
      this._setupEnvironmentMap();
    } else if (!this.options.environmentMap && this.scene.environment) {
      this.scene.environment = null;  
      this.scene.background = null;
    }

    // Update environment map intensity
    this._updateEnvMapIntensity();
    
    // Update helpers
    this._updateHelpers();
  }

  _updateHelpers() {
    // First remove any existing helpers
    if(this.lights.rim) if(this.lights.rim.helper) this.scene.remove(this.lights.rim.helper);
    
    // Create new helpers if enabled
    if (this.options.helpers) {
      this._createHelpers();
    }
  }
  
  _initialize() {
    // Configuración de sombras según calidad
    this._setupShadowQuality();
    
    // Crear luces
    this._createMainLight();
    this._createFillLight();
    this._createRimLight();
    this._createAmbientLight();
    this._createPointLights();

    // Cargar environment map para IBL (Image Based Lighting)
    if (this.options.environmentMap) {
      this._setupEnvironmentMap();
    }

    // Mostrar helpers si es necesario
    if (this.options.helpers) {
      this._createHelpers();
    }
  }
  
  _setupShadowQuality() {
    const qualityMap = {
      'low': 1024,
      'medium': 2048,
      'high': 4096,
      'ultra': 8192
    };
    
    this.shadowMapSize = qualityMap[this.options.quality] || this.options.shadowMapSize;
  }
  
  _createMainLight() {
    if (!this.options.mainLight) return;
    
    // Create SpotLight for main light (key light)
    const light = new THREE.SpotLight(
      this.options.mainLightColor, 
      this.options.mainLightIntensity,
      this.options.mainLightDistance,
      this.options.mainLightAngle,
      this.options.mainLightPenumbra,
      this.options.mainLightDecay
    );
    
    // Configure position
    light.position.set(
      this.options.mainLightPosition.x,
      this.options.mainLightPosition.y,
      this.options.mainLightPosition.z
    );
    
    // Create and position target
    light.target = new THREE.Object3D();
    light.target.position.set(
      this.options.mainLightTarget.x,
      this.options.mainLightTarget.y,
      this.options.mainLightTarget.z
    );
    this.scene.add(light.target);
    
    // Configure shadows
    if (this.options.shadows) {
      //light.castShadow = true;
      light.shadow.mapSize.width = this.shadowMapSize;
      light.shadow.mapSize.height = this.shadowMapSize;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 25;
      light.shadow.radius = 3;
      light.shadow.bias = -0.0001;
      light.shadow.normalBias = 0.05;
    }
    
    this.lights.main = light;
    this.scene.add(light);
  }
  
  _createFillLight() {
    if (!this.options.fillLight) return;
    
    // Create SpotLight for fill light
    const light = new THREE.SpotLight(
      this.options.fillLightColor, 
      this.options.fillLightIntensity,
      this.options.fillLightDistance,
      this.options.fillLightAngle,
      this.options.fillLightPenumbra,
      this.options.fillLightDecay
    );
    
    // Configure position
    light.position.set(
      this.options.fillLightPosition.x,
      this.options.fillLightPosition.y,
      this.options.fillLightPosition.z
    );
    
    // Create and position target
    light.target = new THREE.Object3D();
    light.target.position.set(
      this.options.fillLightTarget.x,
      this.options.fillLightTarget.y,
      this.options.fillLightTarget.z
    );
    this.scene.add(light.target);
    
    // Fill light typically doesn't cast shadows
    light.castShadow = false;
    
    this.lights.fill = light;
    this.scene.add(light);
  }
  
  _createRimLight() {
    if (!this.options.rimLight) return;
    
    // Create SpotLight for rim light
    const light = new THREE.SpotLight(
      this.options.rimLightColor, 
      this.options.rimLightIntensity,
      this.options.rimLightDistance,
      this.options.rimLightAngle,
      this.options.rimLightPenumbra,
      this.options.rimLightDecay
    );
    
    // Configure position
    light.position.set(
      this.options.rimLightPosition.x,
      this.options.rimLightPosition.y,
      this.options.rimLightPosition.z
    );
    
    // Create and position target
    light.target = new THREE.Object3D();
    light.target.position.set(
      this.options.rimLightTarget.x,
      this.options.rimLightTarget.y,
      this.options.rimLightTarget.z
    );
    this.scene.add(light.target);
    
    // Rim light typically doesn't cast shadows
    light.castShadow = false;
    
    this.lights.rim = light;
    this.scene.add(light);
  }
  
  _createAmbientLight() {
    if (!this.options.ambientLight) return;
    
    // Crear luz ambiental (iluminación general)
    const light = new THREE.AmbientLight(
      this.options.ambientColor,
      this.options.ambientIntensity
    );
    
    this.lights.ambient = light;
    this.scene.add(light);
  }
  
  _setupEnvironmentMap() {
    console.log("setup")

    if (!this.options.environmentMap) return;
    const rgbeLoader = new RGBELoader();
    
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer.instance);
    pmremGenerator.compileEquirectangularShader();

    rgbeLoader.load(this.options.hdriPath, (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      this.scene.environment = envMap;
      
      // Opcional: usar como fondo
      //this.scene.background = envMap;

      this._updateEnvMapIntensity();
      
      texture.dispose();
      pmremGenerator.dispose();
    });
  }
  
  _updateEnvMapIntensity(intensity = this.options.envMapIntensity) {
        this.scene.traverse((child) => {
            if (child.isMesh && child.material && 'envMapIntensity' in child.material) {
                child.material.envMap = this.scene.environment;
                child.material.envMapIntensity = intensity;
                child.material.needsUpdate = true;
            }
        });

        return true;
    /*
    // Actualizar la intensidad en todos los materiales
    this.scene.traverse((object) => {
      if (object.isMesh && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => {
            if (material.envMap !== undefined) {
              material.envMapIntensity = this.options.envMapIntensity;
              material.needsUpdate = true;
            }
          });
        } else {
          if (object.material.envMap !== undefined) {
            object.material.envMapIntensity = this.options.envMapIntensity;
            object.material.needsUpdate = true;
          }
        }
      }
    });*/
  }
  
    /*
  _setupEnvironmentMap() {
    if (!this.options.environmentMap) return;

    // Opción 1: Usar cubemap ya cargado por Resources
    if (!this.options.useHDRI && this.resources) {
      const cubemap = this.resources.items[this.options.envMapName];
      if (!cubemap) {
        console.warn(`Cubemap '${this.options.envMapName}' no encontrado en los recursos`);
        return;
      }
      
      // Procesar el cubemap para obtener un mapa de entorno
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer.instance);
      pmremGenerator.compileEquirectangularShader();
      
      const envMap = pmremGenerator.fromCubemap(cubemap).texture;
      
      // Aplicar el environment map a la escena
      //this.scene.environment = envMap;
      
      // Opcional: usar como fondo
      //this.scene.background = cubemap;
      
      // Ajustar intensidad para materiales PBR
      this._updateEnvMapIntensity();
      
      pmremGenerator.dispose();
    } 
    // Opción 2: Cargar un HDRI directamente
    else if (this.options.useHDRI) {
      const rgbeLoader = new RGBELoader();
      
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer.instance);
      pmremGenerator.compileEquirectangularShader();
      
      rgbeLoader.load(this.options.hdriPath, (texture) => {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        this.scene.environment = envMap;
        
        // Opcional: usar como fondo
        this.scene.background = envMap;
        
        this._updateEnvMapIntensity();
        
        texture.dispose();
        pmremGenerator.dispose();
      });
    }
  }*/

  _createHelpers() {
    // Añadir helpers visuales para luces
    if (this.lights.main) {
      const helper = new THREE.SpotLightHelper(this.lights.main);
      this.scene.add(helper);
    }
    
    if (this.lights.fill) {
      const helper = new THREE.SpotLightHelper(this.lights.fill);
      this.scene.add(helper);
    }
    
    if (this.lights.rim) {
      this.lights.rim.helper = new THREE.SpotLightHelper(this.lights.rim);
      this.scene.add(this.lights.rim.helper);
    }
    
    // Add helpers for point lights
    if (this.lights.points && this.lights.points.length > 0) {
      for (const pointLight of this.lights.points) {
        const helper = new THREE.PointLightHelper(pointLight,  0.1, 0xff0000);
        this.scene.add(helper);
      }
    }

    if(!this.gui){

    // Create a GUI
    this.gui = new GUI();

    // Main Light folder
    const mainLightFolder = this.gui.addFolder('Main Light');    
    mainLightFolder.add(this.options, 'mainLight').name('Enabled').onChange(() => this.updateLights());
    mainLightFolder.addColor(this.options, 'mainLightColor').name('Color').onChange(() => this.updateLights());
    mainLightFolder.add(this.options, 'mainLightIntensity', 0, 500).name('Intensity').onChange(() => this.updateLights());
    mainLightFolder.add(this.options, 'mainLightDistance', 1, 60).name('Distance').onChange(() => this.updateLights());
    mainLightFolder.add(this.options, 'mainLightAngle', 0, Math.PI/2).name('Angle').onChange(() => this.updateLights());
    mainLightFolder.add(this.options, 'mainLightPenumbra', 0, 1).name('Penumbra').onChange(() => this.updateLights());
    mainLightFolder.add(this.options, 'mainLightDecay', 0, 5).name('Decay').onChange(() => this.updateLights());

    const mainPosFolder = mainLightFolder.addFolder('Position');
    mainPosFolder.add(this.options.mainLightPosition, 'x', -15, 15).onChange(() => this.updateLights());
    mainPosFolder.add(this.options.mainLightPosition, 'y', -15, 15).onChange(() => this.updateLights());
    mainPosFolder.add(this.options.mainLightPosition, 'z', -15, 15).onChange(() => this.updateLights());

    const mainTargetFolder = mainLightFolder.addFolder('Target');
    mainTargetFolder.add(this.options.mainLightTarget, 'x', -15, 15).onChange(() => this.updateLights());
    mainTargetFolder.add(this.options.mainLightTarget, 'y', -15, 15).onChange(() => this.updateLights());
    mainTargetFolder.add(this.options.mainLightTarget, 'z', -15, 15).onChange(() => this.updateLights());
    mainLightFolder.close();

    // Rim Light folder
    const rimLightFolder = this.gui.addFolder('Rim Light');
    rimLightFolder.add(this.options, 'rimLight').name('Enabled').onChange(() => this.updateLights());
    rimLightFolder.addColor(this.options, 'rimLightColor').name('Color').onChange(() => this.updateLights());
    rimLightFolder.add(this.options, 'rimLightIntensity', 0, 200).name('Intensity').onChange(() => this.updateLights());
    const rimPosFolder = rimLightFolder.addFolder('Position');
    rimPosFolder.add(this.options.rimLightPosition, 'x', -50, 50).onChange(() => this.updateLights());
    rimPosFolder.add(this.options.rimLightPosition, 'y', -1, 1).onChange(() => this.updateLights());
    rimPosFolder.add(this.options.rimLightPosition, 'z', -50, 50).onChange(() => this.updateLights());
    

    // Fill Light folder
    /*
    const fillLightFolder = this.gui.addFolder('Fill Light');
    fillLightFolder.add(this.options, 'fillLight').name('Enabled').onChange(() => this.updateLights());
    fillLightFolder.addColor(this.options, 'fillLightColor').name('Color').onChange(() => this.updateLights());
    fillLightFolder.add(this.options, 'fillLightIntensity', 0, 10).name('Intensity').onChange(() => this.updateLights());
    const fillPosFolder = fillLightFolder.addFolder('Position');
    fillPosFolder.add(this.options.fillLightPosition, 'x', -50, 50).onChange(() => this.updateLights());
    fillPosFolder.add(this.options.fillLightPosition, 'y', -50, 50).onChange(() => this.updateLights());
    fillPosFolder.add(this.options.fillLightPosition, 'z', -50, 50).onChange(() => this.updateLights());

    // Environment Map folder
    const envMapFolder = this.gui.addFolder('Environment Map');
    envMapFolder.add(this.options, 'environmentMap').name('Enabled').onChange(() => this.updateLights());
    envMapFolder.add(this.options, 'envMapIntensity', 0, 3).name('Intensity').onChange(() => this.updateLights());

    // Shadows folder
    const shadowsFolder = this.gui.addFolder('Shadows');
    shadowsFolder.add(this.options, 'shadows').name('Enabled').onChange(() => this.updateLights());
    shadowsFolder.add(this.options, 'softShadows').name('Soft Shadows').onChange(() => this.updateLights());
    shadowsFolder.add(this.options, 'quality', ['low', 'medium', 'high', 'ultra']).name('Quality').onChange(() => this.updateLights());

    */

    // Ambient Light folder
    const ambientFolder = this.gui.addFolder('Ambient Light');
    ambientFolder.add(this.options, 'ambientLight').name('Enabled').onChange(() => this.updateLights());
    ambientFolder.addColor(this.options, 'ambientColor').name('Color').onChange(() => this.updateLights());
    ambientFolder.add(this.options, 'ambientIntensity', 0, 5).name('Intensity').onChange(() => this.updateLights());
    ambientFolder.close();


    // Point Lights folder
    const pointLightsFolder = this.gui.addFolder('Point Lights');
    pointLightsFolder.add(this.options, 'pointLights').name('Enabled').onChange(() => this.updateLights());
    pointLightsFolder.addColor(this.options, 'pointLightColor').name('Color').onChange(() => this.updateLights());
    pointLightsFolder.add(this.options, 'pointLightIntensity', 0, 10).name('Intensity').onChange(() => this.updateLights());
    pointLightsFolder.add(this.options, 'pointLightDistance', 0, 50).name('Distance').onChange(() => this.updateLights());
    pointLightsFolder.add(this.options, 'pointLightDecay', 0, 5).name('Decay').onChange(() => this.updateLights());
    pointLightsFolder.close();

    // Individual point light positions
    if (this.options.pointLightCount > 0 && this.options.pointLightPositions) {
      const pointPositionsFolder = pointLightsFolder.addFolder('Positions');
      for (let i = 0; i < Math.min(this.options.pointLightCount, this.options.pointLightPositions.length); i++) {
        const posFolder = pointPositionsFolder.addFolder(`Point Light ${i+1}`);
        posFolder.add(this.options.pointLightPositions[i], 'x', -5, 5,0.01).onChange(() => this.updateLights());
        posFolder.add(this.options.pointLightPositions[i], 'y', -5, 5,0.01).onChange(() => this.updateLights());
        posFolder.add(this.options.pointLightPositions[i], 'z', -5, 5,0.01).onChange(() => this.updateLights());
      }
    }

    // Helpers
    //this.gui.add(this.options, 'helpers').name('Show Helpers').onChange(() => this.updateLights()); 
    }
  }

    _createPointLights() {
    if (!this.options.pointLights) return;
    
    // Clear any existing point lights
    if (this.lights.points.length > 0) {
      for (const light of this.lights.points) {
        this.scene.remove(light);
      }
      this.lights.points = [];
    }
    
    // Create point lights based on count and positions
    for (let i = 0; i < Math.min(this.options.pointLightCount, this.options.pointLightPositions.length); i++) {
      const pos = this.options.pointLightPositions[i];
      const light = new THREE.PointLight(
        this.options.pointLightColor,
        this.options.pointLightIntensity,
        this.options.pointLightDistance,
        this.options.pointLightDecay,
      );
      
      light.shadow.radius = 3;
      light.shadow.bias = -0.0001;
      light.shadow.normalBias = 0.05;

      light.position.set(pos.x, pos.y, pos.z);
      
      if (this.options.shadows) {
        light.castShadow = true;
        light.shadow.mapSize.width = this.shadowMapSize / 2; // Smaller for performance
        light.shadow.mapSize.height = this.shadowMapSize / 2;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 30;
      }
      
      this.lights.points.push(light);
      this.scene.add(light);
    }
  }
  
  // Método para actualizar en cada frame (por si se necesita alguna animación)
  update(time) {
    if (this.options.mainLightRotate && this.lights.main) {
      // Calculate new position based on time
      const angle = time * this.options.mainLightRotationSpeed/10000;
      
      // Calculate new position in a circle around (0,0,0)
      const x = Math.sin(angle) * this.options.mainLightRadius;
      const z = Math.cos(angle) * this.options.mainLightRadius;
      const y = this.options.mainLightPosition.y; // Keep same height
      
      // Update light position
      this.lights.main.position.set(x, y, z);
      this.lights.main.lookAt(0, 0, 0); // Make sure light always points to center
      
      // Update helpers if they exist
      if (this.options.helpers) {
        this._updateHelpers();
      }
    }
  }
  
  // Método para limpiar y liberar recursos
  dispose() {
    // Eliminar todas las luces de la escena
    if (this.lights.main) this.scene.remove(this.lights.main);
    if (this.lights.fill) this.scene.remove(this.lights.fill);
    if (this.lights.rim) this.scene.remove(this.lights.rim);
    if (this.lights.ambient) this.scene.remove(this.lights.ambient);
    
    // Clean up point lights
    if (this.lights.points && this.lights.points.length > 0) {
      for (const light of this.lights.points) {
        this.scene.remove(light);
      }
      this.lights.points = [];
    }
    
    // Eliminar helpers si existen
    this.scene.traverse(object => {
      if (object.isLightHelper || object.isCameraHelper || object.isPointLightHelper) {
        this.scene.remove(object);
      }
    });
  }
}