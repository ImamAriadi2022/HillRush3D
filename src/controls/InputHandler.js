export class InputHandler {
  constructor() {
    this.forward = false;
    this.backward = false;
    this.right = false;
    this.left = false;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);

    this.start();
  }

  start() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  stop() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.reset();
  }

  reset() {
    this.forward = false;
    this.backward = false;
    this.right = false;
    this.left = false;
  }

  onKeyDown(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.forward = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.backward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.right = true;
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.forward = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.backward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.right = false;
        break;
    }
  }
}
