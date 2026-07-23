import * as THREE from 'three';
import { animate } from '../shared/utils/tween.js';

/** Distance needed for `camera` to frame a plane of size (2*halfWidth) x (2*halfHeight) head-on. */
export function fitDistance(camera, halfWidth, halfHeight, margin = 1.2) {
  const vFov = (camera.fov * Math.PI) / 180;
  const distForHeight = (halfHeight * margin) / Math.tan(vFov / 2);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const distForWidth = (halfWidth * margin) / Math.tan(hFov / 2);
  return Math.max(distForHeight, distForWidth);
}

/** Animate camera position from its current spot to `endPos`, looking at `lookAt` throughout. */
function flyCamera(camera, endPos, lookAt, duration, onComplete) {
  const startPos = camera.position.clone();
  return animate(
    duration,
    (t) => {
      camera.position.lerpVectors(startPos, endPos, t);
      camera.up.set(0, 1, 0);
      camera.lookAt(lookAt);
    },
    onComplete
  );
}

/** Globe (sphere, orbiting camera) -> Map (flat, static top-down camera). */
export function transitionToMap({ camera, controls, uniforms, mapCameraPos, duration = 1600, onComplete }) {
  controls.enabled = false;
  const lookAt = new THREE.Vector3(0, 0, 0);
  animate(
    duration,
    (t) => {
      uniforms.uMorph.value = t;
    },
    undefined
  );
  return flyCamera(camera, mapCameraPos, lookAt, duration, onComplete);
}

/** Map (flat) -> Globe (sphere, restores orbit controls). */
export function transitionToGlobe({ camera, controls, uniforms, globeCameraPos, duration = 1600, onComplete }) {
  const lookAt = new THREE.Vector3(0, 0, 0);
  animate(
    duration,
    (t) => {
      uniforms.uMorph.value = 1 - t;
    },
    undefined
  );
  return flyCamera(camera, globeCameraPos, lookAt, duration, () => {
    controls.target.set(0, 0, 0);
    controls.update();
    controls.enabled = true;
    if (onComplete) onComplete();
  });
}

/** Map -> zoomed-in detail framing on a marker's flat position. */
export function dollyToMarker({ camera, flatPos, closeDistance = 1.4, duration = 1200, onComplete }) {
  const endPos = new THREE.Vector3(flatPos.x, flatPos.y, closeDistance);
  return flyCamera(camera, endPos, flatPos, duration, onComplete);
}

/** Detail -> back out to the full map framing. */
export function dollyToMap({ camera, mapCameraPos, duration = 1200, onComplete }) {
  const lookAt = new THREE.Vector3(0, 0, 0);
  return flyCamera(camera, mapCameraPos, lookAt, duration, onComplete);
}
