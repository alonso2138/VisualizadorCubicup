import * as THREE from 'three';
import EventEmitter from '../Utils/EventEmitter';
import { file } from 'jszip';

export default class Model extends EventEmitter {
    constructor(scene, resources) {
        super();
        
        this.scene = scene;
        this.resources = resources;
        
        // Initialize empty objects for tracking
        this.model = null;
        this.meshes = {};
        
        // Create materials library
        this.materials = {};

        // Esperar a que los recursos estén cargados
        if (this.resources.loaded === this.resources.toLoad) {
            this.init();
        } else {
            this.resources.on('ready', () => {
                this.init();
            });
        }
    }
    
    init() {
       
        // Inicializar el modelo
        this.setModel();
        this.setMeshes();
    }
    
    
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
              material.normalScale.set(2, -2);

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
    async applyTextureToGroup(meshes, texturePath, options = {}) {
      try {
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
        meshes.forEach(mesh => {
          if (!mesh || !mesh.isMesh) return;
          
          if(options.isGlass) mesh.castShadow = false;

          // Generamos un material “world‐space UV” escalable
          const tiling = options.tiling || 0.25
          const offset = options.offset || tiling*0.726
          const mat = this.makeWorldUVMaterial(baseMat,tiling, offset);
          
          // Apply envmap intensity
          if(window.experience.image){
            mat.envMap = window.experience.image.cubemaps[window.experience.image.activeCubemap]
            mat.envMapIntensity = window.experience.image.skyboxIntensity;
          }
          
          // Apply material to mesh
          if (!mesh._originalMaterial) {
            mesh._originalMaterial = mesh.material;
          }

          mesh.material = mat;
          mesh.material.needsUpdate = true; 
          window.experience.lighting._updateEnvMapIntensity();
        });
      } catch (err) {
        console.error('Error applying texture to group:', err);
        return 0;
      }
    }
      
    setModel() {
        if(!this.resources.items.modeloBase) return;
        this.model = this.resources.items.modeloBase.scene;

        // Register all meshes by name or UUID
        this.model.traverse((child) => {
              if (child instanceof THREE.Light) {
                if(child instanceof THREE.DirectionalLight) child.parent.remove(child);
                child.intensity/=25000;
                child.distance*=25000;
                //child.parent.remove(child);
              }

            if (child.isMesh) {
                // Use name if available, otherwise use UUID
                const key = child.name || child.uuid;
                this.meshes[key] = child;

                // Improve material for better reflections
                if (child.material) {
                    child.material.envMapIntensity = 1;
        
                }
            }
        });
        this.scene.add(this.model);
        this.trigger("loaded")
    }
    
    setMeshes() {
        if (!this.model) {
            console.error('No hay modelo para configurar meshes');
            return;
        }
        
        // Recorrer el modelo y guardar referencia a mallas importantes
        this.model.traverse((child) => {
            if (child.isMesh && child.material) {
                const oldMat = child.material;
            
                const newMat = new THREE.MeshPhysicalMaterial({
                  map: oldMat.map || null,
                  color: oldMat.color || new THREE.Color(0xffffff),
                });

            
                child.material = newMat;
                child.castShadow = true;
                child.receiveShadow = true;

                this.meshes[child.userData.name] = (child);
              }   
        });
    }
}