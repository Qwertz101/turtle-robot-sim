import React, { useRef, useEffect, useState, useMemo, useCallback, createContext, useContext } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Play, Pause, RotateCcw, Zap, Activity, Sliders, Gauge, AlertTriangle,
  Boxes, Target, ArrowUpRight, ShieldAlert, Waves, Spline,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   1 · STYLE SHEET — Riverside Labs brand system
   Every colour and font here resolves to a token from
   riverside-labs-tokens.css; no literal hex lives in this file. The
   RaMS accent set applies (robotics/materials lab) — per BRAND.md the
   Neutrino set must never appear on the same screen.

   Type roles: Display = Oswald 600 uppercase +2%, Heading = Oswald 500,
   Caption = Fira Sans 500 uppercase +5%, Data = IBM Plex Mono w/ tabular
   figures. Sizes run ~0.8x the brand scale because this is an
   instrument-dense screen; families, weights, casing and tracking are
   exactly as specified.
   ═══════════════════════════════════════════════════════════════ */
const CSS = `
.ctr{position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;
  background:var(--paper-50);color:var(--ink-900);
  font-family:var(--font-body);font-size:12.5px;line-height:1.55;
  font-variant-numeric:tabular-nums;}
.ctr *{box-sizing:border-box;}
.ctr .mono{font-family:var(--font-mono);font-variant-numeric:tabular-nums;}
.ctr .t9{font-size:9.5px;} .ctr .t10{font-size:10.5px;} .ctr .t11{font-size:11px;}
.ctr .t12{font-size:12px;} .ctr .t13{font-size:13px;} .ctr .t15{font-size:15px;}
.ctr .dim{color:var(--ink-600);} .ctr .mut{color:var(--ink-600);}
.ctr .row{display:flex;align-items:center;}
.ctr .col{display:flex;flex-direction:column;}
.ctr .grow{flex:1;min-width:0;min-height:0;}
/* Caption role */
.ctr .cap-label{font-weight:500;font-size:10.5px;text-transform:uppercase;
  letter-spacing:.05em;color:var(--ink-600);}

/* App bar. In dark mode the -700 token is the LIGHTEST value, so the bar
   takes the -150 fill and -700 becomes its accent text (BRAND.md note). */
.ctr-hdr{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;
  padding:12px 20px 0;background:var(--rams-150);
  border-bottom:1px solid var(--line-300);flex-shrink:0;}
.ctr-hdr h1{margin:0;font-family:var(--font-display);font-weight:600;font-size:20px;
  line-height:26px;text-transform:uppercase;letter-spacing:.02em;color:var(--ink-900);}
.ctr-hdr p{margin:2px 0 12px;font-size:11.5px;color:var(--ink-600);}
.ctr-tabs{display:flex;gap:4px;}
.ctr-tab{display:flex;align-items:center;gap:6px;padding:9px 14px;
  font-family:var(--font-display);font-weight:500;font-size:12.5px;
  text-transform:uppercase;letter-spacing:.03em;
  background:none;border:0;border-bottom:2px solid transparent;
  margin-bottom:-1px;color:var(--ink-600);cursor:pointer;transition:color .15s;}
.ctr-tab:hover{color:var(--ink-900);}
.ctr-tab.on{color:var(--rams-700);border-bottom-color:var(--rams-700);}
/* Light theme: the app bar takes the lab -700 fill with white text, per the
   BRAND.md component default. In dark that same token is the LIGHTEST value,
   so the bar keeps the -150 fill above and -700 becomes its accent instead. */
:root[data-theme="light"] .ctr-hdr{background:var(--rams-700);
  border-bottom-color:var(--rams-700);}
:root[data-theme="light"] .ctr-hdr h1{color:var(--surface);}
:root[data-theme="light"] .ctr-hdr p{color:var(--rams-150);}
:root[data-theme="light"] .ctr-tab{color:var(--rams-150);}
:root[data-theme="light"] .ctr-tab:hover{color:var(--surface);}
:root[data-theme="light"] .ctr-tab.on{color:var(--surface);border-bottom-color:var(--surface);}
:root[data-theme="light"] .ctr-hdr .ctr-btn{background:transparent;
  border-color:var(--rams-150);color:var(--rams-150);}
:root[data-theme="light"] .ctr-hdr .ctr-btn:hover{background:var(--surface);
  border-color:var(--surface);color:var(--rams-700);}

.ctr-body{flex:1;display:flex;min-height:0;}
.ctr-view{position:relative;flex:1;min-width:0;background:var(--paper-50);}
.ctr-view canvas{display:block;position:absolute;inset:0;width:100%;height:100%;}
.ctr-side{width:372px;flex-shrink:0;border-left:1px solid var(--line-300);
  background:var(--surface);display:flex;flex-direction:column;min-height:0;}
.ctr-side.scroll{overflow-y:auto;}
@media(min-width:1400px){.ctr-side{width:420px;}}
@media(max-width:1000px){.ctr-side{width:300px;}}
.ctr-sec{padding:15px 16px;border-bottom:1px solid var(--line-300);display:flex;
  flex-direction:column;gap:10px;}
.ctr-sec h2{margin:0;display:flex;align-items:center;gap:7px;
  font-family:var(--font-display);font-weight:500;font-size:15px;line-height:20px;
  color:var(--ink-900);}

.ctr-cbar{position:absolute;z-index:10;top:50%;right:14px;transform:translateY(-50%);
  display:flex;flex-direction:column;gap:5px;pointer-events:none;}
.ctr-cbar-body{display:flex;gap:6px;height:184px;}
.ctr-cbar-strip{width:14px;border-radius:3px;border:1px solid var(--line-300);}
.ctr-cbar-ticks{display:flex;flex-direction:column;justify-content:space-between;
  color:var(--ink-600);text-align:left;}

.ctr-plot{display:flex;flex-direction:column;gap:5px;padding:12px;flex:1;min-height:0;
  border-bottom:1px solid var(--line-300);}
.ctr-plot .cap{display:flex;justify-content:space-between;align-items:center;
  font-weight:500;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;
  color:var(--ink-600);}
.ctr-plotbox{position:relative;flex:1;min-height:0;overflow:hidden;border-radius:6px;}
/* Canvas must never derive its layout size from its own backing store, or
   width = clientWidth*dpr feeds back and the element doubles every frame. */
.ctr canvas{display:block;}
.ctr-plotbox canvas{position:absolute;inset:0;width:100%;height:100%;border-radius:6px;}

.ctr-foot{flex-shrink:0;border-top:1px solid var(--line-300);padding:12px 20px;
  background:var(--paper-100);
  display:flex;flex-wrap:wrap;align-items:center;gap:12px 22px;}
.ctr-foot .ctr-metrics{flex-basis:100%;display:flex;flex-wrap:wrap;gap:10px;}
.ctr-sliders{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));
  gap:12px 20px;flex:1;min-width:280px;}
@media(max-width:1500px){.ctr-sliders{grid-template-columns:repeat(3,minmax(0,1fr));}}
@media(max-width:1180px){.ctr-sliders{grid-template-columns:repeat(2,minmax(0,1fr));}}

/* Buttons. Primary action = the lab -500 token; in dark mode that token is
   light, so the label takes the app background for contrast (7.3:1). */
.ctr-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;
  padding:8px 13px;border-radius:6px;cursor:pointer;
  font-family:var(--font-display);font-weight:500;font-size:12px;
  text-transform:uppercase;letter-spacing:.03em;
  background:var(--paper-100);border:1px solid var(--line-300);color:var(--ink-900);
  transition:background .15s,border-color .15s;}
.ctr-btn:hover{background:var(--rams-150);border-color:var(--rams-500);}
.ctr-btn.on{background:var(--rams-500);border-color:var(--rams-500);color:var(--paper-50);}
.ctr-btn.primary{width:100%;padding:10px 12px;background:var(--rams-500);
  border-color:var(--rams-500);color:var(--paper-50);}
.ctr-btn.primary:hover{background:var(--rams-700);border-color:var(--rams-700);}

.ctr-metric{padding:7px 11px;border-radius:6px;background:var(--paper-100);
  border:1px solid var(--line-300);min-width:100px;}
.ctr-metric .k{display:flex;align-items:center;gap:4px;font-weight:500;font-size:9.5px;
  text-transform:uppercase;letter-spacing:.05em;color:var(--ink-600);}
.ctr-metric .v{font-family:var(--font-mono);font-size:14px;line-height:20px;
  font-variant-numeric:tabular-nums;margin-top:2px;color:var(--ink-900);
  display:flex;align-items:baseline;gap:6px;}
.ctr-state{display:inline-flex;align-items:center;gap:4px;font-family:var(--font-body);
  font-weight:500;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;
  color:var(--ink-600);}
.ctr-state i{width:6px;height:6px;border-radius:50%;flex-shrink:0;}

.ctr-sl{display:flex;flex-direction:column;gap:5px;}
.ctr-sl .lab{display:flex;align-items:baseline;justify-content:space-between;gap:8px;
  font-weight:500;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;
  color:var(--ink-600);}
.ctr-sl .lab i{font-style:normal;text-transform:none;letter-spacing:0;
  font-family:var(--font-mono);color:var(--ink-600);}
.ctr-sl .val{font-family:var(--font-mono);font-size:12.5px;flex-shrink:0;
  text-transform:none;letter-spacing:0;font-variant-numeric:tabular-nums;
  color:var(--ink-900);}
.ctr-sl input[type=range]{width:100%;height:4px;border-radius:999px;
  background:var(--line-300);-webkit-appearance:none;appearance:none;cursor:pointer;}
.ctr-sl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;
  height:13px;border-radius:50%;background:currentColor;border:0;}
.ctr-sl input[type=range]::-moz-range-thumb{width:13px;height:13px;border-radius:50%;
  background:currentColor;border:0;}

.ctr-gauge{display:flex;flex-direction:column;gap:4px;}
.ctr-gauge .top{display:flex;align-items:baseline;justify-content:space-between;
  font-weight:500;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;
  color:var(--ink-600);}
.ctr-gauge .track{position:relative;display:flex;height:8px;border-radius:999px;
  overflow:hidden;background:var(--paper-100);}
.ctr-gauge .needle{position:absolute;top:0;bottom:0;width:2px;background:var(--ink-900);
  box-shadow:0 0 6px var(--paper-50);}

.ctr-tip{position:absolute;z-index:20;width:236px;padding:11px;border-radius:8px;
  background:var(--surface);border:1px solid var(--line-300);pointer-events:none;
  box-shadow:0 10px 30px rgba(0,0,0,.45);font-size:11.5px;}
.ctr .r{display:flex;justify-content:space-between;align-items:baseline;gap:10px;
  line-height:1.7;font-size:11.5px;}
.ctr .r > span:last-child{font-family:var(--font-mono);font-variant-numeric:tabular-nums;}
.ctr-tip hr{border:0;border-top:1px solid var(--line-300);margin:6px 0;}

.ctr-overlay{position:absolute;z-index:10;pointer-events:none;
  font-family:var(--font-mono);font-size:10px;line-height:1.7;}

/* Status pills/notices use ONLY the semantic --signal-* colours, never a lab
   accent, so "critical" reads identically across Riverside Labs apps. */
.ctr-note{padding:10px 11px;border-radius:6px;font-size:11.5px;line-height:1.55;
  background:color-mix(in srgb, var(--signal-watch) 18%, transparent);
  border:1px solid color-mix(in srgb, var(--signal-watch) 45%, transparent);
  color:var(--signal-watch);}
.ctr-alert{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
  display:flex;align-items:center;gap:8px;padding:8px 13px;border-radius:999px;
  background:color-mix(in srgb, var(--signal-critical) 20%, var(--surface));
  border:1px solid color-mix(in srgb, var(--signal-critical) 55%, transparent);
  color:var(--signal-critical);font-weight:600;font-size:12px;}
.ctr-badge{position:absolute;bottom:16px;left:16px;padding:6px 11px;border-radius:999px;
  background:color-mix(in srgb, var(--signal-watch) 18%, var(--surface));
  border:1px solid color-mix(in srgb, var(--signal-watch) 45%, transparent);
  color:var(--signal-watch);font-size:11px;}

.ctr-p{margin:0;font-size:12.5px;line-height:1.65;color:var(--ink-600);}
.ctr-check{display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:11.5px;
  line-height:1.55;color:var(--ink-600);}
.ctr-check input{margin-top:2px;accent-color:var(--rams-500);}
.ctr-link{background:none;border:0;padding:0;font-size:11.5px;color:var(--riverside-blue-500);
  text-decoration:underline;text-underline-offset:2px;cursor:pointer;text-align:left;}
.ctr-link:hover{color:var(--rams-700);}
.ctr-swatch{display:inline-block;width:24px;height:2px;flex-shrink:0;}
.ctr-numrow{display:flex;align-items:center;gap:8px;margin-top:-2px;}
.ctr-numrow input{width:88px;padding:5px 7px;border-radius:5px;
  background:var(--paper-100);border:1px solid var(--line-300);color:var(--ink-900);
  font-family:var(--font-mono);font-size:12px;font-variant-numeric:tabular-nums;}
.ctr-numrow input:focus{outline:none;border-color:var(--rams-500);}
`;

/* ── Runtime palette ──────────────────────────────────────────────────────
   Canvas 2-D and WebGL need literal colour strings, not CSS variables, so the
   Riverside Labs tokens are resolved once from the document and cached here.
   That keeps riverside-labs-tokens.css the single source of truth: change a
   token and the chrome, the plots and the 3-D scene all follow. Values below
   are the dark-theme fallbacks used before the first sync (and under SSR).

   Semantic mapping (BRAND.md): stability is a STATUS, so it uses the shared
   --signal-* colours rather than a lab accent — "unstable" must read the same
   in every Riverside Labs app. Stable/unstable is additionally encoded in dash
   pattern and stroke weight, so the distinction survives colour-blindness. */
const C = {
  bg: '#12151A',          // --paper-50
  panel: '#181C22',       // --surface
  line: 'rgba(58,64,72,0.55)',
  grid: 'rgba(58,64,72,0.40)',
  axis: 'rgba(166,172,184,0.30)',
  dim: '#A6ACB8',         // --ink-600
  ink: '#E7E5DE',         // --ink-900
  green: '#5E8C74',       // --signal-good      · stable
  unstable: '#A65D57',    // --signal-critical  · unstable / fault
  red: '#A65D57',         // --signal-critical
  gold: '#B8925A',        // --signal-watch     · needs attention
  cyan: '#A9D2CB',        // --rams-700         · lab accent
  accent: '#7FADA7',      // --rams-500         · primary action
  sand: '#D2B579',        // --riverside-sand-600
  blue: '#7C97C1',        // --riverside-blue-500
};

/** Sequential ramp for the efficiency score, built from brand hues only:
 *  paper → institutional blue → RaMS teal → sand → ink. Lightness increases
 *  monotonically so it still reads correctly in greyscale. */
let STOPS = [
  [0.00, [18, 21, 26]], [0.20, [34, 52, 74]], [0.42, [74, 102, 144]],
  [0.62, [127, 173, 167]], [0.82, [210, 181, 121]], [1.00, [231, 229, 222]],
];

const hexToRgb = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (hex, a) => {
  const c = hexToRgb(hex);
  return c ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : hex;
};

/** Pull the live token values into C and STOPS. Called on mount and whenever
 *  the theme changes, so light mode restyles the canvases and the 3-D scene
 *  without any duplicated colour table. */
