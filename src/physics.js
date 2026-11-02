/* ═══════════════════════════════════════════════════════════════════════
   PHYSICS · time-domain dynamics of the snapping fin
   ═══════════════════════════════════════════════════════════════════════
   Time scales decide the reduction. For the Nitinol tubes here:
     torsion  — wave speed √(G/ρ) ≈ 1.7 km/s; first torsional mode of a
                0.15 m overlap ~10⁴ rad/s; spin inertia ρJ is tiny.
     bending  — first cantilever mode of the fin in water ~10² rad/s.
   So TWIST IS QUASI-STATIC and BENDING CARRIES THE INERTIA. (A first
   version slaved the shape to the twist instead; its own check showed the
   bending mode five times slower than the motion it assumed instant, so it
   was replaced by this one.)

   Generalized coordinates  q = centreline (Bishop) curvature at nodes,
     piecewise-linear in s, separately on the overlap and the extension
     (the equilibrium curvature jumps where the sheath ends). Positions
     follow from the Bishop-frame march of CTR_PHYSICS_RULES Part 5.
   Adiabatic coordinate  θ = relative twist at the overlap's end, at every
     instant the local minimum of U over θ, Newton-continued from its
     previous value (Rules Part 4: seeded from the previous state, so the
     hysteresis survives). Massless: spin inertia of the tubes is neglected.
   Input  α(t) = Ω t, the motor (stiff, prescribed).

   Potential (true strain energy, with the ½ of the Kirchhoff rod energy):
     U = K·V(θ, α) + ½ Σ_seg k_B ds |u − u_eq(s; θ, α)|²
       K   = k_eff / L_c, k_eff = 1/(1/k1t + 1/k2t) (k2t with a rigid
             sheath). The app's display scale is mech.kScale = 2·k_eff,
             inherited from Gilbert et al. (2016) Eq. (2), which omits the
             ½; equilibria do not care, dynamics do. Halved HERE only.
       u_eq = (k1b κ₁ e₁ + k2b κ₂ e(θ(s)))/(k1b + k2b) on the overlap,
             κ₂ e(θ) on the extension: the project's Part 5 curvature.
       k_B = k1b + k2b on the overlap, k2b on the extension.
     Σ_i ½k_ib|u − κ_i e_i|² = ½(Σk_ib)|u − ū|² + (terms in θ only), with ū
     the stiffness-weighted mean — completing the square — so this is the
     Kirchhoff bending energy split into the part the reduced model already
     holds (in V) and the part that measures how far the shape is from its
     equilibrium. At rest u = u_eq and U = K·V: the statics, the fold and
     λ_crit are the app's, exactly.
   Kinetic energy:
     T = ½ Σ_seg ( m |v|² + m_a |P_n v|² ),  P_n = I − t tᵀ
       m   : Nitinol walls (ρ = 6450 kg/m³) + fluid inside the tubes
       m_a : added mass of a circular cylinder, C_a ρ_f π D²/4 per length,
             on the normal velocity only (potential flow; Brennen 1982)
   Forces:
     drag    f = −½ ρ_f C_D(Re) D ds |v_n| v_n per segment, normal
             component only (independence principle; Morison et al. 1950),
             C_D = 1 + 10 Re^(−2/3) (White's circular-cylinder fit)
     loss    Kelvin–Voigt on the bending strain rate, β = η / ω₁
             (η = material loss factor, ω₁ = first mode at rest)
   Equations of motion (Lagrange):
     M(q) q̈ = Q_e + Q_d + Q_m − Σ_seg [ Jᵀ M_s c + Jᵀ Ṁ_s v − ½ vᵀ ∂_q M_s v ]
     J = ∂p/∂q is exact for the march (SO(3) right Jacobian), c = second
     directional derivative of p along q̇ (central difference). Written
     this way T + U is conserved exactly with drag, loss and motor off,
     which the validation suite checks, as it does the motor's work.
   Integration: Dormand–Prince RK5(4), error-controlled (Dormand & Prince
   1980), quintic Hermite output. Cycles start 20° of motor turn before the
   reduced model's fold, α_snap − 20° + 2πn: well after the last snap's
   ringing, just before the next snap, so every cycle holds exactly one.
   ═══════════════════════════════════════════════════════════════════════ */
import { gradient, energy, stiffness, foldSnap, bifurcation, muOf } from './model.js';

export const RHO_NITINOL = 6450;          // kg/m³, ASTM F2063 typical
export const MEDIA = {
  water: { id: 'water', name: 'Water', rho: 998.2, mu: 1.002e-3 },   // 20 °C
  air: { id: 'air', name: 'Air', rho: 1.204, mu: 1.813e-5 },         // 20 °C, 1 atm
};
export const PHYS_DEFAULTS = { medium: 'water', rpm: 10.5, loss: 0.01, Ca: 1, cycles: 10,
  nodesOv: 6, nodesEx: 3, segOv: 30 };
export const CYCLE_LEAD = (20 * Math.PI) / 180;

/** White's circular-cylinder drag fit, below the drag crisis. */
export const cdCylinder = (Re) => 1 + 10 * Math.pow(Math.max(Re, 1e-12), -2 / 3);

/* ── small dense linear algebra ────────────────────────────────────────── */
function cholSolve(A, b, n) {
  // In-place Cholesky of SPD A (row-major n×n); solves A x = b.
  const L = A;
  for (let j = 0; j < n; j++) {
    let s = L[j * n + j];
    for (let k = 0; k < j; k++) s -= L[j * n + k] ** 2;
    if (!(s > 0)) throw new Error('mass matrix not positive definite');
    const d = Math.sqrt(s);
    L[j * n + j] = d;
    for (let i = j + 1; i < n; i++) {
      let t = L[i * n + j];
      for (let k = 0; k < j; k++) t -= L[i * n + k] * L[j * n + k];
      L[i * n + j] = t / d;
    }
  }
  const x = b.slice();
  for (let i = 0; i < n; i++) { let t = x[i]; for (let k = 0; k < i; k++) t -= L[i * n + k] * x[k]; x[i] = t / L[i * n + i]; }
  for (let i = n - 1; i >= 0; i--) { let t = x[i]; for (let k = i + 1; k < n; k++) t -= L[k * n + i] * x[k]; x[i] = t / L[i * n + i]; }
  return x;
}
/** Generalized symmetric eigenvalues of (Kq, Mq) by Jacobi on L⁻¹ K L⁻ᵀ. */
function genEig(Kq, Mq, n) {
  const L = Mq.slice();
  for (let j = 0; j < n; j++) {
    let s = L[j * n + j]; for (let k = 0; k < j; k++) s -= L[j * n + k] ** 2;
    const d = Math.sqrt(s); L[j * n + j] = d;
    for (let i = j + 1; i < n; i++) { let t = L[i * n + j]; for (let k = 0; k < j; k++) t -= L[i * n + k] * L[j * n + k]; L[i * n + j] = t / d; }
    for (let i = 0; i < j; i++) L[i * n + j] = 0;
  }
  const solveL = (b) => { const x = b.slice(); for (let i = 0; i < n; i++) { let t = x[i]; for (let k = 0; k < i; k++) t -= L[i * n + k] * x[k]; x[i] = t / L[i * n + i]; } return x; };
  // C = L⁻¹ K L⁻ᵀ
  const Y = new Array(n * n);
  for (let j = 0; j < n; j++) { const col = solveL(Array.from({ length: n }, (_, i) => Kq[i * n + j])); for (let i = 0; i < n; i++) Y[i * n + j] = col[i]; }
  const C = new Array(n * n);
  for (let i = 0; i < n; i++) { const row = solveL(Array.from({ length: n }, (_, j) => Y[i * n + j])); for (let j = 0; j < n; j++) C[i * n + j] = row[j]; }
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) { const s = 0.5 * (C[i * n + j] + C[j * n + i]); C[i * n + j] = s; C[j * n + i] = s; }
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += C[i * n + j] ** 2;
    if (off < 1e-24) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      const apq = C[p * n + q]; if (Math.abs(apq) < 1e-300) continue;
      const th = (C[q * n + q] - C[p * n + p]) / (2 * apq);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) {
        const akp = C[k * n + p], akq = C[k * n + q];
        C[k * n + p] = c * akp - s * akq; C[k * n + q] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = C[p * n + k], aqk = C[q * n + k];
        C[p * n + k] = c * apk - s * aqk; C[q * n + k] = s * apk + c * aqk;
      }
    }
  }
  return Array.from({ length: n }, (_, i) => C[i * n + i]).sort((a, b) => a - b);
}

