import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import './network.css';
import { topics, tools, links, anchorById } from './networkData.js';

const AMBER = new THREE.Color(0xff9c5e);
const AMBER_LIGHT = new THREE.Color(0xffe8cc);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Topic/tool anchor HUD + weaving connection threads, layered onto the existing
 * rotating globe. Adapted from a reference build (globe-network.html): topics
 * top-left, tools bottom-right, hover/click selects an anchor, and Bezier threads
 * with a perpendicular sine wobble connect it to its linked projects — the threads
 * are ordinary 3D geometry recomputed every frame so they keep tracking the
 * projects as the globe rotates.
 */
export class NetworkOverlay {
  constructor({ renderer, scene, camera, rotationGroup, markerMeshes, globeRadius }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.rotationGroup = rotationGroup;
    this.markerMeshes = markerMeshes;
    this.globeRadius = globeRadius;

    this.markerById = new Map(markerMeshes.map((m) => [m.userData.project.id, m]));

    this.hoverTopicId = null;
    this.hoverToolId = null;
    this.lockedTopicId = null;
    this.lockedToolId = null;
    this.rotationPaused = false;
    this.lastSelKey = '';
    this.activeThreads = [];

    this._buildComposer();
    this._buildAnchorDom();
    this._buildHudDom();
  }

