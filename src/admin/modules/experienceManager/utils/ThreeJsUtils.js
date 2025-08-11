// ThreeJsUtils - Utilities for Three.js operations
// Part of the ExperienceManager modular system

export class ThreeJsUtils {
    static checkThreeJsAvailability() {
        return {
            core: !!window.THREE,
            orbitControls: !!window.THREE?.OrbitControls,
            gltfLoader: !!window.THREE?.GLTFLoader
        };
    }

    static ensureLibrariesLoaded() {
        const availability = this.checkThreeJsAvailability();
        
        if (!availability.core) {
            throw new Error('THREE.js library not loaded');
        }

        // Try to fix missing OrbitControls
        if (!availability.orbitControls && window.THREE && window.THREE.OrbitControls) {
            THREE.OrbitControls = window.THREE.OrbitControls;
        }

        // Try to fix missing GLTFLoader
        if (!availability.gltfLoader && window.THREE && window.THREE.GLTFLoader) {
            THREE.GLTFLoader = window.THREE.GLTFLoader;
        }

        return this.checkThreeJsAvailability();
    }

    static createBasicScene(backgroundColor = 0xf0f0f0) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(backgroundColor);
        return scene;
    }

    static createCamera(aspect, fov = 75, near = 0.1, far = 1000) {
        const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);
        return camera;
    }

    static createRenderer(width, height, antialias = true) {
        const renderer = new THREE.WebGLRenderer({ antialias });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        return renderer;
    }

    static addBasicLighting(scene) {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);

        return { ambientLight, directionalLight };
    }

    static createGridHelper(size = 20, divisions = 20, opacity = 0.3) {
        const gridHelper = new THREE.GridHelper(size, divisions);
        gridHelper.material.opacity = opacity;
        gridHelper.material.transparent = true;
        return gridHelper;
    }

    static setupOrbitControls(camera, domElement) {
        if (!THREE.OrbitControls) {
            console.warn('OrbitControls not available');
            return null;
        }

        const controls = new THREE.OrbitControls(camera, domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.enableRotate = true;
        controls.enablePan = true;
        return controls;
    }

    static centerModel(model) {
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        return { box, center };
    }

    static scaleModel(model, maxSize = 5) {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);
        
        if (maxDimension > maxSize) {
            const scale = maxSize / maxDimension;
            model.scale.multiplyScalar(scale);
            return scale;
        }
        
        return 1;
    }

    static fitCameraToModel(camera, controls, model) {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);

        const distance = maxDimension * 2;
        camera.position.set(distance, distance, distance);
        camera.lookAt(0, 0, 0);
        
        if (controls) {
            controls.target.set(0, 0, 0);
            controls.update();
        }
    }

    static enableShadows(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    static disposeObject(object) {
        if (object.geometry) {
            object.geometry.dispose();
        }
        
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => {
                    if (material.map) material.map.dispose();
                    if (material.normalMap) material.normalMap.dispose();
                    if (material.roughnessMap) material.roughnessMap.dispose();
                    if (material.metalnessMap) material.metalnessMap.dispose();
                    material.dispose();
                });
            } else {
                if (object.material.map) object.material.map.dispose();
                if (object.material.normalMap) object.material.normalMap.dispose();
                if (object.material.roughnessMap) object.material.roughnessMap.dispose();
                if (object.material.metalnessMap) object.material.metalnessMap.dispose();
                object.material.dispose();
            }
        }
    }

    static cleanupScene(scene) {
        if (!scene) return;
        
        scene.traverse((object) => {
            this.disposeObject(object);
        });
        
        scene.clear();
    }
}