/* ── The system ────────────────────────────────────────────────────────── */
export function makeSystem(design, phys) {
  const { k1, k2, Lc, Lext, mech, tubes } = design;
  const P = { ...PHYS_DEFAULTS, ...phys };
  const fluid = MEDIA[P.medium] ?? MEDIA.water;
  const lambda = bifurcation(k1, k2, Lc, mech), mu = muOf(mech, Lc, k2);
  const kEff = mech.kScale / 2, K = kEff / Lc;
  const Omega = (P.rpm * 2 * Math.PI) / 60;
  const rigid = !!mech.outerLocked, planar = !!mech.planar;
  const { w1, w2, wy } = mech;

  // Segments (marching steps).
  const N = P.segOv;
  const M = Lext > 1e-6 ? Math.max(3, Math.round(N * (Lext / Lc))) : 0;
  const S = N + M;
  const mmm = (x) => x / 1000;
  const ring = (od, id) => (Math.PI / 4) * (mmm(od) ** 2 - mmm(id) ** 2);
  const disk = (d) => (Math.PI / 4) * mmm(d) ** 2;
  const o = tubes.outer, inn = tubes.inner;
  const mOv = RHO_NITINOL * (ring(o.od, o.id) + ring(inn.od, inn.id))
    + fluid.rho * (disk(inn.id) + Math.max(0, disk(o.id) - disk(inn.od)));
  const mEx = RHO_NITINOL * ring(inn.od, inn.id) + fluid.rho * disk(inn.id);
  const seg = {
    h: new Float64Array(S), sig: new Float64Array(S), ov: new Uint8Array(S),
    m: new Float64Array(S), ma: new Float64Array(S), D: new Float64Array(S), kB: new Float64Array(S),
    nA: new Int32Array(S), nB: new Int32Array(S), wA: new Float64Array(S), wB: new Float64Array(S),
  };
  // Nodes: overlap 0..nO−1 on [0, Lc]; extension nO..nO+nE−1 on [Lc, Lc+Lext].
  const nO = Math.max(2, P.nodesOv), nE = M ? Math.max(2, P.nodesEx) : 0, nNodes = nO + nE;
  for (let j = 0; j < S; j++) {
    const ov = j < N;
    seg.ov[j] = ov ? 1 : 0;
    seg.h[j] = ov ? Lc / N : Lext / M;
    seg.sig[j] = ov ? j / N : 1;                     // overlap: s = j/N rule (integrateShape)
    seg.m[j] = (ov ? mOv : mEx) * seg.h[j];
    seg.ma[j] = P.Ca * fluid.rho * disk(ov ? o.od : inn.od) * seg.h[j];
    seg.D[j] = mmm(ov ? o.od : inn.od);
    seg.kB[j] = ov ? (rigid ? 0 : mech.t1.kb + mech.t2.kb) : mech.t2.kb;
    // Interpolation position: segment midpoint, within its own region.
    const x = ov ? ((j + 0.5) / N) * (nO - 1) : ((j - N + 0.5) / M) * (nE - 1);
    const base = ov ? 0 : nO, cnt = ov ? nO : nE;
    const a = Math.min(cnt - 2, Math.floor(x)), f = x - a;
    seg.nA[j] = base + a; seg.nB[j] = base + a + 1; seg.wA[j] = 1 - f; seg.wB[j] = f;
  }
  // Free DOFs: (node, component). Rigid sheath: overlap curvature fixed.
  // Planar: overlap out-of-plane curvature fixed at 0 (the guide).
  const dofNode = [], dofComp = [];
  for (let nd = 0; nd < nNodes; nd++) {
    const ov = nd < nO;
    if (ov && rigid) continue;
    dofNode.push(nd); dofComp.push(0);
    if (!(ov && planar)) { dofNode.push(nd); dofComp.push(1); }
  }
  const nq = dofNode.length;
  // Per DOF, the segments it touches and their weights.
  const dofSeg = dofNode.map((nd) => {
    const L = [];
    for (let j = 0; j < S; j++) {
      if (seg.nA[j] === nd) L.push([j, seg.wA[j]]);
      if (seg.nB[j] === nd) L.push([j, seg.wB[j]]);
    }
    return L;
  });
  const fixedU = new Float64Array(2 * nNodes);   // values for non-free comps
  if (rigid) for (let nd = 0; nd < nO; nd++) { fixedU[2 * nd] = k1; fixedU[2 * nd + 1] = 0; }

  /* Node curvatures from q. */
  const nodeU = new Float64Array(2 * nNodes);
  const fillNodes = (q) => {
    nodeU.set(fixedU);
    for (let d = 0; d < nq; d++) nodeU[2 * dofNode[d] + dofComp[d]] = q[d];
  };
  const uSegX = new Float64Array(S), uSegY = new Float64Array(S);
  const fillSeg = () => {
    for (let j = 0; j < S; j++) {
      uSegX[j] = seg.wA[j] * nodeU[2 * seg.nA[j]] + seg.wB[j] * nodeU[2 * seg.nB[j]];
      uSegY[j] = seg.wA[j] * nodeU[2 * seg.nA[j] + 1] + seg.wB[j] * nodeU[2 * seg.nB[j] + 1];
    }
  };
  /* Equilibrium curvature u_eq(s; θ, α) and its θ- and α-derivatives. */
  const ueq = (j, th, al, out) => {
    if (seg.ov[j]) {
      const s = seg.sig[j], ph = al + (th - al) * s, c = Math.cos(ph), sn = Math.sin(ph);
      out[0] = w1 * k1 + w2 * k2 * c; out[1] = wy * k2 * sn;
      out[2] = -w2 * k2 * s * sn; out[3] = wy * k2 * s * c;            // ∂/∂θ
      out[4] = -w2 * k2 * s * s * c; out[5] = -wy * k2 * s * s * sn;   // ∂²/∂θ²
      out[6] = -w2 * k2 * (1 - s) * sn; out[7] = wy * k2 * (1 - s) * c; // ∂/∂α
    } else {
      const c = Math.cos(th), sn = Math.sin(th);
      out[0] = k2 * c; out[1] = k2 * sn; out[2] = -k2 * sn; out[3] = k2 * c;
      out[4] = -k2 * c; out[5] = -k2 * sn; out[6] = 0; out[7] = 0;
    }
    return out;
  };
  const E8 = new Float64Array(8);

  /* Twist: local minimum of U over θ, Newton-continued from the twist of
     the last ACCEPTED state (thetaHint), never from the last evaluation:
     integrators evaluate trial states and Jacobian probes far from the
     path, and continuing from those made f depend on call history. Within
     a step θ is therefore a single-valued function of (q, α); across steps
     it follows its own branch, which is the hysteresis (Rules Part 4). */
  let thetaHint = 0, thetaJumps = 0, lastTheta = 0;
  // ∂U/∂θ and ∂²U/∂θ² at fixed shape.
  const gTheta = (th, al) => {
    let g = K * gradient(th, al, lambda, mu), gp = K * stiffness(th, lambda, mu);
    for (let j = 0; j < S; j++) {
      const kh = seg.kB[j] * seg.h[j]; if (!kh) continue;
      ueq(j, th, al, E8);
      const dx = uSegX[j] - E8[0], dy = uSegY[j] - E8[1];
      g -= kh * (dx * E8[2] + dy * E8[3]);
      gp += kh * (E8[2] * E8[2] + E8[3] * E8[3] - dx * E8[4] - dy * E8[5]);
    }
    return [g, gp];
  };
  /* U(θ) at fixed shape (for the energy shed by a twist jump). */
  const Ufix = (th, al) => {
    let U = K * energy(th, al, lambda, mu);
    for (let j = 0; j < S; j++) {
      const kh = seg.kB[j] * seg.h[j]; if (!kh) continue;
      ueq(j, th, al, E8);
      U += 0.5 * kh * ((uSegX[j] - E8[0]) ** 2 + (uSegY[j] - E8[1]) ** 2);
    }
    return U;
  };
  /* The twist at fixed shape: the minimum of U(θ) in the basin of the
     hint (the last accepted twist). TWIST SNAP: torsion is ~500× faster
     than bending here, so the twist sits on its quasi-static manifold
     (Tikhonov singular-perturbation limit) EXCEPT where that manifold
     folds — the basin's stiffness ∂²U/∂θ² goes to zero and the twist must
     jump to the next basin on the torsional time scale (µs), i.e.
     instantly against the bending. The jump fires when the stiffness has
     dropped below JUMP_FRAC of its rest value (the last few percent of
     the approach to the fold, where θ*(q) becomes singular); the energy
     it sheds into torsional ringing is booked as a loss (jumpLoss), so
     the energy balance still closes. */
  const JUMP_FRAC = P.jumpFrac ?? 0;      // 0: jump only when the basin is gone
  let gpRef = 1;
  let lastAl = 0, jumpLoss = 0;
  const solveTheta = (al, hint) => {
    let th = hint, [g, gp] = gTheta(th, al);
    if (gp > JUMP_FRAC * gpRef) {
      for (let it = 0; it < 50; it++) {
        const step = Math.max(-0.05, Math.min(0.05, -g / gp));
        th += step;
        [g, gp] = gTheta(th, al);
        if (Math.abs(step) < 1e-13 * (1 + Math.abs(th))) break;
        if (!(gp > JUMP_FRAC * gpRef)) break;
      }
      if (gp > JUMP_FRAC * gpRef && Math.abs(g) < 1e-9 * gpRef && Math.abs(th - hint) < 0.3) return th;
    }
    // The basin is gone: walk downhill from the hint (direction −U′), or,
    // if the hint sits on a flat inflection, toward the softer side, to
    // the next minimum. Bounded to two turns; failing that, stay put.
    th = hint; [g] = gTheta(th, al);
    const dir = Math.abs(g) > 1e-9 * gpRef ? (g > 0 ? -1 : 1)
      : (gTheta(th + 1e-3, al)[1] < gTheta(th - 1e-3, al)[1] ? 1 : -1);
    const ds = 0.002;
    let x = th, gx = g, climbing = Math.abs(g) <= 1e-9 * gpRef;
    for (let k = 0; k < Math.ceil((4 * Math.PI) / ds); k++) {
      const y = x + dir * ds, gy = gTheta(y, al)[0];
      if (climbing) { if (gy * dir < 0) climbing = false; x = y; gx = gy; continue; }
      if (gy * dir >= 0) {                      // slope reversed: minimum in [x, y]
        let lo = x, hi = y, glo = gx;
        for (let it = 0; it < 80; it++) {
          const m = 0.5 * (lo + hi), gm = gTheta(m, al)[0];
          if ((gm > 0) === (glo > 0)) { lo = m; glo = gm; } else hi = m;
          if (Math.abs(hi - lo) < 1e-13) break;
        }
        return 0.5 * (lo + hi);
      }
      x = y; gx = gy;
    }
    return hint;
  };

  /* Bishop march with optional exact Jacobians. Positions in metres. */
  const K_ = {
    px: new Float64Array(S), py: new Float64Array(S), pz: new Float64Array(S),
    tx: new Float64Array(S), ty: new Float64Array(S), tz: new Float64Array(S),
    ox: new Float64Array(S), oy: new Float64Array(S), oz: new Float64Array(S),   // end of segment j
    wx: new Float64Array(2 * S), wy: new Float64Array(2 * S), wz: new Float64Array(2 * S), // world axes per unit curvature
    R: new Float64Array(9), tip: [0, 0, 0],
  };
  const march = (withAxes, Kout = K_) => {
    let r00 = 1, r01 = 0, r02 = 0, r10 = 0, r11 = 1, r12 = 0, r20 = 0, r21 = 0, r22 = 1;
    let px = 0, py = 0, pz = 0;
    for (let j = 0; j < S; j++) {
      const h = seg.h[j];
      Kout.px[j] = px + 0.5 * h * r02; Kout.py[j] = py + 0.5 * h * r12; Kout.pz[j] = pz + 0.5 * h * r22;
      Kout.tx[j] = r02; Kout.ty[j] = r12; Kout.tz[j] = r22;
      px += r02 * h; py += r12 * h; pz += r22 * h;
      const vx = uSegX[j] * h, vy = uSegY[j] * h, phi = Math.hypot(vx, vy);
      if (phi > 1e-14) {
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
      }
      Kout.ox[j] = px; Kout.oy[j] = py; Kout.oz[j] = pz;
      if (withAxes) {
        // ∂(segment rotation)/∂u_e = R_{j+1} [J_r(φ) e h]×  (right Jacobian)
        const a2 = phi * phi;
        let A1, A2;
        if (phi < 1e-4) { A1 = 0.5 - a2 / 24; A2 = 1 / 6 - a2 / 120; }
        else { A1 = (1 - Math.cos(phi)) / a2; A2 = (phi - Math.sin(phi)) / (a2 * phi); }
        for (let e = 0; e < 2; e++) {
          // J_r e = e − A1 φ×e + A2 φ×(φ×e), φ = (vx, vy, 0)
          const ex = e === 0 ? 1 : 0, ey = e === 0 ? 0 : 1;
          const c1x = vy * 0 - 0 * ey, c1y = 0 * ex - vx * 0, c1z = vx * ey - vy * ex; // φ×e
          const c2x = vy * c1z - 0 * c1y, c2y = 0 * c1x - vx * c1z, c2z = vx * c1y - vy * c1x; // φ×(φ×e)
          const lx = (ex - A1 * c1x + A2 * c2x) * h, ly = (ey - A1 * c1y + A2 * c2y) * h, lz = (-A1 * c1z + A2 * c2z) * h;
          Kout.wx[2 * j + e] = r00 * lx + r01 * ly + r02 * lz;
          Kout.wy[2 * j + e] = r10 * lx + r11 * ly + r12 * lz;
          Kout.wz[2 * j + e] = r20 * lx + r21 * ly + r22 * lz;
        }
      }
    }
    Kout.tip[0] = px; Kout.tip[1] = py; Kout.tip[2] = pz;
    const R = Kout.R; R[0] = r00; R[1] = r01; R[2] = r02; R[3] = r10; R[4] = r11; R[5] = r12; R[6] = r20; R[7] = r21; R[8] = r22;
    return Kout;
  };
  const Kp = { px: new Float64Array(S), py: new Float64Array(S), pz: new Float64Array(S), tx: new Float64Array(S), ty: new Float64Array(S), tz: new Float64Array(S),
    ox: new Float64Array(S), oy: new Float64Array(S), oz: new Float64Array(S), wx: new Float64Array(2 * S), wy: new Float64Array(2 * S), wz: new Float64Array(2 * S), R: new Float64Array(9), tip: [0, 0, 0] };
  const Km = { ...Kp, px: new Float64Array(S), py: new Float64Array(S), pz: new Float64Array(S), tx: new Float64Array(S), ty: new Float64Array(S), tz: new Float64Array(S),
    ox: new Float64Array(S), oy: new Float64Array(S), oz: new Float64Array(S), wx: new Float64Array(2 * S), wy: new Float64Array(2 * S), wz: new Float64Array(2 * S), R: new Float64Array(9), tip: [0, 0, 0] };

  // Jacobian storage: J[d][seg] (3 comps), dT[d][seg] (tangent derivative), tip.
  const Jx = new Float64Array(nq * S), Jy = new Float64Array(nq * S), Jz = new Float64Array(nq * S);
  const Tx = new Float64Array(nq * S), Ty = new Float64Array(nq * S), Tz = new Float64Array(nq * S);
  const JTx = new Float64Array(nq), JTy = new Float64Array(nq), JTz = new Float64Array(nq);
  const jacobians = () => {
    for (let d = 0; d < nq; d++) {
      const e = dofComp[d];
      // Per-segment weight of this DOF.
      let Ax = 0, Ay = 0, Az = 0, Bx = 0, By = 0, Bz = 0;
      const wts = dofSeg[d];
      let wi = 0;
      for (let i = 0; i < S; i++) {
        // contributions of segments j < i already accumulated
        const k = d * S + i;
        const px = K_.px[i], py = K_.py[i], pz = K_.pz[i];
        Jx[k] = Ay * pz - Az * py - Bx; Jy[k] = Az * px - Ax * pz - By; Jz[k] = Ax * py - Ay * px - Bz;
        const tx = K_.tx[i], ty = K_.ty[i], tz = K_.tz[i];
        Tx[k] = Ay * tz - Az * ty; Ty[k] = Az * tx - Ax * tz; Tz[k] = Ax * ty - Ay * tx;
        // add segment i's own rotation for points beyond it
        while (wi < wts.length && wts[wi][0] === i) {
          const wgt = wts[wi][1];
          const ax = wgt * K_.wx[2 * i + e], ay = wgt * K_.wy[2 * i + e], az = wgt * K_.wz[2 * i + e];
          const ox = K_.ox[i], oy = K_.oy[i], oz = K_.oz[i];
          Ax += ax; Ay += ay; Az += az;
          Bx += ay * oz - az * oy; By += az * ox - ax * oz; Bz += ax * oy - ay * ox;
          wi++;
        }
      }
      const tx = K_.tip[0], ty = K_.tip[1], tz = K_.tip[2];
      JTx[d] = Ay * tz - Az * ty - Bx; JTy[d] = Az * tx - Ax * tz - By; JTz[d] = Ax * ty - Ay * tx - Bz;
    }
  };
  for (const L of dofSeg) L.sort((a, b) => a[0] - b[0]);

  let beta = 0;
  const Mq = new Float64Array(nq * nq);
  const qTmp = new Float64Array(nq);

  /** Full evaluation at (t, q, q̇). Returns q̈ and power/quadrature terms;
   *  with `full`, also energies and the motor torque. */
  function evalAt(t, q, qd, full = false, alphaOverride = null, OmegaOverride = null) {
    const Om = OmegaOverride ?? Omega, al = alphaOverride ?? Om * t;
    fillNodes(q); fillSeg();
    const th = solveTheta(al, thetaHint); lastTheta = th; lastAl = al;
    march(true); jacobians();
    // Velocities and the mass matrix.
    const vx = new Float64Array(S), vy = new Float64Array(S), vz = new Float64Array(S);
    for (let d = 0; d < nq; d++) { const w = qd[d]; if (!w) continue; for (let i = 0; i < S; i++) { const k = d * S + i; vx[i] += Jx[k] * w; vy[i] += Jy[k] * w; vz[i] += Jz[k] * w; } }
    Mq.fill(0);
    for (let i = 0; i < S; i++) {
      const m = seg.m[i], ma = seg.ma[i], tx = K_.tx[i], ty = K_.ty[i], tz = K_.tz[i];
      for (let a = 0; a < nq; a++) {
        const ka = a * S + i, ax = Jx[ka], ay = Jy[ka], az = Jz[ka], at = ax * tx + ay * ty + az * tz;
        for (let b = a; b < nq; b++) {
          const kb = b * S + i, dot = ax * Jx[kb] + ay * Jy[kb] + az * Jz[kb];
          const bt = Jx[kb] * tx + Jy[kb] * ty + Jz[kb] * tz;
          Mq[a * nq + b] += m * dot + ma * (dot - at * bt);
        }
      }
    }
    for (let a = 0; a < nq; a++) for (let b = 0; b < a; b++) Mq[a * nq + b] = Mq[b * nq + a];
    // Centripetal/Coriolis acceleration c = (d/dt J)·q̇ and ṫ, as FIRST
    // differences of the exact Jacobian velocity J(q ± τq̇)·q̇. (A second
    // difference of positions amplifies round-off by 1/τ² and made the
    // right-hand side noisy enough to stall Newton during the snap.)
    let qn = 0; for (let d = 0; d < nq; d++) qn += qd[d] * qd[d];
    qn = Math.sqrt(qn);
    const cx = new Float64Array(S), cy = new Float64Array(S), cz = new Float64Array(S);
    const tdx = new Float64Array(S), tdy = new Float64Array(S), tdz = new Float64Array(S);
    if (qn > 0) {
      const tau = 1e-5 / qn, i2t = 1 / (2 * tau);
      for (const sgn of [1, -1]) {
        for (let d = 0; d < nq; d++) qTmp[d] = q[d] + sgn * tau * qd[d];
        fillNodes(qTmp); fillSeg(); march(true); jacobians();
        for (let i = 0; i < S; i++) {
          let ux = 0, uy = 0, uz = 0;
          for (let d = 0; d < nq; d++) { const k = d * S + i, w = qd[d]; ux += Jx[k] * w; uy += Jy[k] * w; uz += Jz[k] * w; }
          cx[i] += sgn * ux * i2t; cy[i] += sgn * uy * i2t; cz[i] += sgn * uz * i2t;
          tdx[i] += sgn * K_.tx[i] * i2t; tdy[i] += sgn * K_.ty[i] * i2t; tdz[i] += sgn * K_.tz[i] * i2t;
        }
      }
      fillNodes(q); fillSeg(); march(true); jacobians();
    }
    // Generalized forces.
    const rhs = new Float64Array(nq);
    let Pdrag = 0, Pmat = 0, Udev = 0, dUda = 0;
    const fx = new Float64Array(S), fy = new Float64Array(S), fz = new Float64Array(S);
    for (let i = 0; i < S; i++) {
      const tx = K_.tx[i], ty = K_.ty[i], tz = K_.tz[i];
      const vt = vx[i] * tx + vy[i] * ty + vz[i] * tz;
      const nx = vx[i] - vt * tx, ny = vy[i] - vt * ty, nz = vz[i] - vt * tz, vn = Math.hypot(nx, ny, nz);
      if (P.drag !== false && vn > 0) {
        const Re = (fluid.rho * vn * seg.D[i]) / fluid.mu;
        const k = -0.5 * fluid.rho * cdCylinder(Re) * seg.D[i] * seg.h[i] * vn;
        fx[i] = k * nx; fy[i] = k * ny; fz[i] = k * nz;
        Pdrag -= fx[i] * vx[i] + fy[i] * vy[i] + fz[i] * vz[i];
      }
    }
    // Elastic deviation, loss, motor-side derivative.
    const devX = new Float64Array(S), devY = new Float64Array(S), udX = new Float64Array(S), udY = new Float64Array(S);
    for (let d = 0; d < nq; d++) { const w = qd[d]; for (const [j, wt] of dofSeg[d]) { if (dofComp[d] === 0) udX[j] += wt * w; else udY[j] += wt * w; } }
    for (let j = 0; j < S; j++) {
      const kh = seg.kB[j] * seg.h[j]; if (!kh) continue;
      ueq(j, th, al, E8);
      devX[j] = uSegX[j] - E8[0]; devY[j] = uSegY[j] - E8[1];
      Udev += 0.5 * kh * (devX[j] ** 2 + devY[j] ** 2);
      dUda -= kh * (devX[j] * E8[6] + devY[j] * E8[7]);
      Pmat += beta * kh * (udX[j] ** 2 + udY[j] ** 2);
    }
    for (let d = 0; d < nq; d++) {
      let Qe = 0, Qm = 0;
      for (const [j, wt] of dofSeg[d]) {
        const kh = seg.kB[j] * seg.h[j];
        Qe -= kh * wt * (dofComp[d] === 0 ? devX[j] : devY[j]);
        Qm -= beta * kh * wt * (dofComp[d] === 0 ? udX[j] : udY[j]);
      }
      let Qd = 0, bias = 0;
      for (let i = 0; i < S; i++) {
        const k = d * S + i, ax = Jx[k], ay = Jy[k], az = Jz[k];
        Qd += fx[i] * ax + fy[i] * ay + fz[i] * az;
        const m = seg.m[i], ma = seg.ma[i];
        if (!qn) continue;
        const tx = K_.tx[i], ty = K_.ty[i], tz = K_.tz[i];
        const at = ax * tx + ay * ty + az * tz, ct = cx[i] * tx + cy[i] * ty + cz[i] * tz, vt = vx[i] * tx + vy[i] * ty + vz[i] * tz;
        const ac = ax * cx[i] + ay * cy[i] + az * cz[i];
        const atd = ax * tdx[i] + ay * tdy[i] + az * tdz[i], vtd = vx[i] * tdx[i] + vy[i] * tdy[i] + vz[i] * tdz[i];
        const dtv = Tx[k] * vx[i] + Ty[k] * vy[i] + Tz[k] * vz[i];
        bias += m * ac + ma * (ac - at * ct) - ma * (atd * vt + at * vtd) + ma * dtv * vt;
      }
      rhs[d] = Qe + Qm + Qd - bias;
    }
    const Mcopy = Mq.slice();
    const acc = cholSolve(Mcopy, Array.from(rhs), nq);
    // Tip velocity and roll vector (material direction at the tip).
    let vtx = 0, vty = 0, vtz = 0;
    for (let d = 0; d < nq; d++) { vtx += JTx[d] * qd[d]; vty += JTy[d] * qd[d]; vtz += JTz[d] * qd[d]; }
    const R = K_.R, c = Math.cos(th), sn = Math.sin(th);
    const rx = R[0] * c + R[1] * sn, ry = R[3] * c + R[4] * sn, rz = R[6] * c + R[7] * sn;
    const rv = rx * vtx + ry * vty + rz * vtz;
    const out = { acc, th, alpha: al, Pdrag, Pmat, row: rv * rv * vtx,
      tip: [K_.tip[0], K_.tip[1], K_.tip[2]], tipV: [vtx, vty, vtz], roll: [rx, ry, rz], tipT: [R[2], R[5], R[8]] };
    if (full) {
      let T = 0; for (let a = 0; a < nq; a++) for (let b = 0; b < nq; b++) T += 0.5 * qd[a] * Mq[a * nq + b] * qd[b];
      out.T = T; out.U = K * energy(th, al, lambda, mu) + Udev;
      out.torque = K * (-(th - al)) + dUda;      // ∂U/∂α at fixed q (θ at its minimum)
    }
    return out;
  }

  /** Equilibrium (rest) q for given (α, θ): nodes at u_eq. */
  const restQ = (al, th) => {
    const q = new Float64Array(nq);
    for (let d = 0; d < nq; d++) {
      const nd = dofNode[d], ov = nd < nO;
      let u;
      if (ov) {
        const s = nO > 1 ? nd / (nO - 1) : 0, ph = al + (th - al) * s;
        u = dofComp[d] === 0 ? w1 * k1 + w2 * k2 * Math.cos(ph) : wy * k2 * Math.sin(ph);
      } else u = dofComp[d] === 0 ? k2 * Math.cos(th) : k2 * Math.sin(th);
      q[d] = u;
    }
    return q;
  };

  /** Linearized modes about the rest state (α = θ = 0): generalized
   *  eigenvalues of the reduced stiffness (θ eliminated) and mass. */
  const modes = () => {
    const q0 = restQ(0, 0), zero = new Float64Array(nq);
    thetaHint = 0;
    evalAt(0, q0, zero, false, 0, 0);
    const Mm = Mq.slice();
    // Stiffness by central differences of the elastic force.
    const Kq = new Array(nq * nq), h = 1e-4;
    const force = (q) => { thetaHint = 0; const sv = P.drag; P.drag = false; const b = beta; beta = 0;
      const e = evalAt(0, q, zero, false, 0, 0); P.drag = sv; beta = b;
      const Mc = Mq.slice(); const f = new Array(nq); for (let a = 0; a < nq; a++) { let s = 0; for (let k = 0; k < nq; k++) s += Mc[a * nq + k] * e.acc[k]; f[a] = s; } return f; };
    for (let b = 0; b < nq; b++) {
      const qp = q0.slice(), qm = q0.slice(); qp[b] += h; qm[b] -= h;
      const fp = force(qp), fm = force(qm);
      for (let a = 0; a < nq; a++) Kq[a * nq + b] = -(fp[a] - fm[a]) / (2 * h);
    }
    for (let a = 0; a < nq; a++) for (let b = 0; b < a; b++) { const s = 0.5 * (Kq[a * nq + b] + Kq[b * nq + a]); Kq[a * nq + b] = s; Kq[b * nq + a] = s; }
    thetaHint = 0;
    return genEig(Kq, Array.from(Mm), nq).map((x) => Math.sqrt(Math.max(0, x)));
  };
  { fillNodes(restQ(0, 0)); fillSeg(); gpRef = Math.max(1e-30, gTheta(0, 0)[1]); }
  const omegas = nq ? modes() : [];
  const omega1 = omegas[0] ?? 0;
  beta = omega1 > 0 ? P.loss / omega1 : 0;
  thetaHint = 0;

  return { evalAt, restQ, nq, S, N, M, seg, lambda, mu, K, kEff, Omega, omegas, omega1,
    fold: foldSnap(lambda, mu), P, fluid,
    setHint: (t) => { thetaHint = t; lastTheta = t; }, getHint: () => thetaHint, jumps: () => thetaJumps,
    /** Accept the twist of the most recent evaluation as the new branch. */
    commit: () => {
      if (Math.abs(lastTheta - thetaHint) > 0.3) {
        // Energy shed by the twist snap, at the shape of the accepted state.
        jumpLoss += Ufix(thetaHint, lastAl) - Ufix(lastTheta, lastAl);
        thetaJumps++;
      }
      thetaHint = lastTheta;
    },
    jumpLoss: () => jumpLoss,
    lastTheta: () => lastTheta,
    /** Centreline points (mm, robot frame) for display: base, every segment end. */
    shape: (q, al, th) => {
      fillNodes(q); fillSeg(); march(false);
      const pts = [[0, 0, 0]];
      for (let j = 0; j < S; j++) pts.push([K_.ox[j] * 1000, K_.oy[j] * 1000, K_.oz[j] * 1000]);
      return { pts, nOverlap: N, R: Array.from(K_.R) };
    },
  };
}

