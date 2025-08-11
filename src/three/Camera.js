import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default class Camera {
  constructor(options = {}) {
    // Opciones por defecto
    this.options = {
      fov: options.fov || 75,
      nearPlane: options.nearPlane || 0.1,
      farPlane: options.farPlane || 1000,
      position: options.position || { x: 2 , y: 0, z: 0 },
      orbitControls: options.orbitControls !== undefined ? options.orbitControls : true,
      damping: options.damping !== undefined ? options.damping : true,
      dampingFactor: options.dampingFactor || 0.05,
      maxDistance: options.maxDistance || 10,
      // Add the new parameters
      autoRotate: options.autoRotate !== undefined ? options.autoRotate : false,
      autoRotateSpeed: options.autoRotateSpeed || 0.5,
      minDistance: options.minDistance || 0.05,
      minPolarAngle: options.minPolarAngle || 0,
      maxPolarAngle: options.maxPolarAngle || Math.PI,
      screenSpacePanning: options.screenSpacePanning !== undefined ? options.screenSpacePanning : true,
      rotateSpeed: options.rotateSpeed || 1.0,
      zoomSpeed: options.zoomSpeed || 1.0,
      panSpeed: options.panSpeed || 1.0,
    };
    
    this._initialize();
  }
  
  _initialize() {
    // Crear la instancia de la cámara
    this.instance = new THREE.PerspectiveCamera(
      this.options.fov,
      window.innerWidth / window.innerHeight,
      this.options.nearPlane,
      this.options.farPlane
    );
    
    // Configurar la posición
    this.instance.position.set(
      this.options.position.x,
      this.options.position.y,
      this.options.position.z
    );
  }
  
  // Configurar OrbitControls
  setOrbitControls(renderer) {
    if (this.options.orbitControls) {
      this.controls = new OrbitControls(this.instance, renderer.domElement);
      
      // Apply all configuration options
      this.controls.enableDamping = this.options.damping;
      this.controls.dampingFactor = this.options.dampingFactor;
      this.controls.maxDistance = this.options.maxDistance;
      this.controls.minDistance = this.options.minDistance;
      this.controls.autoRotate = this.options.autoRotate;
      this.controls.autoRotateSpeed = this.options.autoRotateSpeed;
      this.controls.minPolarAngle = this.options.minPolarAngle;
      this.controls.maxPolarAngle = this.options.maxPolarAngle;
      this.controls.screenSpacePanning = this.options.screenSpacePanning;
      this.controls.rotateSpeed = this.options.rotateSpeed;
      this.controls.zoomSpeed = this.options.zoomSpeed;
      this.controls.panSpeed = this.options.panSpeed;

      this.controls.target.set(0, 0, 0);
    }
    return this.controls;
  }
  
  // Actualizar la cámara cuando cambia el tamaño de la ventana
  resize() {
    this.instance.aspect = window.innerWidth / window.innerHeight;
    this.instance.updateProjectionMatrix();
  }
  
  // Método para actualizar en cada frame
  update() {
    if (this.controls && this.options.damping) {
      this.controls.update();
    }
  }
  
  // Método para apuntar la cámara a un objeto
  lookAt(target) {
    if (target instanceof THREE.Vector3) {
      this.instance.lookAt(target);
    } else if (target.position) {
      this.instance.lookAt(target.position);
    }
  }
  
  // Método para animar la cámara a una nueva posición
  animateTo(newPosition, duration = 1.0, onComplete = null) {
    const startPosition = this.instance.position.clone();
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      
      // Interpolación lineal entre posiciones
      this.instance.position.lerpVectors(
        startPosition,
        newPosition,
        progress
      );
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else if (onComplete) {
        onComplete();
      }
    };
    
    animate();
  }
}