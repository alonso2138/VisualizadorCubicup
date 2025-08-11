import * as THREE from 'three';

export default class Renderer {
  constructor(options = {}) {
    // Opciones por defecto
    this.options = {
      antialias: options.antialias !== undefined ? options.antialias : true,
      alpha: options.alpha !== undefined ? options.alpha : false,
      clearColor: options.clearColor || 0xffffff,
      clearAlpha: options.clearAlpha !== undefined ? options.clearAlpha : 1.0,
      pixelRatio: options.pixelRatio || window.devicePixelRatio,
      shadows: options.shadows !== undefined ? options.shadows : true,
      shadowMapType: options.shadowMapType || THREE.PCFSoftShadowMap,
      physicallyCorrectLights: options.physicallyCorrectLights !== undefined ? options.physicallyCorrectLights : true,
      outputEncoding: options.outputEncoding || THREE.sRGBEncoding,
      toneMapping: options.toneMapping || THREE.ACESFilmicToneMapping,
      toneMappingExposure: options.toneMappingExposure || 1.0,
      container: options.container || document.body,
      autoResize: options.autoResize !== undefined ? options.autoResize : true,
      outputColorSpace: options.outputColorSpace || THREE.SRGBColorSpace
    };

    this._initialize();
  }

  _initialize() {
    // Crear la instancia del renderer
    this.instance = new THREE.WebGLRenderer({
      antialias: this.options.antialias,
      alpha: this.options.alpha
    });

    // Configuración básica
    this.instance.setClearColor(this.options.clearColor, this.options.clearAlpha);
    this.instance.setPixelRatio(Math.min(this.options.pixelRatio, 2)); // Limitar para rendimiento
    this.instance.setSize(window.innerWidth, window.innerHeight);

    // Configuración avanzada
    this.instance.shadowMap.enabled = this.options.shadows;
    this.instance.shadowMap.type = this.options.shadowMapType;
    this.instance.physicallyCorrectLights = this.options.physicallyCorrectLights;
    this.instance.outputEncoding = this.options.outputEncoding;
    this.instance.outputColorSpace = this.options.outputColorSpace;
    this.instance.toneMapping = this.options.toneMapping;
    this.instance.toneMappingExposure = this.options.toneMappingExposure;

    // Añadir el canvas al DOM
    this.options.container.appendChild(this.instance.domElement);

    // Configurar evento de redimensionamiento
    if (this.options.autoResize) {
      window.addEventListener('resize', () => this.resize());
    }
  }

  // Método para actualizar el tamaño del renderer
  resize() {
    this.instance.setSize(window.innerWidth, window.innerHeight);
  }

  // Método para renderizar la escena
  render(scene, camera) {
    this.instance.render(scene, camera instanceof THREE.Camera ? camera : camera.instance);
  }

  // Método para habilitar/deshabilitar sombras
  setShadowsEnabled(enabled) {
    this.instance.shadowMap.enabled = enabled;
    this.instance.shadowMap.needsUpdate = true;
  }

  // Método para cambiar el color de fondo
  setBackground(color, alpha = 1.0) {
    this.instance.setClearColor(color, alpha);
  }

  // Método para cambiar la exposición de tone mapping
  setExposure(exposure) {
    this.instance.toneMappingExposure = exposure;
  }

  // Método para obtener el elemento DOM del canvas
  getDomElement() {
    return this.instance.domElement;
  }

  // Método para activar/desactivar VR cuando sea necesario
  enableVR(enabled = true) {
    if (enabled && this.instance.xr) {
      this.instance.xr.enabled = true;
    }
  }

  // Método para destruir el renderer y liberar recursos
  dispose() {
    if (this.options.autoResize) {
      window.removeEventListener('resize', () => this.resize());
    }
    
    this.instance.dispose();
    
    if (this.instance.domElement && this.instance.domElement.parentNode) {
      this.instance.domElement.parentNode.removeChild(this.instance.domElement);
    }
  }
}