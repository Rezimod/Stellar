// Pinhole projection for the AR finder. The previous linear `dAz / hFov` map
// was good enough at small angles but blew up off-centre, which is exactly
// where the user notices misalignment ("Jupiter is on my screen but the
// marker is 30° to the left"). This module replaces it with a real camera
// model: build unit vectors for the body and the phone aim, then project
// the body into the camera basis.
//
// All angles in degrees, world frame is East-North-Up:
//   x = East, y = North, z = Up
// Astronomical azimuth is measured from North, increasing clockwise.

const DEG = Math.PI / 180;

export interface Vec3 { x: number; y: number; z: number; }

/** Unit vector for an alt/az direction in the East-North-Up frame. */
export function altAzToVec(altDeg: number, azDeg: number): Vec3 {
  const a = altDeg * DEG;
  const z = azDeg * DEG;
  const cosA = Math.cos(a);
  return {
    x: cosA * Math.sin(z),
    y: cosA * Math.cos(z),
    z: Math.sin(a),
  };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
function normalize(v: Vec3): Vec3 {
  const n = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

export interface Projection {
  /** True if the body is in front of the camera (z_cam > 0). */
  inFront: boolean;
  /** Screen-space X in pixels relative to viewport top-left. */
  screenX: number;
  /** Screen-space Y in pixels relative to viewport top-left. */
  screenY: number;
  /** Signed great-circle azimuth delta (deg). Useful for compass arrows. */
  dAz: number;
  /** Signed altitude delta (deg). */
  dAlt: number;
  /** Great-circle separation between target and camera centre (deg). */
  sep: number;
}

/** Shortest signed azimuth delta in (-180, +180]. */
export function shortestAzDelta(targetAz: number, fromAz: number): number {
  return ((targetAz - fromAz + 540) % 360) - 180;
}

/**
 * Project a celestial body onto the AR viewport using a rectilinear pinhole
 * camera. Accurate to the edge of any sensible phone FOV — no blow-up at
 * wide angles, no scale errors at high altitudes.
 *
 * @param target          alt/az of the body, deg.
 * @param cameraAim       alt/az the back of the phone is pointing at, deg.
 * @param horizontalFovDeg Effective horizontal FOV of the rendered viewport.
 * @param verticalFovDeg   Effective vertical FOV.
 * @param viewportWidth    Pixels.
 * @param viewportHeight   Pixels.
 * @param rollDeg          Optional camera roll in degrees. Lets markers rotate
 *                         with the phone when it's held tilted laterally. 0 (or
 *                         omitted) means "phone held upright" — image-up
 *                         aligns with world-up projected.
 */
export function projectBodyToScreen(
  target: { altitude: number; azimuth: number },
  cameraAim: { altitude: number; azimuth: number },
  horizontalFovDeg: number,
  verticalFovDeg: number,
  viewportWidth: number,
  viewportHeight: number,
  rollDeg = 0,
): Projection {
  const t = altAzToVec(target.altitude, target.azimuth);
  const fwd = altAzToVec(cameraAim.altitude, cameraAim.azimuth);

  // Image-up is the world-up vector projected perpendicular to `fwd`.
  // Falls back to a north-ish vector if the camera is aimed straight up or
  // straight down (then world-up is parallel to fwd and the projection is
  // degenerate).
  const worldUp: Vec3 = { x: 0, y: 0, z: 1 };
  let up = {
    x: worldUp.x - dot(worldUp, fwd) * fwd.x,
    y: worldUp.y - dot(worldUp, fwd) * fwd.y,
    z: worldUp.z - dot(worldUp, fwd) * fwd.z,
  };
  if (Math.hypot(up.x, up.y, up.z) < 1e-3) {
    // Camera aimed at zenith or nadir — use north as the reference up.
    up = { x: 0, y: 1, z: 0 };
  } else {
    up = normalize(up);
  }
  const right = cross(fwd, up);
  // (fwd × up) gives the "left" direction in a right-handed image frame; the
  // image-right we want for a normal camera is the negation.
  const camRight: Vec3 = { x: -right.x, y: -right.y, z: -right.z };

  const xCam = dot(t, camRight);
  const yCam = dot(t, up);
  const zCam = dot(t, fwd);

  const halfHFovTan = Math.tan((horizontalFovDeg * 0.5) * DEG);
  const halfVFovTan = Math.tan((verticalFovDeg * 0.5) * DEG);
  const halfW = viewportWidth / 2;
  const halfH = viewportHeight / 2;

  const inFront = zCam > 1e-6;

  // For points behind the camera, project onto the far side of the screen
  // along the angular direction so we can still draw edge arrows.
  const projZ = inFront ? zCam : Math.max(Math.abs(zCam), 1e-3) * -1;
  // Angular tangents (isotropic image plane).
  let ax = xCam / projZ;
  let ay = yCam / projZ;

  // Apply camera roll in angular space so the rotation is isotropic and
  // doesn't smear horizontally when the phone aspect ratio is non-square.
  if (rollDeg !== 0) {
    const r = -rollDeg * DEG;
    const cr = Math.cos(r);
    const sr = Math.sin(r);
    const nx = ax * cr - ay * sr;
    const ny = ax * sr + ay * cr;
    ax = nx;
    ay = ny;
  }

  const px = ax / halfHFovTan;
  const py = ay / halfVFovTan;

  const screenX = halfW + px * halfW;
  const screenY = halfH - py * halfH;

  const dAz = shortestAzDelta(target.azimuth, cameraAim.azimuth);
  const dAlt = target.altitude - cameraAim.altitude;

  // Great-circle separation between target and aim.
  const cosSep = Math.max(-1, Math.min(1, dot(t, fwd)));
  const sep = Math.acos(cosSep) / DEG;

  return { inFront, screenX, screenY, dAz, dAlt, sep };
}