/* ── Dormand–Prince 5(4) ───────────────────────────────────────────────── */
const DP = {
  c: [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1],
  a: [[], [1 / 5], [3 / 40, 9 / 40], [44 / 45, -56 / 15, 32 / 9],
    [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
    [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
    [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84]],
  b: [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0],
  bs: [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40],
};

/** y′ = f(t, y) from t0 to t1 with error control on the first `nCtl`
 *  components; onStep(ta, ya, fa, tb, yb, fb) per accepted step. */
export function integrate(f, t0, y0, t1, opt, onStep) {
  const rtol = opt.rtol ?? 1e-6, atol = opt.atol ?? 1e-9, hMax = opt.hMax ?? Infinity;
  const nCtl = opt.nCtl ?? y0.length, scale = opt.scale ?? null;
  const dim = y0.length;
  let t = t0, y = Float64Array.from(y0), k1 = f(t, y), h = Math.min(opt.h0 ?? 1e-4, t1 - t0);
  const k = new Array(7);
  let nAcc = 0, nRej = 0;
  while (t < t1 - 1e-15) {
    if (t + h > t1) h = t1 - t;
    h = Math.min(h, hMax);
    k[0] = k1;
    for (let s = 1; s < 7; s++) {
      const ys = new Float64Array(dim);
      for (let d = 0; d < dim; d++) {
        let acc = y[d];
        for (let j = 0; j < s; j++) { const a = DP.a[s][j]; if (a) acc += h * a * k[j][d]; }
        ys[d] = acc;
      }
      k[s] = f(t + DP.c[s] * h, ys);
    }
    const yn = new Float64Array(dim);
    let err = 0;
    for (let d = 0; d < dim; d++) {
      let y5 = y[d], e = 0;
      for (let j = 0; j < 7; j++) { y5 += h * DP.b[j] * k[j][d]; e += h * (DP.b[j] - DP.bs[j]) * k[j][d]; }
      yn[d] = y5;
      if (d < nCtl) {
        const sc = (scale ? scale[d] : 1) * atol + rtol * Math.max(Math.abs(y[d]), Math.abs(y5));
        err += (e / sc) ** 2;
      }
    }
    err = Math.sqrt(err / nCtl);
    if (err <= 1 || h < 1e-10) {
      const fn = k[6];
      onStep?.(t, y, k1, t + h, yn, fn);
      t += h; y = yn; k1 = fn; nAcc++;
      h *= Math.min(4, Math.max(0.2, 0.9 * Math.pow(Math.max(err, 1e-10), -0.2)));
    } else {
      nRej++;
      h *= Math.max(0.2, 0.9 * Math.pow(err, -0.25));
    }
  }
  return { y, nAcc, nRej };
}

/* ── TR-BDF2, the stiff integrator ─────────────────────────────────────── */
/* The nodal bending model is stiff: its highest discrete modes (~10⁴–10⁵
   rad/s) are far above the physics of interest (~10² rad/s), so an explicit
   method would be held to steps of tens of microseconds by stability alone.
   TR-BDF2 (Bank et al. 1985) as the DIRK 2(3) pair of Hosea & Shampine
   (1996), Appl. Numer. Math. 20, §2:
        0 |  0  0  0          γ = 2 − √2, d = γ/2, w = √2/4
        γ |  d  d  0          y_{n+1} = z₃ (stiffly accurate, L-stable)
        1 |  w  w  d          companion (order 3): ((1−w)/3, (3w+1)/3, d/3)
   Both implicit stages share the iteration matrix I − h d J (simplified
   Newton, Jacobian reused across steps). The error estimate is the
   companion difference filtered through (I − h d J)⁻¹, as §6 prescribes,
   so stiff components are not grossly over-estimated.
   The state is y = [q, v, quadratures...] with q′ = v, v′ = a(t, q, v);
   quadratures ride along explicitly. The Newton system reduces from
   2n×2n to n×n:  (I − hdB − h²d²A) Δv = r₂ + hd A r₁, Δq = r₁ + hd Δv,
   with A = ∂a/∂q, B = ∂a/∂v.                                            */
const TB = (() => {
  const g = 2 - Math.SQRT2, d = g / 2, w = Math.SQRT2 / 4;
  return { g, d, w, e1: (1 - w) / 3 - w, e2: (3 * w + 1) / 3 - w, e3: d / 3 - d };
})();

function luFactor(A, n) {
  const p = new Int32Array(n);
  for (let i = 0; i < n; i++) p[i] = i;
  for (let k = 0; k < n; k++) {
    let mx = k, best = Math.abs(A[k * n + k]);
    for (let i = k + 1; i < n; i++) { const v = Math.abs(A[i * n + k]); if (v > best) { best = v; mx = i; } }
    if (mx !== k) { for (let j = 0; j < n; j++) { const t = A[k * n + j]; A[k * n + j] = A[mx * n + j]; A[mx * n + j] = t; } const t = p[k]; p[k] = p[mx]; p[mx] = t; }
    const piv = A[k * n + k];
    for (let i = k + 1; i < n; i++) {
      const f = (A[i * n + k] /= piv);
      if (f) for (let j = k + 1; j < n; j++) A[i * n + j] -= f * A[k * n + j];
    }
  }
  return { A, p, n };
}
function luSolve({ A, p, n }, b) {
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = b[p[i]];
  for (let i = 0; i < n; i++) { let s = x[i]; for (let k = 0; k < i; k++) s -= A[i * n + k] * x[k]; x[i] = s; }
  for (let i = n - 1; i >= 0; i--) { let s = x[i]; for (let k = i + 1; k < n; k++) s -= A[i * n + k] * x[k]; x[i] = s / A[i * n + i]; }
  return x;
}

/** f(t, y) → dy for y = [q(n), v(n), extra...] with dy = [v, a, extra′].
 *  opt: rtol, atol, scale (length 2n), hMax, h0. onStep as integrate(). */
export function integrateStiff(f, n, t0, y0, t1, opt, onStep) {
  const rtol = opt.rtol ?? 1e-5, atol = opt.atol ?? 1e-6, hMax = opt.hMax ?? Infinity;
  // Below hMin a step is taken regardless of the error estimate: that is
  // how the solver crosses a genuine discontinuity in f (the twist's
  // basin vanishing at fixed shape), with a time error of at most hMin.
  const hMin = opt.hMin ?? 2e-6;
  const scale = opt.scale ?? new Float64Array(2 * n).fill(1);
  const dim = y0.length, { d, w } = TB;
  let t = t0, y = Float64Array.from(y0), k1 = f(t, y);
  let h = Math.min(opt.h0 ?? 1e-4, t1 - t0, hMax);
  let Ja = null, Jb = null, Jage = 0, fac = null, facH = 0;
  let nAcc = 0, nRej = 0, nJac = 0, nFun = 1, nForced = 0, nNewt = 0;
  const jac = () => {
    // A = ∂a/∂q, B = ∂a/∂v by forward differences at (t, y).
    Ja = new Float64Array(n * n); Jb = new Float64Array(n * n);
    const base = k1;
    for (let j = 0; j < 2 * n; j++) {
      const yp = y.slice(), del = 1e-7 * Math.max(Math.abs(y[j]), scale[j]);
      yp[j] += del;
      const fp = f(t, yp); nFun++;
      for (let i = 0; i < n; i++) {
        const v = (fp[n + i] - base[n + i]) / del;
        if (j < n) Ja[i * n + j] = v; else Jb[i * n + (j - n)] = v;
      }
    }
    nJac++; Jage = 0; fac = null;
  };
  const factor = () => {
    const hd = h * d, M = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
      M[i * n + j] = (i === j ? 1 : 0) - hd * Jb[i * n + j] - hd * hd * Ja[i * n + j];
    fac = luFactor(M, n); facH = h;
  };
  // Solve (I − hdJ) [Δq; Δv] = [r1; r2].
  const wsolve = (r) => {
    const hd = h * d, rhs = new Float64Array(n);
    for (let i = 0; i < n; i++) { let s = r[n + i]; for (let j = 0; j < n; j++) s += hd * Ja[i * n + j] * r[j]; rhs[i] = s; }
    const dv = luSolve(fac, rhs), out = new Float64Array(2 * n);
    for (let i = 0; i < n; i++) { out[n + i] = dv[i]; out[i] = r[i] + hd * dv[i]; }
    return out;
  };
  const errNorm = (e, ya, yb) => {
    let s = 0;
    for (let i = 0; i < 2 * n; i++) { const sc = scale[i] * atol + rtol * Math.max(Math.abs(ya[i]), Math.abs(yb[i])); s += (e[i] / sc) ** 2; }
    return Math.sqrt(s / (2 * n));
  };
  // One implicit stage: z − h d f(z) = c, starting from z0. Returns [z, k] or null.
  const stage = (ts, c, z0) => {
    const z = z0.slice();
    let kz = null, prevNorm = Infinity;
    for (let it = 0; it < 6; it++) {
      kz = f(ts, z); nFun++;
      const r = new Float64Array(2 * n);
      for (let i = 0; i < 2 * n; i++) r[i] = c[i] + h * d * kz[i] - z[i];
      const dz = wsolve(r);
      for (let i = 0; i < 2 * n; i++) z[i] += dz[i];
      const nrm = errNorm(dz, z, z);
      if (nrm < 0.05) { kz = f(ts, z); nFun++; return [z, kz]; }
      if (it > 0 && nrm > 0.9 * prevNorm) return null;   // diverging / too slow
      prevNorm = nrm;
    }
    return null;
  };
  jac();
  while (t < t1 - 1e-15) {
    if (t + h > t1) h = t1 - t;
    h = Math.min(h, hMax);
    if (!fac || facH !== h) factor();
    // Stage 2 at t + γh.
    const c2 = new Float64Array(dim);
    for (let i = 0; i < dim; i++) c2[i] = y[i] + h * d * k1[i];
    const pred2 = new Float64Array(dim);
    for (let i = 0; i < dim; i++) pred2[i] = y[i] + h * TB.g * k1[i];
    const s2 = stage(t + TB.g * h, c2, pred2);
    let ok = !!s2, z3 = null, k3 = null, k2 = null;
    if (ok) {
      [, k2] = s2;
      const c3 = new Float64Array(dim);
      for (let i = 0; i < dim; i++) c3[i] = y[i] + h * w * (k1[i] + k2[i]);
      const pred3 = new Float64Array(dim);
      for (let i = 0; i < dim; i++) pred3[i] = y[i] + h * k1[i];
      const s3 = stage(t + h, c3, pred3);
      ok = !!s3;
      if (ok) [z3, k3] = s3;
    }
    if (!ok) {
      if (h <= hMin) {
        // Forced explicit micro-step across the discontinuity.
        z3 = new Float64Array(dim);
        for (let i = 0; i < dim; i++) z3[i] = y[i] + h * k1[i];
        k3 = f(t + h, z3); nFun++;
        opt.onAccept?.();
        onStep?.(t, y, k1, t + h, z3, k3);
        t += h; y = z3; k1 = k3; nAcc++; nForced++;
        jac(); h = Math.min(hMax, 4 * h); fac = null;
        continue;
      }
      // Newton failed: fresh Jacobian, else smaller step.
      nRej++; nNewt++; opt.debug?.('newton', t, h);
      if (Jage > 0) jac(); else h = Math.max(hMin, h * 0.25);
      fac = null;
      continue;
    }
    // Quadratures: explicit in the stage derivatives.
    for (let i = 2 * n; i < dim; i++) z3[i] = y[i] + h * (w * (k1[i] + k2[i]) + d * k3[i]);
    const est = new Float64Array(2 * n);
    for (let i = 0; i < 2 * n; i++) est[i] = h * (TB.e1 * k1[i] + TB.e2 * k2[i] + TB.e3 * k3[i]);
    const Est = wsolve(est);
    const err = errNorm(Est, y, z3);
    if (err <= 1 || h <= hMin) {
      if (err > 1) { nForced++; Jage = 1000; }
      opt.onAccept?.();
      onStep?.(t, y, k1, t + h, z3, k3);
      t += h; y = z3; k1 = k3; nAcc++; Jage++;
      const fct = Math.min(4, Math.max(0.3, 0.9 * Math.pow(Math.max(err, 1e-8), -1 / 3)));
      if (fct > 1.25 || fct < 0.9) { h *= fct; fac = null; }
      if (Jage > 40) jac();
    } else {
      nRej++; opt.debug?.('err', t, h, err);
      h = Math.max(hMin, h * Math.max(0.2, 0.9 * Math.pow(err, -1 / 3)));
      fac = null;
    }
  }
  return { y, nAcc, nRej, nJac, nFun, nForced, nNewt };
}

/** Quintic Hermite from value, first and second derivative at both ends. */
export function hermite5(h, y0, v0, a0, y1, v1, a1, s) {
  const u = s / h, u2 = u * u, u3 = u2 * u, u4 = u3 * u, u5 = u4 * u;
  const y = (1 - 10 * u3 + 15 * u4 - 6 * u5) * y0 + (u - 6 * u3 + 8 * u4 - 3 * u5) * h * v0
    + (0.5 * u2 - 1.5 * u3 + 1.5 * u4 - 0.5 * u5) * h * h * a0 + (0.5 * u3 - u4 + 0.5 * u5) * h * h * a1
    + (-4 * u3 + 7 * u4 - 3 * u5) * h * v1 + (10 * u3 - 15 * u4 + 6 * u5) * y1;
  const v = ((-30 * u2 + 60 * u3 - 30 * u4) * y0 + (1 - 18 * u2 + 32 * u3 - 15 * u4) * h * v0
    + (u - 4.5 * u2 + 6 * u3 - 2.5 * u4) * h * h * a0 + (1.5 * u2 - 4 * u3 + 2.5 * u4) * h * h * a1
    + (-12 * u2 + 28 * u3 - 15 * u4) * h * v1 + (30 * u2 - 60 * u3 + 30 * u4) * y1) / h;
  return [y, v];
}

/* ── Cycle runner ──────────────────────────────────────────────────────── */
/** From rest (α = θ = 0, shape at equilibrium) through the wind-up, then
 *  `cycles` cycles of one motor turn each, starting CYCLE_LEAD before the
 *  fold angle. State y = [q, q̇, J, W_drag, W_mat, W_motor]. Per cycle:
 *  the quadratures and, with dtOut, uniform samples of q, q̇, θ (and tip
 *  data with `tip`). */
export function runCycles(design, phys, { cycles = 3, dtOut = null, tip = false, full = false,
  rtol = 1e-5, onProgress = null, defer = false, periodicTol = 0 } = {}) {
  const sys = makeSystem(design, phys);
  const { fold, Omega, nq } = sys;
  if (!fold || !(Omega > 0) || !nq) return { sys, none: true, cycles: [] };
  const Tc = (2 * Math.PI) / Omega;
  const tStart = Math.max(0, (fold.alphaSnap - CYCLE_LEAD) / Omega);
  const dim = 2 * nq + 5;
  let lastEval = null;
  const f = (t, y) => {
    const q = y.subarray(0, nq), qd = y.subarray(nq, 2 * nq);
    const e = sys.evalAt(t, q, qd, full);
    lastEval = e;
    const dy = new Float64Array(dim);
    dy.set(qd, 0); dy.set(e.acc, nq);
    dy[2 * nq] = e.row; dy[2 * nq + 1] = e.Pdrag; dy[2 * nq + 2] = e.Pmat; dy[2 * nq + 3] = full ? e.torque * Omega : 0;
    dy[2 * nq + 4] = Math.abs(e.row);                // for the rowing integral's net share
    return dy;
  };
  // Error scales: curvature in 1/m (atol ~ 1e-3 1/m), rates ~ 1/m/s.
  const scale = new Float64Array(2 * nq).fill(1);
  for (let d = nq; d < 2 * nq; d++) scale[d] = 10;
  const opt = { rtol, atol: 1e-3, scale, hMax: Math.min(Tc / 100, 0.02), onAccept: () => sys.commit() };
  let y = new Float64Array(dim);
  y.set(sys.restQ(0, 0), 0);
  sys.setHint(0);
  const stats = { nAcc: 0, nRej: 0, nJac: 0, nFun: 0, nForced: 0 };
  const r0 = integrateStiff(f, nq, 0, y, tStart, opt, null);
  y = r0.y; for (const k in stats) stats[k] += r0[k];
  const K = dtOut ? Math.floor(Tc / dtOut + 1e-9) : 0;
  const out = [];
  for (let c = 0; c < cycles; c++) {
    const t0 = tStart + c * Tc, t1 = t0 + Tc;
    const y0 = y.slice(), jl0 = sys.jumpLoss(), nj0 = sys.jumps(), hint0 = sys.getHint();
    // Mechanical energy exactly at a cycle boundary (θ on the accepted branch).
    const Eat = (tt, yy, hint) => {
      const keep = sys.getHint(); sys.setHint(hint);
      const e = sys.evalAt(tt, yy.subarray(0, nq), yy.subarray(nq, 2 * nq), true);
      sys.setHint(keep); return e.T + e.U;
    };
    const E0 = full ? Eat(t0, y0, hint0) : null;
    let Q = null, QD = null, TH = null, nextK = 0;
    if (dtOut) { Q = new Float64Array(nq * (K + 1)); QD = new Float64Array(nq * (K + 1)); TH = new Float64Array(K + 1); }
    const store = (k, q, qd, th) => { Q.set(q, k * nq); QD.set(qd, k * nq); TH[k] = th; };
    let hintAtA = sys.getHint();
    const onStep = dtOut ? (ta, ya, fa, tb, yb, fb) => {
      const h = tb - ta;
      while (nextK <= K && t0 + nextK * dtOut <= tb + 1e-12) {
        const s = Math.min(h, Math.max(0, t0 + nextK * dtOut - ta));
        const q = new Float64Array(nq), qd = new Float64Array(nq);
        for (let d = 0; d < nq; d++) {
          const [a, b] = hermite5(h, ya[d], ya[nq + d], fa[nq + d], yb[d], yb[nq + d], fb[nq + d], s);
          q[d] = a; qd[d] = b;
        }
        store(nextK, q, qd, sys.getHint());   // branch of this step: lets samples be evaluated independently
        nextK++;
      }
    } : null;
    if (dtOut) { store(0, y.subarray(0, nq), y.subarray(nq, 2 * nq), sys.getHint()); nextK = 1; }
    const r = integrateStiff(f, nq, t0, y, t1, opt, onStep);
    y = r.y; for (const k in stats) stats[k] += r[k];
    while (dtOut && nextK <= K) { store(nextK, y.subarray(0, nq), y.subarray(nq, 2 * nq), sys.getHint()); nextK++; }
    const cyc = { t0, J: y[2 * nq] - y0[2 * nq], Jabs: y[2 * nq + 4] - y0[2 * nq + 4], Wdrag: y[2 * nq + 1] - y0[2 * nq + 1],
      Wmat: y[2 * nq + 2] - y0[2 * nq + 2], Wmotor: y[2 * nq + 3] - y0[2 * nq + 3],
      Wjump: sys.jumpLoss() - jl0, jumps: sys.jumps() - nj0, q: Q, qd: QD, th: TH,
      E0, E1: full ? Eat(t1, y, sys.getHint()) : null };
    cyc.hints = TH ? TH.slice() : null;
    if (dtOut && !defer) {
      // Twist and tip data at the samples, θ continued from the cycle start.
      const hint = sys.getHint();
      sys.setHint(hintAtA);
      if (tip) { cyc.tip = new Float64Array(3 * (K + 1)); cyc.tipV = new Float64Array(3 * (K + 1)); cyc.roll = new Float64Array(3 * (K + 1)); cyc.tipT = new Float64Array(3 * (K + 1)); }
      for (let k = 0; k <= K; k++) {
        const e = sys.evalAt(t0 + k * dtOut, Q.subarray(k * nq, (k + 1) * nq), QD.subarray(k * nq, (k + 1) * nq), full);
        TH[k] = e.th; sys.commit();
        if (tip) for (let d = 0; d < 3; d++) { cyc.tip[3 * k + d] = e.tip[d]; cyc.tipV[3 * k + d] = e.tipV[d]; cyc.roll[3 * k + d] = e.roll[d]; cyc.tipT[3 * k + d] = e.tipT[d]; }
      }
      sys.setHint(hint);
      cyc.dTheta = TH[K] - TH[0];
    }
    out.push(cyc);
    onProgress?.((c + 1) / cycles);
    /* Deterministic dynamics settle onto a periodic orbit. Once a cycle
       starts and ends in the same state (to periodicTol, relative) and
       repeats the previous cycle's J, later cycles are exact copies:
       reuse it instead of integrating again. */
    if (periodicTol > 0 && c >= 1 && c < cycles - 1) {
      const prev = out[c - 1];
      let dq = 0, nq0 = 0;
      for (let d = 0; d < 2 * nq; d++) { dq = Math.max(dq, Math.abs(y[d] - y0[d])); nq0 = Math.max(nq0, Math.abs(y[d])); }
      const dJ = Math.abs(cyc.J - prev.J) / Math.max(1e-12, Math.abs(cyc.J));
      if (dq <= periodicTol * Math.max(1, nq0) && dJ <= periodicTol * 10) {
        for (let r = c + 1; r < cycles; r++) out.push({ ...cyc, t0: tStart + r * Tc, copied: true });
        onProgress?.(1);
        break;
      }
    }
  }
  return { sys, cycles: out, K, dtOut, Tc, tStart, stats, jumps: sys.jumps() };
}

/** Evaluate stored samples independently (parallelizable): for each sample
 *  (t, q, q̇, branch hint) → twist, tip position/velocity, roll, tangent and
 *  the display shape. The hint carries the twist branch from the
 *  integration, so no sample depends on another. */
export function evalSamples(design, phys, { t, q, qd, hints, nq }) {
  const sys = makeSystem(design, phys);
  const n = t.length, S = sys.S;
  const out = { th: new Float64Array(n), tip: new Float64Array(3 * n), tipV: new Float64Array(3 * n),
    roll: new Float64Array(3 * n), tipT: new Float64Array(3 * n), pts: new Float32Array(3 * (S + 1) * n) };
  for (let k = 0; k < n; k++) {
    sys.setHint(hints[k]);
    const qk = q.subarray(k * nq, (k + 1) * nq), e = sys.evalAt(t[k], qk, qd.subarray(k * nq, (k + 1) * nq));
    out.th[k] = e.th;
    for (let d = 0; d < 3; d++) { out.tip[3 * k + d] = e.tip[d]; out.tipV[3 * k + d] = e.tipV[d]; out.roll[3 * k + d] = e.roll[d]; out.tipT[3 * k + d] = e.tipT[d]; }
    sys.shape(qk).pts.forEach((pp, j) => out.pts.set(pp, 3 * ((S + 1) * k + j)));
  }
  return out;
}
