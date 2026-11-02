/* Pure model: reduced twist energy, centreline kinematics, snap geometry,
   efficiencies and the design sweep. No React, no DOM, so it runs in Web
   Workers too. Moved verbatim out of CTRWorkbench.jsx. */
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════
   2 · SHARED TORSIONAL MODEL
   V(θ) = ½(θ−α)² − λcos θ ; V′ = (θ−α) + λ sin θ ; V″ = 1 + λ cos θ

   PLANAR OUTER TUBE adds one term, + ½μ sin²θ (see pairMechanics). μ
   defaults to 0, and with μ = 0 every expression below is the original one
   term for term, so the clamped and fully-constrained modes are untouched.
     V  = ½(θ−α)² − λcos θ + ½μ sin²θ
     V′ = (θ−α) + λ sin θ + μ sin θ cos θ
     V″ = 1 + λ cos θ + μ cos 2θ
   ═══════════════════════════════════════════════════════════════ */
const energy = (th, a, l, mu = 0) => 0.5 * (th - a) ** 2 - l * Math.cos(th) + 0.5 * mu * Math.sin(th) ** 2;
const gradient = (th, a, l, mu = 0) => (th - a) + l * Math.sin(th) + mu * Math.sin(th) * Math.cos(th);
const stiffness = (th, l, mu = 0) => 1 + l * Math.cos(th) + mu * Math.cos(2 * th);

/** Effective bifurcation parameter, λ_eff = −min_θ (λ cos θ + μ cos 2θ).
 *  The second-variation operator is Sh = −h″ + (λ cos θ + μ cos 2θ) h
 *  (Gilbert et al. Eq. (19) with the planar term), so by the same comparison
 *  argument the paper uses (p. 26) every configuration is stable while
 *  λ_eff ≤ π²/4. With μ = 0 it is exactly λ. Closed form: the minimum of
 *  λc + μ(2c² − 1) over c = cos θ ∈ [−1, 1]. */
function lamEff(l, mu = 0) {
  if (!(mu > 0)) return l;
  return l >= 4 * mu ? l - mu : (l * l) / (8 * mu) + mu;
}
/** μ for a design: zero unless the outer tube is held planar. */
const muOf = (mech, Lc, k2) => (mech.Cmu ? mech.Cmu * Lc * Lc * k2 * k2 : 0);

/* ═══════════════════════════════════════════════════════════════
   3 · KINEMATICS (Bishop frame, Euler–Rodrigues)
   ═══════════════════════════════════════════════════════════════ */
const N_STEPS = 50, M2MM = 1000, SNAP_THRESHOLD = 4.0;   // N_STEPS: Part 5 rule
const eye3 = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

function matmul3(A, B) {
  const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += A[i][k] * B[k][j];
      M[i][j] = s;
    }
  return M;
}

function rodrigues(vx, vy, vz) {
  const phi = Math.hypot(vx, vy, vz);
  if (phi < 1e-12) return eye3();
  const kx = vx / phi, ky = vy / phi, kz = vz / phi;
  const s = Math.sin(phi), c = Math.cos(phi), t = 1 - c;
  return [
    [t * kx * kx + c, t * kx * ky - s * kz, t * kx * kz + s * ky],
    [t * kx * ky + s * kz, t * ky * ky + c, t * ky * kz - s * kx],
    [t * kx * kz - s * ky, t * ky * kz + s * kx, t * kz * kz + c],
  ];
}

/** Bishop-frame integration of the tube centreline (Part 5).
 *  @param alpha,thetaTip base and tip twist (rad)
 *  @param k1,k2 precurvatures (m⁻¹)
 *  @param Lc overlap length (m) — sets the ARC LENGTH of the curved section,
 *         so the rendered tube physically lengthens with the L_c slider.
 *  @returns pts in millimetres. */
function integrateShape(alpha, thetaTip, k1, k2, Lc, Lext, w1 = 0.5, w2 = 0.5, wy = w2) {
  const ds = Lc / N_STEPS;
  let R = eye3(), px = 0, py = 0, pz = 0;
  const pts = [new THREE.Vector3(0, 0, 0)];

  // 1 · OVERLAP, s ∈ [0, L_c]. Both tubes present, so the curvature is the
  //     BENDING-STIFFNESS-WEIGHTED sum of the two precurvature vectors
  //     (Part 5, general form). w1 = w2 = 1/2 only for identical tubes; the
  //     /2 form is wrong the moment the cross-sections differ.
  for (let i = 0; i < N_STEPS; i++) {
    const s = i / N_STEPS;
    const th = alpha + (thetaTip - alpha) * s;
    const Kx = w1 * k1 + w2 * k2 * Math.cos(th);
    // wy = w2 normally; 0 when the outer tube is held in its plane, which
    // is exactly the statement that the overlap cannot curve out of it.
    const Ky = wy * k2 * Math.sin(th);
    px += R[0][2] * ds; py += R[1][2] * ds; pz += R[2][2] * ds;
    pts.push(new THREE.Vector3(px * M2MM, py * M2MM, pz * M2MM));
    R = matmul3(R, rodrigues(Kx * ds, Ky * ds, 0));
  }
  const nOverlap = pts.length - 1;                  // last point still sheathed
  const Rmid = R.map((row) => row.slice());

  // 2 · DISTAL EXTENSION, s ∈ [L_c, L_c + L_ext]. The sheath has ended, so
  //     there is no second tube to average against: the fin carries its OWN
  //     precurvature κ₂ at full magnitude, held in its material frame at the
  //     relative twist θ_tip it left the overlap with. It is torsionally
  //     unloaded out here, so θ no longer evolves.
  if (Lext > 1e-6) {
    const M = Math.max(4, Math.min(120, Math.round(N_STEPS * (Lext / Math.max(Lc, 1e-4)))));
    const de = Lext / M;
    const Kx = k2 * Math.cos(thetaTip), Ky = k2 * Math.sin(thetaTip);
    for (let i = 0; i < M; i++) {
      px += R[0][2] * de; py += R[1][2] * de; pz += R[2][2] * de;
      pts.push(new THREE.Vector3(px * M2MM, py * M2MM, pz * M2MM));
      R = matmul3(R, rodrigues(Kx * de, Ky * de, 0));
    }
  }
  return { pts, Rtip: R, Rmid, nOverlap };
}

