import * as THREE from 'three';

export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.width = 40;
    this.length = 1100;
    this.widthSegments = 40;
    this.lengthSegments = 550;
    
    this.geometry = null;
    this.material = null;
    this.mesh = null;
    
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
  }

  // The mathematical formula for the terrain heights
  getHeightAt(x, z) {
    // Basic hilly road profile along the length (z)
    // Note: z is negative as the vehicle moves forward along negative z
    let y = Math.sin(z * 0.04) * 3.5 + Math.cos(z * 0.015) * 2.0;
    
    // Smooth valley: keep the driving path flatter, build up big hills on sides
    const roadWidth = 5.0;
    const distFromRoad = Math.max(0, Math.abs(x) - roadWidth);
    if (distFromRoad > 0) {
      // Add scenic side hills
      y += distFromRoad * distFromRoad * 0.12 * (Math.sin(z * 0.08) * 0.4 + 1.0);
    }
    
    return y;
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
      const vy = pos.getZ(i); // This is height (z coordinate of PlaneGeometry)
      
      const isRoad = Math.abs(vx) < 5.2;
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
