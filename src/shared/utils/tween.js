export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Drives a 0..1 progress value over `duration` ms, calling onUpdate(easedT) every frame
 * and onComplete() once. Returns a cancel function.
 */
export function animate(duration, onUpdate, onComplete, easing = easeInOutCubic) {
  const start = performance.now();
  let rafId;

  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    onUpdate(easing(t));
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else if (onComplete) {
      onComplete();
    }
  }

  rafId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(rafId);
}
