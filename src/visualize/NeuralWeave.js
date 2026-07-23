import * as THREE from 'three';
import { hierarchy, pack } from 'd3-hierarchy';
import './visualize.css';
import { anchors, bubbles, connections } from './data.js';
import { vertexShader, fragmentShader } from './threadShader.js';

const THREAD_COLOR = new THREE.Color(0xff8c32);
const SUB_THREADS = 12;
const SEGMENTS = 28;
const BASE_ALPHA = 0.09;
const DIM_ALPHA = 0.02;
const ACTIVE_ALPHA = 0.85;

function screenToWorld(x, y, width, height) {
  return { x: x - width / 2, y: height / 2 - y };
}

function sampleCubicBezier(p0, p1, p2, p3, segments, out) {
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;
    out[i * 3] = a * p0.x + b * p1.x + c * p2.x + d * p3.x;
    out[i * 3 + 1] = a * p0.y + b * p1.y + c * p2.y + d * p3.y;
    out[i * 3 + 2] = 0;
  }
}

export class NeuralWeave {
  constructor(container) {
    this.container = container;
    this.selectedBubble = null;
    this.hoveredBubble = null;
    this.labelEls = [];

    this._initScene();
    this._build();
    this._initInteraction();

    this._onResize = this._debounce(() => this._handleResize(), 200).bind(this);
    window.addEventListener('resize', this._onResize);

    this._tick = this._tick.bind(this);
    this._rafId = requestAnimationFrame(this._tick);

    window.addEventListener('pagehide', () => this.dispose(), { once: true });
  }

