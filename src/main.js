import * as THREE from 'three';
import { GameManager } from './game/GameManager.js';
import './styles/style.css';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize the Game Manager
  const gameManager = new GameManager();

  // 2. Setup standard delta timer Clock
  const clock = new THREE.Clock();

  // 3. Main animation tick loop
  function tick() {
    requestAnimationFrame(tick);

    // Get time variations
    const dt = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Limit maximum delta time to prevent physics glitches during lag spikes
    const cappedDt = Math.min(dt, 0.1);

    // Update game subsystems
    gameManager.update(cappedDt, elapsedTime);
  }

  // 4. Start the loop
  clock.start();
  tick();
});
