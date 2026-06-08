import * as THREE from 'three';

export class CoinManager {
  constructor(scene) {
    this.scene = scene;
    this.coins = [];
    this.collectingCoins = []; // Coins in the middle of being collected
    this.hoveredCoin = null;
    
    // Geometry & Material
    this.coinGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.16, 12);
    // Rotate cylinder so it stands vertically like a coin
    this.coinGeometry.rotateX(Math.PI / 2);
    
    this.coinMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Gold
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x000000,
      flatShading: true
    });
  }

  spawnCoins(terrain, count = 20, trackLength = 500) {
    // Clear any existing coins
    this.clear();

    const startZ = -40;
    const endZ = -trackLength + 20;
    const step = (endZ - startZ) / (count - 1);

    for (let i = 0; i < count; i++) {
      const z = startZ + i * step;
      // Stagger coin x coordinates relative to the winding road center
      const roadCenterX = terrain.getRoadCenterX(z);
      let x = roadCenterX;
      if (i % 3 === 1) x = roadCenterX - 2.0;
      else if (i % 3 === 2) x = roadCenterX + 2.0;

      // Query height from the road surface (takes bridges into account)
      const y = terrain.getRoadHeightAt(x, z) + 1.6;

      const coinMesh = new THREE.Mesh(this.coinGeometry, this.coinMaterial.clone());
      coinMesh.position.set(x, y, z);
      coinMesh.castShadow = true;
      
      // Store initial properties for animation
      coinMesh.userData = {
        baseY: y,
        index: i,
        collected: false,
        isCoin: true
      };

      this.scene.add(coinMesh);
      this.coins.push(coinMesh);
    }
  }

  update(dt, time, vehicle, onCollect) {
    // 1. Update active coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      
      // Rotate coin
      coin.rotation.y += 2.2 * dt;

      // Floating bobbing effect
      const index = coin.userData.index;
      coin.position.y = coin.userData.baseY + Math.sin(time * 3 + index) * 0.25;

      // Check collision with vehicle
      if (vehicle.loaded) {
        const vehiclePos = vehicle.position;
        // Collision threshold (approx distance from vehicle center)
        const dist = coin.position.distanceTo(vehiclePos);
        
        if (dist < 2.0) {
          // Trigger collection
          coin.userData.collected = true;
          this.coins.splice(i, 1);
          this.collectingCoins.push({
            mesh: coin,
            progress: 0,
            startY: coin.position.y
          });
          onCollect(10); // Award 10 points
        }
      }
    }

    // 2. Update collection visual effects (scale down and fly up)
    for (let i = this.collectingCoins.length - 1; i >= 0; i--) {
      const anim = this.collectingCoins[i];
      anim.progress += dt * 3.5; // animation speed
      
      if (anim.progress >= 1.0) {
        this.scene.remove(anim.mesh);
        anim.mesh.geometry.dispose();
        anim.mesh.material.dispose();
        this.collectingCoins.splice(i, 1);
      } else {
        // scale down
        const scale = 1.0 - anim.progress;
        anim.mesh.scale.set(scale, scale, scale);
        // fly up
        anim.mesh.position.y = anim.startY + anim.progress * 3.5;
        // spin fast
        anim.mesh.rotation.y += dt * 10;
      }
    }
  }

  // Raycasting hover highlight
  handleHover(raycaster) {
    const intersects = raycaster.intersectObjects(this.coins);
    
    // Reset previous hover
    if (this.hoveredCoin) {
      this.hoveredCoin.material.emissive.setHex(0x000000);
      this.hoveredCoin = null;
    }

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (hit.userData.isCoin) {
        this.hoveredCoin = hit;
        // Emissive yellow highlight
        this.hoveredCoin.material.emissive.setHex(0x554400);
      }
    }
  }

  clear() {
    this.coins.forEach(coin => {
      this.scene.remove(coin);
      coin.geometry.dispose();
      coin.material.dispose();
    });
    this.coins = [];

    this.collectingCoins.forEach(anim => {
      this.scene.remove(anim.mesh);
      anim.mesh.geometry.dispose();
      anim.mesh.material.dispose();
    });
    this.collectingCoins = [];
    
    this.hoveredCoin = null;
  }
}