/** The fin tip alone, in millimetres in the robot's local frame: the same
 *  Bishop-frame march as integrateShape (the extension summed in closed
 *  form), with the frame held in nine scalars and nothing allocated. The snap-path efficiency needs
 *  a few hundred tips per design and the optimiser sweeps 2500 designs, so
 *  building curves there is not an option. Writes into `out` = [x, y, z]. */
function tipPoint(alpha, thetaTip, k1, k2, Lc, Lext, w1, w2, out, wy = w2) {
  let r00 = 1, r01 = 0, r02 = 0, r10 = 0, r11 = 1, r12 = 0, r20 = 0, r21 = 0, r22 = 1;
  let px = 0, py = 0, pz = 0;
  const step = (Kx, Ky, ds) => {
    px += r02 * ds; py += r12 * ds; pz += r22 * ds;
    const vx = Kx * ds, vy = Ky * ds, phi = Math.hypot(vx, vy);
    if (phi < 1e-12) return;
    // rodrigues(vx, vy, 0), then R = R·Q
    const kx = vx / phi, ky = vy / phi, s = Math.sin(phi), c = Math.cos(phi), t = 1 - c;
    const q00 = t * kx * kx + c, q01 = t * kx * ky, q02 = s * ky;
    const q10 = q01, q11 = t * ky * ky + c, q12 = -s * kx;
    const q20 = -s * ky, q21 = s * kx, q22 = c;
    let a = r00, b = r01, d = r02;
    r00 = a * q00 + b * q10 + d * q20; r01 = a * q01 + b * q11 + d * q21; r02 = a * q02 + b * q12 + d * q22;
    a = r10; b = r11; d = r12;
    r10 = a * q00 + b * q10 + d * q20; r11 = a * q01 + b * q11 + d * q21; r12 = a * q02 + b * q12 + d * q22;
    a = r20; b = r21; d = r22;
    r20 = a * q00 + b * q10 + d * q20; r21 = a * q01 + b * q11 + d * q21; r22 = a * q02 + b * q12 + d * q22;
  };
  const ds = Lc / N_STEPS;
  // θ(s) is linear along the overlap, so cos θ / sin θ advance by a fixed
  // rotation per step rather than two fresh trig calls.
  const dth = (thetaTip - alpha) / N_STEPS, cd = Math.cos(dth), sd = Math.sin(dth);
  let ct = Math.cos(alpha), st = Math.sin(alpha);
  for (let i = 0; i < N_STEPS; i++) {
    step(w1 * k1 + w2 * k2 * ct, wy * k2 * st, ds);
    const c2 = ct * cd - st * sd; st = st * cd + ct * sd; ct = c2;
  }
  if (Lext > 1e-6) {
    // The extension has CONSTANT curvature, so its M identical steps
    // R_i = R0·Q^i can be summed in closed form instead of marched:
    // Q turns about k = (kx, ky, 0) by φ, so Q^i·e3 = e3·cos iφ + (k×e3)·sin iφ
    // and Σ_{i<M} is a pair of trigonometric geometric series. Same numbers
    // as the march in integrateShape, to rounding.
    const M = Math.max(4, Math.min(120, Math.round(N_STEPS * (Lext / Math.max(Lc, 1e-4)))));
    const de = Lext / M;
    const Kx = k2 * Math.cos(thetaTip), Ky = k2 * Math.sin(thetaTip);
    const phi = Math.hypot(Kx, Ky) * de;
    let sx, sy, sz;                       // Σ Q^i·e3, in the frame at the sheath's end
    if (phi < 1e-9) { sx = 0; sy = 0; sz = M; }
    else {
      const h = Math.sin(phi / 2), A = Math.sin((M * phi) / 2) / h;
      const C = A * Math.cos(((M - 1) * phi) / 2), S = A * Math.sin(((M - 1) * phi) / 2);
      const kx = (Kx * de) / phi, ky = (Ky * de) / phi;
      sx = ky * S; sy = -kx * S; sz = C;   // k×e3 = (ky, −kx, 0)
    }
    px += (r00 * sx + r01 * sy + r02 * sz) * de;
    py += (r10 * sx + r11 * sy + r12 * sz) * de;
    pz += (r20 * sx + r21 * sy + r22 * sz) * de;
  }
  out[0] = px * M2MM; out[1] = py * M2MM; out[2] = pz * M2MM;
  // Optional roll vector (unit): the fin's material direction at the tip,
  // R_end·(cos θ, sin θ, 0). The extension turns the frame about exactly
  // that direction, so it is unchanged along it (same as tipRoll's).
  if (out.length >= 6) {
    const c = Math.cos(thetaTip), sn = Math.sin(thetaTip);
    out[3] = r00 * c + r01 * sn; out[4] = r10 * c + r11 * sn; out[5] = r20 * c + r21 * sn;
  }
  return out;
}

