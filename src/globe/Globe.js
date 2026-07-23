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
import { createHoverPopup, createDetailPanel } from './ProjectCard.js';

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
    color.setHSL(0.98 + hue * 0.04, 0.55 + hue * 0.25, 0.32 + hue * 0.3);
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
    this.state = 'globe'; // 'globe' | 'transitioning' | 'map' | 'detail'
    this.activeProject = null;
    this.cancelFns = [];

    this._initScene();
    this._initMarkers();
    this._initDom();
    this._initInteraction();
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

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.globeCameraPos = new THREE.Vector3(0, 0, SPHERE_RADIUS * 3.2);
    this.camera.position.copy(this.globeCameraPos);

    this.mapCameraPos = new THREE.Vector3(
      0,
      0,
      fitDistance(this.camera, MAP_HALF_WIDTH, MAP_HALF_HEIGHT)
    );

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.6;
    this.controls.minDistance = SPHERE_RADIUS * 1.6;
    this.controls.maxDistance = SPHERE_RADIUS * 6;
    this.controls.minPolarAngle = Math.PI / 2 - 0.6;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.6;

    this.uniforms = {
      uMorph: { value: 0 },
      uPointSize: { value: 2.2 },
    };

    this.clickTarget = new THREE.Mesh(
      new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    this.scene.add(this.clickTarget);
  }

  _initMarkers() {
    this.markersGroup = new THREE.Group();
    this.scene.add(this.markersGroup);
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

      mesh.userData = { project, spherePos, flatPos };
      mesh.position.copy(spherePos);
      this.markersGroup.add(mesh);
      this.markerMeshes.push(mesh);
    });
  }

  _initDom() {
    this.hint = document.createElement('button');
    this.hint.className = 'globe-hint';
    this.hint.textContent = 'Enter Map View';
    document.body.appendChild(this.hint);

    this.backBtn = document.createElement('button');
    this.backBtn.className = 'globe-back';
    this.backBtn.textContent = '← Back';
    document.body.appendChild(this.backBtn);

    this.popup = createHoverPopup();
    this.detail = createDetailPanel({ onClose: () => this._closeDetail() });

    this.hint.addEventListener('click', () => this._enterMap());
    this.backBtn.addEventListener('click', () => {
      if (this.state === 'detail') this._closeDetail();
      else if (this.state === 'map') this._backToGlobe();
    });
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
    this.scene.add(this.points);
  }

  _initInteraction() {
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 0.05 };
    this.pointer = new THREE.Vector2();

    this.canvas = this.container.querySelector('.globe-canvas');

    this.container.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this.container.addEventListener('click', (e) => this._onClick(e));
  }

  _setPointer(e) {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _onPointerMove(e) {
    if (this.state !== 'map') {
      this.popup.hide();
      this.canvas.style.cursor = this.state === 'globe' ? '' : 'default';
      return;
    }
    this._setPointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.markerMeshes);
    if (hits.length) {
      const { project } = hits[0].object.userData;
      this.popup.show(project, e.clientX, e.clientY);
      this.canvas.style.cursor = 'pointer';
    } else {
      this.popup.hide();
      this.canvas.style.cursor = 'default';
    }
  }

  _onClick(e) {
    if (this.state === 'globe') {
      this._setPointer(e);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      if (this.raycaster.intersectObject(this.clickTarget).length) {
        this._enterMap();
      }
      return;
    }

    if (this.state === 'map') {
      this._setPointer(e);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.markerMeshes);
      if (hits.length) {
        this._selectMarker(hits[0].object.userData);
      }
    }
  }

  _enterMap() {
    if (this.state !== 'globe') return;
    this.state = 'transitioning';
    this.hint.classList.add('hidden');
    transitionToMap({
      camera: this.camera,
      controls: this.controls,
      uniforms: this.uniforms,
      mapCameraPos: this.mapCameraPos,
      onComplete: () => {
        this.state = 'map';
        this.backBtn.classList.add('visible');
        this.backBtn.textContent = '← Back to Globe';
      },
    });
  }

  _backToGlobe() {
    if (this.state !== 'map') return;
    this.state = 'transitioning';
    this.backBtn.classList.remove('visible');
    this.popup.hide();
    transitionToGlobe({
      camera: this.camera,
      controls: this.controls,
      uniforms: this.uniforms,
      globeCameraPos: this.globeCameraPos,
      onComplete: () => {
        this.state = 'globe';
        this.hint.classList.remove('hidden');
      },
    });
  }

  _selectMarker({ project, flatPos }) {
    if (this.state !== 'map') return;
    this.state = 'transitioning';
    this.activeProject = project;
    this.popup.hide();
    this.backBtn.classList.remove('visible');
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
        this.backBtn.classList.add('visible');
        this.backBtn.textContent = '← Back to Globe';
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
  }

  _tick() {
    this._rafId = requestAnimationFrame(this._tick);

    if (this.state === 'globe') {
      this.controls.update();
    }

    const morph = this.uniforms.uMorph.value;
    this.markerMeshes.forEach((mesh) => {
      mesh.position.lerpVectors(mesh.userData.spherePos, mesh.userData.flatPos, morph);
    });

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this._rafId);
    window.removeEventListener('resize', this._onResize);
    this.controls.dispose();
    this.points?.geometry.dispose();
    this.points?.material.dispose();
    this.clickTarget.geometry.dispose();
    this.clickTarget.material.dispose();
    this.markerMeshes.forEach((m) => m.material.dispose());
    this.renderer.dispose();
  }
}
