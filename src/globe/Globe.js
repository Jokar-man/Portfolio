import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './globe.css';
import { latLonToSphere, latLonToEquirect } from '../shared/utils/latlon.js';
import { loadCsv, hashToUnit } from './loadCsv.js';
import { vertexShader, fragmentShader } from './pointsShader.js';
import {
  fitDistance,
  transitionToMap,
  transitionToGlobe,
  dollyToMarker,
  dollyToMap,
} from './MapTransition.js';
import { createMarkerChip, createDetailPanel } from './ProjectCard.js';
import { NetworkOverlay } from './NetworkOverlay.js';
import { animate } from '../shared/utils/tween.js';

const SPHERE_RADIUS = 2;
const MAP_HALF_WIDTH = 4;
const MAP_HALF_HEIGHT = 2;
const MARKER_SPHERE_OFFSET = 1.015;
const MARKER_FLAT_Z = 0.05;

function buildPointCloud(rows) {
  const count = rows.length;
  const spherePos = new Float32Array(count * 3);
  const flatPos = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const s = new THREE.Vector3();
  const f = new THREE.Vector3();
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const { lat, lon, iso3 } = rows[i];
    latLonToSphere(lat, lon, SPHERE_RADIUS, s);
    latLonToEquirect(lat, lon, MAP_HALF_WIDTH, MAP_HALF_HEIGHT, f);

    spherePos[i * 3] = s.x;
    spherePos[i * 3 + 1] = s.y;
    spherePos[i * 3 + 2] = s.z;
    flatPos[i * 3] = f.x;
    flatPos[i * 3 + 1] = f.y;
    flatPos[i * 3 + 2] = f.z;

    const hue = hashToUnit(iso3);
    color.setHSL(0.98 + hue * 0.04, 0.4 + hue * 0.18, 0.42 + hue * 0.26);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(spherePos.slice(), 3));
  geometry.setAttribute('aSpherePos', new THREE.BufferAttribute(spherePos, 3));
  geometry.setAttribute('aFlatPos', new THREE.BufferAttribute(flatPos, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

export class Globe {
  constructor(container, projects) {
    this.container = container;
    this.projects = projects;
    this.state = 'map'; // 'map' | 'transitioning' | 'detail' | 'network'
    this.activeProject = null;
    this.cancelFns = [];
    this.clock = new THREE.Clock();

    this._initScene();
    this._initMarkers();
    this._initDom();
    this._initWheelForwarding();
    this._loadPoints();

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    this._tick = this._tick.bind(this);
    this._rafId = requestAnimationFrame(this._tick);

    window.addEventListener('pagehide', () => this.dispose(), { once: true });
  }

  _initScene() {
    const canvas = document.createElement('canvas');
    canvas.className = 'globe-canvas';
    this.container.appendChild(canvas);
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);

    this.scene = new THREE.Scene();

    // Holds the point cloud + markers. Rotation stays at 0 during the map/detail
    // flow (OrbitControls orbits the CAMERA instead) — only network-visualize mode
    // spins this group directly, with a static camera, so on-screen anchor positions
    // stay fixed while the globe turns underneath.
    this.rotationGroup = new THREE.Group();
    this.scene.add(this.rotationGroup);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    // Fixed camera position used only while in 'network' mode, where the globe
    // itself spins (via rotationGroup) instead of the camera orbiting it.
    this.globeCameraPos = new THREE.Vector3(0, 0, SPHERE_RADIUS * 3.2);

    this.mapCameraPos = new THREE.Vector3(
      0,
      0,
      fitDistance(this.camera, MAP_HALF_WIDTH, MAP_HALF_HEIGHT)
    );
    // The site opens directly on the flat map — no standalone rotating-globe view.
    this.camera.position.copy(this.mapCameraPos);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this._setMapControlsEnabled(true);

    // Scaled by pixelRatio since gl_PointSize is authored in framebuffer (not CSS) pixels —
    // without this the dots would render smaller than intended on high-DPI screens.
    this.uniforms = {
      uMorph: { value: 1 },
      uPointSize: { value: 2.2 * this.renderer.getPixelRatio() },
    };
  }

  /** Map state: no orbit rotation, but free pan + zoom over the flat map. */
  _setMapControlsEnabled(enabled) {
    this.controls.enabled = enabled;
    if (!enabled) return;
    this.controls.enableRotate = false;
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.controls.autoRotate = false;
    this.controls.minDistance = this.mapCameraPos.z * 0.2;
    this.controls.maxDistance = this.mapCameraPos.z * 1.8;
    // Without this, left-drag still tries to ROTATE (its default binding) and does
    // nothing since enableRotate is false — pan only fires on right-drag by default.
    // Remap left-drag (and single-finger touch) to PAN so it behaves like a normal map.
    this.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    this.controls.touches.ONE = THREE.TOUCH.PAN;
  }

  _initMarkers() {
    this.markersGroup = new THREE.Group();
    this.rotationGroup.add(this.markersGroup);
    this.markerMeshes = [];

    const geometry = new THREE.SphereGeometry(0.045, 14, 14);

    this.projects.forEach((project) => {
      const material = new THREE.MeshBasicMaterial({ color: 0xff6b6b });
      const mesh = new THREE.Mesh(geometry, material);

      const spherePos = latLonToSphere(
        project.lat,
        project.lon,
        SPHERE_RADIUS * MARKER_SPHERE_OFFSET,
        new THREE.Vector3()
      );
      const flatPos = latLonToEquirect(
        project.lat,
        project.lon,
        MAP_HALF_WIDTH,
        MAP_HALF_HEIGHT,
        new THREE.Vector3()
      );
      flatPos.z = MARKER_FLAT_Z;

      // The chip is a real DOM button (positioned via screen-projection each frame in
      // _tick), not a raycast target — it can't be swallowed by OrbitControls' pointer
      // handling on the canvas the way a 3D-mesh click could.
      const chip = createMarkerChip(project, () => this._selectMarker(mesh.userData));

      mesh.userData = { project, spherePos, flatPos, chip };
      mesh.position.copy(flatPos);
      this.markersGroup.add(mesh);
      this.markerMeshes.push(mesh);
    });
  }

  _initDom() {
    this.bottomBar = document.createElement('div');
    this.bottomBar.className = 'globe-bottom-bar';
    document.body.appendChild(this.bottomBar);

    this.backBtn = document.createElement('button');
    this.backBtn.className = 'globe-back';
    this.backBtn.textContent = '← Back to Map';
    this.bottomBar.appendChild(this.backBtn);

    this.visualizeBtn = document.createElement('button');
    this.visualizeBtn.className = 'globe-visualize visible';
    this.visualizeBtn.textContent = 'Visualize ✦';
    this.bottomBar.appendChild(this.visualizeBtn);

    this.detail = createDetailPanel({ onClose: () => this._closeDetail() });

    this.visualizeBtn.addEventListener('click', () => this._enterNetwork());
    this.backBtn.addEventListener('click', () => {
      if (this.state === 'detail') this._closeDetail();
      else if (this.state === 'network') this._exitNetwork();
    });
  }

  /**
   * OrbitControls' wheel-zoom listener is bound to the canvas element specifically.
   * With 17 project chips covering much of the map, the cursor is very often over a
   * chip (a separate, higher z-index DOM element) rather than bare canvas when the
   * user scrolls — so the wheel event never reaches OrbitControls and zoom appears
   * dead. Forward it manually in that case.
   */
  _initWheelForwarding() {
    document.addEventListener(
      'wheel',
      (e) => {
        if (this.state !== 'map') return;
        if (!e.target.closest?.('.marker-chip')) return;
        e.preventDefault();
        this.canvas.dispatchEvent(
          new WheelEvent('wheel', {
            deltaX: e.deltaX,
            deltaY: e.deltaY,
            deltaZ: e.deltaZ,
            deltaMode: e.deltaMode,
            clientX: e.clientX,
            clientY: e.clientY,
            bubbles: true,
            cancelable: true,
          })
        );
      },
      { passive: false }
    );
  }

  async _loadPoints() {
    const rows = await loadCsv(`${import.meta.env.BASE_URL}image/ccvi.csv`);
    const geometry = buildPointCloud(rows);
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.rotationGroup.add(this.points);
  }

  /**
   * Projects every marker to screen space, then resolves overlaps by stacking
   * chips upward — without this, geographically close projects (e.g. several in
   * the same city) render exactly on top of each other and all but the last one
   * become invisible/unclickable.
   */
  _updateMarkerChips() {
    const rect = this.canvas.getBoundingClientRect();
    const showChips = this.state === 'map';

    if (!showChips) {
      this.markerMeshes.forEach((mesh) => mesh.userData.chip.setVisible(false));
      return;
    }

    const CHIP_W = 190;
    const CHIP_H = 54;
    const GAP = 6;

    const raw = this.markerMeshes.map((mesh) => {
      const ndc = mesh.position.clone().project(this.camera);
      return {
        mesh,
        x: rect.left + (ndc.x * 0.5 + 0.5) * rect.width,
        y: rect.top + (-ndc.y * 0.5 + 0.5) * rect.height,
      };
    });
    raw.sort((a, b) => a.x - b.x);

    const placed = [];
    raw.forEach(({ mesh, x, y }) => {
      // Search offsets alternating up/down from the natural position (0, -1, +1, -2, +2, ...)
      // so a tight cluster fans out around its real location instead of marching
      // straight off the top of the screen.
      let offset = 0;
      for (let guard = 0; guard < 20; guard++) {
        const step = Math.ceil(guard / 2);
        const candidate = guard % 2 === 0 ? -step : step;
        const testOffset = candidate * (CHIP_H + GAP);
        const top = y - CHIP_H * 1.3 - testOffset;
        const bottom = top + CHIP_H;
        const left = x - CHIP_W / 2;
        const right = x + CHIP_W / 2;
        const collides = placed.some(
          (p) => !(right < p.left || left > p.right || bottom < p.top - GAP || top > p.bottom + GAP)
        );
        if (!collides) {
          offset = testOffset;
          break;
        }
      }
      const top = y - CHIP_H * 1.3 - offset;
      placed.push({ left: x - CHIP_W / 2, right: x + CHIP_W / 2, top, bottom: top + CHIP_H });

      mesh.userData.chip.setVisible(true);
      mesh.userData.chip.setPosition(x, y - offset);
    });
  }

  _enterNetwork() {
    if (this.state !== 'map') return;
    this.state = 'transitioning';
    this.controls.enabled = false;
    this.backBtn.classList.remove('visible');
    this.visualizeBtn.classList.remove('visible');

    if (!this.networkOverlay) {
      this.networkOverlay = new NetworkOverlay({
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera,
        rotationGroup: this.rotationGroup,
        markerMeshes: this.markerMeshes,
        globeRadius: SPHERE_RADIUS,
      });
    }

    transitionToGlobe({
      camera: this.camera,
      controls: this.controls,
      uniforms: this.uniforms,
      globeCameraPos: this.globeCameraPos,
      onComplete: () => {
        this.controls.enabled = false;
        this.state = 'network';
        this.networkOverlay.enter();
        this.backBtn.classList.add('visible');
        this.backBtn.textContent = '← Back to Map';
      },
    });
  }

  _exitNetwork() {
    if (this.state !== 'network') return;
    this.state = 'transitioning';
    this.backBtn.classList.remove('visible');
    this.networkOverlay.exit();

    const startRotationY = this.rotationGroup.rotation.y;
    animate(1600, (t) => {
      this.rotationGroup.rotation.y = startRotationY * (1 - t);
    });

    transitionToMap({
      camera: this.camera,
      controls: this.controls,
      uniforms: this.uniforms,
      mapCameraPos: this.mapCameraPos,
      onComplete: () => {
        this.state = 'map';
        this._setMapControlsEnabled(true);
        this.visualizeBtn.classList.add('visible');
      },
    });
  }

  _selectMarker({ project, flatPos }) {
    if (this.state !== 'map') return;
    this.state = 'transitioning';
    this.controls.enabled = false;
    this.activeProject = project;
    this.backBtn.classList.remove('visible');
    this.visualizeBtn.classList.remove('visible');
    dollyToMarker({
      camera: this.camera,
      flatPos,
      onComplete: () => {
        this.state = 'detail';
        this.detail.show(project);
        this.backBtn.classList.add('visible');
        this.backBtn.textContent = '← Back to Map';
      },
    });
  }

  _closeDetail() {
    if (this.state !== 'detail') return;
    this.state = 'transitioning';
    this.detail.hide();
    this.backBtn.classList.remove('visible');
    dollyToMap({
      camera: this.camera,
      mapCameraPos: this.mapCameraPos,
      onComplete: () => {
        this.state = 'map';
        this._setMapControlsEnabled(true);
        this.visualizeBtn.classList.add('visible');
      },
    });
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.mapCameraPos.z = fitDistance(this.camera, MAP_HALF_WIDTH, MAP_HALF_HEIGHT);
    this.renderer.setSize(w, h);
    this.networkOverlay?.handleResize();
  }

  _tick() {
    this._rafId = requestAnimationFrame(this._tick);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.state === 'map') {
      this.controls.update();
    }

    const morph = this.uniforms.uMorph.value;
    this.markerMeshes.forEach((mesh) => {
      mesh.position.lerpVectors(mesh.userData.spherePos, mesh.userData.flatPos, morph);
    });

    if (this.state === 'network') {
      this.networkOverlay.tick(dt);
    } else {
      this._updateMarkerChips();
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    cancelAnimationFrame(this._rafId);
    window.removeEventListener('resize', this._onResize);
    this.controls.dispose();
    this.networkOverlay?.dispose();
    this.points?.geometry.dispose();
    this.points?.material.dispose();
    this.markerMeshes.forEach((m) => {
      m.material.dispose();
      m.userData.chip.destroy();
    });
    this.renderer.dispose();
  }
}