function syncTokens() {
  if (typeof window === 'undefined') return;
  const cs = getComputedStyle(document.documentElement);
  const t = (name, fallback) => {
    const v = cs.getPropertyValue(name).trim();
    return v || fallback;
  };
  C.bg = t('--paper-50', C.bg);
  C.panel = t('--surface', C.panel);
  C.dim = t('--ink-600', C.dim);
  C.ink = t('--ink-900', C.ink);
  C.green = t('--signal-good', C.green);
  C.unstable = t('--signal-critical', C.unstable);
  C.red = C.unstable;
  C.gold = t('--signal-watch', C.gold);
  C.cyan = t('--rams-700', C.cyan);
  C.accent = t('--rams-500', C.accent);
  C.sand = t('--riverside-sand-600', C.sand);
  C.blue = t('--riverside-blue-500', C.blue);

  const lineHex = t('--line-300', '#3A4048');
  C.line = rgba(lineHex, 0.55);
  C.grid = rgba(lineHex, 0.40);
  C.axis = rgba(C.dim, 0.30);

  const ramp = ['--paper-50', '--riverside-blue-100', '--riverside-blue-500',
    '--rams-500', '--riverside-sand-600', '--ink-900'];
  const at = [0, 0.2, 0.42, 0.62, 0.82, 1];
  const next = ramp.map((name, i) => [at[i], hexToRgb(t(name, '#000000'))]);
  if (next.every(([, c]) => c)) STOPS = next;
}

/** three.js wants 0xRRGGBB integers. */
const hexInt = (h) => {
  const c = hexToRgb(h);
  return c ? (c[0] << 16) | (c[1] << 8) | c[2] : 0x808080;
};

/* ═══════════════════════════════════════════════════════════════
   2 · SHARED TORSIONAL MODEL
   V(θ) = ½(θ−α)² − λcos θ ; V′ = (θ−α) + λ sin θ ; V″ = 1 + λ cos θ
   ═══════════════════════════════════════════════════════════════ */
const energy = (th, a, l) => 0.5 * (th - a) ** 2 - l * Math.cos(th);
const gradient = (th, a, l) => (th - a) + l * Math.sin(th);
const stiffness = (th, l) => 1 + l * Math.cos(th);

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
function integrateShape(alpha, thetaTip, k1, k2, Lc, Lext) {
  const ds = Lc / N_STEPS;
  let R = eye3(), px = 0, py = 0, pz = 0;
  const pts = [new THREE.Vector3(0, 0, 0)];

  // 1 · OVERLAP, s ∈ [0, L_c]. Both tubes present, so the curvature is the
  //     equal-stiffness average of the two precurvature vectors (Part 5).
  for (let i = 0; i < N_STEPS; i++) {
    const s = i / N_STEPS;
    const th = alpha + (thetaTip - alpha) * s;
    const Kx = (k1 + k2 * Math.cos(th)) / 2;
    const Ky = (k2 * Math.sin(th)) / 2;
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
// kb/kt = EI/GJ = 1+nu = 1.33 for a circular section (Part 2 special case).
const C_STIFF = NITINOL.kb / NITINOL.kt;
const EPS_SUPERELASTIC = 0.08;   // MONOTONIC limit — never a cyclic safety gate
/** Coffin-Manson inverted for a target cycle count (Part 6). This, not the
 *  8% monotonic limit, is the fatigue-relevant allowable strain. */
const epsAllowFor = (N) => Math.pow(10 / N, 1 / 5);
const LAMBDA_CRIT = Math.PI ** 2 / 4;      // 2.467, beta_sigma = 0 only

/** Actuator work per revolution: ∮|τ dα|, τ = −λ sin θ, dα = (1+λcos θ)dθ */
function motorWork(lambda) {
  let s = 0;
  const n = 200, h = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    const t = h * (i + 0.5);
    s += Math.abs(lambda * Math.sin(t) * (1 + lambda * Math.cos(t))) * h;
  }
  return s;
}

/** Coffin-Manson strain-life power law. The FORM is standard; the constants
 *  (10, −5) are ILLUSTRATIVE placeholders, not fitted to Nitinol test data —
 *  absolute counts here are optimistic by orders of magnitude. Use only for
 *  RELATIVE ranking across the sweep (Part 6 / Part 7). */
const fatigueLife = (e) => (e > 0 ? 10 * Math.pow(e, -5) : Infinity);

/** λ = (k_b/k_t)·L_c²·κ₁·κ₂ — bifurcation index of a two-tube system.
 *  ASSUMES EQUAL STIFFNESS (k1b=k2b, k1t=k2t), i.e. two tubes of the same
 *  material and cross-section. The general form in CTR_PHYSICS_RULES Part 2
 *  carries both tubes' stiffness ratios and must be restored if that ever
 *  stops holding.
 *  It is a PRODUCT of the two precurvatures, so a straight tube anywhere in
 *  the pair (κ = 0) drives λ to zero and the system cannot snap at all: with
 *  nothing to twist against, there is no competing curvature to store energy.
 *  The design sweep varies a single κ, which is this same expression on the
 *  equal-precurvature diagonal κ₁ = κ₂ = κ, giving the λ = C·L_c²·κ² of the
 *  specification. */
const bifurcation = (k1, k2, Lc) => C_STIFF * Lc * Lc * k1 * k2;

function evaluateDesign(kappa, Lc, strainLimit, etaK = 0.05) {
  const lambda = C_STIFF * Lc * Lc * kappa * kappa;
  const eb = kappa * NITINOL.r;
  const base = {
    kappa, Lc, lambda, eb, gamma: 0, eeq: eb, dE: 0, dE_J: 0, Win: 0, eta: 0,
    score: 0, thetaPeak: 0, thetaStable: 0, stored_J: 0, N: fatigueLife(eb), regime: 'stable',
  };
  if (lambda <= LAMBDA_CRIT) return base;

  const thetaPeak = Math.acos(-1 / lambda);              // fold: V″ = 0
  const alphaSnap = thetaPeak + lambda * Math.sin(thetaPeak);
  const g = (t) => t - alphaSnap + lambda * Math.sin(t);

  let thetaStable = null;
  for (let t = thetaPeak + 0.02; t < thetaPeak + 6 * Math.PI; t += 0.02) {
    if (g(t) > 0 && stiffness(t, lambda) > 0) {
      let lo = t - 0.02, hi = t;
      for (let k = 0; k < 40; k++) {
        const m = (lo + hi) / 2;
        if (g(m) > 0) hi = m; else lo = m;
      }
      thetaStable = (lo + hi) / 2;
      break;
    }
  }
  if (thetaStable === null) return base;

  const dE = energy(thetaPeak, alphaSnap, lambda) - energy(thetaStable, alphaSnap, lambda);
  const scale = NITINOL.kt / Lc;
  const gamma = (Math.abs(thetaStable - thetaPeak) / Lc) * NITINOL.r;
  // Approximate combined-strain metric (Part 6). The 0.33 is a deliberate
  // stand-in for nu, NOT 1/3, and this is NOT the literature von Mises strain.
  const eeq = Math.sqrt(eb * eb + 0.33 * gamma * gamma);
  const Win = motorWork(lambda);
  // ENGINEERING PLACEHOLDER (Part 6). etaK has no physical derivation and is
  // NOT from the burst-and-coast swimming paper, which supplies qualitative
  // motivation only — which is exactly why it is exposed as a control rather
  // than buried as a literal. It carries units of 1/ΔE, so its numeric value
  // is only meaningful against the dimensionless ΔE.
  const eta = 1 - Math.exp(-etaK * dE);
  const gate = Math.exp(-Math.pow(eeq / strainLimit, 4));
  return {
    kappa, Lc, lambda, eb, gamma, eeq, dE, dE_J: dE * scale, Win, eta, gate,
    score: Win > 1e-9 ? eta * (dE / Win) * gate : 0,
    thetaPeak, thetaStable, alphaSnap,
    stored_J: 0.5 * (thetaPeak - alphaSnap) ** 2 * scale,
    N: fatigueLife(eeq),
    regime: eeq > strainLimit ? 'failure' : 'snapping',
  };
}

/* ═══════════════════════════════════════════════════════════════
   4b · HYSTERESIS — branch-following continuation
   The equilibrium condition g(θ) = θ − α + λ sin θ = 0 is multivalued past
   the fold, so the tube's tip angle is not a function of the motor angle: it
   depends on which branch the system is ON, i.e. where it has been. Sweeping
   α up and back down therefore snaps at two DIFFERENT angles, tracing a
   hysteresis loop. Solving for a root at each α independently would miss this
   entirely — the branch has to be carried forward.
   ═══════════════════════════════════════════════════════════════ */

/** All equilibria at a given motor angle. */
function equilibria(lambda, a) {
  const g = (t) => t - a + lambda * Math.sin(t);
  const lo = a - lambda - Math.PI, hi = a + lambda + Math.PI;
  const N = 600, out = [];
  let pt = lo, pg = g(lo);
  for (let i = 1; i <= N; i++) {
    const t = lo + ((hi - lo) * i) / N, gt = g(t);
    if (pg === 0 || pg * gt < 0) {
      let x0 = pt, x1 = t;
      for (let k = 0; k < 60; k++) {
        const m = (x0 + x1) / 2;
        if (g(x0) * g(m) <= 0) x1 = m; else x0 = m;
      }
      out.push((x0 + x1) / 2);
    }
    pt = t; pg = gt;
  }
  return out;
}

/** Newton continuation of the CURRENT branch. Returns null when the branch
 *  has folded away (V″ ≤ 0, singular Jacobian, or a jump to another root),
 *  which is precisely the snap condition. */
function branchStep(lambda, a, th) {
  let x = th;
  for (let k = 0; k < 60; k++) {
    const d = 1 + lambda * Math.cos(x);
    if (Math.abs(d) < 1e-7) return null;
    const step = (x - a + lambda * Math.sin(x)) / d;
    x -= step;
    if (Math.abs(step) < 1e-13) break;
  }
  if (!Number.isFinite(x)) return null;
  if (1 + lambda * Math.cos(x) <= 0) return null;
  if (Math.abs(x - th) > Math.PI / 2) return null;
  return x;
}

/** One direction of the sweep. */
function sweepBranch(lambda, from, to, N) {
  const pts = [], snaps = [];
  // Seed on an actual equilibrium. θ = α is NOT a solution once λ > 0, so
  // starting there made the first Newton correction look like a snap.
  const seed = equilibria(lambda, from).filter((r) => stiffness(r, lambda) > 0);
  let th = seed.length
    ? seed.reduce((p, c) => (Math.abs(c - from) < Math.abs(p - from) ? c : p))
    : from;
  for (let i = 0; i <= N; i++) {
    const a = from + ((to - from) * i) / N;
    const next = branchStep(lambda, a, th);
    if (next !== null) { pts.push({ a, th: next, snap: false }); th = next; continue; }

    // The branch is gone. Fall to the lowest-energy stable equilibrium that is
    // not the one we just left.
    const roots = equilibria(lambda, a).filter((r) => stiffness(r, lambda) > 0);
    if (!roots.length) { pts.push({ a, th, snap: false }); continue; }
    let best = null, bestE = Infinity;
    for (const r of roots) {
      if (Math.abs(r - th) < 0.25) continue;
      const e = energy(r, a, lambda);
      if (e < bestE) { bestE = e; best = r; }
    }
    if (best === null) best = roots.reduce((p, c) => (energy(c, a, lambda) < energy(p, a, lambda) ? c : p));
    snaps.push({ a, from: th, to: best, released: energy(th, a, lambda) - energy(best, a, lambda) });
    pts.push({ a, th: best, snap: true });
    th = best;
  }
  return { pts, snaps };
}

function hysteresisLoop(lambda, revs = 1, N = 700) {
  const A = revs * 2 * Math.PI;
  return { up: sweepBranch(lambda, -A, A, N), down: sweepBranch(lambda, A, -A, N) };
}

/* ═══════════════════════════════════════════════════════════════
   4c · MOTOR + HYDRODYNAMICS
   ═══════════════════════════════════════════════════════════════ */

/** DC motor speed–torque line: linear from stall torque to no-load speed. */
const torqueAvail = (rpm, rpmNoLoad, stall_Nmm) =>
  Math.max(0, (stall_Nmm / 1000) * (1 - rpm / rpmNoLoad));

/**
 * Everything downstream of a snap: the energy it releases, whether the motor
 * can actually drive the wind-up, and what that buys in the water.
 *
 * Cruise speed balances average thrust power against quadratic body drag,
 * P = ½ρ C_d A v³. It ignores friction, superelastic hysteresis loss, and
 * added-mass effects, so it is an optimistic upper bound — not a prediction.
 */
function propulsion(lambda, Lc, motor, hydro) {
  const scale = NITINOL.kt / Lc;                  // N·m per unit of V(θ)
  const REVS = 1;
  const loop = hysteresisLoop(lambda, REVS, 520);
  const snaps = [...loop.up.snaps, ...loop.down.snaps];
  // The up sweep runs α from −2π·REVS to +2π·REVS, i.e. 2·REVS revolutions —
  // NOT one. Counting its raw length as a per-revolution rate double-counted
  // and inflated thrust power. Count over the LAST full revolution only, so
  // the rate is per-revolution and any start transient is excluded.
  const aLast = 2 * Math.PI * REVS - 2 * Math.PI;
  const snapsPerRev = loop.up.snaps.filter((sn) => sn.a >= aLast).length;

  if (!snaps.length) {
    return { snapCapable: false, loop, snapsPerRev: 0 };
  }
  const biggest = snaps.reduce((p, c) => (Math.abs(c.to - c.from) > Math.abs(p.to - p.from) ? c : p));
  const released = Math.max(biggest.released, 0) * scale;      // J
  const dTip = Math.abs(biggest.to - biggest.from);            // rad
  const motorPerRev = motorWork(lambda) * scale;               // J per revolution

  // Reaction torque on the motor is ∂V/∂α = −(θ−α); take the peak over the
  // smooth stretches, excluding the snap discontinuities themselves.
  let peakTorque = 0;
  for (const p of loop.up.pts) {
    if (p.snap) continue;
    peakTorque = Math.max(peakTorque, Math.abs(p.th - p.a) * scale);
  }
  const avail = torqueAvail(motor.rpm, motor.rpmNoLoad, motor.stall);

  const Afin = (hydro.finW / 1000) * Lc;                       // m²
  const sSwept = Math.max(dTip * Lc, 1e-6);                    // m
  const vJet = Math.sqrt((2 * released) / (hydro.rho * hydro.Cd * Afin * sSwept));

  const cycle = 60 / motor.rpm;                                // s per revolution
  const Pthrust = (hydro.nFins * released * snapsPerRev) / cycle;
  const areaM2 = hydro.area / 1e4;
  const vCruise = Math.cbrt((2 * Pthrust) / (hydro.rho * hydro.bodyCd * areaM2));

  return {
    snapCapable: true, loop, snaps, snapsPerRev, released, dTip,
    motorPerRev, peakTorque, avail,
    torqueMargin: peakTorque > 0 ? avail / peakTorque : Infinity,
    energyMargin: released > 0 ? motorPerRev / released : Infinity,
    vJet, Pthrust, vCruise,
  };
}

function buildGrid({ nx, ny, kappaMax, LcMin, LcMax, strainLimit, etaK }) {
  const cells = [];
  let best = null, maxDE = 0, maxMJ = 0, maxScore = 0;
  for (let j = 0; j < ny; j++) {
    const Lc = LcMin + ((LcMax - LcMin) * j) / (ny - 1);
    for (let i = 0; i < nx; i++) {
      const d = evaluateDesign((kappaMax * i) / (nx - 1), Lc, strainLimit, etaK);
      cells.push(d);
      if (d.dE > maxDE) maxDE = d.dE;
      if (d.dE_J > maxMJ) maxMJ = d.dE_J;
      if (d.score > maxScore) { maxScore = d.score; best = d; }
    }
  }
  // maxMJ is in JOULES here; the surface converts to mJ at the point of use.
  return { cells, nx, ny, kappaMax, LcMin, LcMax, maxDE, maxMJ, maxScore, best };
}

/* ── Math typesetting ─────────────────────────────────────────────────────
   Variables are written in LaTeX-ish source ("L_c", "E_snap", "kappa_1",
   "m^-1") and rendered with real sub/superscripts. A full KaTeX dependency
   would be heavy for what this app needs — a handful of single-level scripts —
   and would not help the CANVAS plots or the WebGL sprite labels at all, which
   is where most of the variable names actually live. One tiny tokenizer serves
   all three surfaces.

   Note Unicode alone cannot do this: there is no subscript "c" codepoint, so
   "L_c" is unrepresentable as plain text. */

/** "E_snap (mJ)" → [{t:'E'},{t:'snap',sub:1},{t:' (mJ)'}]  ·  also handles ^ */
function mathRuns(src) {
  const s = String(src), out = [];
  let i = 0, buf = '';
  const flush = () => { if (buf) { out.push({ t: buf }); buf = ''; } };
  while (i < s.length) {
    const ch = s[i];
    if ((ch === '_' || ch === '^') && i + 1 < s.length) {
      const kind = ch === '_' ? 'sub' : 'sup';
      if (s[i + 1] === '{') {
        flush();
        const j = s.indexOf('}', i + 1);
        const end = j < 0 ? s.length : j;
        out.push({ t: s.slice(i + 2, end), [kind]: 1 });
        i = j < 0 ? s.length : j + 1;
      } else {
        // Strict LaTeX would script exactly one character, which would render
        // this codebase's "E_snap" as E, subscript-s, "nap". A whole
        // alphanumeric run is scripted instead; braces still force the split
        // where a name genuinely ends mid-token.
        const m = /^[-+]?[A-Za-z0-9]+/.exec(s.slice(i + 1));
        if (m) {
          flush();
          out.push({ t: m[0], [kind]: 1 });
          i += 1 + m[0].length;
        } else { buf += ch; i += 1; }
      }
    } else { buf += ch; i += 1; }
  }
  flush();
  return out;
}

/** Inline math for JSX: <M>{'L_c'}</M> → L<sub>c</sub> */
function M({ children }) {
  return (
    <>
      {mathRuns(children).map((r, i) =>
        r.sub ? <sub key={i}>{r.t}</sub>
          : r.sup ? <sup key={i}>{r.t}</sup>
            : <React.Fragment key={i}>{r.t}</React.Fragment>)}
    </>
  );
}

const SCRIPT_SCALE = 0.72;

/** Width of a math string in the ctx's current font size. */
function mathWidth(ctx, src, size) {
  const base = ctx.font;
  let w = 0;
  for (const r of mathRuns(src)) {
    ctx.font = base.replace(/\d+(\.\d+)?px/, `${(r.sub || r.sup ? size * SCRIPT_SCALE : size).toFixed(2)}px`);
    w += ctx.measureText(r.t).width;
  }
  ctx.font = base;
  return w;
}

/** Draw a math string on a 2-D context. `align` is 'left' | 'center' | 'right'
 *  and is applied to the WHOLE string, since per-run alignment would stagger
 *  the pieces. Returns the width drawn. */
function fillMath(ctx, src, x, y, size, align = 'left') {
  const runs = mathRuns(src);
  const base = ctx.font;
  const total = mathWidth(ctx, src, size);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const r of runs) {
    const isScript = r.sub || r.sup;
    ctx.font = base.replace(/\d+(\.\d+)?px/, `${(isScript ? size * SCRIPT_SCALE : size).toFixed(2)}px`);
    const dy = r.sub ? size * 0.18 : r.sup ? -size * 0.34 : 0;
    ctx.fillText(r.t, cx, y + dy);
    cx += ctx.measureText(r.t).width;
  }
  ctx.font = base;
  ctx.textAlign = prevAlign;
  return total;
}

