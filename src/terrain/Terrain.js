import * as THREE from 'three';

export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.width = 40;
    this.length = 2200;
    this.widthSegments = 40;
    this.lengthSegments = 1100;
    
    this.geometry = null;
    this.material = null;
    this.mesh = null;
    
    // Define 3 bridge zones at Z = -250, -500, -750
    this.bridgeZones = [
      { centerZ: -250, type: 1, xOffsets: [] }, // type 1 = 1 bridge, type 2 = 2 bridges
      { centerZ: -500, type: 1, xOffsets: [] },
      { centerZ: -750, type: 1, xOffsets: [] }
    ];
    this.bridgeMeshes = [];

    // Initialize layout before building mesh
    this.generateBridgeLayouts();
    
    this.init();
  }

  init() {
    this.geometry = new THREE.PlaneGeometry(
      this.width,
      this.length,
      this.widthSegments,
      this.lengthSegments
    );

    // Apply procedural height
    const pos = this.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const worldZ = -vy; // Plane Y corresponds to negative World Z after rotation
      const height = this.getHeightAt(vx, worldZ);
      pos.setZ(i, height);
    }
    
    this.geometry.computeVertexNormals();

    // Material setup: use vertex colors and flat shading for stylized low-poly look
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    
    // Rotate to lie flat in XZ plane
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    
    this.scene.add(this.mesh);

    // Initial color setup
    this.updateTheme(false);

    // Spawn initial bridges
    this.spawnBridges();
  }

  // Base winding road center coordinate along Z
  getWindingRoadCenterX(z) {
    return Math.sin(z * 0.015) * 12.0 + Math.cos(z * 0.007) * 6.0;
  }

  // Winding road center that becomes perfectly straight in bridge zones
  getRoadCenterX(z) {
    const zone = this.getBridgeZoneAt(z);
    if (zone) {
      const halfLength = 14;
      const zStart = zone.centerZ + halfLength; // entrance side
      const zEnd = zone.centerZ - halfLength;   // exit side
      
      const xStart = this.getWindingRoadCenterX(zStart);
      const xEnd = this.getWindingRoadCenterX(zEnd);
      
      // Linearly interpolate road center through the bridge zone
      const ratio = (z - zStart) / (zEnd - zStart);
      return xStart + ratio * (xEnd - xStart);
    }
    return this.getWindingRoadCenterX(z);
  }

  // Normal road height profile without the ravine carved out
  getNormalHeightAt(x, z) {
    let y = Math.sin(z * 0.04) * 3.5 + Math.cos(z * 0.015) * 2.0;
    
    // Smooth valley: keep the driving path flatter, build up big hills on sides
    const roadWidth = 5.0;
    const roadCenterX = this.getRoadCenterX(z);
    const distFromRoad = Math.max(0, Math.abs(x - roadCenterX) - roadWidth);
    if (distFromRoad > 0) {
      // Add scenic side hills
      y += distFromRoad * distFromRoad * 0.12 * (Math.sin(z * 0.08) * 0.4 + 1.0);
    }
    return y;
  }

  // Computes the bridge ramp height (linear interpolation between start and end of ravine)
  getBridgeHeightAt(x, z, zone) {
    const halfLength = 14;
    const zStart = zone.centerZ + halfLength; // Start of bridge
    const zEnd = zone.centerZ - halfLength;   // End of bridge
    
    const yStart = this.getNormalHeightAt(x, zStart);
    const yEnd = this.getNormalHeightAt(x, zEnd);
    
    const ratio = (z - zStart) / (zEnd - zStart);
    return yStart + ratio * (yEnd - yStart);
  }

  // Terrain height (deforms the PlaneGeometry, carving deep ravines at bridge zones)
  getHeightAt(x, z) {
    const zone = this.getBridgeZoneAt(z);
    if (zone) {
      // Carve ravine relative to the straight bridge ramp line
      const yBridge = this.getBridgeHeightAt(x, z, zone);
      const dist = Math.abs(z - zone.centerZ);
      const factor = Math.cos((dist / 14) * Math.PI / 2); // 1 at center, 0 at edge
      return yBridge - factor * 11.0; // Deep ravine depth
    }
    return this.getNormalHeightAt(x, z);
  }

  // Road height query (vehicle, coins, finish line snap to this)
  getRoadHeightAt(x, z) {
    const zone = this.getBridgeZoneAt(z);
    if (zone) {
      const roadCenterX = this.getRoadCenterX(z);
      const isOnBridge = this.checkOnBridge(x, roadCenterX, zone);
      if (isOnBridge) {
        // Safe on bridge, return straight ramp height
        return this.getBridgeHeightAt(x, z, zone);
      } else {
        // Fell off, return deep ravine bottom height
        const yBridge = this.getBridgeHeightAt(x, z, zone);
        const dist = Math.abs(z - zone.centerZ);
        const factor = Math.cos((dist / 14) * Math.PI / 2);
        return yBridge - factor * 11.0;
      }
    }
    return this.getNormalHeightAt(x, z);
  }

  // Check if Z is within any bridge zone
  getBridgeZoneAt(z) {
    const zoneHalfLength = 14;
    for (const zone of this.bridgeZones) {
      if (Math.abs(z - zone.centerZ) < zoneHalfLength) {
        return zone;
      }
    }
    return null;
  }

  // Check if X coordinate is on a bridge platform
  checkOnBridge(x, roadCenterX, zone) {
    let onBridge = false;
    zone.xOffsets.forEach(offset => {
      // Type 1 is 4.2 wide, Type 2 is 2.2 wide
      const width = zone.type === 1 ? 4.2 : 2.2;
      const halfWidth = width / 2;
      const bridgeX = roadCenterX + offset;
      // 0.25 units buffer for tolerance
      if (Math.abs(x - bridgeX) < halfWidth + 0.25) {
        onBridge = true;
      }
    });
    return onBridge;
  }

  // Randomize layouts: 1 bridge (center) or 2 parallel bridges (left and right)
  generateBridgeLayouts() {
    this.bridgeZones.forEach(zone => {
      zone.type = Math.random() < 0.5 ? 1 : 2;
      if (zone.type === 1) {
        zone.xOffsets = [0];
      } else {
        // Parallel bridges with a gap in the center
        zone.xOffsets = [-2.6, 2.6];
      }
    });
  }

  spawnBridges() {
    // Clear old bridge meshes
    this.clearBridges();

    // Generate new layout
    this.generateBridgeLayouts();

    // Spawn meshes in the scene
    this.bridgeZones.forEach(zone => {
      const bridgeLength = 28;
      const halfLength = bridgeLength / 2;
      const zStart = zone.centerZ + halfLength;
      const zEnd = zone.centerZ - halfLength;

      // Road centers at entrance and exit
      const xStart = this.getWindingRoadCenterX(zStart);
      const xEnd = this.getWindingRoadCenterX(zEnd);

      const dx = xEnd - xStart;
      const dz = zEnd - zStart;
      
      zone.xOffsets.forEach(offset => {
        const width = zone.type === 1 ? 4.2 : 2.2;
        
        // Compute heights at the start and end of the bridge at this offset
        const yStart = this.getNormalHeightAt(xStart + offset, zStart);
        const yEnd = this.getNormalHeightAt(xEnd + offset, zEnd);
        const dy = yEnd - yStart;

        // Calculate actual 3D length of the sloped/diagonal bridge
        const actualLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // 1. Bridge platform
        const platformGeo = new THREE.BoxGeometry(width, 0.4, actualLength);
        const platformMat = new THREE.MeshStandardMaterial({
          color: 0x7c593f, // Brown rustic wood
          roughness: 0.9,
          metalness: 0.1,
          flatShading: true
        });
        
        const platform = new THREE.Mesh(platformGeo, platformMat);
        
        // Position at road center midpoint (offset will be applied via local translation)
        const xCenterRoad = (xStart + xEnd) / 2;
        const yCenter = (yStart + yEnd) / 2;
        
        platform.position.set(xCenterRoad, yCenter - 0.2, zone.centerZ);
        
        // Set rotation order YXZ to handle yaw first, then pitch slope
        platform.rotation.order = 'YXZ';
        const tiltY = Math.atan2(dx, dz);
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        const tiltX = -Math.atan2(dy, horizontalDist);
        platform.rotation.set(tiltX, tiltY, 0);

        // Apply local translation to slide bridge left/right perpendicularly
        platform.translateX(offset);
        
        platform.receiveShadow = true;
        platform.castShadow = true;
        
        this.scene.add(platform);
        this.bridgeMeshes.push(platform);

        // 2. Guardrails (Visual Details)
        const railingGeo = new THREE.BoxGeometry(0.12, 0.7, actualLength);
        const railingMat = new THREE.MeshStandardMaterial({
          color: 0x4e3629, // Darker wood
          roughness: 0.9
        });

        const leftRailing = new THREE.Mesh(railingGeo, railingMat);
        leftRailing.position.set(-width / 2 + 0.08, 0.4, 0);
        leftRailing.castShadow = true;
        platform.add(leftRailing);

        const rightRailing = new THREE.Mesh(railingGeo, railingMat);
        rightRailing.position.set(width / 2 - 0.08, 0.4, 0);
        rightRailing.castShadow = true;
        platform.add(rightRailing);
      });
    });
  }

  clearBridges() {
    this.bridgeMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.bridgeMeshes = [];
  }

  // Generate and update vertex colors based on coordinates and theme
  updateTheme(isDark) {
    if (!this.geometry) return;

    const pos = this.geometry.attributes.position;
    const colors = [];

    // Setup color palettes
    const roadColor = isDark ? new THREE.Color('#2a2d3d') : new THREE.Color('#dfc8ae'); // Dark asphalt vs Sandy dirt
    const grassColor = isDark ? new THREE.Color('#19102c') : new THREE.Color('#4a7c59'); // Purple-ish night vs Green field
    const hillPeakColor = isDark ? new THREE.Color('#402b68') : new THREE.Color('#8cb369'); // Glowing violet vs Light green peaks

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy_plane = pos.getY(i);
      const worldZ = -vy_plane; // Map Plane Y to World Z
      const vy = pos.getZ(i); // height
      
      const roadCenterX = this.getRoadCenterX(worldZ);
      const isRoad = Math.abs(vx - roadCenterX) < 4.8;
      
      let c;
      if (isRoad) {
        c = roadColor;
      } else {
        // Lerp based on height
        const heightRatio = Math.max(0, Math.min(1, vy / 15.0));
        c = grassColor.clone().lerp(hillPeakColor, heightRatio);
      }
      
      colors.push(c.r, c.g, c.b);
    }

    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.geometry.attributes.color.needsUpdate = true;
  }
}
