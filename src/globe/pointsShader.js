export const vertexShader = /* glsl */ `
  attribute vec3 aSpherePos;
  attribute vec3 aFlatPos;
  attribute vec3 aColor;
  uniform float uMorph;
  uniform float uPointSize;
  varying vec3 vColor;

  void main() {
    vColor = aColor;
    vec3 pos = mix(aSpherePos, aFlatPos, uMorph);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uPointSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fragmentShader = /* glsl */ `
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.2, d);
    gl_FragColor = vec4(vColor, alpha);
  }
`;
