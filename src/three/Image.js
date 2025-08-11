import * as THREE from 'three';
import { int } from 'three/tsl';

export default class Image {
    constructor(scene, resources, renderer, intensity = 1.0) {
        this.scene = scene;
        this.resources = resources;
        this.renderer = renderer;

        this.cubemaps = {};
        this.activeCubemap = null;
        this.overlayObjects = [];
        
        this.skyboxIntensity = intensity;
        this.sceneBackground = false;

        this.skybox = false;
        this.usingSkyboxMesh = false; 
        
        // PMREMGenerator para convertir cubemaps en environment maps
        this.pmremGenerator = new THREE.PMREMGenerator(this.renderer.instance);
        this.pmremGenerator.compileEquirectangularShader();
        
        // Cargar cubemaps disponibles
        this.loadCubemaps();
        
        // Inicializar con el cubemap base
        this.setBackground("sky", this.skyboxIntensity, false);
    }
    
    loadCubemaps() {
        // Buscar todos los recursos de tipo cubeTexture
        for (const itemName in this.resources.items) {
            const item = this.resources.items[itemName];
                if (item instanceof THREE.DataTexture) {
                this.processCubemap(itemName, item);
            }
        }
    }
    
    processCubemap(name, cubemap) {
        // Procesar cubemap para usarlo como environment map
        const envMap = this.pmremGenerator.fromEquirectangular(cubemap).texture;
        
        // Guardar referencia
        this.cubemaps[name] = cubemap;
        
    }
    
    // Establece un cubemap como fondo de escena
    setBackground(name, intensity = 1.0, useMesh = false) {
        if (!this.cubemaps[name]) {
            console.warn(`Cubemap "${name}" no encontrado`);
            return false;
        }
        
        this.activeCubemap = name;
        
        if (useMesh) {
            // Usar skybox mesh
            this.usingSkyboxMesh = true;
            this.scene.background = null;
            this.createSkybox(name, 1000); // Create or update skybox
        } else {
            // Usar scene.background
            this.usingSkyboxMesh = false;
            this.removeSkybox();
            if(this.sceneBackground) this.scene.background = this.cubemaps[name];
        }
        
        // Usar también para environment map (reflejos)
        this.scene.environment = this.cubemaps[name];
        // this.scene.environment.intensity = 0.2;
        
        return true;
    }
    
    // Crea un cubo grande (skybox) con una textura de cubemap
    createSkybox(name, size = 1000) {

        if (!this.cubemaps[name]) {
            console.warn(`Cubemap "${name}" no encontrado`);
            return false;
        }
        
        // Eliminar skybox existente si hay uno
        this.removeSkybox();
        
        // Usar BoxGeometry en lugar de SphereGeometry para un skybox cúbico
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        // Crear material con la textura del cubemap
        const material = new THREE.MeshBasicMaterial({
            envMap: this.cubemaps[name].original,
            side: THREE.BackSide, // Renderizar desde dentro
            depthWrite: false // Importante para skybox
        });
        
        // Crear el mesh del skybox
        this.skybox = new THREE.Mesh(geometry, material);
        
        // Añadir a la escena
        this.scene.add(this.skybox);
        
        return true;
    }
    
    // Eliminar el skybox de la escena
    removeSkybox() {
        if (this.skybox) {
            this.scene.remove(this.skybox);
            this.skybox.geometry.dispose();
            this.skybox.material.dispose();
            this.skybox = null;
        }
    }
    
    // Cambiar la textura del skybox, o crearlo si no existe
    setSkyboxTexture(name) {
        if (!this.cubemaps[name]) {
            console.warn(`Cubemap "${name}" no encontrado`);
            return false;
        }
        
        this.activeCubemap = name;
        
        if (this.usingSkyboxMesh) {
            if (!this.skybox) {
                return this.createSkybox(name);
            }
            
            // Actualizar la textura
            this.skybox.material.envMap = this.cubemaps[name].original;
            this.skybox.material.needsUpdate = true;
            
        } else {
            // Si estamos usando scene.background, actualizarlo
            this.scene.background = this.cubemaps[name].original;
        }
        
        // Actualizar environment map para reflejos
        this.scene.environment = this.cubemaps[name].processed;
        
        return true;
    }
    
    // Ajustar la opacidad del fondo
    setBackgroundOpacity(opacity = 1.0) {
        if (this.usingSkyboxMesh && this.skybox) {
            if (!this.skybox.material.transparent) {
                this.skybox.material.transparent = true;
            }
            this.skybox.material.opacity = opacity;
            this.skybox.material.needsUpdate = true;
        } else if (this.scene.background) {
            // No podemos cambiar la opacidad directamente del scene.background
            // Tendríamos que cambiar a modo skybox mesh para soportar transparencia
            console.warn("Para usar transparencia, cambie a modo skybox con useMesh=true");
        }
    }
    
    // Alternar entre usar scene.background y un skybox mesh
    toggleSkyboxMode(useMesh = this.usingSkyboxMesh) {
        const currentCubemap = this.activeCubemap;
        if (!currentCubemap) {
            console.warn("No hay cubemap activo para cambiar el modo");
            return false;
        }
        
        return this.setBackground(currentCubemap, this.skyboxIntensity, useMesh);
    }
    
    // Actualizar la intensidad del environment map en los materiales
    updateEnvironmentMapIntensity(intensity) {
        this.scene.traverse((child) => {
            if (child.isMesh && child.material && 'envMapIntensity' in child.material) {
                child.material.envMap = this.scene.environment;
                child.material.envMapIntensity = intensity;
                child.material.needsUpdate = true;
            }
        });

        return true;
    }
}