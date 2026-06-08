export class InputHandler {
  constructor() {
    this.forward = false;
    this.backward = false;

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
  }

  onKeyDown(event) {
    switch (event.code) {
      case 'ArrowRight':
      case 'KeyD':
        this.forward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.backward = true;
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'ArrowRight':
      case 'KeyD':
        this.forward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.backward = false;
        break;
    }
  }
}