  _buildComposer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.6, 0.2);
    this.composer.addPass(this.bloom);
  }

  _buildAnchorDom() {
    this.anchorEls = [];

    const makeAnchor = (anchor, kind) => {
      const el = document.createElement('div');
      el.className = `network-anchor ${kind}`;
      el.textContent = anchor.label;
      el.addEventListener('mouseenter', () => {
        if (kind === 'topic') this.hoverTopicId = anchor.id;
        else this.hoverToolId = anchor.id;
      });
      el.addEventListener('mouseleave', () => {
        if (kind === 'topic') this.hoverTopicId = null;
        else this.hoverToolId = null;
      });
      el.addEventListener('click', () => {
        if (kind === 'topic') this.lockedTopicId = this.lockedTopicId === anchor.id ? null : anchor.id;
        else this.lockedToolId = this.lockedToolId === anchor.id ? null : anchor.id;
      });
      document.body.appendChild(el);
      anchor.el = el;
      this.anchorEls.push(el);
    };

    topics.forEach((t) => makeAnchor(t, 'topic'));
    tools.forEach((t) => makeAnchor(t, 'tool'));

    this._layoutAnchors();
  }

  _layoutAnchors() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isNarrow = w < 760;

    const topicLeft = isNarrow ? 72 : 96;
    const topicTop = 130;
    const topicGap = Math.min(38, (h * 0.5) / topics.length);
    topics.forEach((t, i) => {
      t.px = topicLeft;
      t.py = topicTop + i * topicGap;
      t.align = 'left';
    });

    const toolRight = isNarrow ? 16 : 32;
    const toolBottom = 96;
    const toolGap = Math.min(38, (h * 0.5) / tools.length);
    tools.forEach((t, i) => {
      t.px = w - toolRight;
      t.py = h - toolBottom - i * toolGap;
      t.align = 'right';
    });

    [...topics, ...tools].forEach((a) => {
      a.el.style.left = `${a.px}px`;
      a.el.style.top = `${a.py}px`;
      a.el.style.transform = a.align === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)';
    });
  }

  _buildHudDom() {
    this.comboLabel = document.createElement('div');
    this.comboLabel.className = 'network-combo';
    document.body.appendChild(this.comboLabel);

    this.hint = document.createElement('div');
    this.hint.className = 'network-hint';
    this.hint.textContent = 'Hover a topic or tool — select both to narrow it down';
    document.body.appendChild(this.hint);

    this.pauseBtn = document.createElement('button');
    this.pauseBtn.className = 'network-pause';
    this.pauseBtn.textContent = 'Pause Rotation';
    this.pauseBtn.addEventListener('click', () => {
      this.rotationPaused = !this.rotationPaused;
      this.pauseBtn.textContent = this.rotationPaused ? 'Resume Rotation' : 'Pause Rotation';
    });
    document.body.appendChild(this.pauseBtn);

    this.projectLabelEls = new Map();
  }

  /** Fixed 3D world position for each anchor, derived from its screen position, so
   *  threads are ordinary 3D geometry that gets properly depth-occluded by the globe. */
  _screenPointToWorld(px, py, distance) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ndcX = (px / w) * 2 - 1;
    const ndcY = -(py / h) * 2 + 1;
    const vec = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(this.camera);
    const dir = vec.sub(this.camera.position).normalize();
    return this.camera.position.clone().add(dir.multiplyScalar(distance));
  }

  _computeAnchorWorldPositions() {
    const dist = this.camera.position.length();
    [...topics, ...tools].forEach((a) => {
      a.worldPos = this._screenPointToWorld(a.px, a.py, dist);
    });
  }

  _activeLinksFor(topicId, toolId) {
    const activeLinks = [];
    const activeProjectIds = new Set();
    if (topicId && toolId) {
      const topicProjects = new Set(links.filter((l) => l.source === topicId).map((l) => l.project));
      links
        .filter((l) => l.source === toolId && topicProjects.has(l.project))
        .forEach((l) => {
          activeLinks.push(l);
          activeProjectIds.add(l.project);
        });
      links
        .filter((l) => l.source === topicId && activeProjectIds.has(l.project))
        .forEach((l) => activeLinks.push(l));
    } else if (topicId) {
      links.filter((l) => l.source === topicId).forEach((l) => {
        activeLinks.push(l);
        activeProjectIds.add(l.project);
      });
    } else if (toolId) {
      links.filter((l) => l.source === toolId).forEach((l) => {
        activeLinks.push(l);
        activeProjectIds.add(l.project);
      });
    }
    return { activeLinks, activeProjectIds };
  }

  _disposeActiveThreads() {
    this.activeThreads.forEach((t) => {
      this.scene.remove(t.line);
      t.line.geometry.dispose();
      t.line.material.dispose();
    });
    this.activeThreads = [];
  }

  _buildThreadsForLinks(activeLinks) {
    this._disposeActiveThreads();
    const sampleCount = 46;

    activeLinks.forEach((link) => {
      const isTopic = topics.some((t) => t.id === link.source);
      const subCount = Math.max(2, link.weight * 2);
      for (let i = 0; i < subCount; i++) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(sampleCount * 3), 3));
        const material = new THREE.LineBasicMaterial({
          color: isTopic ? AMBER : AMBER_LIGHT,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        this.activeThreads.push({
          line,
          anchorId: link.source,
          projectId: link.project,
          sampleCount,
          params: {
            mid1: new THREE.Vector3((Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 1.1),
            mid2: new THREE.Vector3((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7),
            mid1T: lerp(0.22, 0.4, Math.random()),
            mid2T: lerp(0.6, 0.82, Math.random()),
            freq: lerp(1.2, 2.4, Math.random()),
            amp: lerp(0.04, 0.12, Math.random()),
            endJitter: new THREE.Vector3(
              (Math.random() - 0.5) * 0.05,
              (Math.random() - 0.5) * 0.05,
              (Math.random() - 0.5) * 0.05
            ),
          },
        });
      }
    });
  }

  _updateThreadGeometry(t) {
    const anchor = anchorById(t.anchorId);
    const marker = this.markerById.get(t.projectId);
    if (!marker) return;
    const end = marker.getWorldPosition(new THREE.Vector3()).add(t.params.endJitter);
    const start = anchor.worldPos;

    const mid1 = start.clone().lerp(end, t.params.mid1T).add(t.params.mid1);
    const mid2 = start.clone().lerp(end, t.params.mid2T).add(t.params.mid2);
    [mid1, mid2].forEach((p) => {
      const d = p.length();
      const minD = this.globeRadius * 1.18;
      if (d < minD) p.multiplyScalar(minD / Math.max(d, 0.001));
    });

    const curve = new THREE.CubicBezierCurve3(start, mid1, mid2, end);
    let pts = curve.getPoints(t.sampleCount - 1);

    const axis = new THREE.Vector3().subVectors(end, start).normalize();
    const arbitrary = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const normal = new THREE.Vector3().crossVectors(axis, arbitrary).normalize();
    pts = pts.map((p, k) => {
      const tt = k / (pts.length - 1);
      const wobble = Math.sin(tt * Math.PI * t.params.freq) * t.params.amp * Math.sin(tt * Math.PI);
      return p.clone().addScaledVector(normal, wobble);
    });

    const arr = t.line.geometry.attributes.position.array;
    pts.forEach((p, i) => {
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    });
    t.line.geometry.attributes.position.needsUpdate = true;
    t.line.geometry.computeBoundingSphere();
  }

  _getOrCreateProjectLabel(project) {
    let el = this.projectLabelEls.get(project.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'network-project-label';
      el.textContent = project.title;
      document.body.appendChild(el);
      this.projectLabelEls.set(project.id, el);
    }
    return el;
  }

  enter() {
    document.body.classList.add('network-active');
    this._layoutAnchors();
    this._computeAnchorWorldPositions();
    this.markerMeshes.forEach((mesh) => {
      mesh.userData.chip.setVisible(false);
      mesh.visible = true;
      mesh.userData.baseScale = mesh.scale.x || 1;
    });
  }

  exit() {
    document.body.classList.remove('network-active');
    this.hoverTopicId = null;
    this.hoverToolId = null;
    this.lockedTopicId = null;
    this.lockedToolId = null;
    this.lastSelKey = '';
    this._disposeActiveThreads();
    this.projectLabelEls.forEach((el) => el.remove());
    this.projectLabelEls.clear();
    this.comboLabel.classList.remove('visible');
    [...topics, ...tools].forEach((a) => {
      a.el.classList.remove('active', 'dim');
    });
    this.markerMeshes.forEach((mesh) => {
      mesh.visible = true;
      mesh.scale.setScalar(1);
    });
  }

  handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this._layoutAnchors();
    this._computeAnchorWorldPositions();
  }

  tick(dt) {
    const topicId = this.lockedTopicId || this.hoverTopicId;
    const toolId = this.lockedToolId || this.hoverToolId;
    const hasSelection = Boolean(topicId || toolId);
    const selKey = `${topicId || ''}|${toolId || ''}`;

    if (!this.rotationPaused) {
      const speed = hasSelection ? 0.12 : 0.35;
      this.rotationGroup.rotation.y += speed * dt;
    }

    if (selKey !== this.lastSelKey) {
      this.lastSelKey = selKey;
      if (hasSelection) {
        const { activeLinks } = this._activeLinksFor(topicId, toolId);
        this._buildThreadsForLinks(activeLinks);
      } else {
        this._disposeActiveThreads();
      }
    }

    const { activeProjectIds } = hasSelection ? this._activeLinksFor(topicId, toolId) : { activeProjectIds: new Set() };

    [...topics, ...tools].forEach((a) => {
      const isActive = a.id === topicId || a.id === toolId;
      a.el.classList.toggle('active', isActive);
      a.el.classList.toggle('dim', hasSelection && !isActive);
    });

    this.markerMeshes.forEach((mesh) => {
      const project = mesh.userData.project;
      const isActive = !hasSelection || activeProjectIds.has(project.id);
      mesh.visible = isActive;
      const targetScale = hasSelection && activeProjectIds.has(project.id) ? 1.8 : 1;
      const nextScale = lerp(mesh.scale.x || 1, targetScale, 0.18);
      mesh.scale.setScalar(nextScale);

      const label = this._getOrCreateProjectLabel(project);
      if (hasSelection && activeProjectIds.has(project.id)) {
        const wp = mesh.getWorldPosition(new THREE.Vector3());
        const ndc = wp.project(this.camera);
        if (ndc.z < 1) {
          label.style.left = `${((ndc.x + 1) / 2) * window.innerWidth}px`;
          label.style.top = `${((1 - ndc.y) / 2) * window.innerHeight}px`;
          label.style.opacity = '1';
        } else {
          label.style.opacity = '0';
        }
      } else {
        label.style.opacity = '0';
      }
    });

    this.activeThreads.forEach((t) => {
      this._updateThreadGeometry(t);
      t.line.material.opacity = lerp(t.line.material.opacity, 0.36, 0.15);
    });

    if (topicId && toolId) {
      const { activeProjectIds: combo } = this._activeLinksFor(topicId, toolId);
      const topicLabel = anchorById(topicId).label;
      const toolLabel = anchorById(toolId).label;
      if (combo.size > 0) {
        const names = [...combo].map((id) => this.markerById.get(id)?.userData.project.title).join(', ');
        this.comboLabel.textContent = `${topicLabel} × ${toolLabel} → ${names}`;
      } else {
        this.comboLabel.textContent = `${topicLabel} × ${toolLabel} · no project matches this combination`;
      }
      this.comboLabel.classList.add('visible');
    } else {
      this.comboLabel.classList.remove('visible');
    }

    this.composer.render();
  }

  dispose() {
    this._disposeActiveThreads();
    this.anchorEls.forEach((el) => el.remove());
    this.projectLabelEls.forEach((el) => el.remove());
    this.comboLabel.remove();
    this.hint.remove();
    this.pauseBtn.remove();
    this.composer.dispose();
  }
}
