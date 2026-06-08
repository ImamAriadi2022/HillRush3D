import * as THREE from 'three';

export class FinishLine {
  constructor(scene, zPosition) {
    this.scene = scene;
    this.z = zPosition;
    this.group = new THREE.Group();
    this.hasCrossed = false;

    this.init();
  }

  init() {
    // 1. Generate Checkered Banner Texture programmatically
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Draw checkerboard
    const rows = 2;
    const cols = 8;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
      }
    }
    
    // Add text "FINISH" on top
    ctx.fillStyle = '#f97316'; // orange accent
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Draw outline for legibility
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeText('FINISH', canvas.width / 2, canvas.height / 2);
    ctx.fillText('FINISH', canvas.width / 2, canvas.height / 2);

    const bannerTexture = new THREE.CanvasTexture(canvas);

    // 2. Materials
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.5,
      metalness: 0.5
    });

    const bannerMat = new THREE.MeshStandardMaterial({
      map: bannerTexture,
      side: THREE.DoubleSide,
      roughness: 0.4,
      metalness: 0.1
    });

    // 3. Spawning archway pieces (Pillars & Banner)
    // Pillars
    const pillarHeight = 7.5;
    const pillarGeo = new THREE.CylinderGeometry(0.18, 0.22, pillarHeight, 8);
    
    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-6.2, pillarHeight / 2, this.z);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true;
    this.group.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(6.2, pillarHeight / 2, this.z);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true;
    this.group.add(rightPillar);

    // Crossbar
    const crossbarLength = 12.8;
    const crossbarGeo = new THREE.CylinderGeometry(0.1, 0.1, crossbarLength, 8);
    const crossbar = new THREE.Mesh(crossbarGeo, pillarMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, pillarHeight, this.z);
    crossbar.castShadow = true;
    this.group.add(crossbar);

    // Banner board
    const bannerGeo = new THREE.PlaneGeometry(12.4, 1.8);
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, pillarHeight - 0.9, this.z);
    banner.castShadow = true;
    this.group.add(banner);

    // Base plates for pillars
    const basePlateGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.2, 8);
    const leftPlate = new THREE.Mesh(basePlateGeo, pillarMat);
    leftPlate.position.set(-6.2, 0.1, this.z);
    leftPlate.receiveShadow = true;
    this.group.add(leftPlate);

    const rightPlate = new THREE.Mesh(basePlateGeo, pillarMat);
    rightPlate.position.set(6.2, 0.1, this.z);
    rightPlate.receiveShadow = true;
    this.group.add(rightPlate);

    this.scene.add(this.group);
  }

  // Adjust Y positions of pillars to rest on the terrain slope
  adjustToTerrain(terrain) {
    const leftY = terrain.getHeightAt(-6.2, this.z);
    const rightY = terrain.getHeightAt(6.2, this.z);
    const midY = terrain.getHeightAt(0, this.z);

    // Update parts offsets
    const pillarHeight = 7.5;
    
    // Left Pillar
    this.group.children[0].position.y = leftY + pillarHeight / 2;
    this.group.children[4].position.y = leftY + 0.1; // left base plate
    
    // Right Pillar
    this.group.children[1].position.y = rightY + pillarHeight / 2;
    this.group.children[5].position.y = rightY + 0.1; // right base plate

    // Crossbar
    const avgPillarTopY = ((leftY + pillarHeight) + (rightY + pillarHeight)) / 2;
    this.group.children[2].position.y = avgPillarTopY;
    
    // Rotate crossbar slightly if left and right heights are different
    const dY = rightY - leftY;
    this.group.children[2].rotation.z = (Math.PI / 2) + Math.atan2(dY, 12.4);

    // Banner
    this.group.children[3].position.y = avgPillarTopY - 0.9;
    this.group.children[3].rotation.z = Math.atan2(dY, 12.4);
  }

  checkCollision(vehiclePosition) {
    if (this.hasCrossed) return false;

    // Trigger when vehicle passes the finish line's Z plane going forward (negative Z)
    if (vehiclePosition.z <= this.z) {
      this.hasCrossed = true;
      return true;
    }
    return false;
  }

  reset() {
    this.hasCrossed = false;
  }
}