/* ── Plot axis helpers ────────────────────────────────────────────────────
   Every axis in this app carries a quantity, a symbol and a unit. Angles are
   ticked in multiples of π because that is where the physics lands (the fold
   sits near θ = π), and marked "rad" so they are never read as degrees. */

/** Tick positions at π/2, π or 2π spacing across [−R, R], labelled in π. */
function piTicks(R, maxTicks = 7) {
  const steps = [Math.PI / 2, Math.PI, 2 * Math.PI, 4 * Math.PI, 8 * Math.PI];
  const step = steps.find((sp) => (2 * R) / sp <= maxTicks) ?? steps[steps.length - 1];
  const out = [];
  for (let i = -Math.floor(R / step); i <= Math.floor(R / step); i++) {
    const v = i * step, k = v / Math.PI;
    let lab;
    if (Math.abs(k) < 1e-9) lab = '0';
    else if (Math.abs(k - Math.round(k)) < 1e-9) {
      const n = Math.round(k);
      lab = n === 1 ? 'π' : n === -1 ? '−π' : `${n}π`;
    } else lab = k > 0 ? 'π/2' : '−π/2';
    out.push({ v, lab });
  }
  return out;
}

/** Evenly spaced numeric ticks across [min, max]. */
function linTicks(min, max, n = 4, digits = 1) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const v = min + ((max - min) * i) / n;
    out.push({ v, lab: v.toFixed(digits) });
  }
  return out;
}

/** Tick marks, tick labels and axis titles for a 2-D canvas plot. */
function drawAxes(ctx, { w, h, pad, xTicks, yTicks, X, Y, xLabel, yLabel }) {
  ctx.save();
  ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.strokeStyle = C.axis; ctx.lineWidth = 1; ctx.fillStyle = C.dim;

  ctx.textBaseline = 'top';
  xTicks.forEach(({ v, lab }) => {
    const x = X(v);
    if (x < pad.l - 0.5 || x > w - pad.r + 0.5) return;
    ctx.beginPath(); ctx.moveTo(x, h - pad.b); ctx.lineTo(x, h - pad.b + 4); ctx.stroke();
    fillMath(ctx, lab, x, h - pad.b + 6, 9, 'center');
  });

  ctx.textBaseline = 'middle';
  yTicks.forEach(({ v, lab }) => {
    const y = Y(v);
    if (y < pad.t - 0.5 || y > h - pad.b + 0.5) return;
    ctx.beginPath(); ctx.moveTo(pad.l - 4, y); ctx.lineTo(pad.l, y); ctx.stroke();
    fillMath(ctx, lab, pad.l - 6, y, 9, 'right');
  });

  ctx.fillStyle = C.dim;
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.textBaseline = 'bottom';
  fillMath(ctx, xLabel, pad.l + (w - pad.l - pad.r) / 2, h - 1, 10, 'center');
  ctx.save();
  ctx.translate(10, pad.t + (h - pad.t - pad.b) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'top';
  fillMath(ctx, yLabel, 0, 0, 10, 'center');
  ctx.restore();
  ctx.restore();
}

const cmapCss = () => STOPS.map(([p, c]) => `rgb(${c.join(",")}) ${(p * 100).toFixed(1)}%`).join(", ");

/** Vertical colour scale for the independent 4th variable, with numeric ticks
 *  — the colour axis has its own range and cannot be read off the z axis. */
function ColorBar({ max, label, ticks = 5 }) {
  const rows = Array.from({ length: ticks }, (_, i) => 1 - i / (ticks - 1));
  return (
    <div className="ctr-cbar">
      <div className="mono t9 mut" style={{ textAlign: "right" }}><M>{label}</M></div>
      <div className="ctr-cbar-body">
        <div className="ctr-cbar-strip" style={{ background: `linear-gradient(to top, ${cmapCss()})` }} />
        <div className="ctr-cbar-ticks mono t9">
          {rows.map((t) => <span key={t}>{(t * max).toFixed(2)}</span>)}
        </div>
      </div>
    </div>
  );
}

function colormap(t) {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (x <= STOPS[i][0]) {
      const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i];
      const f = (x - a) / (b - a);
      return [0, 1, 2].map((k) => (ca[k] + (cb[k] - ca[k]) * f) / 255);
    }
  }
  return STOPS[STOPS.length - 1][1].map((v) => v / 255);
}

/* ═══════════════════════════════════════════════════════════════
   5 · SHARED DESIGN STORE
   ═══════════════════════════════════════════════════════════════ */
const DesignCtx = createContext(null);
const useDesign = () => useContext(DesignCtx);

function useDesignStore() {
  // κ₁ = κ₂ = 9.4 m⁻¹ over a 150 mm overlap reproduces the λ ≈ 3.2 this view
  // used to hard-code, but now as a consequence of the geometry rather than a
  // free parameter.
  const [sim, setSim] = useState({ alphaDeg: 0, LcMm: 150, extMm: 45, k1: 9.4, k2: 9.4 });
  const [handoff, setHandoff] = useState(null);
  const patchSim = useCallback((p) => setSim((s) => ({ ...s, ...p })), []);
  const applyDesign = useCallback((d) => {
    // The sweep is the equal-precurvature diagonal, so a design lands in the
    // simulator as κ₁ = κ₂ = κ; λ then follows from those and L_c.
    const k = Math.min(25, d.kappa);
    setSim((s) => ({ ...s, LcMm: d.Lc * 1000, k1: k, k2: k, alphaDeg: 0 }));
    setHandoff({ kappa: d.kappa, Lc: d.Lc, lambda: d.lambda, stamp: Date.now() });
  }, []);
  return { sim, patchSim, handoff, applyDesign };
}

/* ═══════════════════════════════════════════════════════════════
   6 · UI ATOMS
   ═══════════════════════════════════════════════════════════════ */