/* ── Snap propulsion efficiency ───────────────────────────────────────────
   A snap is not a straight shove: during the release the tip sweeps an ARC,
   and parts of that arc can swing sideways or back against the rest. The
   efficiency asks how much of the snap's energy ends up pushing along the
   net direction.

   The stroke is cut into short pieces. Each piece k moves the tip along a
   floor direction d̂_k and gives up an amount of elastic energy ΔE_k (the
   drop in V over that piece, at the motor angle the snap happened at): that
   energy is what the piece has to push water with, so it is the natural
   weight -- a piece that sweeps a long way while releasing almost nothing
   pushes almost nothing.

     net direction   n̂ ∝ Σ ΔE_k·d̂_k          (over every snap recorded)
     forward         F = Σ ΔE_k·max( d̂_k·n̂, 0)
     backward        B = Σ ΔE_k·max(−d̂_k·n̂, 0)
     total           E = Σ ΔE_k
     efficiency      η = (F − B) / E

   The denominator is the WHOLE snap, not just its parallel part: energy
   spent swinging sideways is energy that did not go forward, so it counts
   against η. A snap that runs in a straight line along n̂ scores 100%; one
   that is 60% forward and 40% straight back scores 20%, the backward push
   cancelling an equal forward one; a snap that swings far out sideways and
   back while creeping forward scores low even though almost none of it is
   backward. (An earlier version divided by F + B, the parallel part only,
   and so called a sideways swing with a small forward drift ~98%.) What is
   not forward is split for display as back = B/E and sideways = 1 − (F+B)/E.

   The path is the quasi-static one: at fixed α, θ runs from where the snap
   left to where it lands, and the tip shape is a pure function of (α, θ). */

/** Where a snap starts and lands, for a forward sweep of α. null below the
 *  fold, where there is no snap. */
function foldSnap(lambda, mu = 0) {
  if (!(lamEff(lambda, mu) > LAMBDA_CRIT)) return null;
  let thetaPeak;
  if (mu === 0) thetaPeak = Math.acos(-1 / lambda);      // fold: V″ = 0
  else {
    // No closed form with the planar term: follow the branch up from θ = 0
    // to the first θ where V″ reaches zero.
    let t = 0;
    while (t < 2 * Math.PI && stiffness(t, lambda, mu) > 0) t += 0.002;
    if (t >= 2 * Math.PI) return null;
    let lo = t - 0.002, hi = t;
    for (let k = 0; k < 50; k++) {
      const m = (lo + hi) / 2;
      if (stiffness(m, lambda, mu) > 0) lo = m; else hi = m;
    }
    thetaPeak = (lo + hi) / 2;
  }
  const alphaSnap = thetaPeak + lambda * Math.sin(thetaPeak) + mu * Math.sin(thetaPeak) * Math.cos(thetaPeak);
  const g = (t) => t - alphaSnap + lambda * Math.sin(t) + mu * Math.sin(t) * Math.cos(t);
  for (let t = thetaPeak + 0.02; t < thetaPeak + 6 * Math.PI; t += 0.02) {
    if (g(t) > 0 && stiffness(t, lambda, mu) > 0) {
      let lo = t - 0.02, hi = t;
      for (let k = 0; k < 40; k++) {
        const m = (lo + hi) / 2;
        if (g(m) > 0) hi = m; else lo = m;
      }
      return { thetaPeak, alphaSnap, thetaStable: (lo + hi) / 2 };
    }
  }
  return null;
}

/** The minimum θ settles into from θ0 at fixed α: descent of V, Newton where
 *  V is convex (fast and stable at any λ), a plain gradient step elsewhere,
 *  each step capped so it cannot hop a basin. */
function settle(th0, a, lambda, mu = 0) {
  let th = th0;
  for (let i = 0; i < 20000; i++) {
    const g = gradient(th, a, lambda, mu), k = stiffness(th, lambda, mu);
    if (Math.abs(g) < 1e-10 && k > 0) break;
    th += Math.max(-0.05, Math.min(0.05, k > 0.5 ? -g / k : -0.5 * g));
  }
  return th;
}

/** Sample a snap's floor path θ0 → θ1. `at(θ)` returns [u, v, V]: floor
 *  coordinates and potential. Uniform in θ is not enough -- at large λ the
 *  tip runs tight little hooks that a coarse polyline cuts straight across,
 *  hiding exactly the backward motion being measured -- so each of 10 base
 *  pieces is bisected wherever its midpoint strays from its chord. Within
 *  ~0.01 of a dense reference over the whole design sweep (worst cell 0.014). */
function snapStroke(at, th0, th1) {
  const out = [at(th0)];
  const rec = (ta, pa, tb, pb, depth) => {
    const tm = (ta + tb) / 2, pm = at(tm);
    const dev = Math.hypot(pm[0] - (pa[0] + pb[0]) / 2, pm[1] - (pa[1] + pb[1]) / 2);
    const chord = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    if (depth < 6 && dev > 0.12 * chord + 1e-7) {
      rec(ta, pa, tm, pm, depth + 1); rec(tm, pm, tb, pb, depth + 1);
    } else out.push(pm, pb);
  };
  const BASE = 10;
  let ta = th0, pa = out[0];
  for (let k = 1; k <= BASE; k++) {
    const tb = th0 + ((th1 - th0) * k) / BASE, pb = at(tb);
    rec(ta, pa, tb, pb, 0);
    ta = tb; pa = pb;
  }
  return out;
}

