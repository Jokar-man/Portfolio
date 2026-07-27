/** Converts lat/lon (degrees) to a point on a sphere of the given radius. */
export function latLonToSphere(lat, lon, radius, target) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  target.x = -radius * Math.sin(phi) * Math.cos(theta);
  target.y = radius * Math.cos(phi);
  target.z = radius * Math.sin(phi) * Math.sin(theta);
  return target;
}

/** Converts lat/lon (degrees) to an equirectangular XY position spanning +/- halfWidth/halfHeight.
 *  Matches the sphere conversion's handedness (Americas negative-lon => left) so the globe<->map
 *  morph doesn't cross points over each other mid-transition. */
export function latLonToEquirect(lat, lon, halfWidth, halfHeight, target) {
  target.x = (lon / 180) * halfWidth;
  target.y = (lat / 90) * halfHeight;
  target.z = 0;
  return target;
}
