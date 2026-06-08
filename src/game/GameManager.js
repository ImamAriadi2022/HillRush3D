import * as THREE from 'three';
import { SceneManager } from '../scene/SceneManager.js';
import { UIManager } from '../ui/UIManager.js';
import { InputHandler } from '../controls/InputHandler.js';
import { Terrain } from '../terrain/Terrain.js';
import { Vehicle } from '../objects/Vehicle.js';
import { CoinManager } from '../objects/Coin.js';
import { FinishLine } from '../objects/FinishLine.js';

const STATE_START = 'START';
const STATE_PLAYING = 'PLAYING';
const STATE_VICTORY = 'VICTORY';
const STATE_GAMEOVER = 'GAMEOVER';

export class GameManager {
  constructor() {
    this.state = STATE_START;
    this.score = 0;
    this.isDark = false;
    
    // Config
    this.trackLength = 1000; // Total track length in units (Z goes from 0 to -1000)
    
    // Confetti particles for victory celebration
    this.particles = [];

    // Raycaster for coin hovers
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.init();
  }

  init() {
    // 1. Initialize Subsystems
    this.sceneManager = new SceneManager('canvas-container');
    this.uiManager = new UIManager();
    this.inputHandler = new InputHandler();

    // 2. Initialize Scene Objects
    this.terrain = new Terrain(this.sceneManager.scene);
    this.vehicle = new Vehicle(this.sceneManager.scene);
    this.coinManager = new CoinManager(this.sceneManager.scene);
    
    // Place finish line at Z = -500
    this.finishLine = new FinishLine(this.sceneManager.scene, -this.trackLength);
    this.finishLine.adjustToTerrain(this.terrain);

    // Initial coin spawn (50 coins over 1000-unit track)
    this.coinManager.spawnCoins(this.terrain, 50, this.trackLength);

    // 3. Bind UI Events
    this.uiManager.bindStartGame(() => this.startGame());
    this.uiManager.bindRestartGame(() => this.restartGame());
    this.uiManager.bindThemeToggle(() => this.toggleTheme());

    // 4. Mouse movement listener for raycasting coin highlights
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));

    // Force initial UI update
    this.uiManager.updateScore(this.score);
    this.uiManager.updateProgress(0);
    this.uiManager.setTheme(this.isDark);
  }

  startGame() {
    this.state = STATE_PLAYING;
    this.sceneManager.snapCamera(this.vehicle);
  }

  restartGame() {
    this.state = STATE_PLAYING;
    this.score = 0;
    this.uiManager.updateScore(this.score);
    this.uiManager.updateProgress(0);

    // Hide modals
    this.uiManager.hideGameOverModal();
    this.uiManager.hideVictoryModal();

    // Regenerate randomized bridges (some with 1, some with 2)
    this.terrain.spawnBridges();

    // Reset objects
    this.vehicle.reset();
    this.coinManager.clear();
    this.coinManager.spawnCoins(this.terrain, 50, this.trackLength);
    this.finishLine.reset();
    this.finishLine.adjustToTerrain(this.terrain);
    this.inputHandler.reset();
    
    // Clear confetti
    this.clearConfetti();

    // Reset camera position
    this.sceneManager.snapCamera(this.vehicle);
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    
    // Update document styles
    this.uiManager.setTheme(this.isDark);
    
    // Update 3D scene elements
    this.sceneManager.updateTheme(this.isDark);
    this.terrain.updateTheme(this.isDark);
    this.vehicle.updateTheme(this.isDark);
  }

  onMouseMove(event) {
    // Convert mouse position to normalized device coordinates (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  onCoinCollected(points) {
    this.score += points;
    this.uiManager.updateScore(this.score);
  }

  triggerVictory() {
    this.state = STATE_VICTORY;
    this.inputHandler.reset();
    this.vehicle.speed = 0;
    
    // Show victory UI
    this.uiManager.showVictoryModal(this.score);
    
    // Spawn confetti explosion at the finish line
    this.spawnConfetti();
  }

  triggerGameOver() {
    this.state = STATE_GAMEOVER;
    this.inputHandler.reset();
    this.vehicle.speed = 0;
    this.uiManager.showGameOverModal();
  }

  spawnConfetti() {
    const particleCount = 80;
    const colors = [0xffd700, 0xff5555, 0x55ff55, 0x5555ff, 0xff55ff, 0x06b6d4];
    
    const geom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    
    // Position of the finish arch center
    const finishY = this.terrain.getHeightAt(0, -this.trackLength) + 3.0;
    const origin = new THREE.Vector3(0, finishY, -this.trackLength);

    for (let i = 0; i < particleCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(origin);
      this.sceneManager.scene.add(mesh);
      
      // Random velocities
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        Math.random() * 10 + 5,
        (Math.random() - 0.5) * 6
      );

      this.particles.push({
        mesh,
        velocity: vel,
        life: 1.0,
        decay: Math.random() * 0.3 + 0.2
      });
    }
  }

  updateConfetti(dt) {
    const gravity = 9.8;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dt;
      
      if (p.life <= 0) {
        this.sceneManager.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        // Apply physics
        p.velocity.y -= gravity * dt;
        p.mesh.position.addScaledVector(p.velocity, dt);
        
        // Spin particle
        p.mesh.rotation.x += dt * 5;
        p.mesh.rotation.y += dt * 3;
        
        // Fade out scale
        p.mesh.scale.set(p.life, p.life, p.life);
      }
    }
  }

  clearConfetti() {
    this.particles.forEach(p => {
      this.sceneManager.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
    this.particles = [];
  }

  update(dt, time) {
    // 1. Raycast for coin hover highlight
    if (this.state === STATE_PLAYING || this.state === STATE_START) {
      this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
      this.coinManager.handleHover(this.raycaster);
    }

    // 2. State-specific Updates
    if (this.state === STATE_PLAYING) {
      // Update vehicle physics and terrain snapping
      this.vehicle.update(dt, this.inputHandler, this.terrain);
      
      // Update camera smooth follow
      this.sceneManager.updateCamera(this.vehicle, dt);

      // Update coins (movement & collections)
      this.coinManager.update(dt, time, this.vehicle, (pts) => this.onCoinCollected(pts));

      // Calculate and update progress HUD
      // Progress = distance traveled along Z (0 to -500)
      const progressPercent = (this.vehicle.position.z / -this.trackLength) * 100;
      this.uiManager.updateProgress(progressPercent);

      // Check win condition
      if (this.finishLine.checkCollision(this.vehicle.position)) {
        this.triggerVictory();
      }

      // Check Game Over condition (fell off bridge or road)
      const normalY = this.terrain.getNormalHeightAt(this.vehicle.position.x, this.vehicle.position.z);
      if (this.vehicle.position.y < normalY - 3.8) {
        this.triggerGameOver();
      }
    } else if (this.state === STATE_VICTORY) {
      // In victory, still run basic animations & cameras
      this.coinManager.update(dt, time, this.vehicle, () => {});
      this.updateConfetti(dt);
      
      // Keep camera static or floating gently
      this.sceneManager.updateCamera(this.vehicle, dt);
    } else if (this.state === STATE_START) {
      // In start screen, just center the camera on vehicle
      if (this.vehicle.loaded) {
        this.sceneManager.snapCamera(this.vehicle);
      }
    } else if (this.state === STATE_GAMEOVER) {
      // In Game Over state, let the car keep falling, update camera follow
      this.vehicle.update(dt, this.inputHandler, this.terrain);
      this.sceneManager.updateCamera(this.vehicle, dt);
    }

    // Render 3D Frame
    this.sceneManager.render();
  }
}