/** Pieces of a stroke as {u, v, e}: unit floor direction and energy given up. */
function strokePieces(pts) {
  const out = [];
  for (let k = 0; k + 1 < pts.length; k++) {
    const du = pts[k + 1][0] - pts[k][0], dv = pts[k + 1][1] - pts[k][1];
    const L = Math.hypot(du, dv);
    const e = pts[k][2] - pts[k + 1][2];
    // Energy climbed back (e < 0) is not a push; a piece that barely moves
    // has no direction to speak of.
    if (L > 1e-9 && e > 0) out.push({ u: du / L, v: dv / L, e });
  }
  return out;
}

/** Σ e·d̂ of a set of pieces: the stroke's push, as a floor vector. */
function strokeVector(pieces) {
  let u = 0, v = 0;
  for (const p of pieces) { u += p.e * p.u; v += p.e * p.v; }
  return [u, v];
}

/** η = (F − B)/E of `pieces` along the unit direction (nu, nv). */
function forwardShare(pieces, nu, nv) {
  let F = 0, B = 0, E = 0;
  for (const p of pieces) {
    const c = p.u * nu + p.v * nv;
    if (c > 0) F += p.e * c; else B -= p.e * c;
    E += p.e;
  }
  return { F, B, E, eta: E > 0 ? (F - B) / E : 0 };
}

/** Efficiency of one design's snap, straight from the model. Floor frame is
 *  the robot's local (x, y): η is invariant to how the floor is rotated. */
function snapEfficiency(lambda, k1, k2, Lc, Lext, mech, fold = foldSnap(lambda, muOf(mech, Lc, k2))) {
  if (!fold) return null;
  const { thetaPeak, alphaSnap, thetaStable } = fold;
  const mu = muOf(mech, Lc, k2);
  const tmp = [0, 0, 0];
  const pts = snapStroke((th) => {
    tipPoint(alphaSnap, th, k1, k2, Lc, Lext, mech.w1, mech.w2, tmp, mech.wy);
    return [tmp[0], tmp[1], energy(th, alphaSnap, lambda, mu)];
  }, thetaPeak, thetaStable);
  const pieces = strokePieces(pts);
  const [u, v] = strokeVector(pieces);
  const n = Math.hypot(u, v);
  if (n < 1e-12) return { eta: 0, F: 0, B: 0, E: 0 };
  return forwardShare(pieces, u / n, v / n);
}

/* ═══════════════════════════════════════════════════════════════
   4 · DESIGN ENGINE — nitinol fin optimisation
   ═══════════════════════════════════════════════════════════════ */
/* Material constants: CTR_PHYSICS_RULES Part 0.5 / Part 8.
   TUBE IDENTITY: these are the THIN "turtle fin" capillary (d_o = 1.02 mm),
   NOT the 1.47/1.28 mm reference tube in the material-parameters file. The
   two are not interchangeable; only E and nu are shared between them.
   G is DERIVED from E and nu — never hardcoded (Part 7 DO-list). */
const NITINOL = (() => {
  const E = 50e9, nu = 0.33;
  const G = E / (2 * (1 + nu));
  const d_o = 1.02e-3, wall = 0.10e-3, d_i = d_o - 2 * wall;
  const I = (Math.PI / 64) * (d_o ** 4 - d_i ** 4), J = 2 * I;   // J = 2I exact
  return { E, nu, G, d_o, d_i, I, J, kb: E * I, kt: G * J, r: d_o / 2 };
})();
// Material only (E, nu, G) is shared between the tubes; each tube's section
// and stiffness come from pairMechanics() below. The d_o / kb / kt kept here
// describe the app's original 1.02 mm tube, i.e. DEFAULT_TUBES.
const EPS_SUPERELASTIC = 0.08;   // MONOTONIC limit — never a cyclic safety gate
/** Coffin-Manson inverted for a target cycle count (Part 6). This, not the
 *  8% monotonic limit, is the fatigue-relevant allowable strain. */
const epsAllowFor = (N) => Math.pow(10 / N, 1 / 5);
const LAMBDA_CRIT = Math.PI ** 2 / 4;      // 2.467, beta_sigma = 0 only

/* The live animation's twist solver, shared with the Logs tab and the
   optimiser's rowing objective so they run the SAME discrete dynamics the
   3-D view shows. Heavy-ball descent on V: v ← MOM·v − LR·∂V/∂θ, then
   |v| ≤ VMAX, SUB substeps per frame, α held fixed within a frame and
   advanced by SWEEP_RATE·dt; dt is clamped to DT_MAX. */
const SOLVER = { LR: 0.02, MOM: 0.85, SUB: 6, VMAX: 0.25, SWEEP_RATE: 1.1, DT_MAX: 0.05 };

/** Small seeded PRNG for the frame-time jitter (reproducible runs). */
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Snap onsets. A frame is FAST when θ moves faster than SNAP_THRESHOLD
   (rad/s, the same test that colours the live track). A snap's ringing can
   dip below the threshold and come back, so one snap is many fast frames;
   an ONSET is a fast frame that (1) follows at least SNAP_GAP_S of slow
   motion and (2) comes at least π of motor turn after the previous onset.
   Snaps repeat every 2π of α, so (2) can never merge two real snaps, while
   either rule alone stops ringing being counted as a second snap. */