  _debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  _initScene() {
    const canvas = document.createElement('canvas');
    canvas.className = 'weave-canvas';
    this.container.appendChild(canvas);
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 10);
    this.camera.position.z = 5;
  }

  _clearLabels() {
    this.labelEls.forEach((el) => el.remove());
    this.labelEls = [];
  }

  _build() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();

    // dispose previous build (on resize rebuilds)
    this._disposeSceneContent();
    this._clearLabels();

    const isNarrow = width < 760;
    const packLeft = isNarrow ? width * 0.16 : width * 0.32;
    const packWidth = width - packLeft - width * 0.06;
    const packTop = height * 0.16;
    const packHeight = height * 0.74;

    const root = hierarchy(bubbles).sum((d) => d.value || 0);
    pack().size([packWidth, packHeight]).padding(10)(root);

    this.bubbleNodes = {};
    root.children.forEach((node) => {
      const sx = node.x + packLeft;
      const sy = node.y + packTop;
      const w = screenToWorld(sx, sy, width, height);
      this.bubbleNodes[node.data.name] = { x: w.x, y: w.y, r: node.r, name: node.data.name };
    });

    const anchorX = isNarrow ? width * 0.08 : width * 0.12;
    const marginY = height * 0.22;
    const usableH = height - marginY * 2;
    this.anchorNodes = {};
    anchors.forEach((a, i) => {
      const sy = marginY + (usableH * (i + 0.5)) / anchors.length;
      const w = screenToWorld(anchorX, sy, width, height);
      this.anchorNodes[a.id] = { x: w.x, y: w.y, label: a.label, sx: anchorX, sy };
    });

    this._buildBubbleMeshes();
    this._buildAnchorMeshes();
    this._buildThreads();
    this._buildLabels(width, height);
    this._updateHighlight(null);
  }

  _buildBubbleMeshes() {
    this.bubbleGroup = new THREE.Group();
    this.scene.add(this.bubbleGroup);

    Object.values(this.bubbleNodes).forEach((node) => {
      const fillGeo = new THREE.CircleGeometry(node.r, 48);
      const fillMat = new THREE.MeshBasicMaterial({
        color: 0xfff4e0,
        transparent: true,
        opacity: 0.035,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const fill = new THREE.Mesh(fillGeo, fillMat);
      fill.position.set(node.x, node.y, -0.02);

      const ringGeo = new THREE.RingGeometry(node.r * 0.96, node.r, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffcf8a,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(node.x, node.y, -0.01);

      node.fillMat = fillMat;
      node.ringMat = ringMat;
      this.bubbleGroup.add(fill);
      this.bubbleGroup.add(ring);
    });
  }

  _buildAnchorMeshes() {
    this.anchorGroup = new THREE.Group();
    this.scene.add(this.anchorGroup);
    const baseRadius = 7;

    Object.values(this.anchorNodes).forEach((node) => {
      const geo = new THREE.CircleGeometry(baseRadius, 24);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff8c32,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(node.x, node.y, 0.01);
      mesh.userData = { current: 1, target: 1 };
      node.mesh = mesh;
      this.anchorGroup.add(mesh);
    });
  }

  _buildThreads() {
    const positions = [];
    const colors = [];
    const alphas = [];
    this.connectionRanges = [];
    this.bubbleToConnections = {};
    this.bubbleToAnchors = {};

    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    const sample = new Float32Array((SEGMENTS + 1) * 3);

    connections.forEach((conn, connIndex) => {
      const anchor = this.anchorNodes[conn.anchor];
      const bubble = this.bubbleNodes[conn.bubble];
      if (!anchor || !bubble) return;

      const start = connIndex === 0 ? 0 : positions.length / 3;

      const dir = new THREE.Vector3(bubble.x - anchor.x, bubble.y - anchor.y, 0);
      const dist = dir.length();
      dir.normalize();
      const perp = new THREE.Vector3(-dir.y, dir.x, 0);

      for (let k = 0; k < SUB_THREADS; k++) {
        const spread = (k / (SUB_THREADS - 1) - 0.5) * bubble.r * 1.4;
        p0.set(
          anchor.x + perp.x * (Math.random() - 0.5) * 4,
          anchor.y + perp.y * (Math.random() - 0.5) * 4,
          0
        );

        const landX = bubble.x - dir.x * bubble.r * 0.85 + perp.x * spread;
        const landY = bubble.y - dir.y * bubble.r * 0.85 + perp.y * spread;
        const landDir = new THREE.Vector3(landX - bubble.x, landY - bubble.y, 0).normalize();
        p3.set(
          bubble.x + landDir.x * bubble.r,
          bubble.y + landDir.y * bubble.r,
          0
        );

        p1.set(
          anchor.x + dir.x * dist * 0.35 + perp.x * (Math.random() - 0.5) * dist * 0.2,
          anchor.y + dir.y * dist * 0.35 + perp.y * (Math.random() - 0.5) * dist * 0.2,
          0
        );
        p2.set(
          p3.x - dir.x * dist * 0.3 + perp.x * (Math.random() - 0.5) * dist * 0.3,
          p3.y - dir.y * dist * 0.3 + perp.y * (Math.random() - 0.5) * dist * 0.3,
          0
        );

        sampleCubicBezier(p0, p1, p2, p3, SEGMENTS, sample);

        for (let s = 0; s < SEGMENTS; s++) {
          positions.push(
            sample[s * 3], sample[s * 3 + 1], sample[s * 3 + 2],
            sample[(s + 1) * 3], sample[(s + 1) * 3 + 1], sample[(s + 1) * 3 + 2]
          );
          colors.push(
            THREAD_COLOR.r, THREAD_COLOR.g, THREAD_COLOR.b,
            THREAD_COLOR.r, THREAD_COLOR.g, THREAD_COLOR.b
          );
          alphas.push(BASE_ALPHA, BASE_ALPHA);
        }
      }

      const count = positions.length / 3 - start;
      this.connectionRanges[connIndex] = { start, count, bubble: conn.bubble, anchor: conn.anchor };
      (this.bubbleToConnections[conn.bubble] ||= []).push(connIndex);
      (this.bubbleToAnchors[conn.bubble] ||= new Set()).add(conn.anchor);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
    this.alphaAttribute = new THREE.Float32BufferAttribute(alphas, 1);
    geometry.setAttribute('aAlpha', this.alphaAttribute);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    this.threadMesh = new THREE.LineSegments(geometry, material);
    this.scene.add(this.threadMesh);
  }

  _buildLabels(width, height) {
    Object.values(this.anchorNodes).forEach((node) => {
      const el = document.createElement('div');
      el.className = 'weave-label weave-label-anchor';
      el.textContent = node.label;
      el.style.left = `${node.sx + 14}px`;
      el.style.top = `${node.sy}px`;
      document.body.appendChild(el);
      this.labelEls.push(el);
    });

    Object.values(this.bubbleNodes).forEach((node) => {
      const sx = width / 2 + node.x;
      const sy = height / 2 - node.y;
      const el = document.createElement('div');
      el.className = 'weave-label weave-label-bubble';
      const pct = this._averageExpertise(node.name);
      el.innerHTML = `<span class="weave-label-title">${node.name}</span><span class="weave-label-meta">${pct}%  •  ${Math.round(node.x)},${Math.round(node.y)}</span>`;
      el.style.left = `${sx}px`;
      el.style.top = `${sy - node.r}px`;
      document.body.appendChild(el);
      this.labelEls.push(el);
    });
  }

  _averageExpertise(bubbleName) {
    const category = bubbles.children.find((c) => c.name === bubbleName);
    if (!category) return 0;
    const values = category.children.map((c) => c.value);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  _initInteraction() {
    this.container.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this.container.addEventListener('click', (e) => this._onClick(e));
    this.container.addEventListener('pointerleave', () => {
      this.hoveredBubble = null;
      this._updateHighlight(this.selectedBubble);
    });
  }

  _bubbleAt(clientX, clientY) {
    const rect = this.container.getBoundingClientRect();
    const w = screenToWorld(clientX - rect.left, clientY - rect.top, rect.width, rect.height);
    for (const node of Object.values(this.bubbleNodes)) {
      const dx = w.x - node.x;
      const dy = w.y - node.y;
      if (dx * dx + dy * dy <= node.r * node.r) return node.name;
    }
    return null;
  }

  _onPointerMove(e) {
    const hit = this._bubbleAt(e.clientX, e.clientY);
    if (hit !== this.hoveredBubble) {
      this.hoveredBubble = hit;
      this.canvas.style.cursor = hit ? 'pointer' : 'default';
      this._updateHighlight(hit ?? this.selectedBubble);
    }
  }

  _onClick(e) {
    const hit = this._bubbleAt(e.clientX, e.clientY);
    this.selectedBubble = hit && hit === this.selectedBubble ? null : hit;
    this._updateHighlight(this.hoveredBubble ?? this.selectedBubble);
  }

  _updateHighlight(activeBubble) {
    const alphas = this.alphaAttribute.array;

    this.connectionRanges.forEach((range) => {
      const isActive = activeBubble && range.bubble === activeBubble;
      const value = activeBubble ? (isActive ? ACTIVE_ALPHA : DIM_ALPHA) : BASE_ALPHA;
      for (let i = 0; i < range.count; i++) {
        alphas[range.start + i] = value;
      }
    });
    this.alphaAttribute.needsUpdate = true;

    Object.values(this.anchorNodes).forEach((anchor) => {
      const connectedIds = activeBubble ? this.bubbleToAnchors[activeBubble] : null;
      const isActive = connectedIds && connectedIds.has(this._anchorIdOf(anchor));
      anchor.mesh.userData.target = isActive ? 1.7 : 1;
    });

    Object.values(this.bubbleNodes).forEach((node) => {
      const isActive = node.name === activeBubble;
      node.ringMat.opacity = isActive ? 0.55 : 0.18;
      node.fillMat.opacity = isActive ? 0.09 : 0.035;
    });
  }

  _anchorIdOf(anchorNode) {
    return anchors.find((a) => this.anchorNodes[a.id] === anchorNode)?.id;
  }

  _handleResize() {
    this._build();
  }

  _tick() {
    this._rafId = requestAnimationFrame(this._tick);

    Object.values(this.anchorNodes).forEach((anchor) => {
      const ud = anchor.mesh.userData;
      ud.current += (ud.target - ud.current) * 0.15;
      anchor.mesh.scale.setScalar(ud.current);
    });

    this.renderer.render(this.scene, this.camera);
  }

  _disposeSceneContent() {
    [this.bubbleGroup, this.anchorGroup].forEach((group) => {
      if (!group) return;
      group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      this.scene.remove(group);
    });
    if (this.threadMesh) {
      this.threadMesh.geometry.dispose();
      this.threadMesh.material.dispose();
      this.scene.remove(this.threadMesh);
    }
  }

  dispose() {
    cancelAnimationFrame(this._rafId);
    window.removeEventListener('resize', this._onResize);
    this._disposeSceneContent();
    this._clearLabels();
    this.renderer.dispose();
  }
}
