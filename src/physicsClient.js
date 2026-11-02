/* Main-thread side of the physics workers.
   The time integration is sequential by nature (each instant needs the one
   before), so it runs in one worker. Everything after it — turning every
   stored sample into the twist, tip motion, roll and display shape — is
   independent per sample, so it is split across a pool sized to the
   machine's cores. The optimiser's designs are independent too and use the
   whole pool. */
import { SNAP_THRESHOLD } from './model.js';

const newWorker = () => new Worker(new URL('./physics.worker.js', import.meta.url), { type: 'module' });
const CORES = Math.max(1, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4);
let seq = 0;

/** Serializable design description for the worker. */
export const designMsg = (sim, tubes, outerLocked, outerPlanar) => ({
  k1: sim.k1, k2: sim.k2, Lc: sim.LcMm / 1000, Lext: sim.extMm / 1000,
  tubes, outerLocked: !!outerLocked, outerPlanar: !!outerPlanar && !outerLocked,
});

/** Run one message on a worker; resolves with its result. */
function runOn(w, msg, onProgress) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    w.onmessage = (e) => {
      const m = e.data;
      if (m.id !== id) return;
      if (m.progress != null && !m.done) onProgress?.(m.progress, m);
      if (m.done) resolve(m.result);
      if (m.error) reject(new Error(m.error));
    };
    w.onerror = (e) => reject(new Error(e.message || 'worker error'));
    w.postMessage({ ...msg, id });
  });
}

/** One design, N cycles, averaged. Returns { promise, cancel }. */
export function solveCycles({ design, phys, cycles, dtOut, tip = false }, onProgress) {
  const workers = [];
  let cancelled = false;
  const cancel = () => { cancelled = true; workers.forEach((w) => w.terminate()); };
  const promise = (async () => {
    const wi = newWorker(); workers.push(wi);
    // Phase 1 (≈40% of the bar): the integration.
    const I = await runOn(wi, { kind: 'integrate', design, phys, cycles, dtOut }, (p) => onProgress?.(0.4 * p));
    wi.terminate();
    if (I.none) return I;
    // Phase 2: every sample of every cycle, spread over the pool.
    // Copied (periodic) cycles are identical: evaluate the unique ones only.
    const { K, nq } = I, C = I.integrated ?? I.cycles.length, n = C * (K + 1);
    const t = new Float64Array(n), q = new Float64Array(n * nq), qd = new Float64Array(n * nq), hints = new Float64Array(n);
    I.cycles.slice(0, C).forEach((c, ci) => {
      for (let k = 0; k <= K; k++) t[ci * (K + 1) + k] = c.t0 + k * dtOut;
      q.set(c.q, ci * (K + 1) * nq); qd.set(c.qd, ci * (K + 1) * nq); hints.set(c.hints, ci * (K + 1));
    });
    const P = Math.max(1, Math.min(CORES, Math.ceil(n / 200), 32));
    const chunk = Math.ceil(n / P);
    let done = 0;
    const parts = await Promise.all(Array.from({ length: P }, (_, p) => {
      if (cancelled) return null;
      const a = p * chunk, b = Math.min(n, a + chunk);
      if (a >= b) return null;
      const w = newWorker(); workers.push(w);
      return runOn(w, { kind: 'samples', design, phys, nq, t: t.slice(a, b), q: q.slice(a * nq, b * nq),
        qd: qd.slice(a * nq, b * nq), hints: hints.slice(a, b) }).then((r) => {
        w.terminate(); done++; onProgress?.(0.4 + 0.6 * (done / P)); return { a, b, r };
      });
    }));
    const S1 = I.S + 1;
    const all = { th: new Float64Array(n), tip: new Float64Array(3 * n), tipV: new Float64Array(3 * n),
      roll: new Float64Array(3 * n), tipT: new Float64Array(3 * n), pts: new Float32Array(3 * S1 * n) };
    parts.forEach((pt) => { if (!pt) return; for (const k of Object.keys(all)) all[k].set(pt.r[k], (k === 'pts' ? 3 * S1 : k === 'th' ? 1 : 3) * pt.a); });
    return assemble(I, all, tip, dtOut, P);
  })();
  return { promise, cancel };
}