const SNAP_GAP_S = 0.3;
function makeSnapDetector() {
  let lastFastT = -Infinity, lastOnsetA = -Infinity;
  const det = (rate, t, a) => {
    if (!(rate > SNAP_THRESHOLD)) return false;
    const quiet = t - lastFastT > SNAP_GAP_S;
    lastFastT = t;
    if (quiet && a - lastOnsetA < Math.PI) det.blocked++;   // diagnostic only
    if (!quiet || a - lastOnsetA < Math.PI) return false;
    lastOnsetA = a;
    return true;
  };
  det.blocked = 0;
  return det;
}

/** Runs the solver from rest, frame by frame, until `cycles` complete
 *  snap-to-snap cycles have been seen (cycles + 1 onsets), or until α passes
 *  a bound where a snap is overdue. Frame k holds (T, A, TH) after the
 *  frame; onsets[i] is the index of the first fast frame of snap i, so a
 *  cycle runs from frame onsets[i] − 1 (the last state before the snap) to
 *  frame onsets[i+1] − 1. The warm-up up to the first snap is discarded by
 *  the callers simply by starting at onsets[0] − 1. */
function sweepFrames({ lambda, mu, cycles, fps = 60, jitter = 0, seed = 1 }) {
  const { LR, MOM, SUB, VMAX, SWEEP_RATE, DT_MAX } = SOLVER;
  const fold = foldSnap(lambda, mu);
  const T = [0], A = [0], TH = [0], onsets = [];
  if (!fold) return { T, A, TH, onsets, blocked: 0 };
  const aMax = fold.alphaSnap + 2 * Math.PI * (cycles + 3);
  const rnd = mulberry32(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const det = makeSnapDetector();
  let t = 0, a = 0, th = 0, v = 0;
  while (onsets.length < cycles + 1 && a < aMax) {
    const dt = jitter > 0
      ? Math.min(DT_MAX, Math.max(0.2 / fps, (1 / fps) * (1 + jitter * gauss())))
      : Math.min(DT_MAX, 1 / fps);
    t += dt; a += dt * SWEEP_RATE;
    const th0 = th;
    for (let i = 0; i < SUB; i++) {
      v = Math.max(-VMAX, Math.min(VMAX, MOM * v - LR * gradient(th, a, lambda, mu)));
      th += v;
    }
    T.push(t); A.push(a); TH.push(th);
    if (det(Math.abs(th - th0) / dt, t, a)) onsets.push(T.length - 1);
  }
  return { T, A, TH, onsets, blocked: det.blocked };
}

/** Rowing integral of one snap-to-snap cycle, averaged over `cycles`:
 *    J = ∮ (r̂ · v)² dx_fwd = Σ (r̂·Δp/Δt)² · Δx_fwd
 *  r̂ = unit roll vector at the tip, v = tip velocity, x_fwd = the tip's
 *  forward (robot-local +x) coordinate; SI units, m³/s². Inspired by drag,
 *  F_D = ½ρC_D A v²: (r̂·v)² is the blade-normal speed squared, so
 *  ½ρC_D A·J is the drag work along FORWARD per cycle, in joules. ρ, C_D
 *  and A are left out: they do not depend on κ or L_c, so they do not
 *  change the ranking. Squared, so the blade is symmetric (r̂ and −r̂ score
 *  the same). Measured from the first snap on (the wind-up from rest is
 *  discarded) with each cycle ending at the next snap. Frame times are
 *  drawn around 1/ROW_FPS with relative sd `jitter`, as in the Logs tab. */
const ROW_FPS = 60;
function rowingIntegral(lambda, mu, k1, k2, Lc, Lext, mech, cycles = 1, jitter = 0, seed = 1) {
  const F = sweepFrames({ lambda, mu, cycles, fps: ROW_FPS, jitter, seed });
  const n = F.onsets.length - 1;
  if (n < 1) return { J: 0, Jabs: 0, sd: 0, cycles: 0 };
  const out = [0, 0, 0, 0, 0, 0];
  const per = new Float64Array(n);
  let Jabs = 0;
  for (let c = 0; c < n; c++) {
    const s0 = F.onsets[c] - 1, s1 = F.onsets[c + 1] - 1;
    let prev = null;
    for (let k = s0; k <= s1; k++) {
      tipPoint(F.A[k], F.TH[k], k1, k2, Lc, Lext, mech.w1, mech.w2, out, mech.wy);
      if (prev) {
        const dt = F.T[k] - F.T[k - 1];
        const dx = (out[0] - prev[0]) / M2MM, dy = (out[1] - prev[1]) / M2MM, dz = (out[2] - prev[2]) / M2MM;
        const f = (prev[3] * dx + prev[4] * dy + prev[5] * dz) / dt;     // r̂·v, m/s
        per[c] += f * f * dx; Jabs += Math.abs(f * f * dx);
      }
      prev = out.slice();
    }
  }
  let m = 0, m2 = 0;
  for (const x of per) { m += x / n; m2 += (x * x) / n; }
  return { J: m, Jabs: Jabs / n, sd: Math.sqrt(Math.max(0, m2 - m * m)), cycles: n };
}

/** The fin's roll at the tip: its material (κ₂) direction, θ from the
 *  sheath frame carried along the free extension. Angle about the tip axis
 *  from FORWARD (robot-local +x) projected normal to that axis, right-handed
 *  about the tangent; null when the tip points along FORWARD. Robot-local
 *  axes are (x, y, z) = (forward, up, outward). */
function tipRoll(Rtip, th) {
  const c = Math.cos(th), sn = Math.sin(th);
  const t = [Rtip[0][2], Rtip[1][2], Rtip[2][2]];
  const d = [0, 1, 2].map((i) => Rtip[i][0] * c + Rtip[i][1] * sn);
  const dn = Math.hypot(d[0], d[1], d[2]); d[0] /= dn; d[1] /= dn; d[2] /= dn;
  const f = [1 - t[0] * t[0], -t[0] * t[1], -t[0] * t[2]];
  const fn = Math.hypot(f[0], f[1], f[2]);
  if (fn < 1e-6) return { dir: d, tan: t, deg: null };
  f[0] /= fn; f[1] /= fn; f[2] /= fn;
  const cr = [f[1] * d[2] - f[2] * d[1], f[2] * d[0] - f[0] * d[2], f[0] * d[1] - f[1] * d[0]];
  const deg = (Math.atan2(cr[0] * t[0] + cr[1] * t[1] + cr[2] * t[2], f[0] * d[0] + f[1] * d[1] + f[2] * d[2]) * 180) / Math.PI;
  return { dir: d, tan: t, deg };
}

/** Actuator work per revolution: ∮|τ dα|, τ = −λ sin θ, dα = (1+λcos θ)dθ.
 *  With the planar term, τ = −(λ sin θ + μ sin θ cos θ) and dα = V″ dθ. */
function motorWork(lambda, mu = 0) {
  let s = 0;
  const n = 200, h = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    const t = h * (i + 0.5);
    s += mu === 0
      ? Math.abs(lambda * Math.sin(t) * (1 + lambda * Math.cos(t))) * h
      : Math.abs((lambda * Math.sin(t) + mu * Math.sin(t) * Math.cos(t)) * stiffness(t, lambda, mu)) * h;
  }
  return s;
}

