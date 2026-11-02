/* Physics worker.
   Messages in:
     { id, kind: 'integrate', design, phys, cycles, dtOut }
       → the time integration (inherently sequential): per cycle the stored
         samples (q, q̇, twist-branch hint) and the energy/rowing totals
     { id, kind: 'samples', design, phys, nq, t, q, qd, hints }
       → independent evaluation of a batch of samples (tip, roll, shape)
     { id, kind: 'rowing', designs: [{i, design}], phys, cycles }
       → rowing integral per design (optimiser)
   Messages out: { id, progress } … then { id, done: true, result } or { id, error }. */
import { runCycles, evalSamples } from './physics.js';
import { pairMechanics } from './model.js';

const withMech = (d) => ({ ...d, mech: pairMechanics(d.tubes, !!d.outerLocked, !!d.outerPlanar) });

function integrate({ id, design, phys, cycles, dtOut }) {
  const t0 = performance.now();
  const R = runCycles(withMech(design), phys, { cycles, dtOut, full: true, defer: true, rtol: phys.rtol ?? 1e-5, periodicTol: 1e-4,
    onProgress: (p) => postMessage({ id, progress: p }) });
  if (R.none) return { none: true, reason: !R.sys?.fold ? 'no fold: λ below π²/4, nothing snaps' : 'motor stopped' };
  const { sys } = R;
  return {
    K: R.K, dt: dtOut, Tc: R.Tc, Omega: sys.Omega, alpha0: sys.Omega * R.tStart, tStart: R.tStart,
    nq: sys.nq, S: sys.S, nOverlap: sys.N, omega1: sys.omega1, omegas: sys.omegas.slice(0, 6), fluid: sys.fluid.name,
    steps: R.stats, ms: performance.now() - t0, integrated: R.cycles.filter((c) => !c.copied).length,
    cycles: R.cycles.map((c) => ({ t0: c.t0, q: c.q, qd: c.qd, hints: c.hints,
      J: c.J, Jabs: c.Jabs, Wdrag: c.Wdrag, Wmat: c.Wmat, Wjump: c.Wjump, Wmotor: c.Wmotor, jumps: c.jumps,
      resid: c.E1 != null ? (c.Wmotor - c.Wdrag - c.Wmat - c.Wjump - (c.E1 - c.E0)) / Math.max(1e-30, Math.abs(c.Wmotor)) : null })),
  };
}

function solveRowing({ id, designs, phys, cycles }) {
  const out = [];
  designs.forEach(({ i, design }, n) => {
    try {
      const R = runCycles(withMech(design), phys, { cycles, rtol: phys.rtol ?? 1e-4 });
      if (R.none) out.push({ i, J: 0, Jabs: 0, sd: 0, ok: false });
      else {
        const J = R.cycles.map((c) => c.J), m = J.reduce((a, b) => a + b, 0) / J.length;
        out.push({ i, J: m, Jabs: R.cycles.reduce((a, c) => a + c.Jabs, 0) / J.length, ok: true,
          sd: Math.sqrt(J.reduce((a, b) => a + (b - m) ** 2, 0) / J.length) });
      }
    } catch (e) { out.push({ i, J: 0, Jabs: 0, sd: 0, ok: false, err: String(e?.message ?? e) }); }
    postMessage({ id, progress: (n + 1) / designs.length, partial: out[out.length - 1] });
  });
  return out;
}

self.onmessage = (e) => {
  const m = e.data;
  try {
    const result = m.kind === 'integrate' ? integrate(m)
      : m.kind === 'samples' ? evalSamples(withMech(m.design), m.phys, m) : solveRowing(m);
    postMessage({ id: m.id, done: true, result });
  } catch (err) {
    postMessage({ id: m.id, error: String(err?.message ?? err) });
  }
};
