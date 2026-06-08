import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Vehicle {
  constructor(scene) {
    this.scene = scene;
    this.model = null;
    this.wheels = [];
    this.loaded = false;

    // Movement physics parameters
    this.position = new THREE.Vector3(0, 0, 0);
    this.speed = 0;
    this.maxSpeed = 30;
    this.acceleration = 12;
    this.deceleration = 8;
    this.braking = 25;
    this.friction = 5;
    
    // Dimensions for snapping
    this.wheelbase = 3.2; // Distance between front and rear wheels
    this.chassisOffset = 0.55; // Upward offset so wheels sit on terrain
    this.wheelRadius = 0.6;

    // Headlights for Dark Mode
    this.headlights = [];
    
    this.loadModel();
  }

  loadModel() {
    const loader = new GLTFLoader();
    
    loader.load(
      '/low-poly_truck_car_drifter.glb',
      (gltf) => {
        this.model = gltf.scene;
        
        // Enable shadows on the truck
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
          
          // Identify wheels
          if (child.name && child.name.toLowerCase().includes('wheel') && !child.name.toLowerCase().includes('black')) {
            // Store reference to parent node if it represents the wheel group
            // In our GLB, nodes like "Front_wheel" and "Rear_wheel" contain the meshes.
            this.wheels.push(child);
          }
        });

        // Set initial scale and rotation (if GLB needs adjustment)
        this.model.scale.set(1.0, 1.0, 1.0);
        
        this.scene.add(this.model);
        this.loaded = true;
        
        // Create headlights
        this.createHeadlights();
      },
      undefined,
      (error) => {
        console.error('Error loading vehicle model:', error);
      }
    );
  }

  createHeadlights() {
    if (!this.model) return;

    // Left Headlight
    const leftLight = new THREE.SpotLight('#ffffff', 0, 25, Math.PI / 6, 0.5, 1);
    leftLight.position.set(-0.8, 0.8, -1.8); // Local position in front of truck
    leftLight.target.position.set(-0.8, 0.5, -10);
    leftLight.castShadow = true;
    leftLight.shadow.mapSize.width = 512;
    leftLight.shadow.mapSize.height = 512;

    // Right Headlight
    const rightLight = new THREE.SpotLight('#ffffff', 0, 25, Math.PI / 6, 0.5, 1);
    rightLight.position.set(0.8, 0.8, -1.8);
    rightLight.target.position.set(0.8, 0.5, -10);
    rightLight.castShadow = true;
    rightLight.shadow.mapSize.width = 512;
    rightLight.shadow.mapSize.height = 512;

    this.model.add(leftLight);
    this.model.add(leftLight.target);
    this.model.add(rightLight);
    this.model.add(rightLight.target);

    this.headlights = [leftLight, rightLight];
  }

  update(dt, input, terrain) {
    if (!this.loaded || !this.model) return;

    // 1. Process Keyboard Input (Physics)
    if (input.forward) {
      this.speed += this.acceleration * dt;
    } else if (input.backward) {
      this.speed -= this.braking * dt;
    } else {
      // Apply passive friction
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - this.friction * dt);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + this.friction * dt);
      }
    }

    // Clamp speed limits (reverse is slower)
    this.speed = THREE.MathUtils.clamp(this.speed, -this.maxSpeed * 0.4, this.maxSpeed);

    // 2. Update Position Z (along track length)
    // Vehicle moves forward in negative Z direction
    this.position.z -= this.speed * dt;
    this.position.x = 0; // Constrained to center lane

    // 3. Terrain Snapping & Pitch Angle
    const halfBase = this.wheelbase / 2;
    const frontZ = this.position.z - halfBase;
    const rearZ = this.position.z + halfBase;

    // Query height at front & rear wheel positions
    const frontY = terrain.getHeightAt(0, frontZ);
    const rearY = terrain.getHeightAt(0, rearZ);

    // Calculate vehicle height (average) and pitch (tilt)
    this.position.y = (frontY + rearY) / 2 + this.chassisOffset;
    const pitch = Math.atan2(frontY - rearY, this.wheelbase);

    // Apply translation to model
    this.model.position.copy(this.position);
    this.model.rotation.set(pitch, 0, 0);

    // 4. Spin Wheels
    // Rotational delta: distance traveled / wheel radius
    const rotationDelta = (this.speed * dt) / this.wheelRadius;
    this.wheels.forEach((wheel) => {
      // Spin around local X axis
      wheel.rotation.x -= rotationDelta;
    });
  }

  updateTheme(isDark) {
    // Enable headlights only in dark mode
    this.headlights.forEach((light) => {
      light.intensity = isDark ? 20 : 0;
    });
  }

  reset() {
    this.position.set(0, 0, 0);
    this.speed = 0;
    
    if (this.model) {
      this.model.position.copy(this.position);
      this.model.rotation.set(0, 0, 0);
    }

    this.wheels.forEach((wheel) => {
      wheel.rotation.set(0, 0, 0);
    });
  }
}