/** Coffin-Manson strain-life power law. The FORM is standard; the constants
 *  (10, −5) are ILLUSTRATIVE placeholders, not fitted to Nitinol test data —
 *  absolute counts here are optimistic by orders of magnitude. Use only for
 *  RELATIVE ranking across the sweep (Part 6 / Part 7). */
const fatigueLife = (e) => (e > 0 ? 10 * Math.pow(e, -5) : Infinity);

/* ── Two-tube mechanics, general form ─────────────────────────────────────
   Tube 1 = OUTER / constraint tube (κ₁), tube 2 = INNER fin (κ₂), matching
   the rest of the app. Each tube now has its own cross-section, so the
   equal-stiffness shortcut λ = (k_b/k_t)·L²·κ₁κ₂ no longer holds and the
   GENERAL formula of CTR_PHYSICS_RULES Part 2 is used:

       λ = L_c²·κ₁κ₂ · [k1b·k2b / (k1b + k2b)] · [1/k1t + 1/k2t]

   The last bracket is the torsional COMPLIANCE of the relative twist θ: the
   two tubes carry it in series, like two springs end to end.

   "Fully constrained" outer tube = a RIGID outer tube: it can neither twist
   nor bend, i.e. the limit k1b, k1t -> infinity. Both brackets change:
     · k1b·k2b/(k1b+k2b) -> k2b   the fin can no longer bend the sheath, so
                                  it takes the whole curvature mismatch
     · 1/k1t + 1/k2t      -> 1/k2t only the fin stores twist

       λ_rigid = L_c²·κ₁κ₂ · k2b / k2t = (1+ν)·L_c²·κ₁κ₂  (any Nitinol fin)

   For two tubes of the same material this equals the free λ EXACTLY: the
   stiffer coupling and the smaller compliance cancel. Rigidity therefore
   does not decide whether the fin snaps -- it changes what the snap looks
   like (the overlap holds the sheath's arc; only the free fin moves) and how
   much energy each snap carries. (Locking torsion ALONE, with the sheath
   still free to bend, would halve λ -- that is a different device.)

   Energy scale. The rules give E_J = ΔV·(k_t/L_c) with the SHARED k_t of the
   equal-stiffness case. Its general form here is 2·k_eff/L_c, where
   k_eff = 1/(compliance) is the stiffness of the relative twist; it reduces
   exactly to the rules' k_t/L_c for two identical free tubes, so no existing
   number moves. See the note in the handoff: a direct derivation of the
   lumped energy gives k_eff/L_c, i.e. the rules' convention may carry a
   factor of 2 -- kept as-is here, because the rules file is authoritative and
   the factor is uniform, so every comparison between designs and modes is
   unaffected. */
function tubeSection(odMm, idMm) {
  const d_o = odMm / 1000, d_i = idMm / 1000;
  const I = (Math.PI / 64) * (d_o ** 4 - d_i ** 4), J = 2 * I;     // J = 2I exact
  return { d_o, d_i, r: d_o / 2, I, J, kb: NITINOL.E * I, kt: NITINOL.G * J };
}
/* PLANAR outer tube: a guide holds the sheath's centreline in its own
   precurvature plane. It can still bend in that plane and twist about its
   axis (the guide is taken as frictionless and torsion-free), so λ, the
   torsional compliance and the energy scale are the clamped ones. What the
   guide removes is out-of-plane curvature of the overlap: K_y = 0. The fin's
   out-of-plane precurvature component κ₂ sin θ is then held flat by the
   guide instead of being shared with the sheath, which costs bending energy

       ½·k2b·κ₂²·sin²θ − ½·k_red·κ₂²·sin²θ = ½·[k2b²/(k1b+k2b)]·κ₂²·sin²θ

   per unit length relative to the free pair (Gilbert et al. Eq. (2)
   energy, minimised over the in-plane curvature). Scaled like λ, this adds
   ½μ sin²θ to V with μ = L_c²·κ₂²·[k2b²/(k1b+k2b)]·(1/k1t + 1/k2t), which
   for identical tubes is (1+ν)·L_c²·κ₂², the same size as λ. It pulls the
   fin toward the plane (θ = 0 or π) and moves where the fold sits. */
