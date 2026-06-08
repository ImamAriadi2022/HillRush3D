import * as THREE from 'three';

export class SceneManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Lighting references
    this.ambientLight = null;
    this.dirLight = null;
    
    // Camera follow offset configuration
    this.followOffset = new THREE.Vector3(0, 4.5, 9.5); // x (centered), y (above), z (behind)
    this.lookAheadOffset = new THREE.Vector3(0, 1.0, -3.0); // look slightly in front of truck
    
    this.init();
  }

  init() {
    // 1. Create Scene
    this.scene = new THREE.Scene();
    
    // 2. Setup Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 12);

    // 3. Setup WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    this.container.appendChild(this.renderer.domElement);

    // 4. Setup Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(20, 50, 10);
    this.dirLight.castShadow = true;
    
    // Configure shadow map bounds for high quality low-poly shadows
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 150;
    
    const d = 30;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;

    this.scene.add(this.dirLight);

    // 5. Add fog to mask the far clipping plane
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

    // 6. Handle resizing
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Initial theme setup (Light mode)
    this.updateTheme(false);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Smooth camera follow lerp
  updateCamera(vehicle, dt) {
    if (!vehicle || !vehicle.loaded) return;

    const vehiclePos = vehicle.position;

    // Target position of the camera behind the truck
    const targetCameraPos = new THREE.Vector3(
      vehiclePos.x + this.followOffset.x,
      vehiclePos.y + this.followOffset.y,
      vehiclePos.z + this.followOffset.z
    );

    // Point where the camera looks (ahead of the truck)
    const targetLookAt = new THREE.Vector3(
      vehiclePos.x + this.lookAheadOffset.x,
      vehiclePos.y + this.lookAheadOffset.y,
      vehiclePos.z + this.lookAheadOffset.z
    );

    // Apply lerping to make camera camera feel smooth and physical
    const lerpFactor = 5.0 * dt; // time-independent lerp speed
    this.camera.position.lerp(targetCameraPos, THREE.MathUtils.clamp(lerpFactor, 0, 1));

    // Update camera orientation
    // We create a temporary look-at point and interpolate towards it
    const currentLookAt = new THREE.Vector3();
    this.camera.getWorldDirection(currentLookAt);
    // Project current look at to a point in front of camera
    currentLookAt.multiplyScalar(5).add(this.camera.position);
    currentLookAt.lerp(targetLookAt, THREE.MathUtils.clamp(lerpFactor * 1.5, 0, 1));
    this.camera.lookAt(currentLookAt);

    // Keep Directional Light centered near the vehicle to render shadows efficiently
    this.dirLight.position.set(
      vehiclePos.x + 20,
      vehiclePos.y + 40,
      vehiclePos.z + 10
    );
    this.dirLight.target = vehicle.model;
  }

  // Snaps the camera instantly to target (e.g. on game start / restart)
  snapCamera(vehicle) {
    if (!vehicle || !vehicle.loaded) return;
    
    const vehiclePos = vehicle.position;
    this.camera.position.set(
      vehiclePos.x + this.followOffset.x,
      vehiclePos.y + this.followOffset.y,
      vehiclePos.z + this.followOffset.z
    );
    
    const targetLookAt = new THREE.Vector3(
      vehiclePos.x + this.lookAheadOffset.x,
      vehiclePos.y + this.lookAheadOffset.y,
      vehiclePos.z + this.lookAheadOffset.z
    );
    this.camera.lookAt(targetLookAt);
  }

  updateTheme(isDark) {
    const skyLightColor = new THREE.Color(isDark ? '#0b0c16' : '#93c5fd'); // Dark indigo vs Bright skyblue
    const ambientColor = new THREE.Color(isDark ? '#2e2c45' : '#e0e9f5');
    const dirLightColor = new THREE.Color(isDark ? '#a5b4fc' : '#fffae8');

    // 1. Sky and Fog Colors
    this.scene.background = skyLightColor;
    this.scene.fog.color = skyLightColor;
    
    // 2. Adjust lighting values
    this.ambientLight.color = ambientColor;
    this.ambientLight.intensity = isDark ? 0.35 : 0.8;
    
    this.dirLight.color = dirLightColor;
    this.dirLight.intensity = isDark ? 0.5 : 1.25;

    // Adjust shadow bias/strengths if needed
    this.renderer.setClearColor(skyLightColor);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
