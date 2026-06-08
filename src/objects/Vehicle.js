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

    // Lateral offset relative to winding road center
    this.roadOffset = 0.0;
    
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
            this.wheels.push(child);
          }
        });

        // 1. Calculate original bounding box size
        const box = new THREE.Box3().setFromObject(this.model);
        const size = new THREE.Vector3();
        box.getSize(size);
        console.log('Original vehicle size:', size);

        // 2. Auto-scale so that the longest dimension (usually length along Z) is 3.5 units
        const maxDim = Math.max(size.x, size.y, size.z);
        let scaleFactor = 1.0;
        if (maxDim > 0) {
          scaleFactor = 3.5 / maxDim;
        }
        this.model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        console.log('Applied scale factor:', scaleFactor);

        // Set rotation order to YXZ for stable vehicle tilting
        this.model.rotation.order = 'YXZ';
        // Set initial rotation to face negative Z (-90 deg around Y)
        this.model.rotation.set(0, -Math.PI / 2, 0);

        this.scene.add(this.model);

        // 3. Compute dynamic chassis offset and wheel radius based ONLY on the wheels
        this.model.updateMatrixWorld(true);
        let lowestWheelBottom = 0;
        let calculatedRadius = 0.6; // default fallback
        
        this.wheels.forEach((wheel) => {
          const wheelBox = new THREE.Box3().setFromObject(wheel);
          const wheelSize = new THREE.Vector3();
          wheelBox.getSize(wheelSize);
          const radius = wheelSize.y / 2;
          
          if (radius > 0) {
            calculatedRadius = radius;
          }
          
          const wheelWorldPos = new THREE.Vector3();
          wheel.getWorldPosition(wheelWorldPos);
          
          const bottom = wheelWorldPos.y - radius;
          if (bottom < lowestWheelBottom) {
            lowestWheelBottom = bottom;
          }
        });
        
        this.wheelRadius = calculatedRadius;
        console.log('Dynamic wheel radius:', this.wheelRadius);
        
        if (lowestWheelBottom < 0) {
          this.chassisOffset = -lowestWheelBottom;
        } else {
          const scaledBox = new THREE.Box3().setFromObject(this.model);
          this.chassisOffset = -scaledBox.min.y;
        }
        console.log('Calculated chassis offset:', this.chassisOffset);

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

    // Left Headlight (Local front is +X in GLB space, sides are along Z)
    const leftLight = new THREE.SpotLight('#ffffff', 0, 25, Math.PI / 6, 0.5, 1);
    leftLight.position.set(1.8, 0.8, -0.8); 
    leftLight.target.position.set(10, 0.5, -0.8);
    leftLight.castShadow = true;
    leftLight.shadow.mapSize.width = 512;
    leftLight.shadow.mapSize.height = 512;

    // Right Headlight
    const rightLight = new THREE.SpotLight('#ffffff', 0, 25, Math.PI / 6, 0.5, 1);
    rightLight.position.set(1.8, 0.8, 0.8);
    rightLight.target.position.set(10, 0.5, 0.8);
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

    // 2. Process Lateral Steering Input relative to the winding road (A: left, D: right)
    const lateralSpeed = 7.5;
    if (input.left) {
      this.roadOffset -= lateralSpeed * dt;
    }
    if (input.right) {
      this.roadOffset += lateralSpeed * dt;
    }
    
    // Clamp roadOffset so the car does not go off the side of the road
    this.roadOffset = THREE.MathUtils.clamp(this.roadOffset, -4.5, 4.5);

    // 3. Update Position Z (along track length, negative direction is forward)
    this.position.z -= this.speed * dt;

    // 4. Calculate World X based on Winding Road Center + lateral roadOffset
    this.position.x = terrain.getRoadCenterX(this.position.z) + this.roadOffset;

    // 5. Terrain Snapping & Rotations (Yaw & Pitch)
    const halfBase = this.wheelbase / 2;
    const frontZ = this.position.z - halfBase;
    const rearZ = this.position.z + halfBase;

    // Track Front and Rear X coordinates along the curve
    const frontX = terrain.getRoadCenterX(frontZ) + this.roadOffset;
    const rearX = terrain.getRoadCenterX(rearZ) + this.roadOffset;

    // Query heights at front & rear wheels from road surface (takes bridges into account)
    const frontY = terrain.getRoadHeightAt(frontX, frontZ);
    const rearY = terrain.getRoadHeightAt(rearX, rearZ);

    // Calculate vehicle Y height (average)
    this.position.y = (frontY + rearY) / 2 + this.chassisOffset;

    // Calculate Yaw (angle of the road curve)
    const dx = frontX - rearX;
    const dz = frontZ - rearZ; // dz is negative since frontZ < rearZ
    const yaw = Math.atan2(dx, dz);

    // Calculate Pitch (uphill/downhill tilt)
    const pitch = Math.atan2(frontY - rearY, this.wheelbase);

    // Apply translation to model
    this.model.position.copy(this.position);
    
    // Apply YXZ Euler rotations:
    // - pitch around X
    // - (-Math.PI / 2 + yaw) around Y (pointing forward + road curve yaw)
    // - 0 around Z
    this.model.rotation.set(pitch, -Math.PI / 2 + yaw, 0);

    // 6. Spin Wheels
    // Rotational delta: distance traveled / wheel radius
    const rotationDelta = (this.speed * dt) / this.wheelRadius;
    this.wheels.forEach((wheel) => {
      // Spin around local Z axle (since front of vehicle is local +X)
      wheel.rotation.z -= rotationDelta;
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
    this.roadOffset = 0.0;
    
    if (this.model) {
      this.model.position.copy(this.position);
      this.model.rotation.set(0, -Math.PI / 2, 0);
    }

    this.wheels.forEach((wheel) => {
      wheel.rotation.set(0, 0, 0);
    });
  }
}