/** Average the cycles sample by sample (they line up exactly in time). */
function assemble(I, all, tip, dtOut, workersUsed) {
  const { K } = I, Ctot = I.cycles.length, C = I.integrated ?? Ctot, S1 = I.S + 1, N1 = K + 1;
  // Weight of each unique cycle in the average over all Ctot cycles.
  const wt = (c) => (c === C - 1 ? Ctot - C + 1 : 1) / Ctot;
  const th = new Float64Array(N1), pts = new Float32Array(3 * S1 * N1);
  const tipP = new Float64Array(3 * N1), tipV = new Float64Array(3 * N1), roll = new Float64Array(3 * N1);
  const spd = new Float64Array(N1), spd2 = new Float64Array(N1), snap = new Float64Array(N1);
  for (let c = 0; c < C; c++) {
    const o = c * N1;
    for (let k = 0; k < N1; k++) {
      const w = wt(c);
      th[k] += (all.th[o + k] - 2 * Math.PI * c) * w;
      for (let d = 0; d < 3; d++) { tipP[3 * k + d] += all.tip[3 * (o + k) + d] * w; tipV[3 * k + d] += all.tipV[3 * (o + k) + d] * w; roll[3 * k + d] += all.roll[3 * (o + k) + d] * w; }
      const v = Math.hypot(all.tipV[3 * (o + k)], all.tipV[3 * (o + k) + 1], all.tipV[3 * (o + k) + 2]);
      spd[k] += v * w; spd2[k] += v * v * w;
      if (k < K && Math.abs(all.th[o + k + 1] - all.th[o + k]) / dtOut > SNAP_THRESHOLD) snap[k] += w;
      for (let j = 0; j < 3 * S1; j++) pts[3 * S1 * k + j] += all.pts[3 * S1 * (o + k) + j] * w;
    }
  }
  for (let k = 0; k < N1; k++) {
    const nn = Math.hypot(roll[3 * k], roll[3 * k + 1], roll[3 * k + 2]) || 1;
    for (let d = 0; d < 3; d++) roll[3 * k + d] /= nn;
  }
  const per = I.cycles.map((c) => ({ J: c.J, Jabs: c.Jabs, Wdrag: c.Wdrag, Wmat: c.Wmat, Wjump: c.Wjump, Wmotor: c.Wmotor, jumps: c.jumps, resid: c.resid }));
  const Js = per.map((p) => p.J), m = Js.reduce((a, b) => a + b, 0) / Ctot;
  const raw = tip ? I.cycles.map((c, cAll) => {
    const ci = Math.min(cAll, C - 1), o = ci * N1, sl = (A, w) => A.slice(w * o, w * (o + N1));
    return { th: sl(all.th, 1).map((x) => x + 2 * Math.PI * (cAll - ci)), tip: sl(all.tip, 3), tipV: sl(all.tipV, 3), roll: sl(all.roll, 3), tipT: sl(all.tipT, 3) };
  }) : null;
  return {
    K, dt: dtOut, Tc: I.Tc, Omega: I.Omega, alpha0: I.alpha0, cycles: Ctot, nOverlap: I.nOverlap, S: I.S,
    th, pts, tipP, tipV, roll, spd, spdSd: spd.map((mm, k) => Math.sqrt(Math.max(0, spd2[k] - mm * mm))), snap,
    per, J: [m, Math.sqrt(Js.reduce((a, b) => a + (b - m) ** 2, 0) / Ctot)], omega1: I.omega1, omegas: I.omegas,
    fluid: I.fluid, steps: I.steps, ms: I.ms, raw, workers: workersUsed, integrated: I.integrated,
  };
}

/** Many designs (optimiser rowing), spread over every core. */
export function solveRowingGrid(items, phys, cycles, onProgress, onPartial) {
  const nW = Math.max(1, Math.min(items.length, CORES, 32));
  const workers = Array.from({ length: nW }, newWorker);
  // Work-stealing queue: each worker takes the next design when it finishes,
  // so slow designs (air, near the fold) do not leave cores idle.
  let next = 0, done = 0;
  const results = [];
  const promise = Promise.all(workers.map((w) => (async () => {
    while (next < items.length) {
      const it = items[next++];
      const res = await runOn(w, { kind: 'rowing', designs: [it], phys, cycles });
      results.push(res[0]); onPartial?.(res[0]); done++; onProgress?.(done / items.length);
    }
    w.terminate();
  })())).then(() => results);
  return { promise, cancel: () => workers.forEach((w) => w.terminate()), workers: nW };
}