function pairMechanics(tubes, outerLocked, outerPlanar = false) {
  const t1 = tubeSection(tubes.outer.od, tubes.outer.id);
  const t2 = tubeSection(tubes.inner.od, tubes.inner.id);
  const kbRed = (t1.kb * t2.kb) / (t1.kb + t2.kb);
  const complFree = 1 / t1.kt + 1 / t2.kt;
  const complLocked = 1 / t2.kt;
  const compl = outerLocked ? complLocked : complFree;
  const Cfree = kbRed * complFree, Clocked = t2.kb * complLocked;
  return {
    t1, t2, outerLocked,
    C: outerLocked ? Clocked : Cfree,     // λ = C·L_c²·κ₁κ₂
    Cfree, Clocked,
    // Part 5 weights: curvature of the overlap is the bending-stiffness
    // weighted sum of the two precurvature vectors (1/2, 1/2 only if equal).
    // A rigid sheath has infinite weight: w1 = 1, w2 = 0, so the overlap is
    // exactly the sheath's own arc and does not move with θ.
    w1: outerLocked ? 1 : t1.kb / (t1.kb + t2.kb),
    w2: outerLocked ? 0 : t2.kb / (t1.kb + t2.kb),
    kScale: 2 / compl,                    // N·m²; E_J = ΔV·kScale/L_c (see above)
    // Planar mode (ignored when rigid): no out-of-plane overlap curvature,
    // and μ = Cmu·L_c²·κ₂² in V. wy = w2 in the other two modes.
    planar: outerPlanar && !outerLocked,
    wy: outerPlanar && !outerLocked ? 0 : (outerLocked ? 0 : t2.kb / (t1.kb + t2.kb)),
    Cmu: outerPlanar && !outerLocked ? complFree * (t2.kb * t2.kb) / (t1.kb + t2.kb) : 0,
    CmuPlanar: complFree * (t2.kb * t2.kb) / (t1.kb + t2.kb),
    rMax: Math.max(t1.r, t2.r),
    clearance: tubes.outer.id - tubes.inner.od,   // mm; must be > 0 to nest
  };
}
/** The pair the app shipped with: two identical 1.02 / 0.82 mm tubes, free. */
const DEFAULT_TUBES = { outer: { od: 1.02, id: 0.82 }, inner: { od: 1.02, id: 0.82 } };

/** λ for the current pair. It is a PRODUCT of the two precurvatures, so a
 *  straight tube anywhere in the pair (κ = 0) drives λ to zero and the system
 *  cannot snap: with nothing to twist against there is no competing curvature
 *  to store energy. The design sweep varies a single κ, i.e. this expression
 *  on the diagonal κ₁ = κ₂ = κ (Part 2 rule: stated explicitly). */
/** Torsional efficiency of one snap: the share of the released energy that
 *  comes out of the twist ½(θ−α)², i.e. what a torsional-spring reservoir
 *  (the fin twisting a separate output shaft) can deliver. The rest is the
 *  bending coupling (and, planar, the guide term). Fold at fixed α_snap. */
function torsionEfficiency(lambda, mu, fold = foldSnap(lambda, mu)) {
  if (!fold) return null;
  const { thetaPeak: p, thetaStable: q, alphaSnap: a } = fold;
  const E = energy(p, a, lambda, mu) - energy(q, a, lambda, mu);
  const T = 0.5 * (p - a) ** 2 - 0.5 * (q - a) ** 2;
  return E > 0 ? { eta: Math.max(0, Math.min(1, T / E)), T, E, B: E - T } : null;
}

const bifurcation = (k1, k2, Lc, mech) => mech.C * Lc * Lc * k1 * k2;

