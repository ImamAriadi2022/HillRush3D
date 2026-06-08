export class UIManager {
  constructor() {
    // DOM Element References
    this.scoreValue = document.getElementById('score-value');
    this.progressPercent = document.getElementById('progress-percent');
    this.progressFill = document.getElementById('progress-fill');
    
    this.startModal = document.getElementById('start-modal');
    this.startBtn = document.getElementById('start-btn');
    
    this.victoryModal = document.getElementById('victory-modal');
    this.victoryScore = document.getElementById('victory-score');
    this.victoryRestartBtn = document.getElementById('victory-restart-btn');
    
    this.gameoverModal = document.getElementById('gameover-modal');
    this.gameoverRestartBtn = document.getElementById('gameover-restart-btn');
    
    this.restartBtn = document.getElementById('restart-btn');
    this.themeToggle = document.getElementById('theme-toggle');
    this.sunIcon = this.themeToggle.querySelector('.sun-icon');
    this.moonIcon = this.themeToggle.querySelector('.moon-icon');
  }

  bindStartGame(callback) {
    this.startBtn.addEventListener('click', () => {
      this.hideStartModal();
      callback();
    });
  }

  bindRestartGame(callback) {
    // Restart button in HUD
    this.restartBtn.addEventListener('click', () => {
      callback();
    });

    // Play again button in Victory Modal
    this.victoryRestartBtn.addEventListener('click', () => {
      this.hideVictoryModal();
      callback();
    });

    // Restart button in Game Over Modal
    this.gameoverRestartBtn.addEventListener('click', () => {
      this.hideGameOverModal();
      callback();
    });
  }

  bindThemeToggle(callback) {
    this.themeToggle.addEventListener('click', () => {
      callback();
    });
  }

  updateScore(score) {
    if (this.scoreValue) {
      this.scoreValue.textContent = score;
    }
  }

  updateProgress(percent) {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    if (this.progressPercent) {
      this.progressPercent.textContent = `${clamped}%`;
    }
    if (this.progressFill) {
      this.progressFill.style.width = `${clamped}%`;
    }
  }

  showStartModal() {
    this.startModal.classList.remove('hidden');
  }

  hideStartModal() {
    this.startModal.classList.add('hidden');
  }

  showVictoryModal(finalScore) {
    if (this.victoryScore) {
      this.victoryScore.textContent = finalScore;
    }
    this.victoryModal.classList.remove('hidden');
  }

  hideVictoryModal() {
    this.victoryModal.classList.add('hidden');
  }

  setTheme(isDark) {
    if (isDark) {
      document.documentElement.classList.add('dark');
      this.sunIcon.style.display = 'none';
      this.moonIcon.style.display = 'block';
    } else {
      document.documentElement.classList.remove('dark');
      this.sunIcon.style.display = 'block';
      this.moonIcon.style.display = 'none';
    }
  }

  showGameOverModal() {
    this.gameoverModal.classList.remove('hidden');
  }

  hideGameOverModal() {
    this.gameoverModal.classList.add('hidden');
  }
}
