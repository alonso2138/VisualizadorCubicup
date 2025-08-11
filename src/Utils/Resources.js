import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import EventEmitter from './EventEmitter.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

export default class Resources extends EventEmitter
{
    constructor(sources)
    {
        super()

        this.sources = sources

        this.items = {}
        this.materialList = []
        this.toLoad = this.sources.length
        this.loaded = 0
        this.errors = []

        this.setLoaders()
        this.startLoading()
    }

    setLoaders()
    {
        this.loaders = {}
        this.loaders.gltfLoader = new GLTFLoader()  
        this.loaders.textureLoader = new THREE.TextureLoader()
        this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader()
        this.loaders.RGBELoader = new RGBELoader();

    }

    startLoading()
    {        
        // Load each source
        for(const source of this.sources)
        {
            if(source.type === 'gltfModel')
            {
                this.loaders.gltfLoader.load(
                    source.path,
                    (file) => {
                        this.sourceLoaded(source, file)
                    },
                    (progressEvent) => { // Callback para el progreso
                        const progress = (progressEvent.loaded / progressEvent.total) * 100;
                        if(window.updateProgress) window.updateProgress(progress)
                    }, // Progreso (opcional)
                    (error) => {
                        this.handleError(source, error)
                    }
                )
            }
            else if(source.type === 'texture')
            {
                // Extraer el nombre del material (parte antes del _)
                const nameParts = source.name.split('_');
                if(nameParts.length > 1) {
                    const materialName = nameParts[0];
                    
                    // Añadir a la lista de materiales si no existe ya
                    if(!this.materialList.includes(materialName)) {
                        this.materialList.push(materialName);
                    }
                }

                //this.materialList.push(source);
                this.loaders.textureLoader.load(
                    source.path,
                    (file) => {
                        this.sourceLoaded(source, file)
                    },
                    undefined, // Progreso (opcional)
                    (error) => {
                        this.handleError(source, error)
                    }
                )
            }
            else if(source.type === 'cubeTexture')
            {
                this.loaders.cubeTextureLoader.load(
                    source.path,
                    (file) => {
                        this.sourceLoaded(source, file)
                    },
                    undefined, // Progreso (opcional)
                    (error) => {
                        this.handleError(source, error)
                    }
                )
            }
            else if(source.type === 'hdri')
            {
                this.loaders.RGBELoader.load(
                    source.path,
                    (texture) => {
                        texture.mapping = THREE.EquirectangularReflectionMapping;

                        this.sourceLoaded(source, texture)
                    },
                    undefined,
                    (error) => {
                        this.handleError(source, error)
                    }
                )
            }
        }
    }

    handleError(source, error) {
        // Registrar el error
        this.errors.push({ source: source.name, error });
        
        // Incrementar contador de cargados para que el proceso continúe
        this.loaded++;
                
        // Verificar si hemos terminado, aunque sea con errores
        if(this.loaded === this.toLoad) {
            this.trigger('ready')
        }
    }

    sourceLoaded(source, file)
    {
        this.items[source.name] = file

        this.loaded++
        
        if(this.loaded === this.toLoad)
        {
            this.trigger('ready')

        }
    }
}