function evaluateDesign(kappa, Lc, strainLimit, etaK = 0.05, mech, Lext = 0, objective = 'translation', rowPre = null) {
  const lambda = mech.C * Lc * Lc * kappa * kappa;     // κ₁ = κ₂ = κ (sweep diagonal)
  // Bending strain per tube, ε = κ·d_o/2 on each tube's OWN diameter (Part 6:
  // never mix diameters); the larger governs.
  const eb = kappa * (mech.outerLocked ? mech.t2.r : mech.rMax);
  const base = {
    kappa, Lc, lambda, eb, gamma: 0, eeq: eb, dE: 0, dE_J: 0, Win: 0, eta: 0,
    etaP: 0, etaT: 0, etaO: 0, prod_J: 0, rowJ: 0, rowAbs: 0, rowSd: 0,
    score: 0, thetaPeak: 0, thetaStable: 0, stored_J: 0, N: fatigueLife(eb), regime: 'stable',
  };
  const mu = muOf(mech, Lc, kappa);                    // 0 unless planar
  base.mu = mu; base.lamEff = lamEff(lambda, mu);
  const fold = foldSnap(lambda, mu);
  if (!fold) return base;
  const { thetaPeak, alphaSnap, thetaStable } = fold;

  const dE = energy(thetaPeak, alphaSnap, lambda, mu) - energy(thetaStable, alphaSnap, lambda, mu);
  const scale = mech.kScale / Lc;
  // Snap propulsion efficiency: the share of the snap's arc that pushes along
  // its own net direction. It depends on the tip's path, so on L_ext too.
  const etaP = Math.max(0, snapEfficiency(lambda, kappa, kappa, Lc, Lext, mech, fold)?.eta ?? 0);
  // Torsional efficiency: share of ΔE released as twist (torsional-spring
  // reservoir driving a separate propulsor). The objective picks which one
  // the score and the surface height use.
  const etaT = torsionEfficiency(lambda, mu, fold)?.eta ?? 0;
  const etaO = objective === 'torsion' ? etaT : etaP;
  // Rowing objective: the stroke integral. The optimiser precomputes it
  // (averaged over many revolutions, asynchronously) and passes it in;
  // without that, one unjittered revolution.
  const row = objective === 'rowing'
    ? (rowPre ?? rowingIntegral(lambda, mu, kappa, kappa, Lc, Lext, mech)) : null;
  // Torsional strain per tube (Part 6 engineering estimate): the snap's angle
  // jump spread over L_c, times that tube's own radius. As in the rules, a
  // free tube is charged the FULL jump (a conservative bound -- in series
  // the two share it). A locked outer tube cannot twist at all, so it carries
  // none and the inner tube carries all of it.
  const dth = Math.abs(thetaStable - thetaPeak) / Lc;
  const g1 = mech.outerLocked ? 0 : dth * mech.t1.r;
  const g2 = dth * mech.t2.r;
  // Approximate combined-strain metric (Part 6). The 0.33 is a deliberate
  // stand-in for nu, NOT 1/3, and this is NOT the literature von Mises strain.
  // A rigid sheath does not deform in service, so it is not a fatigue site.
  const e1 = mech.outerLocked ? 0 : Math.hypot(kappa * mech.t1.r, Math.sqrt(0.33) * g1);
  const e2 = Math.hypot(kappa * mech.t2.r, Math.sqrt(0.33) * g2);
  const eeq = Math.max(e1, e2);
  const gamma = Math.max(g1, g2);
  const Win = motorWork(lambda, mu);
  // ENGINEERING PLACEHOLDER (Part 6). etaK has no physical derivation and is
  // NOT from the burst-and-coast swimming paper, which supplies qualitative
  // motivation only — which is exactly why it is exposed as a control rather
  // than buried as a literal. It carries units of 1/ΔE, so its numeric value
  // is only meaningful against the dimensionless ΔE.
  // Productive energy: only the share of the snap that pushes forward
  // counts, in both the saturation term and the energy-per-work ratio.
  const dEp = etaO * dE;
  const eta = 1 - Math.exp(-etaK * dEp);
  const gate = Math.exp(-Math.pow(eeq / strainLimit, 4));
  return {
    kappa, Lc, lambda, mu, lamEff: base.lamEff, eb, gamma, eeq, dE, dE_J: dE * scale, Win, eta, gate,
    etaP, etaT, etaO,
    // Surface height: productive snap energy in J, or for the rowing
    // objective J_row/1000 so the plot's ×1000 shows J_row in m³/s².
    prod_J: row ? row.J / 1000 : dE * scale * etaO,
    rowJ: row ? row.J : 0, rowAbs: row ? row.Jabs : 0, rowSd: row?.sd ?? 0,
    // Symmetric blade, so the stroke's direction along forward is a
    // convention too: score the magnitude.
    score: row ? Math.abs(row.J) * gate : Win > 1e-9 ? eta * (dEp / Win) * gate : 0,
    thetaPeak, thetaStable, alphaSnap,
    stored_J: 0.5 * (thetaPeak - alphaSnap) ** 2 * scale,
    N: fatigueLife(eeq),
    regime: eeq > strainLimit ? 'failure' : 'snapping',
  };
}

function buildGrid({ nx, ny, kappaMin = 0, kappaMax, LcMin, LcMax, strainLimit, etaK, mech, Lext, objective, rowData = null }) {
  const cells = [];
  let best = null, maxDE = 0, maxMJ = 0, maxProd = 0, maxScore = 0;
  for (let j = 0; j < ny; j++) {
    const Lc = LcMin + ((LcMax - LcMin) * j) / (ny - 1);
    for (let i = 0; i < nx; i++) {
      const d = evaluateDesign(kappaMin + ((kappaMax - kappaMin) * i) / (nx - 1), Lc, strainLimit, etaK, mech, Lext, objective,
        rowData ? { J: rowData[3 * (j * nx + i)], Jabs: rowData[3 * (j * nx + i) + 1], sd: rowData[3 * (j * nx + i) + 2] } : null);
      cells.push(d);
      if (d.dE > maxDE) maxDE = d.dE;
      if (d.dE_J > maxMJ) maxMJ = d.dE_J;
      if (d.prod_J > maxProd) maxProd = d.prod_J;
      if (d.score > maxScore) { maxScore = d.score; best = d; }
    }
  }
  // maxMJ / maxProd are in JOULES here; the surface converts to mJ at use.
  return { cells, nx, ny, kappaMin, kappaMax, LcMin, LcMax, maxDE, maxMJ, maxProd, maxScore, best };
}


export {
  energy, gradient, stiffness, lamEff, muOf, N_STEPS, eye3, matmul3, rodrigues, integrateShape, tipPoint, foldSnap, settle, snapStroke, strokePieces, strokeVector, forwardShare, snapEfficiency, NITINOL, EPS_SUPERELASTIC, epsAllowFor, LAMBDA_CRIT, SOLVER, mulberry32, SNAP_GAP_S, makeSnapDetector, sweepFrames, ROW_FPS, rowingIntegral, tipRoll, motorWork, fatigueLife, tubeSection, pairMechanics, DEFAULT_TUBES, torsionEfficiency, bifurcation, evaluateDesign, buildGrid, M2MM, SNAP_THRESHOLD,
};