function Slider({ label, symbol, value, min, max, step, onChange, unit, accent, digits }) {
  const d = digits !== undefined ? digits : unit === '°' ? 0 : 2;
  return (
    <div className="ctr-sl" style={{ color: accent }}>
      <div className="lab">
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <M>{label}</M> <i><M>{symbol}</M></i>
        </span>
        <span className="val mono">{value.toFixed(d)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}

function Metric({ icon, label, value, color, note }) {
  return (
    <div className="ctr-metric">
      <div className="k">{icon}<M>{label}</M></div>
      <div className="v mono">
        {value}
        {note && (
          <span className="ctr-state">
            <i style={{ background: color }} />{note}
          </span>
        )}
      </div>
    </div>
  );
}

function ZoneGauge({ label, value, display, bands, max }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  const zone = bands.find((b) => value <= b.upto) || bands[bands.length - 1];
  return (
    <div className="ctr-gauge">
      <div className="top">
        <span><M>{label}</M></span>
        <span className="mono t12" style={{ color: zone.color }}>{display}</span>
      </div>
      <div className="track">
        {bands.map((b, i) => {
          const from = i === 0 ? 0 : bands[i - 1].upto;
          const w = ((Math.min(b.upto, max) - from) / max) * 100;
          return <div key={i} style={{ width: `${Math.max(0, w)}%`, background: b.color, opacity: 0.28 }} />;
        })}
        <div className="needle" style={{ left: `${pct}%` }} />
      </div>
      <span className="t10" style={{ color: zone.color }}><M>{zone.name}</M></span>
    </div>
  );
}

function Row({ k, v, c }) {
  return <div className="r"><span className="dim"><M>{k}</M></span><span className="mono" style={{ color: c }}>{v}</span></div>;
}

/* ═══════════════════════════════════════════════════════════════
   7 · WORKSPACE A — INTERACTIVE 3D SIMULATOR
   ═══════════════════════════════════════════════════════════════ */
function SimulatorWorkspace() {
  const { sim, patchSim, handoff } = useDesign();
  const { alphaDeg, LcMm, extMm, k1, k2 } = sim;
  const lambda = bifurcation(k1, k2, LcMm / 1000);
  const [sweeping, setSweeping] = useState(false);
  const [slow, setSlow] = useState(false);
  const [topView, setTopView] = useState(false);
  // Which material point gets traced onto the floor. The fin tip is the
  // hydrodynamically active end; the end of the overlap is where the sheath
  // releases the fin, which is the point a distally-mounted flap would pivot
  // about. Both are legitimate design references, so the choice is exposed.
  const [traceMode, setTraceMode] = useState('off');
  const [hud, setHud] = useState({ theta: 0, alpha: 0, kres: 0, V: 0, Vpp: 1, vel: 0, snapping: false });

  const P = useRef({ alpha: 0, lambda, k1, k2, Lc: LcMm / 1000, Lext: extMm / 1000,
    sweeping: false, slow: false, trace: 'off' });
  useEffect(() => {
    P.current = { alpha: (alphaDeg * Math.PI) / 180, lambda, k1, k2,
      Lc: LcMm / 1000, Lext: extMm / 1000, sweeping, slow, trace: traceMode };
  }, [alphaDeg, lambda, k1, k2, LcMm, extMm, sweeping, slow, traceMode]);

  const theta = useRef(0), vel = useRef(0), flash = useRef(0), subAccum = useRef(0);
  const trail = useRef([]), sweepAlpha = useRef(0);
  const mountRef = useRef(null), energyRef = useRef(null), scurveRef = useRef(null);
  const three = useRef({});

  useEffect(() => {
    if (!handoff) return;
    theta.current = 0; vel.current = 0; trail.current = [];
    three.current.trace?.clear();
  }, [handoff?.stamp]);

  /* A traced curve belongs to ONE tube geometry. Changing a precurvature, the
     overlap or the extension moves every material point on the backbone, so a
     path drawn under the old parameters is not a path of the current robot --
     it is cleared rather than left to accumulate into a meaningless smear.
     Base twist alpha is deliberately NOT a dependency: sweeping alpha is
     precisely what draws the path. */
  useEffect(() => { three.current.trace?.clear(); }, [k1, k2, LcMm, extMm, traceMode]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'
        || t.isContentEditable)) return;
      e.preventDefault();
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
        document.activeElement.blur();
      }
      setTopView((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { three.current.setTop?.(topView); }, [topView]);

  const reset = useCallback(() => {
    theta.current = 0; vel.current = 0; trail.current = []; flash.current = 0;
    three.current.trace?.clear();
    patchSim({ alphaDeg: 0 }); setSweeping(false); sweepAlpha.current = 0;
    setTopView(false);
    three.current.reframe?.();
  }, [patchSim]);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(C.bg);
    const planFog = new THREE.Fog(hexInt(C.bg), 300, 800);
    scene.fog = planFog;

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 3000);
    /* Plan view renders through an ORTHOGRAPHIC camera, not the perspective
       one. Under perspective, a point at height h and its vertical projection
       on the floor land at DIFFERENT screen radii -- magnified by
       (r + |y_floor|) / (r - h), which for this robot runs 1.3x to 1.8x and
       changes around the loop. The ground track would then never line up with
       the tip that drew it. Orthographic projection along -Y puts every point
       directly over its own footprint by construction, which is also what a
       plan view means in engineering drawing: no foreshortening, distances on
       screen proportional to distances on the floor. */
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 3000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Filmic tone mapping + sRGB output: a metal lit by an HDR environment
    // blows out to flat white under the default linear clamp, which is the
    // single biggest reason WebGL metal looks like plastic.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // A polished metal shows its surroundings, not its lights. RoomEnvironment
    // is a small studio-box IBL — the softbox-and-walls setup a RealView-style
    // viewport uses — prefiltered by PMREM so roughness picks the right mip.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    scene.add(new THREE.AmbientLight(0xffffff, 0.18));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(150, 260, 180);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 4;
    key.shadow.bias = -0.0012;
    key.shadow.normalBias = 0.6;
    const sc = key.shadow.camera;
    sc.near = 60; sc.far = 900; sc.left = -190; sc.right = 190; sc.top = 190; sc.bottom = -190;
    sc.updateProjectionMatrix();
    scene.add(key);
    // Lights stay neutral white: illumination is physics, not branding, and a
    // tinted key would falsify the metal's colour.
    const rim = new THREE.DirectionalLight(0xffffff, 0.5); rim.position.set(-180, 40, -150); scene.add(rim);

    // Shadow catcher. ShadowMaterial renders only what is shadowed, so the
    // floor keeps the page background instead of introducing a grey slab.
    const floorPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900),
      new THREE.ShadowMaterial({ opacity: 0.5 })
    );
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.y = -60.4;
    floorPlane.receiveShadow = true;
    scene.add(floorPlane);

    const grid = new THREE.GridHelper(400, 20, hexInt(C.dim), hexInt(C.panel));
    grid.position.y = -60; grid.material.transparent = true; grid.material.opacity = 0.18;
    scene.add(grid);

    const stub = new THREE.Mesh(
      new THREE.CylinderGeometry(4.4, 4.4, 26, 24, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0x8b949e, metalness: 1.0, roughness: 0.35, envMapIntensity: 1.0, side: THREE.DoubleSide })
    );
    stub.position.set(0, -73, 0); scene.add(stub);

    const robot = new THREE.Group();
    robot.rotation.x = -Math.PI / 2; robot.position.y = -60; scene.add(robot);

    /* -- Motion path -----------------------------------------------------
       Drawn as a flat RIBBON of triangles lying in the floor plane, not as a
       THREE.Line: WebGL clamps LineBasicMaterial.linewidth to 1 px on
       essentially every platform, so a polyline would be a hairline that
       disappears the moment the plan view zooms out -- which is the very view
       this trace exists to serve.

       It is a child of `scene`, not of `robot`, and every sample has its Y
       overwritten with the floor height. That makes it a true orthographic
       PROJECTION of the tracked point onto the floor: the (x, z) ground track
       is kept and the out-of-plane excursion is discarded, which is exactly
       what the top-down view shows.

       Colour is per-SEGMENT. The geometry is non-indexed, so the two
       triangles of a quad own their colour and share no vertex with their
       neighbours; a phase boundary is therefore a hard edge. Interpolating
       across it would blur the one transition the plot is meant to expose.

       Nothing decays. Every sample stays until the path is explicitly
       cleared, so the closed loop is visible in full at any instant. */
    const TRACE_MAX = 6000;        // segments the buffer can hold
    const TRACE_W = 1.7;           // ribbon width, scene units (~mm)
    const TRACE_Y = -59.55;        // just proud of the grid at y = -60
    const TRACE_MIN_D = 0.5;       // reject sub-pixel steps: they make degenerate quads
    const tracePos = new Float32Array(TRACE_MAX * 18);   // 6 verts x 3 floats
    const traceCol = new Float32Array(TRACE_MAX * 18);
    const traceGeo = new THREE.BufferGeometry();
    traceGeo.setAttribute('position', new THREE.BufferAttribute(tracePos, 3));
    traceGeo.setAttribute('color', new THREE.BufferAttribute(traceCol, 3));
    traceGeo.setDrawRange(0, 0);
    const traceMesh = new THREE.Mesh(traceGeo, new THREE.MeshBasicMaterial({
      vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.95,
      // The path is an annotation, not a body. It stays out of the shadow pass
      // (castShadow defaults false) and out of the depth buffer, so it can
      // never print a second floating silhouette or z-fight with the grid.
      depthWrite: false,
    }));
    traceMesh.renderOrder = 2;
    traceMesh.frustumCulled = false;   // bounds are never recomputed as it grows
    traceMesh.visible = false;
    scene.add(traceMesh);

    /* Tie-line: tracked point -> its footprint on the floor. */
    const dropGeo = new THREE.BufferGeometry();
    dropGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const dropLine = new THREE.Line(dropGeo, new THREE.LineBasicMaterial({
      color: hexInt(C.dim), transparent: true, opacity: 0.45, depthWrite: false,
    }));
    dropLine.frustumCulled = false;
    dropLine.visible = false;
    scene.add(dropLine);
    const drop = {
      set(w) {
        const a = dropGeo.attributes.position.array;
        a[0] = w.x; a[1] = w.y; a[2] = w.z;
        a[3] = w.x; a[4] = TRACE_Y; a[5] = w.z;
        dropGeo.attributes.position.needsUpdate = true;
        dropLine.visible = true;
      },
      hide() { dropLine.visible = false; },
    };

    let segN = 0, tracePrev = null;
    const cBuild = new THREE.Color(hexInt(C.accent));
    const cSnap = new THREE.Color(hexInt(C.unstable));
    const trace = {
      clear() { segN = 0; tracePrev = null; traceGeo.setDrawRange(0, 0); traceMesh.visible = false; },
      /** `p` is a WORLD-space point; only its ground track is retained. */
      push(p, snapping) {
        const cx = p.x, cz = p.z;
        if (!tracePrev) { tracePrev = [cx, cz]; return; }
        const dx = cx - tracePrev[0], dz = cz - tracePrev[1];
        const len = Math.hypot(dx, dz);
        if (len < TRACE_MIN_D || segN >= TRACE_MAX) return;
        const nx = (-dz / len) * (TRACE_W / 2), nz = (dx / len) * (TRACE_W / 2);
        const ax = tracePrev[0], az = tracePrev[1];
        const quad = [
          [ax - nx, az - nz], [ax + nx, az + nz], [cx - nx, cz - nz],
          [ax + nx, az + nz], [cx + nx, cz + nz], [cx - nx, cz - nz],
        ];
        const col = snapping ? cSnap : cBuild;
        let o = segN * 18;
        for (const q of quad) {
          tracePos[o] = q[0]; tracePos[o + 1] = TRACE_Y; tracePos[o + 2] = q[1];
          traceCol[o] = col.r; traceCol[o + 1] = col.g; traceCol[o + 2] = col.b;
          o += 3;
        }
        segN += 1;
        tracePrev = [cx, cz];
        traceGeo.attributes.position.needsUpdate = true;
        traceGeo.attributes.color.needsUpdate = true;
        traceGeo.setDrawRange(0, segN * 6);
        traceMesh.visible = true;
      },
    };

    /* Both tubes are OPAQUE. A metal has a skin depth of order 10 nm in the
       visible, so a 100 µm steel wall transmits nothing — a see-through metal
       sheath is not optics, it is an X-ray convention. The old translucent
       sheath was also the source of the dark streak that read as a shadow:
       with side:DoubleSide the renderer was shading the sheath's INTERIOR
       wall (normals pointing away from both camera and key light, sampling the
       environment from the wrong hemisphere) and alpha-blending that dark
       surface over the fin. It was never a shadow — nothing but the floor had
       receiveShadow at all. The fix is to stop drawing a surface that cannot
       be seen through in reality. */
    const matOuter = new THREE.MeshPhysicalMaterial({
      color: 0xc3ccd6, metalness: 1.0, roughness: 0.13,
      envMapIntensity: 1.5, clearcoat: 1.0, clearcoatRoughness: 0.05,
      side: THREE.DoubleSide,
    });
    const matInner = new THREE.MeshPhysicalMaterial({
      color: 0xa9aeb6, metalness: 1.0, roughness: 0.26,
      envMapIntensity: 1.35, clearcoat: 0.5, clearcoatRoughness: 0.2,
      emissive: 0x000000, emissiveIntensity: 1,
      side: THREE.DoubleSide,
    });
    const matCore = new THREE.MeshPhysicalMaterial({
      color: 0x9aa3ad, metalness: 1.0, roughness: 0.32, envMapIntensity: 1.1,
    });
    const matGlow = new THREE.MeshBasicMaterial({ color: hexInt(C.cyan), transparent: true, opacity: 0.10 });

    const outer = new THREE.Mesh(new THREE.BufferGeometry(), matOuter);
    const inner = new THREE.Mesh(new THREE.BufferGeometry(), matInner);
    const core = new THREE.Mesh(new THREE.BufferGeometry(), matCore);
    const glow = new THREE.Mesh(new THREE.BufferGeometry(), matGlow);
    // The sheath is transmissive, so the fin inside is what should throw the
    // shadow; a transparent caster would otherwise print a solid silhouette.
    // Every solid both casts and receives: a curved tube genuinely shadows
    // itself where it arcs over, and omitting receiveShadow was leaving that
    // real optical effect out.
    [outer, inner, stub].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
    // Inside an opaque fin these can never be seen; keeping them would only
    // add hidden shadow casters.
    core.visible = false; glow.visible = false;
    robot.add(outer, inner, glow, core);

    const tipOrb = new THREE.Mesh(new THREE.SphereGeometry(3.4, 20, 20), new THREE.MeshBasicMaterial({ color: hexInt(C.ink) }));
    robot.add(tipOrb);

    const arrows = {
      k1: new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 26, hexInt(C.blue), 8, 4),
      k2: new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 26, hexInt(C.sand), 8, 4),
      res: new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 34, hexInt(C.ink), 9, 5),
    };
    robot.add(arrows.k1, arrows.k2, arrows.res);

    const frameR = () => Math.max(240, ((P.current.Lc + P.current.Lext) * 1000) * 2.0);
    const cam = { r: frameR(), phi: Math.PI / 2.35, ang: 0.9, tx: 0, ty: 0 };
    let planOn = false;
    // tan(42 deg / 2) = 0.384: matching half-height keeps the framing roughly
    // continuous across the switch instead of jumping scale.
    const PLAN_HALF = 0.384;
    const applyCam = () => {
      camera.position.set(
        cam.r * Math.sin(cam.phi) * Math.sin(cam.ang) + cam.tx,
        cam.r * Math.cos(cam.phi) + cam.ty,
        cam.r * Math.sin(cam.phi) * Math.cos(cam.ang)
      );
      camera.lookAt(cam.tx, cam.ty, 0);
      if (planOn) {
        // In plan view the pan offsets address the FLOOR, so ty is a world-Z
        // displacement rather than a height.
        const h = Math.max(20, cam.r * PLAN_HALF), a = camera.aspect || 1;
        ortho.left = -h * a; ortho.right = h * a; ortho.top = h; ortho.bottom = -h;
        ortho.position.set(cam.tx, 700, cam.ty);
        ortho.up.set(0, 0, -1);
        ortho.lookAt(cam.tx, -60, cam.ty);
        ortho.updateProjectionMatrix();
      }
    };
    applyCam();

    /* Plan view. Looking straight down, the default +Y up-vector is PARALLEL
       to the view direction, so the camera roll is undefined and three.js
       produces a degenerate basis — hence the explicit in-plane up vector.
       The prior framing is saved so a glance from above does not destroy the
       orbit the user set up. */
    let savedCam = null;
    const setTop = (on) => {
      planOn = on;
      /* Fog is a PERSPECTIVE depth cue, keyed to distance from the camera.
         The plan camera stands ~760 units off the floor, which is past the
         far fog limit (800), so leaving it on painted the whole scene --
         ribbon included -- in background colour. Depth haze is meaningless in
         an orthographic plan view anyway: nothing is nearer than anything
         else in a projection with no foreshortening. */
      scene.fog = on ? null : planFog;
      if (on) {
        savedCam = { ...cam };
        cam.phi = 1e-3; cam.ang = 0; cam.tx = 0; cam.ty = 0;
        cam.r = frameR() * 0.92;
      } else {
        if (savedCam) Object.assign(cam, savedCam);
        savedCam = null;
      }
      applyCam();
    };

    let drag = null;
    const el = renderer.domElement;
    el.style.touchAction = 'none';
    const down = (e) => { drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 2 }; el.setPointerCapture(e.pointerId); };
    const move = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      // Plan view is a fixed orientation by definition, so a drag can only
      // ever pan it -- orbiting would silently tilt it off vertical and
      // reintroduce the very misalignment it exists to remove.
      if (drag.pan || planOn) { cam.tx -= dx * 0.35; cam.ty += dy * 0.35; }
      else { cam.ang -= dx * 0.006; cam.phi = Math.max(0.12, Math.min(Math.PI - 0.12, cam.phi - dy * 0.006)); }
      applyCam();
    };
    const up = () => { drag = null; };
    const wheel = (e) => { e.preventDefault(); cam.r = Math.max(70, Math.min(900, cam.r * (1 + Math.sign(e.deltaY) * 0.09))); applyCam(); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointerleave', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      applyCam();                       // keeps the ortho frustum on the new aspect
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(mount);

    three.current = { scene, camera, renderer, outer, inner, core, glow, tipOrb, arrows, matCore, matGlow, matInner, matOuter, setTop, trace, drop, robot,
      cam: () => (planOn ? ortho : camera),
      reframe: () => { cam.r = frameR(); cam.tx = 0; cam.ty = 0; applyCam(); } };
    return () => {
      ro.disconnect();
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointerleave', up);
      el.removeEventListener('wheel', wheel);
      envRT.dispose();
      traceGeo.dispose(); traceMesh.material.dispose();
      dropGeo.dispose(); dropLine.material.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  const prepCanvas = (canvas) => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    // Measure the wrapper, never the canvas itself: reading clientWidth off an
    // element whose backing store we are about to set is a self-feeding loop.
    const box = canvas.parentElement;
    const w = Math.min(box ? box.clientWidth : 0, 4000);
    const h = Math.min(box ? box.clientHeight : 0, 4000);
    if (w < 2 || h < 2) return null;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = C.panel; ctx.fillRect(0, 0, w, h);
    return { ctx, w, h };
  };

  // Manim-style receding grid: the graticule is scaffolding, so it sits far
  // below the curve in contrast and never competes with it.
  const drawGrid = (ctx, w, h, pad) => {
    ctx.save();
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const x = Math.round(pad.l + ((w - pad.l - pad.r) * i) / 8) + 0.5;
      ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b);
    }
    for (let i = 0; i <= 5; i++) {
      const y = Math.round(pad.t + ((h - pad.t - pad.b) * i) / 5) + 0.5;
      ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y);
    }
    ctx.stroke();
    ctx.restore();
  };

  /* ── Batched polyline stroking ──────────────────────────────────────────
     The previous renderer stroked every sample as its own path. Each 1-2px
     segment was then antialiased in isolation and composited over its
     neighbour, so shared endpoints accumulated alpha twice and the curve
     beaded along its length; separate paths also cannot form line joins, so
     high-curvature regions faceted. Here the samples are grouped into runs of
     constant stability and each run is stroked as ONE path with round joins,
     which lets the rasterizer antialias the stroke as a single shape.

     Colour changes are cross-faded across a short bridge spanning the
     stability boundary rather than switched abruptly, so the transition reads
     as a gradient instead of a seam.                                        */
  const BRIDGE = 6; // samples of overlap on each side of a stability change

  const strokeRuns = (ctx, pts, style) => {
    if (pts.length < 2) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 1 · contiguous runs of identical stability
    const runs = [];
    let start = 0;
    for (let i = 1; i <= pts.length; i++) {
      if (i === pts.length || pts[i][2] !== pts[start][2]) {
        runs.push({ from: start, to: i - 1, stable: pts[start][2] });
        start = i;
      }
    }

    // 2 · one path per run, extended by a sample so runs meet without a gap
    runs.forEach(({ from, to, stable }) => {
      const hi = Math.min(to + 1, pts.length - 1);
      if (hi <= from) return;
      const s = stable ? style.stable : style.unstable;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.setLineDash(s.dash);
      ctx.beginPath();
      ctx.moveTo(pts[from][0], pts[from][1]);
      for (let i = from + 1; i <= hi; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    });

    // 3 · cross-fade over each boundary, painted on top of the seam
    ctx.setLineDash([]);
    for (let r = 1; r < runs.length; r++) {
      const b = runs[r].from;
      const lo = Math.max(0, b - BRIDGE), hi = Math.min(pts.length - 1, b + BRIDGE);
      if (hi - lo < 2) continue;
      const before = runs[r - 1].stable ? style.stable : style.unstable;
      const after = runs[r].stable ? style.stable : style.unstable;
      const g = ctx.createLinearGradient(pts[lo][0], pts[lo][1], pts[hi][0], pts[hi][1]);
      g.addColorStop(0, before.color);
      g.addColorStop(1, after.color);
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(before.width, after.width);
      ctx.beginPath();
      ctx.moveTo(pts[lo][0], pts[lo][1]);
      for (let i = lo + 1; i <= hi; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Mafs-style tapered motion trail: a continuous ribbon whose width and
  // opacity fall off with age, so the eye tracks the state through a snap
  // instead of seeing a scatter of unrelated dots.
  const strokeTrail = (ctx, pts, rgb) => {
    if (pts.length < 2) return;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const t = i / (pts.length - 1);
      ctx.strokeStyle = `rgba(${rgb},${(t * 0.55).toFixed(3)})`;
      ctx.lineWidth = 0.8 + t * 2.4;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawEnergy = (a, l, th, snap) => {
    const canvas = energyRef.current; if (!canvas) return;
    const surf = prepCanvas(canvas); if (!surf) return;
    const { ctx, w, h } = surf;
    const pad = { l: 52, r: 12, t: 14, b: 34 };
    const half = 7.2, t0 = a - half, t1 = a + half;
    const N = 600;
    let vmin = Infinity, vmax = -Infinity; const raw = [];
    for (let i = 0; i <= N; i++) {
      const t = t0 + ((t1 - t0) * i) / N, v = energy(t, a, l);
      raw.push([t, v]); if (v < vmin) vmin = v; if (v > vmax) vmax = v;
    }
    const span = Math.max(vmax - vmin, 1e-6);
    const X = (t) => pad.l + ((t - t0) / (t1 - t0)) * (w - pad.l - pad.r);
    const Y = (v) => h - pad.b - ((v - vmin) / span) * (h - pad.t - pad.b) * 0.9;
    drawGrid(ctx, w, h, pad);

    // Transparency lives in the fill, never in the curve.
    ctx.beginPath();
    ctx.moveTo(X(raw[0][0]), Y(raw[0][1]));
    for (let i = 1; i < raw.length; i++) ctx.lineTo(X(raw[i][0]), Y(raw[i][1]));
    ctx.lineTo(X(t1), h - pad.b); ctx.lineTo(X(t0), h - pad.b); ctx.closePath();
    const g = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
    g.addColorStop(0, rgba(C.green, 0.16)); g.addColorStop(1, rgba(C.green, 0));
    ctx.fillStyle = g; ctx.fill();

    const pts = raw.map(([t, v]) => [X(t), Y(v), stiffness(t, l) > 0]);
    strokeRuns(ctx, pts, {
      stable: { color: C.green, width: 2.2, dash: [] },
      unstable: { color: C.unstable, width: 1.8, dash: [5, 4] },
    });

    ctx.save();
    ctx.lineWidth = 1.6;
    for (let i = 1; i < raw.length; i++) {
      const g0 = gradient(raw[i - 1][0], a, l), g1 = gradient(raw[i][0], a, l);
      if (g0 !== 0 && g0 * g1 > 0) continue;
      let lo = raw[i - 1][0], hi = raw[i][0];
      for (let k = 0; k < 40; k++) {
        const m = (lo + hi) / 2;
        if (gradient(lo, a, l) * gradient(m, a, l) <= 0) hi = m; else lo = m;
      }
      const te = (lo + hi) / 2, stable = stiffness(te, l) > 0;
      ctx.strokeStyle = stable ? C.cyan : C.unstable;
      ctx.setLineDash(stable ? [] : [2, 1.6]);
      ctx.beginPath(); ctx.arc(X(te), Y(energy(te, a, l)), 3.4, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    strokeTrail(ctx, trail.current.map((p) => [X(p[0]), Y(p[1])]), (hexToRgb(C.sand) || [210, 181, 121]).join(","));

    const bx = X(th), by = Y(energy(th, a, l));
    const halo = ctx.createRadialGradient(bx, by, 1, bx, by, 20);
    halo.addColorStop(0, rgba(snap ? C.unstable : C.sand, 0.8));
    halo.addColorStop(1, rgba(snap ? C.unstable : C.sand, 0));
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(bx, by, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = snap ? C.unstable : C.sand;
    ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.stroke();

    ctx.save();
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(X(a), pad.t); ctx.lineTo(X(a), h - pad.b); ctx.stroke();
    ctx.restore();
    drawAxes(ctx, {
      w, h, pad, X, Y,
      xTicks: piTicks(Math.max(Math.abs(t0), Math.abs(t1))).filter((t) => t.v >= t0 && t.v <= t1),
      yTicks: linTicks(vmin, vmax, 4, 1),
      xLabel: 'relative twist  θ  (rad)',
      yLabel: 'V(θ)  (dimensionless)',
    });
  };

  const drawSCurve = (a, l, th) => {
    const canvas = scurveRef.current; if (!canvas) return;
    const surf = prepCanvas(canvas); if (!surf) return;
    const { ctx, w, h } = surf;
    const pad = { l: 52, r: 12, t: 14, b: 34 };
    const TY = Math.max(3 * Math.PI, Math.abs(th) + 1.5);
    // The branch is α = θ + λ sin θ, so α reaches ±(TY + λ). Pinning the axis
    // at ±2π made the curve run off the panel as soon as λ grew.
    const AX = Math.max(2 * Math.PI, TY + l + 0.5, Math.abs(a) + 0.5);
    const X = (v) => pad.l + ((v + AX) / (2 * AX)) * (w - pad.l - pad.r);
    const Y = (v) => h - pad.b - ((v + TY) / (2 * TY)) * (h - pad.t - pad.b);
    const plot = () => { ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip(); };
    drawGrid(ctx, w, h, pad);

    ctx.save();
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, Y(0)); ctx.lineTo(w - pad.r, Y(0));
    ctx.moveTo(X(0), pad.t); ctx.lineTo(X(0), h - pad.b);
    ctx.stroke();
    ctx.restore();

    const N = 1400, pts = [];
    for (let i = 0; i <= N; i++) {
      const t = -TY + (2 * TY * i) / N;
      pts.push([X(t + l * Math.sin(t)), Y(t), stiffness(t, l) > 0]);
    }
    // Unstable branch: bright and dashed, never dark. Encoding the distinction
    // in dash and weight keeps both branches legible against the panel.
    ctx.save(); plot();
    strokeRuns(ctx, pts, {
      stable: { color: C.green, width: 2.4, dash: [] },
      unstable: { color: C.unstable, width: 1.8, dash: [5, 5] },
    });
    ctx.restore();

    const cx = X(a), cy = Y(th);
    ctx.save();
    ctx.strokeStyle = rgba(C.accent, 0.40); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, cy); ctx.lineTo(w - pad.r, cy);
    ctx.moveTo(cx, pad.t); ctx.lineTo(cx, h - pad.b);
    ctx.stroke();
    ctx.restore();

    const dot = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14);
    dot.addColorStop(0, rgba(C.accent, 0.55)); dot.addColorStop(1, rgba(C.accent, 0));
    ctx.fillStyle = dot; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.1; ctx.stroke();

    drawAxes(ctx, {
      w, h, pad, X, Y,
      xTicks: piTicks(AX), yTicks: piTicks(TY),
      xLabel: 'base twist  α  (rad)',
      yLabel: 'tip twist  θ  (rad)',
    });
  };

  useEffect(() => {
    let raf, last = performance.now(), hudClock = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const p = P.current;
      // Slow motion replays the IDENTICAL discrete dynamics at a fraction of
      // the substep rate — it does not soften the integrator, so the snap
      // trajectory and its landing basin are exactly the same, just slower.
      const tScale = p.slow ? 0.1 : 1;
      let a = p.alpha;
      let wrapped = false;
      if (p.sweeping) {
        sweepAlpha.current += dt * 1.1 * tScale;
        if (sweepAlpha.current > Math.PI * 2) {
          // The equilibrium relation α = θ + λ·sinθ is invariant under a
          // SIMULTANEOUS shift of α and θ by 2πn. Shifting α alone (as this
          // used to) teleported the landscape out from under θ, and the
          // resulting chase registered as a snap even at λ = 0, where no
          // snap can physically exist. Shift both and the state is preserved.
          sweepAlpha.current -= Math.PI * 4;
          theta.current -= Math.PI * 4;
          trail.current = [];
          wrapped = true;
        }
        a = sweepAlpha.current;
      } else sweepAlpha.current = a;

      const LR = 0.02, MOM = 0.85, SUB = 6;
      const before = theta.current;
      subAccum.current += SUB * tScale;
      const steps = Math.floor(subAccum.current);
      subAccum.current -= steps;
      for (let i = 0; i < steps; i++) {
        const gr = gradient(theta.current, a, p.lambda);
        let v = MOM * vel.current - LR * gr;
        v = Math.max(-0.25, Math.min(0.25, v));
        vel.current = v; theta.current += v;
      }
      // Rate is measured per SUBSTEP, so the threshold means the same thing
      // whether or not slow motion is on.
      const rate = steps > 0
        ? (Math.abs(theta.current - before) / steps) * SUB / Math.max(dt, 1e-3)
        : 0;
      // A snap needs a fold to fall off; without one (λ ≤ π²/4) there is
      // nothing to detect, and the wrap frame is never a physical event.
      if (!wrapped && p.lambda > LAMBDA_CRIT && rate > SNAP_THRESHOLD) flash.current = 0.45;
      flash.current = Math.max(0, flash.current - dt);
      const snapping = flash.current > 0;

      trail.current.push([theta.current, energy(theta.current, a, p.lambda)]);
      if (trail.current.length > 26) trail.current.shift();

      const T = three.current;
      if (T.renderer) {
        const { pts, Rtip, Rmid, nOverlap } = integrateShape(a, theta.current, p.k1, p.k2, p.Lc, p.Lext);
        const curve = new THREE.CatmullRomCurve3(pts);
        const swap = (m, geo) => { m.geometry.dispose(); m.geometry = geo; };
        // The sheath ends exactly where the OVERLAP ends — no arbitrary
        // fraction. Its rendered length is L_c by construction, so the two
        // sliders now change the sheath/fin proportions independently.
        const sheath = new THREE.CatmullRomCurve3(pts.slice(0, nOverlap + 1));
        swap(T.outer, new THREE.TubeGeometry(sheath, Math.max(8, nOverlap), 4.2, 24, false));
        swap(T.inner, new THREE.TubeGeometry(curve, pts.length, 2.4, 20, false));
        // Snap flash as emission on the fin itself rather than a fake halo.
        T.matInner.emissive.setHex(snapping ? hexInt(C.unstable) : 0x000000);
        T.matInner.emissiveIntensity = snapping ? 1.6 : 0;
        const tip = pts[pts.length - 1];
        const mid = pts[nOverlap];
        if (p.trace !== 'off' && T.trace) {
          // pts live in the robot group's local frame (pitched -90 deg and
          // lifted onto the base plate), so a sample has to pass through that
          // group matrix before it means anything in floor coordinates.
          const src = p.trace === 'overlap' ? mid : tip;
          const w = T.robot.localToWorld(src.clone());
          T.trace.push(w, snapping);
          // Vertical tie-line from the tracked point down to its own footprint.
          // In the perspective 3/4 view an elevated point and its ground
          // projection cannot coincide on screen -- that is what a projection
          // IS -- so the correspondence is drawn explicitly instead of left to
          // be inferred. In plan view it collapses to a dot, as it should.
          T.drop.set(w);
        } else if (T.drop) T.drop.hide();
        T.tipOrb.position.copy(tip);
        T.tipOrb.material.color.setHex(snapping ? hexInt(C.unstable) : hexInt(C.ink));
        const th = theta.current;
        const world = (x, y) => new THREE.Vector3(
          Rmid[0][0] * x + Rmid[0][1] * y,
          Rmid[1][0] * x + Rmid[1][1] * y,
          Rmid[2][0] * x + Rmid[2][1] * y
        ).normalize();
        const rx = (p.k1 + p.k2 * Math.cos(th)) / 2, ry = (p.k2 * Math.sin(th)) / 2;
        const rmag = Math.hypot(rx, ry);
        [['k1', world(1, 0), p.k1 > 0.01],
        ['k2', world(Math.cos(th), Math.sin(th)), p.k2 > 0.01],
        ['res', rmag > 1e-4 ? world(rx, ry) : new THREE.Vector3(1, 0, 0), rmag > 1e-3]]
          .forEach(([k, dir, vis]) => {
            T.arrows[k].position.copy(mid); T.arrows[k].setDirection(dir); T.arrows[k].visible = vis;
          });
        T.renderer.render(T.scene, T.cam());
      }

      drawEnergy(a, p.lambda, theta.current, snapping);
      drawSCurve(a, p.lambda, theta.current);

      hudClock += dt;
      if (hudClock > 0.08) {
        hudClock = 0;
        const kx = (p.k1 + p.k2 * Math.cos(theta.current)) / 2;
        const ky = (p.k2 * Math.sin(theta.current)) / 2;
        setHud({ theta: theta.current, alpha: a, kres: Math.hypot(kx, ky),
          V: energy(theta.current, a, p.lambda), Vpp: stiffness(theta.current, p.lambda), vel: rate, snapping });
        if (p.sweeping) patchSim({ alphaDeg: Math.round((a * 180) / Math.PI) });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [patchSim]);

  const unstable = hud.Vpp <= 0;

  return (
    <div className="col grow">
      <div className="ctr-body">
        <div className="ctr-view" ref={mountRef}>
          <div className="ctr-overlay mono dim" style={{ top: 12, left: 12 }}>
            <div>drag · orbit</div><div>shift + drag · pan</div><div>scroll · zoom</div>
            <div style={{ color: topView ? C.accent : undefined }}>space · {topView ? 'exit plan view' : 'plan view'}</div>
            {traceMode !== 'off' && !topView && (
              <div style={{ color: C.accent }}>path drawn on floor — press space</div>
            )}
          </div>
          <div className="ctr-overlay mono" style={{ top: 12, right: 12, textAlign: 'right' }}>
            <div style={{ color: C.blue }}>— outer tube κ₁</div>
            <div style={{ color: C.sand }}>— inner tube κ₂</div>
            <div style={{ color: C.ink }}>— resultant curvature</div>
            {traceMode !== 'off' && (
              <>
                <div style={{ marginTop: 6, color: C.dim }}>
                  ground track · {traceMode === 'tip'
                    ? 'fin tip' : <>end of overlap <M>{'L_c'}</M></>}
                </div>
                <div style={{ color: C.accent }}>— build-up (quasi-static)</div>
                <div style={{ color: C.unstable }}>— snap (energy release)</div>
              </>
            )}
          </div>
          {handoff && (
            <div className="ctr-badge mono">
              loaded · κ {handoff.kappa.toFixed(1)} m⁻¹ · L_c {(handoff.Lc * 1000).toFixed(0)} mm
            </div>
          )}
          {hud.snapping && (
            <div className="ctr-alert"><AlertTriangle size={15} /> Snap in progress — elastic energy releasing</div>
          )}
        </div>

        <div className="ctr-side">
          <div className="ctr-plot">
            <div className="cap">
              <span>Energy landscape</span>
              <span className="mono t10 dim">
                V [–] = torsion {(0.5 * ((hud.theta - hud.alpha) ** 2)).toFixed(2)}
                {' + '}bend {(lambda * (1 - Math.cos(hud.theta))).toFixed(2)}
              </span>
            </div>
            <div className="ctr-plotbox"><canvas ref={energyRef} /></div>
          </div>
          <div className="ctr-plot" style={{ borderBottom: 0 }}>
            <div className="cap">
              <span>Equilibrium map</span>
              <span className="mono t10 dim">tip twist vs base twist</span>
            </div>
            <div className="ctr-plotbox"><canvas ref={scurveRef} /></div>
          </div>
        </div>
      </div>

      <footer className="ctr-foot">
        <div className="row" style={{ gap: 8, flexShrink: 0 }}>
          <button className="ctr-btn" onClick={() => setSweeping((s) => !s)}>
            {sweeping ? <Pause size={14} /> : <Play size={14} />}{sweeping ? 'Pause' : 'Sweep α'}
          </button>
          <button className="ctr-btn" onClick={reset}><RotateCcw size={14} /> Reset</button>
          <button className={`ctr-btn${slow ? ' on' : ''}`} onClick={() => setSlow((v) => !v)}
            title="Replay the same dynamics at 1/10 substep rate">
            <Waves size={14} /> {slow ? "Slo-mo 1/10" : "Slo-mo"}
          </button>
          <button className={`ctr-btn${traceMode !== 'off' ? ' on' : ''}`}
            onClick={() => setTraceMode((m) => (m === 'off' ? 'tip' : m === 'tip' ? 'overlap' : 'off'))}
            title="Project the tracked point's ground track onto the floor. Cycles off - fin tip - end of overlap.">
            <Spline size={14} />
            {traceMode === 'off' ? 'Path off'
              : traceMode === 'tip' ? 'Path · fin tip'
                : 'Path · overlap end'}
          </button>
          {traceMode !== 'off' && (
            <button className="ctr-btn" onClick={() => three.current.trace?.clear()}
              title="Erase the accumulated ground track">
              <RotateCcw size={14} /> Clear path
            </button>
          )}
        </div>

        <div className="ctr-sliders">
          <Slider label="Motor base twist" symbol="α" value={alphaDeg} min={-360} max={360} step={1}
            unit="°" accent={C.cyan} onChange={(v) => { patchSim({ alphaDeg: v }); setSweeping(false); }} />
          <Slider label="Overlap length" symbol="L_c" value={LcMm} min={10} max={Math.max(150, Math.ceil(LcMm / 10) * 10)} step={1}
            unit=" mm" digits={0} accent={C.blue} onChange={(v) => patchSim({ LcMm: v })} />
          <Slider label="Fin extension" symbol="L_ext" value={extMm} min={0} max={120} step={1}
            unit=" mm" digits={0} accent={C.accent} onChange={(v) => patchSim({ extMm: v })} />
          <Slider label="Outer precurvature" symbol="κ₁" value={k1} min={0} max={25} step={0.1}
            unit=" m⁻¹" accent={C.blue} onChange={(v) => patchSim({ k1: v })} />
          <Slider label="Inner precurvature" symbol="κ₂" value={k2} min={0} max={25} step={0.1}
            unit=" m⁻¹" accent={C.gold} onChange={(v) => patchSim({ k2: v })} />
        </div>

        <div className="ctr-metrics">
          <Metric icon={<Boxes size={12} />} label="Bifurcation λ [–]" value={lambda.toFixed(2)}
            color={lambda > LAMBDA_CRIT ? C.gold : C.dim}
            note={lambda > LAMBDA_CRIT ? "snaps" : "no fold"} />
          <Metric icon={<Zap size={12} />} label="Elastic V [–]" value={hud.V.toFixed(2)} color={C.gold} />
          <Metric icon={<Gauge size={12} />} label="Lumped V″ [–]" value={hud.Vpp.toFixed(2)}
            color={unstable ? C.red : C.green} note={unstable ? 'unstable' : 'stable'} />
          <Metric icon={<Activity size={12} />} label="Twist rate [°/s]"
            value={`${((hud.vel * 180) / Math.PI).toFixed(0)}°/s`} color={hud.snapping ? C.red : C.dim} />
          <Metric icon={<Waves size={12} />} label="Resultant |K| [m⁻¹]" value={hud.kres.toFixed(2)}
            color={hud.kres < 0.5 ? C.unstable : C.green}
            note={hud.kres < 0.5 ? "straight" : ""} />
          <Metric icon={<Activity size={12} />} label="Tip twist θ [°]"
            value={`${((hud.theta * 180) / Math.PI).toFixed(0)}°`} color={C.cyan} />
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   8 · WORKSPACE B — DESIGN OPTIMISATION
   ═══════════════════════════════════════════════════════════════ */
const GRID_N = 50, SURF = 105, HEIGHT = 74;

function OptimizerWorkspace() {
  const { applyDesign } = useDesign();
  // Part 6: the allowable strain must be justified by a target cycle life,
  // not hardcoded to the 8% monotonic superelastic limit — at 8% the gate is
  // inert over the whole practical κ range and the optimum just walks to the
  // corner of the parameter box.
  const [logLife, setLogLife] = useState(10);            // log10 target cycles
  const [LcMaxMm, setLcMaxMm] = useState(150);
  // The 150 mm ceiling was an arbitrary slider bound, not a physical limit —
  // it is now itself editable.
  const [LcLimitMm, setLcLimitMm] = useState(150);
  const [etaK, setEtaK] = useState(0.05);
  const [clip, setClip] = useState(true);
  const [hover, setHover] = useState(null);

  const targetLife = Math.pow(10, logLife);
  const strainLimit = epsAllowFor(targetLife);
  const strainPct = strainLimit * 100;
  const kappaCeiling = (2 * strainLimit) / NITINOL.d_o;     // ε_bend = κ·d₀/2 ≤ ε_allow
  const kappaMax = clip ? Math.min(25, kappaCeiling) : 25;

  const grid = useMemo(() => buildGrid({
    nx: GRID_N, ny: GRID_N, kappaMax, LcMin: 0.01, LcMax: LcMaxMm / 1000, strainLimit, etaK,
  }), [kappaMax, LcMaxMm, strainLimit, etaK]);

  const best = grid.best;
  const focus = hover || best;

  const mountRef = useRef(null), tipRef = useRef(null), three = useRef({});
  const gridRef = useRef(grid);
  useEffect(() => { gridRef.current = grid; }, [grid]);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(C.bg);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 3000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.92));
    const l1 = new THREE.DirectionalLight(0xffffff, 0.22); l1.position.set(160, 240, 120); scene.add(l1);
    const l2 = new THREE.DirectionalLight(0xffffff, 0.12); l2.position.set(-180, 90, -160); scene.add(l2);

    const surface = new THREE.Mesh(new THREE.BufferGeometry(),
      // polygonOffset pushes the surface back in depth so contours lying on it
      // win the depth test. A small vertical lift alone is unreliable on a
      // steep ridge, where the surface can climb faster than the offset and
      // swallow the tube.
      new THREE.MeshLambertMaterial({
        vertexColors: true, side: THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4,
      }));
    scene.add(surface);

    const wire = new THREE.LineSegments(new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: hexInt(C.dim), transparent: true, opacity: 0.07 }));
    scene.add(wire);

    // Contours are swept tubes, not THREE.Line: WebGL clamps LineBasicMaterial
    // linewidth to 1px on virtually every platform, so a polyline contour can
    // only ever be a hairline that aliases against the surface behind it. Real
    // geometry takes the same lighting and antialiasing as the surface itself.
    // Groups, not single meshes: a contour need not span the whole domain, so
    // it can consist of several disjoint components. One mesh per component
    // keeps them separate instead of bridging the gaps.
    const onsetMat = new THREE.MeshBasicMaterial({ color: hexInt(C.green) });
    const limitMat = new THREE.MeshBasicMaterial({ color: hexInt(C.unstable) });
    const onsetLine = new THREE.Group(); const limitLine = new THREE.Group();
    onsetLine.renderOrder = 2; limitLine.renderOrder = 3;
    scene.add(onsetLine, limitLine);

    const axes = new THREE.Group(); scene.add(axes);

    const floor = new THREE.GridHelper(SURF * 2, 14, hexInt(C.dim), hexInt(C.panel));
    floor.position.y = -1; floor.material.transparent = true; floor.material.opacity = 0.16;
    scene.add(floor);

    const markBest = new THREE.Mesh(new THREE.SphereGeometry(3, 18, 18), new THREE.MeshBasicMaterial({ color: hexInt(C.accent) }));
    const markHover = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 16), new THREE.MeshBasicMaterial({ color: hexInt(C.ink) }));
    markHover.visible = false;
    const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: hexInt(C.accent), transparent: true, opacity: 0.5 }));
    scene.add(markBest, markHover, stem);

    const cam = { r: 500, phi: 1.0, ang: 0.86 + Math.PI + 0.22 };
    const applyCam = () => {
      camera.position.set(
        cam.r * Math.sin(cam.phi) * Math.sin(cam.ang),
        cam.r * Math.cos(cam.phi) + 40,
        cam.r * Math.sin(cam.phi) * Math.cos(cam.ang)
      );
      camera.lookAt(0, 18, 0);
    };
    applyCam();

    const el = renderer.domElement;
    el.style.touchAction = 'none';
    let drag = null, pointer = null;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();

    const down = (e) => { drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      cam.ang -= dx * 0.006;
      cam.phi = Math.max(0.18, Math.min(1.5, cam.phi - dy * 0.005));
      applyCam();
    };
    const up = () => { drag = null; };
    const leave = () => { pointer = null; drag = null; };
    const wheel = (e) => { e.preventDefault(); cam.r = Math.max(150, Math.min(760, cam.r * (1 + Math.sign(e.deltaY) * 0.09))); applyCam(); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointerleave', leave);
    el.addEventListener('wheel', wheel, { passive: false });

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(mount);

    three.current = { scene, camera, renderer, surface, wire, onsetLine, limitLine, onsetMat, limitMat, axes, markBest, markHover, stem };

    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const g = gridRef.current;
      if (pointer && !drag && g) {
        ndc.x = (pointer.x / pointer.w) * 2 - 1;
        ndc.y = -(pointer.y / pointer.h) * 2 + 1;
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObject(surface, false)[0];
        if (hit) {
          const i = Math.round(((hit.point.x + SURF) / (2 * SURF)) * (g.nx - 1));
          const j = Math.round(((hit.point.z + SURF) / (2 * SURF)) * (g.ny - 1));
          const cell = g.cells[j * g.nx + i];
          if (cell) {
            markHover.visible = true;
            const eMax = g.maxMJ * 1000;
            const y = eMax > 0 ? ((cell.dE_J * 1000) / eMax) * HEIGHT : 0;
            markHover.position.set(
              -SURF + (2 * SURF * i) / (g.nx - 1), y + 2,
              -SURF + (2 * SURF * j) / (g.ny - 1)
            );
            three.current.onHover?.(cell, pointer);
          }
        } else { markHover.visible = false; three.current.onHover?.(null, pointer); }
      } else if (!pointer) {
        markHover.visible = false; three.current.onHover?.(null, null);
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointerleave', leave);
      el.removeEventListener('wheel', wheel);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  const lastHover = useRef(0);
  useEffect(() => {
    three.current.onHover = (cell, pt) => {
      const now = performance.now();
      if (now - lastHover.current < 60) return;
      lastHover.current = now;
      setHover(cell || null);
      const tip = tipRef.current;
      if (tip && cell && pt) {
        tip.style.display = 'block';
        tip.style.left = `${Math.max(8, Math.min(pt.x + 16, pt.w - 232))}px`;
        tip.style.top = `${Math.max(8, Math.min(pt.y + 14, pt.h - 196))}px`;
      } else if (tip) tip.style.display = 'none';
    };
  }, []);

  useEffect(() => {
    const T = three.current;
    if (!T.surface) return;
    const { cells, nx, ny, maxDE, maxMJ, maxScore, kappaMax, LcMin, LcMax } = grid;
    // Surface height is the TRUE snap energy in millijoules, not the
    // nondimensional ΔE. E_snap = ΔE·(k_t/L_c), and k_t/L_c varies ~2.75x over
    // the snapping part of the L_c axis, so plotting ΔE made equal heights mean
    // unequal energies and visually understated short overlaps.
    const EMAX = maxMJ * 1000;                       // mJ

    /* ── 4D surface: z = ΔE_snap, colour = Score ──────────────────────────
       Two independent scalars share one surface — height carries the snap
       energy, colour carries the efficiency score — which is the 4-column
       x/y/z/colour arrangement gnuplot's pm3d draws.

       The sweep itself stays at the specified 50×50 so the reported statistics
       describe the actual sampled design space. Only the RENDER mesh is
       refined: both fields are resampled with a bicubic Catmull-Rom filter
       onto a ×UP grid, which is what `set pm3d interpolate` does and what
       turns a faceted staircase into a smooth surface. Colour is interpolated
       per-vertex on its own normalisation, independent of height.           */
    const UP = 4;
    const rx = (nx - 1) * UP + 1, ry = (ny - 1) * UP + 1;
    const cl = (a, hi) => (a < 0 ? 0 : a > hi ? hi : a);

    const catmull = (p0, p1, p2, p3, t) => {
      const t2 = t * t, t3 = t2 * t;
      return 0.5 * (2 * p1 + (-p0 + p2) * t
        + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
        + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    };
    const bicubic = (f, u, v) => {
      const i = Math.floor(u), j = Math.floor(v);
      const fu = u - i, fv = v - j;
      const row = (jj) => catmull(
        f(cl(i - 1, nx - 1), jj), f(cl(i, nx - 1), jj),
        f(cl(i + 1, nx - 1), jj), f(cl(i + 2, nx - 1), jj), fu);
      return catmull(
        row(cl(j - 1, ny - 1)), row(cl(j, ny - 1)),
        row(cl(j + 1, ny - 1)), row(cl(j + 2, ny - 1)), fv);
    };

    const fE = (i, j) => cells[j * nx + i].dE_J * 1000;     // mJ
    const fScore = (i, j) => cells[j * nx + i].score;
    // Regime is categorical, so it is carried as a 0/1 field and hard-cut at
    // 0.5 after filtering. Blending it would smear "material failure" into
    // neighbouring survivable designs — the one thing this plot must not do.
    // Signed distance to each regime boundary, as CONTINUOUS scalars. The fill
    // and the contour lines are both zero crossings of these, which is what
    // makes them land on top of one another instead of a cell apart.
    const fLam = (i, j) => cells[j * nx + i].lambda - LAMBDA_CRIT;   // >0 snaps
    const fEps = (i, j) => cells[j * nx + i].eeq - strainLimit;      // >0 fails
    const fLamField = (u, v) => bicubic(fLam, u, v);
    const fEpsField = (u, v) => bicubic(fEps, u, v);

    const pos = new Float32Array(rx * ry * 3), col = new Float32Array(rx * ry * 3);
    for (let b = 0; b < ry; b++)
      for (let a = 0; a < rx; a++) {
        const n = b * rx + a;
        const u = (a / (rx - 1)) * (nx - 1), v = (b / (ry - 1)) * (ny - 1);
        pos[n * 3] = -SURF + (2 * SURF * a) / (rx - 1);
        pos[n * 3 + 1] = EMAX > 0 ? (Math.max(bicubic(fE, u, v), 0) / EMAX) * HEIGHT : 0;
        pos[n * 3 + 2] = -SURF + (2 * SURF * b) / (ry - 1);
        let rgb;
        if (fEpsField(u, v) > 0) rgb = [0.13, 0.11, 0.11];          // past ε_allow
        else if (fLamField(u, v) <= 0) rgb = [0.055, 0.075, 0.13];  // below the fold
        else rgb = colormap(maxScore > 0 ? bicubic(fScore, u, v) / maxScore : 0);
        col[n * 3] = rgb[0]; col[n * 3 + 1] = rgb[1]; col[n * 3 + 2] = rgb[2];
      }
    const idx = [];
    for (let b = 0; b < ry - 1; b++)
      for (let a = 0; a < rx - 1; a++) {
        const p = b * rx + a, q = p + 1, r = p + rx, t = r + 1;
        idx.push(p, r, q, q, r, t);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    T.surface.geometry.dispose(); T.surface.geometry = geo;

    // The wireframe stays on the 50×50 SAMPLE grid, so it still shows where
    // the physics was actually evaluated rather than the interpolated mesh.
    const wpts = [];
    const dY = (i, j) => (EMAX > 0 ? ((cells[j * nx + i].dE_J * 1000) / EMAX) * HEIGHT : 0) + 0.3;
    const P = (i, j) => new THREE.Vector3(
      -SURF + (2 * SURF * i) / (nx - 1), dY(i, j), -SURF + (2 * SURF * j) / (ny - 1));
    for (let j = 0; j < ny; j += 4) for (let i = 0; i < nx - 1; i++) wpts.push(P(i, j), P(i + 1, j));
    for (let i = 0; i < nx; i += 4) for (let j = 0; j < ny - 1; j++) wpts.push(P(i, j), P(i, j + 1));
    T.wire.geometry.dispose();
    T.wire.geometry = new THREE.BufferGeometry().setFromPoints(wpts);

    /* ── Contours ─────────────────────────────────────────────────────────
       Everything below is a level set of the SAME bicubically-filtered field
       that colours and shapes the surface. That matters:

       · The colour boundary is now the zero crossing of λ−λ_crit (and of
         ε_eq−ε_allow), the identical scalar whose zero crossing this contour
         traces — so the fill meets the line exactly. Previously the fill was
         the 0.5 level of a bicubically smoothed 0/1 MASK while the line was
         the 0 level of the continuous scalar: two different curves, offset by
         up to a cell, leaving a band of wrong colour between them.

       · The contour's HEIGHT is read from the same bicubic dE as the surface
         mesh, so it lies on the rendered surface by construction. Evaluating
         the design exactly instead put the tube on the true surface, which is
         not quite the interpolated one — near the onset kink the interpolant
         overshoots and swallowed the tube, breaking it into dashes.          */
    const CONTOUR_LIFT = 0.9;
    const SUBU = 4;                                  // sub-cell search steps
    const yAt = (u, v) =>
      (EMAX > 0 ? (Math.max(bicubic(fE, u, v), 0) / EMAX) * HEIGHT : 0) + CONTOUR_LIFT;
    const xAt = (u) => -SURF + (2 * SURF * u) / (nx - 1);
    const zAt = (v) => -SURF + (2 * SURF * v) / (ny - 1);

    /** Leading zero crossing of `field` along row v, to sub-cell precision. */
    const crossU = (v, field) => {
      const R = (nx - 1) * SUBU;
      let pu = 0, pg = field(0, v);
      for (let i = 1; i <= R; i++) {
        const u = ((nx - 1) * i) / R, g = field(u, v);
        if (Number.isFinite(pg) && Number.isFinite(g) && (pg > 0) !== (g > 0)) {
          let a = pu, b = u;
          for (let k = 0; k < 28; k++) {
            const m = (a + b) / 2;
            if ((field(a, v) > 0) !== (field(m, v) > 0)) b = m; else a = m;
          }
          return (a + b) / 2;
        }
        pu = u; pg = g;
      }
      return null;
    };

    /** Runs of consecutive rows that carry a crossing. A contour need not span
     *  the domain, and splining across a gap would invent an arc that is not
     *  in the data. */
    const components = (field) => {
      const runs = []; let run = [];
      const ROWS = (ny - 1) * 2;                     // finer than the data rows
      for (let r = 0; r <= ROWS; r++) {
        const v = ((ny - 1) * r) / ROWS;
        const u = crossU(v, field);
        if (u !== null) run.push(new THREE.Vector3(xAt(u), yAt(u, v), zAt(v)));
        else { if (run.length > 1) runs.push(run); run = []; }
      }
      if (run.length > 1) runs.push(run);
      return runs;
    };

    const contourTubes = (group, mat, runs, radius) => {
      group.children.forEach((m) => m.geometry.dispose());
      group.clear();
      runs.forEach((pts) => {
        const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
        const segs = Math.max(24, Math.min(pts.length * 4, 700));
        group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, radius, 8, false), mat));
      });
      group.visible = runs.length > 0;
    };

    contourTubes(T.onsetLine, T.onsetMat, components(fLamField), 0.55);
    contourTubes(T.limitLine, T.limitMat, components(fEpsField), 0.7);

    /* ── Labelled axes ────────────────────────────────────────────────────
       The three swept quantities plus the colour channel, named on the plot
       itself. Ranges are read from the live grid, so the ticks can never
       disagree with the sweep that produced the surface.                    */
    // sizeAttenuation off: an axis label must hold a constant screen size, or
    // the near corner magnifies it while the far corner shrinks it away.
    const PX = 1 / 2400;
    const label = (text, size, color) => {
      const c = document.createElement('canvas');
      const font = `${size}px ui-monospace, Menlo, Consolas, monospace`;
      const m = c.getContext('2d');
      m.font = font;
      // Subscripts descend, so the sprite needs headroom the plain metrics
      // would not have reserved.
      const w = Math.ceil(mathWidth(m, text, size)) + 16, h = size + 18;
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.font = font; g.textBaseline = 'middle'; g.fillStyle = color;
      fillMath(g, text, 8, h / 2, size, 'left');
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, depthTest: false, depthWrite: false,
        sizeAttenuation: false,
      }));
      sp.renderOrder = 6;
      sp.scale.set(w * PX, h * PX, 1);
      return sp;
    };
    const at = (sp, x, y, z) => { sp.position.set(x, y, z); T.axes.add(sp); return sp; };

    T.axes.children.forEach((o) => {
      if (o.material) { o.material.map?.dispose(); o.material.dispose(); }
      o.geometry?.dispose();
    });
    T.axes.clear();

    const OUT = SURF + 16;                  // tick text sits just off the plot
    const TICK = C.dim, TITLE = C.ink;
    const xOf = (kappa) => -SURF + (2 * SURF * kappa) / kappaMax;
    const zOf = (LcM) => -SURF + (2 * SURF * (LcM - LcMin)) / (LcMax - LcMin);

    // Axis rules along the two near edges (the camera looks from the origin
    // corner, so these are the edges nearest the viewer).
    const rule = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-SURF, 0, -SURF), new THREE.Vector3(SURF, 0, -SURF),
      new THREE.Vector3(-SURF, 0, -SURF), new THREE.Vector3(-SURF, 0, SURF),
      new THREE.Vector3(-SURF, 0, -SURF), new THREE.Vector3(-SURF, HEIGHT, -SURF),
    ]);
    T.axes.add(new THREE.LineSegments(rule,
      new THREE.LineBasicMaterial({ color: hexInt(C.dim), transparent: true, opacity: 0.5 })));

    // x → precurvature κ
    for (let k = 0; k <= kappaMax + 1e-9; k += 5) {
      at(label(k.toFixed(0), 30, TICK), xOf(k), 1, -OUT);
    }
    at(label('κ  precurvature  (m⁻¹)', 34, TITLE), 0, 1, -OUT - 12);

    // z → overlap length L_c
    const lcTicks = 4;
    for (let i = 0; i <= lcTicks; i++) {
      const v = (LcMin + ((LcMax - LcMin) * i) / lcTicks) * 1000;
      at(label(v.toFixed(0), 30, TICK), -OUT, 1, zOf(v / 1000));
    }
    at(label('L_c  overlap  (mm)', 34, TITLE), -OUT - 14, 1, 0);

    // y → snap energy. This is the dimensionless ΔE of V(θ); the tooltip
    // reports the same design in mJ, which needs L_c to convert.
    const eTicks = 4;
    for (let i = 0; i <= eTicks; i++) {
      const v = (EMAX * i) / eTicks;
      at(label(v.toFixed(EMAX < 20 ? 1 : 0), 30, TICK), -OUT + 6, 1 + (HEIGHT * i) / eTicks, -SURF);
    }
    at(label('E_snap  (mJ)', 34, TITLE), -OUT + 4, HEIGHT + 20, -SURF);

    if (grid.best) {
      const bi = cells.indexOf(grid.best);
      const i = bi % nx, j = Math.floor(bi / nx);
      const x = -SURF + (2 * SURF * i) / (nx - 1);
      const z = -SURF + (2 * SURF * j) / (ny - 1);
      const y = EMAX > 0 ? ((grid.best.dE_J * 1000) / EMAX) * HEIGHT : 0;
      T.markBest.position.set(x, y + 4, z); T.markBest.visible = true;
      T.stem.geometry.dispose();
      T.stem.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, z), new THREE.Vector3(x, y + 4, z)]);
    } else T.markBest.visible = false;
  }, [grid, strainLimit]);

  const analysis = useMemo(() => {
    const { cells } = grid;
    const safe = cells.filter((c) => c.regime === 'snapping');
    const biggest = safe.reduce((a, b) => (b.dE_J > (a?.dE_J ?? -1) ? b : a), null);
    return {
      biggest,
      failing: cells.filter((c) => c.regime === 'failure').length,
      sub: cells.filter((c) => c.dE <= 0).length,
      total: cells.length,
      pinnedLc: best && Math.abs(best.Lc - grid.LcMax) < 1e-6,
      pinnedK: best && Math.abs(best.kappa - grid.kappaMax) < grid.kappaMax / GRID_N,
    };
  }, [grid, best]);

  const recommend = (c) => {
    if (!c || c.dE <= 0) return { text: 'Under-powered', color: C.dim };
    if (c.regime === 'failure') return { text: 'MATERIAL FAILURE WARNING', color: C.red };
    if (grid.maxScore > 0 && c.score > 0.75 * grid.maxScore) return { text: 'Optimal', color: C.cyan };
    if (grid.maxScore > 0 && c.score > 0.3 * grid.maxScore) return { text: 'Workable', color: C.gold };
    return { text: 'Under-powered', color: C.dim };
  };
  const fmtN = (n) => (!isFinite(n) ? '∞' : n >= 1e6 ? `${(n / 1e6).toPrecision(3)}e6` : n.toPrecision(3));
  const lifeCat = (n) => (n > 1e5 ? { t: 'High-cycle', c: C.green } : n > 1e3 ? { t: 'Low-cycle', c: C.gold } : { t: 'Immediate yielding', c: C.red });

  return (
    <div className="ctr-body">
      <div className="ctr-view" ref={mountRef}>
        <div className="ctr-overlay" style={{ top: 12, left: 12 }}>
          <div className="t11" style={{ color: C.ink }}>Snap energy surface</div>
          <div className="mono dim">height E_snap [mJ] · colour Score [–]</div>
          <div className="mono dim" style={{ marginTop: 8 }}>
            <div>x → κ · 0 – {grid.kappaMax.toFixed(1)} m⁻¹</div>
            <div>z → L_c · 10 – {LcMaxMm} mm</div>
          </div>
        </div>

        <div className="ctr-overlay mono" style={{ bottom: 12, left: 12 }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="ctr-swatch" style={{ background: C.green }} />
            <span className="mut">λ = π²/4 snap onset</span>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span className="ctr-swatch" style={{ background: C.unstable }} />
            <span className="mut">ε = ε_allow fatigue edge</span>
          </div>
          <div className="dim" style={{ marginTop: 4 }}>drag · orbit &nbsp; scroll · zoom</div>
        </div>

        <ColorBar max={grid.maxScore} label="Score [–]" />

        <div className="ctr-tip" ref={tipRef} style={{ display: 'none' }}>
          {hover && (() => {
            const r = recommend(hover);
            return (
              <>
                <div className="mono" style={{ color: '#cbd5e1' }}>
                  κ {hover.kappa.toFixed(2)} m⁻¹ · L_c {(hover.Lc * 1000).toFixed(0)} mm
                </div>
                <hr />
                <Row k="Snap energy" v={`${(hover.dE_J * 1000).toFixed(2)} mJ`} c={C.gold} />
                <Row k="λ [–]" v={hover.lambda.toFixed(2)} c={hover.lambda > LAMBDA_CRIT ? C.gold : C.dim} />
                <Row k="Equiv. strain" v={`${(hover.eeq * 100).toFixed(2)} %`} c={hover.eeq > strainLimit ? C.red : C.green} />
                <Row k="Fatigue life ~" v={`${fmtN(hover.N)} cyc`} c="#94a3b8" />
                <Row k="Score [–]" v={grid.maxScore > 0 ? (hover.score / grid.maxScore).toFixed(3) : '0'} c={C.cyan} />
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #1e293b', fontWeight: 500, color: r.color }}>
                  {r.text}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="ctr-side scroll">
        <div className="ctr-sec">
          <h2><Target size={15} color={C.cyan} /> The sweet spot</h2>
          {best && best.dE > 0 ? (
            <>
              <div className="mono" style={{ color: '#67e8f9', fontSize: 14, lineHeight: 1.6 }}>
                κ = {best.kappa.toFixed(2)} m⁻¹<br />
                L_c = {(best.Lc * 1000).toFixed(0)} mm
              </div>
              <p className="ctr-p">
                Releases {(best.dE_J * 1000).toFixed(1)} mJ per snap at {(best.eeq * 100).toFixed(2)}% equivalent
                strain, against a fatigue allowable of {strainPct.toFixed(2)}%. Predicted life {fmtN(best.N)} cycles
                at λ = {best.lambda.toFixed(2)}.
              </p>
              <button className="ctr-btn primary" onClick={() => applyDesign(best)}>
                <ArrowUpRight size={14} /> Load into simulator
              </button>
            </>
          ) : (
            <p className="ctr-p">
              No design in this domain crosses λ = π²/4, so nothing snaps. Raise the allowable strain
              or the overlap ceiling to open up a bifurcating region.
            </p>
          )}
          {best && best.dE > 0 && (analysis.pinnedLc || analysis.pinnedK) && (
            <div className="ctr-note">
              <strong>Boundary-limited optimum. </strong>
              {analysis.pinnedLc && 'Score still rises at the longest overlap, so L_c is set by your fin envelope, not by physics. '}
              {analysis.pinnedK && 'Curvature sits on the fatigue ceiling — the material, not the energetics, is binding.'}
            </div>
          )}
        </div>

        <div className="ctr-sec">
          <h2><Waves size={15} color={C.gold} /> Big snaps vs small snaps</h2>
          <p className="ctr-p">
            Below λ = π²/4 the energy well never folds. {analysis.sub} of {analysis.total} grid points
            sit here: the tube rotates smoothly, stores torsion, and gives it back with no impulse.
            Zero thrust, zero wear.
          </p>
          <p className="ctr-p">
            Past the fold, ΔE_snap grows roughly with λ, but so does the twist the tube must shed in one
            release. Torsional strain scales as Δθ/L_c, so the cheapest way to buy a big snap — a short
            overlap — is exactly the way that destroys the tube.
            {analysis.failing > 0 && ` ${analysis.failing} points here exceed ε_allow.`}
          </p>
          {analysis.biggest && best && (
            <p className="ctr-p">
              The largest survivable snap in this domain is {(analysis.biggest.dE_J * 1000).toFixed(1)} mJ
              at κ = {analysis.biggest.kappa.toFixed(1)} m⁻¹, scoring{' '}
              {grid.maxScore > 0 ? (analysis.biggest.score / grid.maxScore).toFixed(2) : '0'} against the
              optimum: motor work per revolution rises faster than usable energy, and the hydrodynamic
              term (1 − e^−0.05ΔE) has already saturated. Past saturation, extra snap energy buys strain,
              not thrust.
            </p>
          )}
        </div>

        <div className="ctr-sec">
          <h2>
            <ShieldAlert size={15} color="#94a3b8" /> Safety check
            <span className="mono t10 dim" style={{ marginLeft: 'auto', fontWeight: 400 }}>
              {hover ? 'hovered' : 'optimum'}
            </span>
          </h2>
          {focus && (
            <>
              <ZoneGauge label="Peak bending strain" value={focus.eb * 100}
                display={`${(focus.eb * 100).toFixed(2)} %`} max={Math.max(2, strainPct * 2)}
                bands={[
                  { upto: strainPct, color: C.green, name: `Within fatigue allowable (${strainPct.toFixed(2)}%)` },
                  { upto: EPS_SUPERELASTIC * 100, color: C.gold, name: 'Past fatigue allowable, still superelastic' },
                  { upto: 99, color: C.red, name: 'Beyond superelastic limit' },
                ]} />
              <ZoneGauge label="Equivalent strain (bend + torsion)" value={focus.eeq * 100}
                display={`${(focus.eeq * 100).toFixed(2)} %`} max={Math.max(2, strainPct * 2)}
                bands={[
                  { upto: strainPct, color: C.green, name: `Within ε_allow (${strainPct.toFixed(2)}%)` },
                  { upto: EPS_SUPERELASTIC * 100, color: C.gold, name: 'Over fatigue allowable' },
                  { upto: 99, color: C.red, name: 'Beyond superelastic limit' },
                ]} />
              <ZoneGauge label="Torsional energy stored" value={focus.stored_J * 1000}
                display={`${(focus.stored_J * 1000).toFixed(2)} mJ`}
                max={Math.max(1, (best?.stored_J ?? 0) * 2000)}
                bands={[
                  { upto: Math.max(0.4, (best?.stored_J ?? 0) * 600), color: C.dim, name: 'Low storage — weak stroke' },
                  { upto: Math.max(1, (best?.stored_J ?? 0) * 1600), color: C.green, name: 'Productive storage' },
                  { upto: 1e9, color: C.gold, name: 'High storage — check strain' },
                ]} />
              <div className="row" style={{ justifyContent: 'space-between', paddingTop: 2 }}>
                <span className="t11 mut">Cycle life <span className="t9 dim">(ranking only)</span></span>
                <span className="mono t12" style={{ color: lifeCat(focus.N).c }}>
                  {lifeCat(focus.N).t} · {fmtN(focus.N)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="ctr-sec" style={{ borderBottom: 0, gap: 14 }}>
          <h2><Sliders size={15} color="#94a3b8" /> Domain</h2>
          <Slider label="Target cycle life" symbol="N" value={logLife} min={6} max={12} step={0.1}
            unit="" digits={1} accent={C.red} onChange={setLogLife} />
          <div className="field-note mono t10 dim" style={{ marginTop: -4 }}>
            10^{logLife.toFixed(1)} cycles → ε_allow = (10/N)^(1/5) = {strainPct.toFixed(2)} %.
            Inverted Coffin-Manson, not the {(EPS_SUPERELASTIC * 100).toFixed(0)}% monotonic
            superelastic limit — that one is a one-time strain, not a per-cycle gate.
          </div>
          <Slider label="Overlap ceiling" symbol="L_c" value={LcMaxMm}
            min={40} max={LcLimitMm} step={5}
            unit=" mm" digits={0} accent={C.gold} onChange={setLcMaxMm} />
          <label className="ctr-numrow">
            <span className="cap-label">Slider upper bound</span>
            <input type="number" min={60} max={2000} step={10} value={LcLimitMm}
              onChange={(e) => {
                const v = Math.max(60, Math.min(2000, Number(e.target.value) || 60));
                setLcLimitMm(v);
                setLcMaxMm((c) => Math.min(c, v));
              }} />
            <span className="mono t10 dim">mm</span>
          </label>
          <Slider label="Hydro saturation" symbol="k_η" value={etaK} min={0.005} max={0.5} step={0.005}
            unit="" digits={3} accent={C.blue} onChange={setEtaK} />
          <div className="mono t10 dim" style={{ marginTop: -4, lineHeight: 1.6 }}>
            <M>{'η_hydro = 1 − exp(−k_η · ΔE)'}</M>. Engineering placeholder — no
            physical derivation, and not a value taken from the burst-and-coast
            literature. RAISING it saturates η toward 1 for every snap, so the
            score stops rewarding size and collapses onto pure round-trip
            efficiency (λ → 3.65). LOWERING it leaves η ≈ k_η·ΔE, so the score
            scales as ΔE²/W_in and chases larger, less efficient snaps.
          </div>
          <label className="ctr-check">
            <input type="checkbox" checked={clip} onChange={(e) => setClip(e.target.checked)} />
            <span>
              Clip κ axis to the fatigue ceiling{' '}
              <span className="mono dim">(κ ≤ 2ε/d₀ = {kappaCeiling.toFixed(1)} m⁻¹)</span>{' '}
              so the surface only spans survivable designs.
            </span>
          </label>
          <div className="mono t10 dim">
            d₀ {(NITINOL.d_o * 1e3).toFixed(2)} mm · kt {(NITINOL.kt * 1e3).toFixed(2)} mN·m² ·
            kb/kt {C_STIFF.toFixed(2)} · grid {GRID_N}×{GRID_N}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   8b · WORKSPACE C — PROPULSION
   ═══════════════════════════════════════════════════════════════ */
function PropulsionWorkspace() {
  const { sim } = useDesign();
  const { LcMm, k1, k2 } = sim;
  const lambda = bifurcation(k1, k2, LcMm / 1000);
  const Lc = LcMm / 1000;

  const [motor, setMotor] = useState({ rpmNoLoad: 100, rpm: 70, stall: 150 });
  const [hydro, setHydro] = useState({
    finW: 8, Cd: 1.3, rho: 997, nFins: 2, area: 20, bodyCd: 0.8,
  });
  const pm = (p) => setMotor((s) => ({ ...s, ...p }));
  const ph = (p) => setHydro((s) => ({ ...s, ...p }));

  const R = useMemo(() => propulsion(lambda, Lc, motor, hydro), [lambda, Lc, motor, hydro]);

  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const box = canvas.parentElement;
    const w = box.clientWidth, h = box.clientHeight;
    if (w < 2 || h < 2) return;
    canvas.style.width = '100%'; canvas.style.height = '100%';
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = C.panel; ctx.fillRect(0, 0, w, h);

    const pad = { l: 58, r: 16, t: 18, b: 38 };
    const A = Math.PI * 2;
    const all = [...R.loop.up.pts, ...R.loop.down.pts];
    let tMin = Infinity, tMax = -Infinity;
    all.forEach((p) => { if (p.th < tMin) tMin = p.th; if (p.th > tMax) tMax = p.th; });
    if (!Number.isFinite(tMin)) { tMin = -A; tMax = A; }
    const m = Math.max((tMax - tMin) * 0.08, 0.2);
    tMin -= m; tMax += m;
    const X = (a) => pad.l + ((a + A) / (2 * A)) * (w - pad.l - pad.r);
    const Y = (t) => h - pad.b - ((t - tMin) / (tMax - tMin)) * (h - pad.t - pad.b);

    ctx.save();
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const x = Math.round(pad.l + ((w - pad.l - pad.r) * i) / 8) + 0.5;
      ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b);
    }
    for (let i = 0; i <= 5; i++) {
      const y = Math.round(pad.t + ((h - pad.t - pad.b) * i) / 5) + 0.5;
      ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y);
    }
    ctx.stroke(); ctx.restore();

    // θ = α reference — where the tip would sit with no bifurcation at all.
    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,0.30)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(-A), Y(-A)); ctx.lineTo(X(A), Y(A)); ctx.stroke();
    ctx.restore();

    // Each direction is one continuous run, broken at the snaps; the vertical
    // connector at a break IS the snap, drawn dashed so it is not read as
    // states the tube actually passes through.
    const drawRun = (run, color) => {
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = color; ctx.lineWidth = 2.2;
      ctx.beginPath();
      let pen = false;
      run.pts.forEach((p) => {
        if (p.snap) { ctx.stroke(); ctx.beginPath(); pen = false; }
        if (!pen) { ctx.moveTo(X(p.a), Y(p.th)); pen = true; }
        else ctx.lineTo(X(p.a), Y(p.th));
      });
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = C.unstable; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]);
      run.snaps.forEach((s) => {
        ctx.beginPath(); ctx.moveTo(X(s.a), Y(s.from)); ctx.lineTo(X(s.a), Y(s.to)); ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.fillStyle = C.unstable;
      run.snaps.forEach((s) => {
        ctx.beginPath(); ctx.arc(X(s.a), Y(s.to), 3.2, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    };
    drawRun(R.loop.up, C.sand);
    drawRun(R.loop.down, C.blue);

    drawAxes(ctx, {
      w, h, pad, X, Y,
      xTicks: piTicks(A), yTicks: piTicks(Math.max(Math.abs(tMin), Math.abs(tMax))),
      xLabel: 'base twist  α  (rad)',
      yLabel: 'tip twist  θ  (rad)',
    });
    ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.sand; ctx.fillText('■ α increasing', pad.l + 8, pad.t + 12);
    ctx.fillStyle = C.blue; ctx.fillText('■ α decreasing', pad.l + 96, pad.t + 12);
  }, [R]);

  const mJ = (j) => (j * 1000).toFixed(1);
  const pill = (ok, warn) => (ok ? C.green : warn ? C.gold : C.unstable);

  return (
    <div className="ctr-body">
      <div className="ctr-view" style={{ display: 'flex', flexDirection: 'column', padding: 14, gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="t11" style={{ color: '#cbd5e1' }}>Hysteresis staircase</span>
          <span className="mono t10 dim">λ = {lambda.toFixed(2)} · {R.snapsPerRev} snap/rev</span>
        </div>
        <div className="ctr-plotbox" style={{ flex: 1 }}><canvas ref={canvasRef} /></div>
        <p className="ctr-p" style={{ margin: 0 }}>
          Sweeping α up and back down snaps at <b>different</b> angles, so the two runs
          do not retrace each other. The enclosed area is the energy lost per cycle —
          the tip's state depends on where it has been, not just where the motor is now.
        </p>
      </div>

      <div className="ctr-side scroll">
        <div className="ctr-sec">
          <h2><Gauge size={15} color={C.cyan} /> Motor</h2>
          <Slider label="No-load speed" symbol="ω₀" value={motor.rpmNoLoad} min={10} max={300} step={1}
            unit=" RPM" digits={0} accent={C.cyan} onChange={(v) => pm({ rpmNoLoad: v })} />
          <Slider label="Operating speed" symbol="ω" value={motor.rpm} min={1} max={299} step={1}
            unit=" RPM" digits={0} accent={C.cyan} onChange={(v) => pm({ rpm: v })} />
          <Slider label="Stall torque" symbol="τ" value={motor.stall} min={10} max={400} step={1}
            unit=" N·mm" digits={0} accent={C.cyan} onChange={(v) => pm({ stall: v })} />
        </div>

        <div className="ctr-sec">
          <h2><Waves size={15} color={C.gold} /> Water</h2>
          <Slider label="Fin width" symbol="w" value={hydro.finW} min={2} max={25} step={0.5}
            unit=" mm" digits={1} accent={C.gold} onChange={(v) => ph({ finW: v })} />
          <Slider label="Fin drag coeff" symbol="C_d" value={hydro.Cd} min={0.3} max={2} step={0.05}
            unit="" accent={C.gold} onChange={(v) => ph({ Cd: v })} />
          <Slider label="Water density" symbol="ρ" value={hydro.rho} min={995} max={1030} step={1}
            unit=" kg/m³" digits={0} accent={C.gold} onChange={(v) => ph({ rho: v })} />
          <Slider label="Fins snapping" symbol="n" value={hydro.nFins} min={1} max={4} step={1}
            unit="" digits={0} accent={C.gold} onChange={(v) => ph({ nFins: v })} />
          <Slider label="Frontal area" symbol="A" value={hydro.area} min={4} max={100} step={1}
            unit=" cm²" digits={0} accent="#a78bfa" onChange={(v) => ph({ area: v })} />
          <Slider label="Body drag coeff" symbol="C_D" value={hydro.bodyCd} min={0.2} max={1.5} step={0.05}
            unit="" accent="#a78bfa" onChange={(v) => ph({ bodyCd: v })} />
        </div>

        {!R.snapCapable ? (
          <div className="ctr-sec">
            <h2><ShieldAlert size={15} color={C.unstable} /> No snap</h2>
            <p className="ctr-p">
              λ = {lambda.toFixed(2)} is below π²/4, so the tip tracks the motor smoothly and
              never releases an impulse. Raise κ₁, κ₂ or L_c in the simulator tab — λ is their
              product, so a straight tube on either side gives zero thrust.
            </p>
          </div>
        ) : (
          <>
            <div className="ctr-sec">
              <h2><Zap size={15} color={C.gold} /> Energy budget</h2>
              <Row k="Released per snap" v={`${mJ(R.released)} mJ`} c={C.gold} />
              <Row k="Motor work per rev" v={`${mJ(R.motorPerRev)} mJ`} c="#94a3b8" />
              <Row k="Margin [%]" v={`${(R.energyMargin * 100).toFixed(0)} %`}
                c={pill(R.energyMargin >= 1.15, R.energyMargin >= 1)} />
              <Row k="Tip jump Δθ" v={`${((R.dTip * 180) / Math.PI).toFixed(0)}°`} c={C.cyan} />
            </div>

            <div className="ctr-sec">
              <h2><Activity size={15} color={C.cyan} /> Torque check</h2>
              <Row k="Peak reaction" v={`${(R.peakTorque * 1000).toFixed(1)} N·mm`} c="#94a3b8" />
              <Row k="Available @ ω" v={`${(R.avail * 1000).toFixed(1)} N·mm`} c="#94a3b8" />
              <Row k="Margin [–]" v={`${R.torqueMargin.toFixed(2)}×`}
                c={pill(R.torqueMargin >= 1.3, R.torqueMargin >= 1)} />
              <p className="ctr-p" style={{ marginTop: 4 }}>
                Quasi-static. Rotor inertia can carry a brief deficit, but a sustained one
                bogs the motor down and delays the snap.
              </p>
            </div>

            <div className="ctr-sec">
              <h2><ArrowUpRight size={15} color={C.green} /> Thrust</h2>
              <Row k="Jet velocity" v={`${(R.vJet * 100).toFixed(1)} cm/s`} c={C.cyan} />
              <Row k="Avg thrust power" v={`${(R.Pthrust * 1000).toFixed(0)} mW`} c="#94a3b8" />
              <Row k="Cruise speed" v={`${(R.vCruise * 100).toFixed(1)} cm/s`} c={C.green} />
              <p className="ctr-p" style={{ marginTop: 4 }}>
                Cruise balances average thrust power against ½ρC_D A v³. The model is
                frictionless and ignores superelastic hysteresis loss and added mass, so
                treat every number here as an optimistic upper bound.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   9 · ROOT
   ═══════════════════════════════════════════════════════════════ */
export default function CTRWorkbench() {
  const store = useDesignStore();
  const [tab, setTab] = useState('sim');
  // Instrument/data-dense screens default to the dark surface (BRAND.md
  // component defaults). The token file supports both, so the choice is a
  // default rather than a lock-in.
  const [theme, setTheme] = useState('dark');
  const [ready, setReady] = useState(0);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    syncTokens();
    setReady((n) => n + 1);      // force a repaint of the canvases and scenes
  }, [theme]);
  useEffect(() => { if (store.handoff) setTab('sim'); }, [store.handoff?.stamp]);

  const tabs = [
    { id: 'sim', label: 'Interactive 3D simulator', icon: Activity },
    { id: 'opt', label: 'Design optimization', icon: Boxes },
    { id: 'prop', label: 'Propulsion', icon: Waves },
  ];

  return (
    <DesignCtx.Provider value={store}>
      <style>{CSS}</style>
      <div className="ctr">
        <header className="ctr-hdr">
          <div>
            <h1>Concentric tube workbench</h1>
            <p>Two-tube CTR fin · torsional bifurcation, snap energetics, nitinol fatigue</p>
          </div>
          <div className="row" style={{ gap: 14, alignItems: 'flex-end' }}>
            <nav className="ctr-tabs">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`ctr-tab${tab === id ? ' on' : ''}`}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </nav>
            <button className="ctr-btn" style={{ marginBottom: 8 }}
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title="Switch surface. Dark is the default for instrument screens.">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </header>
        {tab === 'sim' && <SimulatorWorkspace key={`sim${ready}`} />}
        {tab === 'opt' && <OptimizerWorkspace key={`opt${ready}`} />}
        {tab === 'prop' && <PropulsionWorkspace key={`prop${ready}`} />}
      </div>
    </DesignCtx.Provider>
  );
}
