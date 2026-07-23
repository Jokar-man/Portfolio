import * as THREE from 'three';

const PARTICLE_COUNT = 400;

export class ProfileBackground {
  constructor(container) {
    this.container = container;

    const canvas = document.createElement('canvas');
    canvas.className = 'profile-bg-canvas';
    container.appendChild(canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50);
    this.camera.position.z = 8;

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff8c66,
      size: 0.045,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    this._tick = this._tick.bind(this);
    this._rafId = requestAnimationFrame(this._tick);

    window.addEventListener('pagehide', () => this.dispose(), { once: true });
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _tick() {
    this._rafId = requestAnimationFrame(this._tick);
    this.points.rotation.y += 0.0006;
    this.points.rotation.x += 0.0002;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this._rafId);
    window.removeEventListener('resize', this._onResize);
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.renderer.dispose();
  }
}
