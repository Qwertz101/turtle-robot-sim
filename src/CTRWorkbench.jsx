import React, { useRef, useEffect, useState, useMemo, useCallback, createContext, useContext } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Play, Pause, RotateCcw, Zap, Activity, Sliders, Gauge, AlertTriangle,
  Boxes, Target, ArrowUpRight, ShieldAlert, Waves,
  Layers, ChevronDown, ChevronLeft, ChevronRight, Ruler,
  CircleDot, Waypoints, MoveUpRight, Compass, BookOpen, Anchor, RectangleVertical, Lock, Sun, Moon, SlidersHorizontal, RotateCw, MoveRight, ScrollText, Download, Box, MoveHorizontal, Droplets, Wind,
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import CitationsPage from './CitationsPage.jsx';
import { PHYS_DEFAULTS, MEDIA } from './physics.js';
import { solveCycles, solveRowingGrid, designMsg } from './physicsClient.js';
import {
  energy, gradient, stiffness, lamEff, muOf, N_STEPS, eye3, matmul3, rodrigues, integrateShape, tipPoint, foldSnap, settle, snapStroke, strokePieces, strokeVector, forwardShare, snapEfficiency, NITINOL, EPS_SUPERELASTIC, epsAllowFor, LAMBDA_CRIT, SOLVER, mulberry32, SNAP_GAP_S, makeSnapDetector, sweepFrames, ROW_FPS, rowingIntegral, tipRoll, motorWork, fatigueLife, tubeSection, pairMechanics, DEFAULT_TUBES, torsionEfficiency, bifurcation, evaluateDesign, buildGrid, M2MM, SNAP_THRESHOLD,
} from './model.js';
import { EQ_BY_ID, EQ_NUM, KIND, REF_BY_KEY } from './citations.js';

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
.ctr-logs{flex:1;overflow:auto;min-height:0;}
.ctr-logs-in{max-width:880px;margin:0 auto;padding:22px 16px 40px;}
.ctr-logs h2{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:16px;letter-spacing:.04em;text-transform:uppercase;}
.ctr-logs-design{margin:12px 0;padding:8px 10px;border:1px solid var(--line-300);border-radius:6px;font-size:11.5px;}
.ctr-logs-cfg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px 14px;margin-bottom:8px;}
.ctr-logs-cfg label{display:grid;grid-template-columns:1fr;gap:3px;font-size:11px;}
.ctr-logs-cfg label>span{text-transform:uppercase;letter-spacing:.06em;color:var(--ink-600);}
.ctr-logs-cfg label{position:relative;}
.ctr-logs-cfg label>i{position:absolute;right:8px;bottom:6px;font-style:normal;font-size:10.5px;color:var(--ink-600);pointer-events:none;}
.ctr-logs-res{margin-top:16px;}
.ctr-logs-stats{display:flex;flex-direction:column;gap:2px;font-size:11.5px;margin-bottom:10px;}
.ctr-logs-warn{margin-bottom:8px;padding:6px 9px;border:1px solid var(--rams-500);border-radius:6px;font-size:12px;}
.ctr-logplot{margin-top:10px;}
.ctr-view{position:relative;flex:1;min-width:0;background:var(--paper-50);}
.ctr-solving{position:absolute;z-index:12;left:50%;top:14px;transform:translateX(-50%);padding:8px 12px;border-radius:8px;border:1px solid var(--rams-500);background:var(--paper-100);font-size:12px;text-align:center;}
.ctr-oned{position:absolute;inset:0;width:100%;height:100%;z-index:5;background:var(--paper-50);}
.ctr-view canvas{display:block;position:absolute;inset:0;width:100%;height:100%;}
.ctr-side{width:372px;flex-shrink:0;border-left:1px solid var(--line-300);
  background:var(--surface);display:flex;flex-direction:column;min-height:0;}
.ctr-side.scroll{overflow-y:auto;}
@media(min-width:1400px){.ctr-side{width:420px;}}
@media(max-width:1000px){.ctr-side{width:300px;}}
.ctr-cbar{position:absolute;z-index:10;top:50%;right:14px;transform:translateY(-50%);
  display:flex;flex-direction:column;gap:5px;pointer-events:none;}
.ctr-cbar-body{display:flex;gap:6px;height:184px;}
.ctr-cbar-strip{width:14px;border-radius:3px;border:1px solid var(--line-300);}
.ctr-cbar-ticks{display:flex;flex-direction:column;justify-content:space-between;
  color:var(--ink-600);text-align:left;}

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

/* ── Collapsible chrome ───────────────────────────────────────────────────
   Both the sidebar and every panel inside it fold away, because the two
   things this app is actually for -- the 3-D scene and the optimisation
   surface -- are spatial, and a fixed 372 px of chrome is 25% of a laptop
   viewport that the geometry could be using. Collapsed state is a thin RAIL
   rather than nothing at all: a control that vanishes completely is a control
   the user cannot find again. */
.ctr-rail{width:34px;flex-shrink:0;border-left:1px solid var(--line-300);
  background:var(--surface);display:flex;flex-direction:column;align-items:center;
  gap:12px;padding:10px 0;}
.ctr-rail .vlabel{writing-mode:vertical-rl;font-family:var(--font-display);
  font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.07em;
  color:var(--ink-600);user-select:none;}
.ctr-icon-btn{background:none;border:0;color:var(--ink-600);cursor:pointer;
  padding:4px;border-radius:5px;display:flex;align-items:center;justify-content:center;
  transition:color .15s,background .15s;}
.ctr-icon-btn:hover{color:var(--ink-900);background:var(--paper-100);}

.ctr-side-hd{display:flex;align-items:center;gap:8px;padding:9px 8px 9px 15px;
  border-bottom:1px solid var(--line-300);flex-shrink:0;background:var(--paper-100);}
.ctr-side-hd .ttl{flex:1;font-family:var(--font-display);font-weight:500;font-size:11.5px;
  text-transform:uppercase;letter-spacing:.05em;color:var(--ink-600);}

.ctr-panel{border-bottom:1px solid var(--line-300);display:flex;flex-direction:column;
  min-height:0;flex-shrink:0;}
.ctr-panel-hd{display:flex;align-items:center;gap:7px;width:100%;padding:11px 14px;
  background:none;border:0;cursor:pointer;text-align:left;
  font-family:var(--font-display);font-weight:500;font-size:13.5px;line-height:19px;
  color:var(--ink-900);}
.ctr-panel-hd:hover{background:var(--paper-100);}
.ctr-panel-hd .chev{color:var(--ink-600);flex-shrink:0;transition:transform .15s;}
.ctr-panel:not(.open) .ctr-panel-hd .chev{transform:rotate(-90deg);}
.ctr-panel-hd .ttl{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;}
.ctr-panel-hd .rt{flex-shrink:0;font-family:var(--font-mono);font-size:10px;
  font-weight:400;color:var(--ink-600);}
.ctr-panel-bd{padding:0 14px 14px;display:flex;flex-direction:column;gap:11px;min-height:0;}
/* A plot panel claims the leftover height when open and none when shut. */
.ctr-panel.plot.open{flex:1;}
.ctr-panel.plot .ctr-panel-bd{flex:1;min-height:90px;}

/* ── Data layers ──────────────────────────────────────────────────────────
   A Google-Earth-style overlay switchboard: the scene is one map, and each
   layer is an independent read on the SAME configuration. Anchored bottom
   left over the viewport rather than docked in the sidebar, so it stays
   reachable when the sidebar is collapsed. */
.ctr-tl{position:absolute;z-index:14;left:12px;top:12px;display:flex;flex-direction:column;
  align-items:flex-start;gap:8px;max-width:calc(100% - 24px);}
.ctr-eff{width:236px;padding:10px 12px 9px;border-radius:10px;background:var(--surface);
  border:1px solid var(--line-300);box-shadow:0 6px 20px rgba(0,0,0,.35);}
.ctr-eff .v{font-family:var(--font-mono);font-size:24px;line-height:1.1;color:var(--ink-900);
  font-variant-numeric:tabular-nums;}
.ctr-eff .bar{position:relative;height:5px;border-radius:3px;margin:7px 0 6px;
  background:var(--paper-100);border:1px solid var(--line-300);overflow:hidden;}
.ctr-eff .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;}
.ctr-eff .bar b{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ink-600);}
.ctr-eff .ft{font-family:var(--font-mono);font-size:10px;line-height:1.6;color:var(--ink-600);}
.ctr-help-btn{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:7px;
  cursor:pointer;font-family:var(--font-mono);font-size:10px;color:var(--ink-600);
  background:var(--surface);border:1px solid var(--line-300);}
.ctr-help-btn:hover,.ctr-help-btn.on{color:var(--ink-900);border-color:var(--rams-500);}
.ctr-help{padding:8px 11px;border-radius:8px;background:var(--surface);
  border:1px solid var(--line-300);font-family:var(--font-mono);font-size:10px;line-height:1.7;
  color:var(--ink-600);}
/* A calculated number that links to its citation. */
.ctr-cx{cursor:pointer;pointer-events:auto;border-bottom:1px dotted color-mix(in srgb, currentColor 50%, transparent);}
.ctr-cx:hover{border-bottom-style:solid;}
.ctr-pop{position:fixed;z-index:200;width:340px;max-width:calc(100vw - 24px);padding:11px 13px 12px;
  border-radius:9px;background:var(--surface);border:1px solid var(--line-300);border-left:4px solid var(--k);
  box-shadow:0 14px 40px rgba(0,0,0,.45);color:var(--ink-900);font-family:var(--font-body);font-size:12px;}
.ctr-pop .hd{display:flex;align-items:baseline;gap:8px;}
.ctr-pop .k{font-family:KaTeX_Main,serif;font-variant:small-caps;font-weight:700;letter-spacing:.05em;color:var(--k);}
.ctr-pop .n{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-600);}
.ctr-pop .ttl{font-family:KaTeX_Main,serif;font-weight:700;font-size:14px;}
.ctr-pop .eq{margin:9px 0 7px;overflow-x:auto;overflow-y:hidden;font-size:13.5px;padding-bottom:2px;}
.ctr-pop .src{color:var(--ink-600);font-size:11px;line-height:1.5;margin-bottom:9px;}
.ctr-pop .val{font-family:var(--font-mono);font-size:11px;color:var(--ink-600);}
/* Typed specification fields and the axis-bounds table. */
.ctr-fields{display:flex;flex-direction:column;gap:6px;}
.ctr-field{display:grid;grid-template-columns:minmax(0,1fr) 86px 30px;gap:8px;align-items:center;
  font-size:12px;color:var(--ink-600);}
.ctr-field .l i{font-style:normal;color:var(--ink-900);margin-left:3px;}
.ctr-field .u,.ctr-axes .u{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-600);}
.ctr-axes{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,1fr) 30px;gap:6px 8px;align-items:center;}
.ctr-axes .h{font-weight:500;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-600);text-align:center;}
.ctr-axes .t{font-size:11.5px;color:var(--ink-900);white-space:nowrap;}
.ctr-scorecard{pointer-events:auto;margin-top:10px;padding:8px 11px 7px;border-radius:8px;cursor:pointer;
  background:color-mix(in srgb, var(--surface) 88%, transparent);border:1px solid var(--line-300);
  color:var(--ink-900);max-width:330px;}
.ctr-scorecard:hover{border-color:var(--rams-500);}
.ctr-scorecard .katex{font-size:1.12em;}
.ctr-layers{position:absolute;z-index:14;left:14px;bottom:14px;display:flex;
  flex-direction:column;align-items:flex-start;gap:8px;}
.ctr-layers-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 12px;
  border-radius:8px;cursor:pointer;font-family:var(--font-display);font-weight:500;
  font-size:12px;text-transform:uppercase;letter-spacing:.03em;
  background:var(--surface);border:1px solid var(--line-300);color:var(--ink-900);
  box-shadow:0 6px 20px rgba(0,0,0,.35);}
.ctr-layers-btn:hover{border-color:var(--rams-500);}
.ctr-layers-btn .cnt{font-family:var(--font-mono);font-size:10.5px;color:var(--rams-700);}
.ctr-layers-card{width:248px;max-height:min(58vh,430px);overflow-y:auto;
  border-radius:10px;background:var(--surface);border:1px solid var(--line-300);
  box-shadow:0 14px 40px rgba(0,0,0,.5);padding-bottom:6px;}
.ctr-layers-card .hd{display:flex;align-items:center;gap:7px;padding:11px 13px 9px;
  border-bottom:1px solid var(--line-300);
  font-family:var(--font-display);font-weight:500;font-size:13px;color:var(--ink-900);}
.ctr-layers-card h3{margin:0;padding:12px 13px 4px;font-weight:500;font-size:10px;
  text-transform:uppercase;letter-spacing:.07em;color:var(--ink-600);}
.ctr-layer{display:flex;align-items:flex-start;gap:9px;padding:7px 13px;cursor:pointer;}
.ctr-layer:hover{background:var(--paper-100);}
.ctr-layer input{margin-top:3px;accent-color:var(--rams-500);flex-shrink:0;}
.ctr-layer .nm{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink-900);}
.ctr-layer .ds{font-size:10.5px;line-height:1.5;color:var(--ink-600);margin-top:2px;}
.ctr-layer-empty{padding:2px 13px 10px;font-size:10.5px;line-height:1.55;
  color:var(--ink-600);font-style:italic;}
.ctr-key{display:inline-block;width:18px;height:3px;border-radius:2px;flex-shrink:0;}
.ctr-lyr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:0 10px 4px;}
.ctr-lyr{display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 4px 7px;
  border-radius:8px;border:1px solid var(--line-300);background:var(--paper-100);
  color:var(--ink-600);cursor:pointer;font-size:10.5px;line-height:1.2;text-align:center;
  transition:border-color .15s,color .15s;}
.ctr-lyr:hover:not(:disabled){color:var(--ink-900);}
.ctr-lyr.on{background:var(--surface);}
.ctr-lyr:disabled{opacity:.4;cursor:default;}

/* Spec strip: what the scene is currently showing, read-only. The numbers are
   set on the optimisation tab, so editing them here would contradict the
   single place they are owned. */
.ctr-spec{display:flex;flex-wrap:wrap;gap:4px 16px;}
.ctr-spec span{font-family:var(--font-mono);font-size:10px;color:var(--ink-600);}
.ctr-spec b{font-weight:400;color:var(--ink-900);}

/* Tube section editor: three linked fields per tube. */
.ctr-sect{display:grid;grid-template-columns:auto repeat(3,minmax(0,1fr));gap:6px 8px;
  align-items:center;}
.ctr-sect .h{font-weight:500;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;
  color:var(--ink-600);text-align:center;}
.ctr-sect .t{font-size:11.5px;color:var(--ink-900);white-space:nowrap;}
.ctr-num{width:100%;min-width:0;padding:5px 6px;border-radius:5px;
  background:var(--paper-50);border:1px solid var(--line-300);color:var(--ink-900);
  font-family:var(--font-mono);font-size:12px;font-variant-numeric:tabular-nums;}
.ctr-num:focus{outline:none;border-color:var(--rams-500);}
.ctr-seg{display:flex;border:1px solid var(--line-300);border-radius:6px;overflow:hidden;}
.ctr-seg button{flex:1;padding:7px 8px;background:var(--paper-100);border:0;cursor:pointer;
  font-family:var(--font-display);font-weight:500;font-size:11px;text-transform:uppercase;
  letter-spacing:.03em;color:var(--ink-600);}
.ctr-seg button + button{border-left:1px solid var(--line-300);}
.ctr-seg button.on{background:var(--rams-500);color:var(--paper-50);}
.ctr-verdict{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.ctr-verdict > div{padding:8px 10px;border-radius:6px;border:1px solid var(--line-300);
  background:var(--paper-100);}
.ctr-verdict > div.act{border-color:var(--rams-500);}
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

/* Every CONFIGURED quantity in the app lives here, in one store, because the
   workflow is "set the specification once, then read it from several views".
   Keeping any of it in one tab's local state would let two tabs disagree
   about the same physical robot, and would lose it whenever that tab
   unmounts.

   What is NOT here: alpha, the motor base twist. That is not a specification,
   it is the live actuation input the simulator drives, so it stays with the
   view that animates it. */
function useDesignStore() {
  // κ₁ = κ₂ = 9.4 m⁻¹ over a 150 mm overlap reproduces the λ ≈ 3.2 this view
  // used to hard-code, but now as a consequence of the geometry rather than a
  // free parameter.
  const [sim, setSim] = useState({ alphaDeg: 0, LcMm: 150, extMm: 45, k1: 9.4, k2: 9.4 });
  // Optimiser settings: the fatigue/score constants and the graph's axis
  // bounds (the box it searches), not the design itself. Bounds are typed,
  // so there is no separate slider ceiling to keep in step. z is in mJ;
  // zAuto spans 0 to the tallest cell.
  const [domain, setDomain] = useState({
    logLife: 10, etaK: 0.05, clip: true, rowCycles: 2, rowGrid: 12,
    kMin: 0, kMax: 25, LcMinMm: 10, LcMaxMm: 150, zAuto: true, zMin: 0, zMax: 300,
  });
  // Data-layer visibility on the 3-D view. This belongs in the shared store,
  // not local state on SimulatorWorkspace: the root remounts every workspace
  // on a theme switch (key={`${tab}${ready}`}, so the canvases and WebGL
  // scenes repaint), and local state does not survive its component
  // unmounting — a theme toggle was silently switching every layer back off.
  const [layers, setLayers] = useState({ tipTrack: false, midTrack: false, vectors: false, tipVectors: false, compass: false, headingUp: false, effCard: true });
  // Tube cross-sections (mm) and the outer tube's rotational constraint.
  // Part of the SPECIFICATION, so owned here like every other configured
  // quantity; `mech` is derived once and read by every view.
  const [tubes, setTubes] = useState(DEFAULT_TUBES);
  const [outerLocked, setOuterLocked] = useState(false);
  // Planar: the outer tube is held in its own plane (see pairMechanics).
  // The three outer-tube modes are exclusive; the switch sets both flags.
  const [outerPlanar, setOuterPlanar] = useState(false);
  const mech = useMemo(() => pairMechanics(tubes, outerLocked, outerPlanar), [tubes, outerLocked, outerPlanar]);
  const [handoff, setHandoff] = useState(null);
  // What counts as useful snap output: 'translation' (the tip's net push,
  // η_prop) or 'torsion' (the twist released, η_T, for a fin used as a
  // torsional spring that powers a separate propulsor).
  const [objective, setObjective] = useState('translation');
  // Simulator view: the 3-D scene, or the 1-D forward-axis view.
  const [simView, setSimView] = useState('3d');
  // Physics solver settings (time-domain dynamics, src/physics.js):
  // medium (water / air), motor speed, material loss factor, cycles averaged.
  const [phys, setPhys] = useState({ medium: PHYS_DEFAULTS.medium, rpm: PHYS_DEFAULTS.rpm,
    loss: PHYS_DEFAULTS.loss, cycles: PHYS_DEFAULTS.cycles });
  const patchPhys = useCallback((p) => setPhys((s) => ({ ...s, ...p })), []);

  const patchSim = useCallback((p) => setSim((s) => ({ ...s, ...p })), []);
  const patchTube = useCallback((which, p) =>
    setTubes((t) => ({ ...t, [which]: { ...t[which], ...p } })), []);
  const patchDomain = useCallback((p) => setDomain((s) => ({ ...s, ...p })), []);
  const patchLayers = useCallback((p) => setLayers((s) => ({ ...s, ...p })), []);

  const applyDesign = useCallback((d) => {
    // The sweep is the equal-precurvature diagonal, so a design lands in the
    // simulator as κ₁ = κ₂ = κ; λ then follows from those and L_c.
    setSim((s) => ({ ...s, LcMm: d.Lc * 1000, k1: d.kappa, k2: d.kappa, alphaDeg: 0 }));
    setHandoff({ kappa: d.kappa, Lc: d.Lc, lambda: d.lambda, stamp: Date.now() });
  }, []);

  return { sim, patchSim,
    domain, patchDomain, layers, patchLayers, handoff, applyDesign,
    tubes, patchTube, setTubes, outerLocked, setOuterLocked, outerPlanar, setOuterPlanar, mech, objective, setObjective, simView, setSimView, phys, patchPhys };
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

/** A calculated number that knows where it came from. Clicking it offers a
 *  jump to its entry on the citations page; the value shown is passed along
 *  so the entry can say which number brought the reader there. */
function Cx({ id, children }) {
  const { openCite } = useDesign();
  const open = (e) => { e.stopPropagation(); openCite(id, e.currentTarget.textContent.trim(), e); };
  return (
    <span className="ctr-cx" role="button" tabIndex={0} title="Where does this number come from?"
      onClick={open} onKeyDown={(e) => { if (e.key === 'Enter') open(e); }}>
      {children}
    </span>
  );
}

function Metric({ icon, label, value, color, note, cite }) {
  return (
    <div className="ctr-metric">
      <div className="k">{icon}<M>{label}</M></div>
      <div className="v mono">
        {cite ? <Cx id={cite}>{value}</Cx> : value}
        {note && (
          <span className="ctr-state">
            <i style={{ background: color }} />{note}
          </span>
        )}
      </div>
    </div>
  );
}

function ZoneGauge({ label, value, display, bands, max, cite }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  const zone = bands.find((b) => value <= b.upto) || bands[bands.length - 1];
  return (
    <div className="ctr-gauge">
      <div className="top">
        <span><M>{label}</M></span>
        <span className="mono t12" style={{ color: zone.color }}>{cite ? <Cx id={cite}>{display}</Cx> : display}</span>
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

/** Collapsible section. `plot` panels stretch to fill leftover sidebar height
 *  when open; the canvases inside re-measure their wrapper every frame, so
 *  folding one simply stops it drawing rather than corrupting its backing
 *  store. */
function Panel({ title, icon, right, children, open, onToggle, plot }) {
  return (
    <section className={`ctr-panel${open ? ' open' : ''}${plot ? ' plot' : ''}`}>
      <button className="ctr-panel-hd" onClick={onToggle}
        aria-expanded={open} title={open ? 'Collapse' : 'Expand'}>
        <ChevronDown size={13} className="chev" />
        {icon}
        <span className="ttl"><M>{title}</M></span>
        {right && <span className="rt">{right}</span>}
      </button>
      {open && <div className="ctr-panel-bd">{children}</div>}
    </section>
  );
}

/** Sidebar that folds to a labelled rail. */
function SideBar({ title, open, onToggle, scroll, children }) {
  if (!open) {
    return (
      <aside className="ctr-rail">
        <button className="ctr-icon-btn" onClick={onToggle} title={`Show ${title}`}>
          <ChevronLeft size={16} />
        </button>
        <span className="vlabel">{title}</span>
      </aside>
    );
  }
  return (
    <aside className={`ctr-side${scroll ? ' scroll' : ''}`}>
      <div className="ctr-side-hd">
        <span className="ttl">{title}</span>
        <button className="ctr-icon-btn" onClick={onToggle} title={`Hide ${title}`}>
          <ChevronRight size={16} />
        </button>
      </div>
      {children}
    </aside>
  );
}

/** One row of the data-layer switchboard. */
/** One layer toggle: a symbol and a short label. The full explanation lives
 *  in the tooltip, so the card stays scannable. */
function LayerRow({ on, onChange, name, desc, icon: Icon, color, disabled }) {
  return (
    <button type="button" className={`ctr-lyr${on ? ' on' : ''}`} disabled={disabled}
      title={desc} aria-pressed={on} onClick={() => onChange(!on)}
      style={on ? { borderColor: color, color } : undefined}>
      <Icon size={18} />
      <span>{name}</span>
    </button>
  );
}

/** Numeric field that commits live while valid and never reformats under the
 *  cursor: text is re-synced from `value` only while the field is NOT focused,
 *  so typing "0.8" is not interrupted by an intermediate "0" being committed
 *  and redisplayed as "0.000". Invalid text reverts on blur. */
function NumField({ value, onCommit, min, max, step = 0.01, digits = 3, title }) {
  const [txt, setTxt] = useState(value.toFixed(digits));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setTxt(value.toFixed(digits)); }, [value, digits]);
  return (
    <input className="ctr-num" type="number" value={txt} step={step} min={min} max={max} title={title}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; setTxt(value.toFixed(digits)); }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      onChange={(e) => {
        setTxt(e.target.value);
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v) && v >= min && v <= max) onCommit(v);
      }} />
  );
}

/** One typed specification value: label, field, unit. */
function FieldRow({ label, sym, unit, value, onCommit, min, max, digits = 2, step }) {
  return (
    <label className="ctr-field">
      <span className="l"><M>{label}</M><i><M>{sym}</M></i></span>
      <NumField value={value} onCommit={onCommit} min={min} max={max} digits={digits}
        step={step} title={`${label} (${unit}), ${min} to ${max}`} />
      <span className="u">{unit}</span>
    </label>
  );
}

/** Keeps a set of panel open/closed flags. */
function usePanels(initial) {
  const [open, setOpen] = useState(initial);
  const toggle = useCallback((k) => setOpen((o) => ({ ...o, [k]: !o[k] })), []);
  return [open, toggle];
}

/* ═══════════════════════════════════════════════════════════════
   7 · WORKSPACE A — INTERACTIVE 3D SIMULATOR
   ═══════════════════════════════════════════════════════════════ */
/* ── 1-D view ─────────────────────────────────────────────────────────────
   Everything projected onto the FORWARD axis (robot-local +x): where the
   tip is along it, the forward component of the tip's velocity (the travel
   vector), and the forward component of the unit roll vector (cos of the
   roll vector's angle to forward, −1 to 1). Above: the axis with the live
   values as arrows. Below: their last ONE_D_SPAN seconds, red where the
   fin is snapping. Fed per frame by the simulator loop; drawn on its own
   canvas over the 3-D view, which keeps running underneath.             */
const ONE_D_SPAN = 8;
function OneDView({ feed }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, g = cv.getContext('2d');
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const dpr = window.devicePixelRatio || 1;
      const W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const o = feed.current, cur = o.cur;
      if (!cur) return;
      // Everything along the current axis (it moves as snaps accumulate).
      for (const q of o.hist) {
        if (q.ex === cur.ex && q.ey === cur.ey) continue;
        q.x = q.px * cur.ex + q.py * cur.ey; q.v = q.vx * cur.ex + q.vy * cur.ey; q.r = q.rx * cur.ex + q.ry * cur.ey;
        q.ex = cur.ex; q.ey = cur.ey;
      }
      const mono = '11px "Fira Code", ui-monospace, monospace';
      // Keep clear of the top-left cards: beside them on a wide view,
      // below them on a narrow one.
      const tl = cv.parentElement?.querySelector('.ctr-tl');
      const tlR = tl ? tl.getBoundingClientRect() : null, cvR = cv.getBoundingClientRect();
      const tlRight = tlR ? tlR.right - cvR.left : 0, tlBottom = tlR ? tlR.bottom - cvR.top : 0;
      const beside = W - tlRight > 460;
      const L = beside ? tlRight + 40 : 24, R = W - 28, mid = (L + R) / 2;
      const reach = Math.max(10, cur.reach);
      const X = (mm) => mid + ((R - L) / 2) * (mm / reach);
      const arrow = (x0, y, x1, col, w) => {
        g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w;
        g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
        if (Math.abs(x1 - x0) > 4) {
          const s = Math.sign(x1 - x0);
          g.beginPath(); g.moveTo(x1 + s * 2, y); g.lineTo(x1 - s * 9, y - 5); g.lineTo(x1 - s * 9, y + 5); g.fill();
        }
      };

      // ── Axis with live arrows ──
      const yA = beside ? Math.max(118, H * 0.24) : Math.max(118, tlBottom + 56);
      g.strokeStyle = C.dim; g.lineWidth = 1;
      g.beginPath(); g.moveTo(L, yA); g.lineTo(R, yA); g.stroke();
      g.font = mono; g.fillStyle = C.dim; g.textAlign = 'center';
      const step = reach > 150 ? 50 : reach > 60 ? 20 : 10;
      for (let mm = -Math.floor(reach / step) * step; mm <= reach; mm += step) {
        g.beginPath(); g.moveTo(X(mm), yA - 4); g.lineTo(X(mm), yA + 4); g.stroke();
        g.fillText(`${mm}`, X(mm), yA + 17);
      }
      // Axis name: the net thrust direction (its bearing from FORWARD, positive
      // toward UP) once there is one, else FORWARD.
      const axisName = cur.net ? `NET THRUST (${cur.bearing >= 0 ? '+' : ''}${cur.bearing.toFixed(0)}° from fwd)` : 'FORWARD';
      const ax = cur.net ? 'thrust' : 'fwd';
      g.textAlign = 'left'; g.fillText(cur.net ? '← against' : '← BACK', L, yA - 12);
      g.textAlign = 'right'; g.fillText(`${axisName} →  mm`, R, yA - 12);
      if (!cur.net) { g.textAlign = 'center'; g.fillText('no snaps yet: sweep α to set the net thrust axis', mid, yA + 82); }
      g.textAlign = 'center'; g.fillText('base', X(0), yA + 30);

      const xt = X(cur.x);
      // Travel: forward velocity, log-scaled so snaps stay on screen.
      const vLen = Math.sign(cur.v) * Math.min(160, 34 * Math.log10(1 + Math.abs(cur.v)));
      arrow(xt, yA - 34, xt + vLen, C.gold, 2.5);
      // Roll: forward component of the unit roll vector, ±70 px at ±1.
      /* Roll as a compass needle through the tip: the blade normal drawn in
         the (forward, rest) plane, its forward component r_f horizontal and
         the remaining √(1 − r_f²) vertical. Symmetric blade, so the needle
         is double-ended. Behind it, the wake: the area the needle swept
         between frames, i.e. the water its face pushed, filled gold where
         the tip moved forward and blue where it moved back, fading out over
         WAKE_S seconds. */
      const NEEDLE = 46, WAKE_S = 1.6;
      const nv = (q) => [q.r, -Math.sqrt(Math.max(0, 1 - q.r * q.r))];
      for (let i = 1; i < o.hist.length; i++) {
        const a = o.hist[i - 1], b = o.hist[i], age = cur.t - b.t;
        if (age > WAKE_S) continue;
        const xa = X(a.x), xb = X(b.x);
        if (Math.abs(xb - xa) < 0.05 && Math.abs(b.r - a.r) < 1e-4) continue;
        const [ua, va] = nv(a), [ub, vb] = nv(b);
        g.globalAlpha = 0.42 * (1 - age / WAKE_S) ** 1.5;
        g.fillStyle = b.x >= a.x ? C.gold : C.blue;
        for (const sgn of [1, -1]) {
          g.beginPath();
          g.moveTo(xa, yA); g.lineTo(xa + sgn * NEEDLE * ua, yA + sgn * NEEDLE * va);
          g.lineTo(xb + sgn * NEEDLE * ub, yA + sgn * NEEDLE * vb); g.lineTo(xb, yA);
          g.closePath(); g.fill();
        }
      }
      g.globalAlpha = 1;
      {
        const [u, v] = nv(cur);
        g.lineCap = 'round';
        g.strokeStyle = C.cyan; g.lineWidth = 3.5;
        g.beginPath(); g.moveTo(xt, yA); g.lineTo(xt + NEEDLE * u, yA + NEEDLE * v); g.stroke();
        g.strokeStyle = C.dim;
        g.beginPath(); g.moveTo(xt, yA); g.lineTo(xt - NEEDLE * u, yA - NEEDLE * v); g.stroke();
        g.lineCap = 'butt';
      }
      g.fillStyle = cur.fast ? C.unstable : C.ink;
      g.beginPath(); g.arc(xt, yA, 6, 0, 2 * Math.PI); g.fill();
      g.font = mono; g.textAlign = 'left';
      g.fillStyle = C.gold; g.fillText(`travel·${ax} ${cur.v.toFixed(0)} mm/s`, Math.min(xt + 10, R - 150), yA - 44);
      g.fillStyle = C.cyan; g.fillText(`roll·${ax} ${cur.r.toFixed(2)}`, Math.min(xt + 10, R - 150), yA + 62);
      g.fillStyle = C.ink; g.fillText(`tip ${cur.x.toFixed(1)} mm`, Math.min(xt + 10, R - 150), yA - 12 + 0);

      // ── Lower area: relative force vs forward position, plus strips ──
      const top = Math.max(yA + 90, H * 0.42), bot = H - 46, gap = 14;
      const hist = o.hist, t1 = cur.t, t0 = t1 - ONE_D_SPAN;
      const wide = W > 700;
      // Force plot on the left (or full width on top when narrow), the two
      // time strips on the right (or below).
      const PL = 24, PR = wide ? Math.round(W * 0.55) : W - 28;
      const PT = top, PB = wide ? bot : top + (bot - top) * 0.5 - gap / 2;
      const SL = wide ? PR + 22 : 24, SR = W - 28;
      const sTop = wide ? top : PB + gap;
      const h = (bot - sTop - gap) / 2;
      const TX = (t) => SL + ((SR - SL) * (t - t0)) / ONE_D_SPAN;
      const strip = (y, label, get, lo, hi, col) => {
        g.strokeStyle = C.line; g.lineWidth = 1;
        g.strokeRect(SL, y, SR - SL, h);
        const Y = (v) => y + h - (h * (Math.max(lo, Math.min(hi, v)) - lo)) / (hi - lo);
        if (lo < 0 && hi > 0) { g.beginPath(); g.moveTo(SL, Y(0)); g.lineTo(SR, Y(0)); g.stroke(); }
        g.lineWidth = 1.6;
        for (let i = 1; i < hist.length; i++) {
          const a = hist[i - 1], b = hist[i];
          g.strokeStyle = b.fast ? C.unstable : col;
          g.beginPath(); g.moveTo(TX(a.t), Y(get(a))); g.lineTo(TX(b.t), Y(get(b))); g.stroke();
        }
        g.font = mono; g.fillStyle = col; g.textAlign = 'left';
        g.fillText(label, SL + 6, y + 13);
        g.fillStyle = C.dim; g.textAlign = 'right';
        g.fillText(`${hi}`, SR - 4, y + 12); g.fillText(`${lo}`, SR - 4, y + h - 4);
      };
      const symLim = (m) => Math.pow(10, Math.ceil(Math.log10(Math.max(m, 1e-9))));
      const vLim = symLim(Math.max(50, ...hist.map((q) => Math.abs(q.v))));
      const axWord = cur.net ? 'net thrust axis' : 'forward';
      strip(sTop, `travel · ${axWord} (mm/s)`, (q) => q.v, -vLim, vLim, C.gold);
      strip(sTop + h + gap, `roll · ${axWord} (unit vector component)`, (q) => q.r, -1, 1, C.cyan);
      g.fillStyle = C.dim; g.font = mono; g.textAlign = 'left'; g.fillText(`−${ONE_D_SPAN} s`, SL, bot + 14);
      g.textAlign = 'right'; g.fillText('now', SR, bot + 14);

      // Relative force (r̂·v)² against tip forward position. The forward
      // position is on the same mm scale as the axis above; force on a log
      // scale (floor 1e-6 m²/s²) so the snap and the slow wind-up both read.
      const rr = Math.ceil(reach / 10) * 10;
      const F0 = 1e-6, fMax = Math.max(F0 * 10, ...hist.map((q) => q.f));
      const fLog = Math.log10(fMax / F0);
      const PX = (x) => PL + ((PR - PL) * (Math.max(-rr, Math.min(rr, x)) + rr)) / (2 * rr);
      const PY = (f) => PB - 4 - (PB - PT - 8) * (Math.log10(Math.max(F0, f) / F0) / fLog);
      g.strokeStyle = C.line; g.lineWidth = 1;
      g.strokeRect(PL, PT, PR - PL, PB - PT);
      g.beginPath(); g.moveTo(PX(0), PT); g.lineTo(PX(0), PB); g.stroke();
      g.lineWidth = 1.6;
      for (let i = 1; i < hist.length; i++) {
        const a = hist[i - 1], b = hist[i];
        g.strokeStyle = b.fast ? C.unstable : C.accent;
        g.globalAlpha = 0.25 + 0.75 * ((b.t - t0) / ONE_D_SPAN);       // older = fainter
        g.beginPath(); g.moveTo(PX(a.x), PY(a.f)); g.lineTo(PX(b.x), PY(b.f)); g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = cur.fast ? C.unstable : C.ink;
      g.beginPath(); g.arc(PX(cur.x), PY(cur.f), 4, 0, 2 * Math.PI); g.fill();
      // Rowing integral over the last revolution: Σ (r̂·v)²·Δx_fwd, m³/s².
      const rev = cur.Tc;
      let J = 0;
      for (let i = 1; i < hist.length; i++) {
        if (hist[i].t < t1 - rev) continue;
        J += hist[i - 1].f * (hist[i].x - hist[i - 1].x) / M2MM;
      }
      g.font = mono; g.textAlign = 'left'; g.fillStyle = C.accent;
      g.fillText(`relative force (r̂·v)² (m²/s², log) vs tip position along ${axWord} (mm)`, PL + 6, PT + 13);
      g.fillStyle = C.dim;
      g.fillText(`−${rr}`, PL + 4, PB - 4);
      g.textAlign = 'right'; g.fillText(`${rr}`, PR - 4, PB - 4);
      g.fillText(fMax.toPrecision(2), PR - 4, PT + 26);
      g.fillStyle = C.gold; g.textAlign = 'left';
      g.fillText(`∮(r̂·v)²dx, last rev ${J.toPrecision(3)} m³/s²`, PL + 6, PT + 28);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [feed]);
  return <canvas ref={ref} className="ctr-oned" />;
}

function SimulatorWorkspace() {
  const { sim, patchSim, handoff, layers, patchLayers, themeTick, mech,
    setOuterLocked, setOuterPlanar, theme, setTheme, objective, setObjective, simView, setSimView,
    phys, patchPhys, physSol } = useDesign();
  const { alphaDeg, LcMm, extMm, k1, k2 } = sim;
  const lambda = bifurcation(k1, k2, LcMm / 1000, mech);
  const mu = muOf(mech, LcMm / 1000, k2);                 // 0 unless planar
  const lamE = lamEff(lambda, mu);                        // = λ unless planar
  const [sweeping, setSweeping] = useState(false);
  const [slow, setSlow] = useState(false);
  const [topView, setTopView] = useState(false);
  // The view cube can be hidden to reclaim the corner. Space toggles it; the
  // plan view itself is now reached through the cube's TOP face.
  const [cubeOn, setCubeOn] = useState(true);
  /* Data layers. Each one is an independent read on the SAME configured
     robot, in the manner of a mapping app: the scene is the map, the layers
     are the overlays. Categories are fixed (motion, energy) so a new overlay
     has an obvious home.

     tipTrack vs midTrack: the fin tip is the hydrodynamically active end; the
     end of the overlap is where the sheath releases the fin, which is the
     point a distally-mounted flap would pivot about. Both are legitimate
     design references and both can be lit at once, which is the direct way to
     see which one your design actually cares about. */
  const setLayer = useCallback((k, v) => patchLayers({ [k]: v }), [patchLayers]);
  const [layersOpen, setLayersOpen] = useState(false);
  const [modesOpen, setModesOpen] = useState(false);
  const outerMode = mech.outerLocked ? 'rigid' : mech.planar ? 'planar' : 'clamped';
  const setOuterMode = (m) => { setOuterLocked(m === 'rigid'); setOuterPlanar(m === 'planar'); };
  const [side, setSide] = useState(true);
  const [panels, togglePanel] = usePanels({ energy: true, scurve: true });
  const [hud, setHud] = useState({ theta: 0, alpha: 0, kres: 0, V: 0, Vpp: 1, vel: 0, snapping: false });

  const P = useRef({ alpha: 0, lambda, mu, lamE, k1, k2, Lc: LcMm / 1000, Lext: extMm / 1000,
    sweeping: false, slow: false, layers, w1: mech.w1, w2: mech.w2, wy: mech.wy, planar: mech.planar,
    kScale: mech.kScale, phys: null });
  const physData = physSol.status === 'ready' ? physSol.data : null;
  useEffect(() => {
    P.current = { alpha: (alphaDeg * Math.PI) / 180, lambda, mu, lamE, k1, k2,
      Lc: LcMm / 1000, Lext: extMm / 1000, sweeping, slow, layers,
      w1: mech.w1, w2: mech.w2, wy: mech.wy, planar: mech.planar, kScale: mech.kScale, phys: physData };
  }, [alphaDeg, lambda, mu, lamE, k1, k2, LcMm, extMm, sweeping, slow, layers, mech, physData]);
  // Playback clock of the solved cycle (physical seconds).
  const playT = useRef(0);

  const theta = useRef(0), vel = useRef(0), flash = useRef(0), subAccum = useRef(0), fastRef = useRef(false);
  const tipPrev = useRef(null), tipVel = useRef(new THREE.Vector3()), tipInfo = useRef({ spd: 0, rollDeg: null });
  // 1-D view feed: forward components per frame (robot-local x = forward).
  const oneD = useRef({ t: 0, hist: [], cur: null });
  const snapEv = useRef(null);                            // in-flight snap, for the compass
  const trail = useRef([]), sweepAlpha = useRef(0);
  const mountRef = useRef(null), energyRef = useRef(null), scurveRef = useRef(null);
  const three = useRef({});
  const clearTracks = useCallback(() => {
    three.current.tracks?.tip.clear();
    three.current.tracks?.mid.clear();
    three.current.compass?.clear();
    snapEv.current = null;
  }, []);

  useEffect(() => {
    if (!handoff) return;
    theta.current = 0; vel.current = 0; trail.current = [];
    clearTracks();
  }, [handoff?.stamp]);

  /* A traced curve belongs to ONE tube geometry. Changing a precurvature, the
     overlap or the extension moves every material point on the backbone, so a
     path drawn under the old parameters is not a path of the current robot --
     it is cleared rather than left to accumulate into a meaningless smear.
     Base twist alpha is deliberately NOT a dependency: sweeping alpha is
     precisely what draws the path. */
  useEffect(() => { clearTracks(); }, [k1, k2, LcMm, extMm, mech]);

  // Lighting a track layer restarts it; see makeTrack().enable.
  useEffect(() => { three.current.tracks?.tip.enable(layers.tipTrack); }, [layers.tipTrack]);
  useEffect(() => { three.current.tracks?.mid.enable(layers.midTrack); }, [layers.midTrack]);
  useEffect(() => { three.current.compass?.setVisible(layers.compass); }, [layers.compass]);
  useEffect(() => { three.current.setHeadingUp?.(layers.compass && layers.headingUp); },
    [layers.compass, layers.headingUp]);

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
      setCubeOn((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { three.current.setTop?.(topView); }, [topView]);
  useEffect(() => { three.current.setCubeVisible?.(cubeOn); }, [cubeOn]);

  /* Repaint the scene for the new palette. The 2-D plots need no equivalent:
     they are redrawn from scratch every animation frame, so they pick the new
     tokens up on their own. */
  useEffect(() => { if (themeTick) three.current.restyle?.(); }, [themeTick]);

  const reset = useCallback(() => {
    theta.current = 0; vel.current = 0; trail.current = []; flash.current = 0;
    clearTracks();
    patchSim({ alphaDeg: 0 }); setSweeping(false); sweepAlpha.current = 0;
    setTopView(false);
    three.current.reframe?.();
  }, [patchSim, clearTracks]);

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

    /* Planar-mode guide: the robot-local x = 0 plane, the plane the outer
       tube's own precurvature bends in (K_x rotates about local x). Drawn
       as a faint sheet with an outline, and only in planar mode. */
    const guideMat = new THREE.MeshBasicMaterial({
      color: hexInt(C.accent), transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false,
    });
    const guideGeo = new THREE.PlaneGeometry(1, 1);
    const guide = new THREE.Mesh(guideGeo, guideMat);
    const guideEdge = new THREE.LineSegments(new THREE.EdgesGeometry(guideGeo),
      new THREE.LineBasicMaterial({ color: hexInt(C.accent), transparent: true, opacity: 0.45 }));
    const guideGroup = new THREE.Group();
    guideGroup.add(guide, guideEdge);
    guideGroup.rotation.y = Math.PI / 2;               // XY plane → local YZ plane
    guideGroup.visible = false;
    robot.add(guideGroup);


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
    // Tip motion layer: where the tip is travelling, and the fin's roll
    // about its own axis at the tip. Robot-local, like the curvature arrows.
    arrows.vel = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 30, hexInt(C.gold), 9, 5);
    arrows.roll = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 24, hexInt(C.cyan), 7, 4);
    robot.add(arrows.vel, arrows.roll);

    /* -- Motion path layers ----------------------------------------------
       Drawn as a flat RIBBON of triangles lying in the floor plane, not as a
       THREE.Line: WebGL clamps LineBasicMaterial.linewidth to 1 px on
       essentially every platform, so a polyline would be a hairline that
       disappears the moment the plan view zooms out -- which is the very view
       this trace exists to serve.

       Each ribbon is a child of `scene`, not of `robot`, and every sample has
       its Y overwritten with the floor height. That makes it a true
       orthographic PROJECTION of the tracked point onto the floor: the (x, z)
       ground track is kept and the out-of-plane excursion is discarded, which
       is exactly what the plan view shows.

       Colour is per-SEGMENT. The geometry is non-indexed, so the two
       triangles of a quad own their colour and share no vertex with their
       neighbours; a phase boundary is therefore a hard edge. Interpolating
       across it would blur the one transition the plot is meant to expose.

       Nothing decays. Every sample stays until the track is cleared, so the
       closed loop is visible in full at any instant.

       This is a FACTORY because the fin tip and the end of the overlap are now
       independent layers that can be lit at the same time -- which is the
       direct way to answer "which of the two do I actually need": put both on
       the floor and compare the enclosed areas. Phase stays the primary
       encoding (it is the physics); the two tracks are separated by ribbon
       WIDTH, a secondary channel, so neither reading is destroyed. */
    const TRACE_MAX = 6000;        // segments one ribbon can hold
    const TRACE_Y = -59.55;        // just proud of the grid at y = -60
    const TRACE_MIN_D = 0.5;       // reject sub-pixel steps: they make degenerate quads
    const cBuild = new THREE.Color(hexInt(C.accent));
    const cSnap = new THREE.Color(hexInt(C.unstable));

    function makeTrack(width) {
      const pos = new Float32Array(TRACE_MAX * 18);      // 6 verts x 3 floats
      const col = new Float32Array(TRACE_MAX * 18);
      /* Which phase each segment was drawn in. The colour buffer alone cannot
         answer that after the fact -- it holds resolved RGB, and the palette
         those came from is gone once the theme changes. Keeping the phase
         means an existing track can be RE-coloured for the new theme instead
         of being discarded. 1 byte per segment. */
      const phase = new Uint8Array(TRACE_MAX);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setDrawRange(0, 0);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.95,
        // The path is an annotation, not a body. It stays out of the shadow
        // pass (castShadow defaults false) and out of the depth buffer, so it
        // can never print a second floating silhouette or z-fight with the grid.
        depthWrite: false,
      }));
      mesh.renderOrder = 2;
      mesh.frustumCulled = false;     // bounds are never recomputed as it grows
      mesh.visible = false;
      scene.add(mesh);

      /* Tie-line: tracked point -> its own footprint. In the perspective view
         an elevated point and its ground projection cannot coincide on screen
         -- that is what a projection IS -- so the correspondence is drawn
         rather than left to be inferred. In plan view it collapses to a dot. */
      const dGeo = new THREE.BufferGeometry();
      dGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const dLine = new THREE.Line(dGeo, new THREE.LineBasicMaterial({
        color: hexInt(C.dim), transparent: true, opacity: 0.45, depthWrite: false,
      }));
      dLine.frustumCulled = false; dLine.visible = false;
      scene.add(dLine);

      let n = 0, prev = null, on = false;
      return {
          /* Turning a layer on CLEARS it. Accumulating across an off period
           would splice two disconnected arcs into one stroke and invent a
           segment the tip never travelled. */
        enable(v) {
          on = v; n = 0; prev = null;
          geo.setDrawRange(0, 0);
          mesh.visible = false; dLine.visible = false;
        },
        clear() { n = 0; prev = null; geo.setDrawRange(0, 0); mesh.visible = false; },
        hide() { dLine.visible = false; },
        /** 0..1 multiplier on the ribbon's opacity; see trackFade(). */
        setFade(k) { mesh.material.opacity = 0.95 * k; },
        /** Repaint an already-drawn track in the current palette. */
        restyle() {
          for (let i = 0; i < n; i++) {
            const c = phase[i] ? cSnap : cBuild;
            for (let o = i * 18; o < (i + 1) * 18; o += 3) {
              col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b;
            }
          }
          if (n > 0) geo.attributes.color.needsUpdate = true;
          dLine.material.color.setHex(hexInt(C.dim));
        },
        /** `w` is a WORLD-space point; only its ground track is retained. */
        push(w, snapping) {
          if (!on) return;
          const dp = dGeo.attributes.position.array;
          dp[0] = w.x; dp[1] = w.y; dp[2] = w.z;
          dp[3] = w.x; dp[4] = TRACE_Y; dp[5] = w.z;
          dGeo.attributes.position.needsUpdate = true;
          dLine.visible = true;

          const cx = w.x, cz = w.z;
          if (!prev) { prev = [cx, cz]; return; }
          const dx = cx - prev[0], dz = cz - prev[1];
          const len = Math.hypot(dx, dz);
          if (len < TRACE_MIN_D || n >= TRACE_MAX) return;
          const nx = (-dz / len) * (width / 2), nz = (dx / len) * (width / 2);
          const ax = prev[0], az = prev[1];
          const quad = [
            [ax - nx, az - nz], [ax + nx, az + nz], [cx - nx, cz - nz],
            [ax + nx, az + nz], [cx + nx, cz + nz], [cx - nx, cz - nz],
          ];
          const c = snapping ? cSnap : cBuild;
          phase[n] = snapping ? 1 : 0;
          let o = n * 18;
          for (const q of quad) {
            pos[o] = q[0]; pos[o + 1] = TRACE_Y; pos[o + 2] = q[1];
            col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b;
            o += 3;
          }
          n += 1;
          prev = [cx, cz];
          geo.attributes.position.needsUpdate = true;
          geo.attributes.color.needsUpdate = true;
          geo.setDrawRange(0, n * 6);
          mesh.visible = true;
        },
        dispose() {
          geo.dispose(); mesh.material.dispose();
          dGeo.dispose(); dLine.material.dispose();
        },
      };
    }

    const tracks = { tip: makeTrack(1.9), mid: makeTrack(1.0) };

    /* ── Snap compass ──────────────────────────────────────────────────
       Every snap is recorded as a vector: direction = where the snap's arc
       pushes, i.e. the energy-weighted mean of the tip's floor directions
       over the release (Σ ΔE_k·d̂_k -- NOT the start-to-end chord, which
       on a hooked arc can point nearly backwards); magnitude = the elastic
       energy that release gave up, dV*(k_t/L_c), the same E_snap the
       optimiser plots. The bold arrow is their sum.

       Every piece of every recorded arc is kept too, so the snap propulsion
       efficiency η = (F − B)/(F + B) can be taken against the CURRENT net
       direction -- see snapEfficiency() for the definition. It is the same
       number the optimiser computes from the model, measured here from the
       snaps that actually happened, including any the user drove backwards
       by hand.

       Direction convention follows the request: the arrow points the way the
       FIN moves. The reaction on the body is the reverse.

       Arrows are flat triangles on the floor, like the tracks, for the same
       reason: a 1 px line is not legible from the plan view this exists to
       serve. They fade edge-on with the tracks, being floor figures too. */
    const snaps = [];                          // [{dx, dz, E}]  E in J
    const pieces = [];                         // every arc piece {u, v, e}, floor (x, z)
    const net = new THREE.Vector2(0, 0);
    let sumE = 0, share = { F: 0, B: 0, E: 0, eta: 0 };
    const compassGroup = new THREE.Group();
    compassGroup.visible = false;
    scene.add(compassGroup);
    // depthTest off: these are annotations and must read over the model. In
    // plan view the fin at rest lies along the very direction it snaps, and
    // would otherwise sit exactly on top of the net arrow.
    const arrowMat = (opacity) => new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity, side: THREE.DoubleSide,
      depthWrite: false, depthTest: false, toneMapped: false,
    });
    const eachMesh = new THREE.Mesh(new THREE.BufferGeometry(), arrowMat(0.55));
    const netMesh = new THREE.Mesh(new THREE.BufferGeometry(), arrowMat(0.95));
    eachMesh.renderOrder = 3; netMesh.renderOrder = 4;
    eachMesh.frustumCulled = false; netMesh.frustumCulled = false;
    compassGroup.add(eachMesh, netMesh);

    const COMPASS_MAX = 88;                    // longest arrow, scene units
    const flatArrow = (out, x, z, len, w) => {
      const L = Math.hypot(x, z);
      if (L < 1e-9 || len < 0.5) return;
      const ux = x / L, uz = z / L, px = -uz, pz = ux;
      const head = Math.min(len * 0.45, w * 3.4), sh = Math.max(0, len - head);
      const hw = w / 2, hh = w * 1.7, Y = TRACE_Y + 0.15;
      out.push(
        -px * hw, Y, -pz * hw,  px * hw, Y, pz * hw,  ux * sh + px * hw, Y, uz * sh + pz * hw,
        -px * hw, Y, -pz * hw,  ux * sh + px * hw, Y, uz * sh + pz * hw,  ux * sh - px * hw, Y, uz * sh - pz * hw,
        ux * sh - px * hh, Y, uz * sh - pz * hh,  ux * sh + px * hh, Y, uz * sh + pz * hh,  ux * len, Y, uz * len,
      );
    };
    const setGeo = (mesh, arr) => {
      mesh.geometry.dispose();
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      mesh.geometry = g;
    };
    const rebuildCompass = () => {
      const big = Math.max(net.length(), ...snaps.map((q) => q.E), 1e-12);
      const k = COMPASS_MAX / big;
      const each = [], sum = [];
      snaps.forEach((q) => flatArrow(each, q.dx, q.dz, q.E * k, 0.9));
      flatArrow(sum, net.x, net.y, net.length() * k, 2.6);
      setGeo(eachMesh, each); setGeo(netMesh, sum);
    };
    const compass = {
      /** q = {pts: [[x, z, V], ...] floor path of the arc, E: energy in J}. */
      add(q) {
        const pc = strokePieces(q.pts);
        const [dx, dz] = strokeVector(pc);
        const L = Math.hypot(dx, dz);
        if (L < 1e-12) return;
        snaps.push({ dx, dz, E: q.E });
        pieces.push(...pc);
        // Unit direction times energy: only the bearing of Σ ΔE·d̂ is used,
        // so each snap still counts once, at its full E_snap.
        net.x += (dx / L) * q.E; net.y += (dz / L) * q.E; sumE += q.E;
        const n = net.length();
        share = n > 1e-12 ? forwardShare(pieces, net.x / n, net.y / n) : { F: 0, B: 0, E: 0, eta: 0 };
        rebuildCompass();
      },
      clear() {
        snaps.length = 0; pieces.length = 0; net.set(0, 0); sumE = 0;
        share = { F: 0, B: 0, E: 0, eta: 0 };
        rebuildCompass();
      },
      setVisible(v) { compassGroup.visible = v; },
      setFade(kf) { eachMesh.material.opacity = 0.55 * kf; netMesh.material.opacity = 0.95 * kf; },
      restyle() {
        eachMesh.material.color.setHex(hexInt(C.dim));
        netMesh.material.color.setHex(hexInt(C.gold));
      },
      /** For the HUD: |net| in J, alignment |net|/sumE, count, bearing (deg, 0 = +X, CCW toward -Z... i.e. atan2(-z, x)). */
      stats: () => ({ mag: net.length(), align: sumE > 0 ? net.length() / sumE : 0, n: snaps.length,
        eta: share.eta, F: share.F, B: share.B, E: share.E,
        bearing: net.length() > 1e-9 ? (Math.atan2(-net.y, net.x) * 180) / Math.PI : null }),
      /** Unit heading of the net vector on the floor, or null. */
      heading: () => (net.length() > 1e-9 ? net.clone().normalize() : null),
      dispose() {
        eachMesh.geometry.dispose(); netMesh.geometry.dispose();
        eachMesh.material.dispose(); netMesh.material.dispose();
      },
    };
    compass.restyle();
    rebuildCompass();
    /* Seed each track's on/off state from the store HERE, synchronously at
       creation, rather than leaving it to the sibling `enable` effects below.
       Those effects only fire when layers.tipTrack/midTrack CHANGE, so on a
       theme switch -- where this whole scene remounts but the layer flags do
       not change -- they can race this effect (which always constructs a
       fresh track defaulting to off) and lose, since dev-mode double-invoke
       can rerun this scene-setup a second time AFTER the sibling effect has
       already applied the correct state, silently overwriting it back to
       off. P.current.layers is populated synchronously at ref creation
       (before any effect runs), so reading it here is race-free regardless
       of how many times this effect fires or in what order. */
    tracks.tip.enable(P.current.layers.tipTrack);
    tracks.mid.enable(P.current.layers.midTrack);
    compass.setVisible(!!P.current.layers.compass);

    /* Re-read the palette into every scene object whose colour came from a
       token. Materials are mutated in place -- nothing is rebuilt except the
       grid, whose colours three.js bakes into vertex attributes at
       construction and offers no setter for. */
    let gridHelper = grid;
    const restyle = () => {
      scene.background = new THREE.Color(C.bg);
      planFog.color.setHex(hexInt(C.bg));
      matGlow.color.setHex(hexInt(C.cyan));
      guideMat.color.setHex(hexInt(C.accent)); guideEdge.material.color.setHex(hexInt(C.accent));
      arrows.k1.setColor(new THREE.Color(hexInt(C.blue)));
      arrows.k2.setColor(new THREE.Color(hexInt(C.sand)));
      arrows.res.setColor(new THREE.Color(hexInt(C.ink)));
      arrows.vel.setColor(new THREE.Color(hexInt(C.gold)));
      arrows.roll.setColor(new THREE.Color(hexInt(C.cyan)));
      // Shared by both tracks, so update before asking either to repaint.
      cBuild.setHex(hexInt(C.accent));
      cSnap.setHex(hexInt(C.unstable));
      tracks.tip.restyle(); tracks.mid.restyle();
      compass.restyle();
      styleCube();

      scene.remove(gridHelper);
      gridHelper.geometry.dispose(); gridHelper.material.dispose();
      gridHelper = new THREE.GridHelper(400, 20, hexInt(C.dim), hexInt(C.panel));
      gridHelper.position.y = -60;
      gridHelper.material.transparent = true; gridHelper.material.opacity = 0.18;
      scene.add(gridHelper);
    };

    const frameR = () => Math.max(240, ((P.current.Lc + P.current.Lext) * 1000) * 2.0);
    const cam = { r: frameR(), phi: Math.PI / 2.35, ang: 0.9, tx: 0, ty: 0 };
    let planOn = false;
    // tan(42 deg / 2) = 0.384: matching half-height keeps the framing roughly
    // continuous across the switch instead of jumping scale.
    const PLAN_HALF = 0.384;
    /* Which way is up in the plan view. Not a constant: it is the heading
       the orbit already had, snapped to the nearest of the four cardinal
       directions, so a model you had turned "left side up" is still left
       side up when you look straight down at it. In a 3/4 view the far side
       of the floor is the top of the screen, and that far side lies along
       -(sin ang, cos ang); snapping ang to a multiple of 90 deg makes the
       plan view axis-aligned (a grid at 37 deg is not a plan view) while
       staying as close as possible to what was on screen. The screen-right
       axis follows from it, and panning has to use both so the scene still
       follows the mouse when the view is turned. */
    const planUp = new THREE.Vector3(0, 0, -1), planRight = new THREE.Vector3(1, 0, 0);
    let planQ = 0;
    const snapHeading = () => Math.round(cam.ang / (Math.PI / 2)) * (Math.PI / 2);
    const setPlanHeading = (q) => {
      planQ = q;
      planUp.set(-Math.sin(q), 0, -Math.cos(q));
      planRight.set(Math.cos(q), 0, -Math.sin(q));       // = (-Y) x up
    };
    /* Compass "heading-up" mode. With it on, the plan view turns so the net
       snap vector points screen-right; with it off, the plan view rests on
       the nearest cardinal heading (north-up). Either way the heading eases
       rather than jumps, since the net vector moves a little at every snap. */
    // Seeded from the store for the same reason the tracks are (see above).
    let headingUp = !!(P.current.layers.compass && P.current.layers.headingUp);
    const setHeadingUp = (v) => { headingUp = v; };
    const steerPlan = (dt) => {
      if (!planOn) return;
      const n = headingUp ? compass.heading() : null;
      // planRight = (cos q, -sin q) must equal n  =>  q = atan2(-n.z, n.x)
      const target = n ? Math.atan2(-n.y, n.x) : Math.round(planQ / (Math.PI / 2)) * (Math.PI / 2);
      let d = target - planQ;
      d = Math.atan2(Math.sin(d), Math.cos(d));            // shortest way round
      // Exponential approach never quite arrives; land it once within 0.2 deg.
      if (Math.abs(d) < 0.0035) { if (d !== 0) { setPlanHeading(target); applyCam(); } return; }
      setPlanHeading(planQ + d * Math.min(1, dt / 0.25));
      applyCam();
    };
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
        ortho.up.copy(planUp);
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
        const q = snapHeading();
        setPlanHeading(q);
        cam.phi = 1e-3; cam.ang = q; cam.tx = 0; cam.ty = 0;
        cam.r = frameR() * 0.92;
      } else {
        if (savedCam) Object.assign(cam, savedCam);
        savedCam = null;
      }
      applyCam();
    };

    /* ── View cube ─────────────────────────────────────────────────────
       The SolidWorks / Fusion orientation widget: a translucent chamfered
       cube in the corner that turns with the camera, whose 26 facets -- six
       faces, twelve edge chamfers, eight corner bevels -- are each a click
       target for the view looking in from that direction. Faces give the
       six orthographic-style views, corners the isometrics, edges the views
       in between.

       It is drawn into a scissored viewport of the SAME renderer as a second
       scene, not as DOM: it has to be a real 3-D object that shares the main
       camera's rotation exactly, and a CSS cube cannot be raycast against
       reliably. The cube camera copies the active camera's quaternion each
       frame, so roll is mirrored too -- in plan view, where up is -Z, the
       cube shows its TOP face with FRONT at the bottom of the screen, which
       is the drafting convention.

       The chamfered form is built from one vertex family: every vertex is at
       distance 1 along one axis and +-S_IN along the other two (24 points).
       A face is the four points sharing an axis and sign; an edge chamfer
       joins the two such points on each of two adjacent faces; a corner
       bevel takes one point from each of three faces. */
    const CUBE_PX = 112, CUBE_PAD = 14, CUBE_TOP = 12;
    const S_IN = 0.66;                   // face half-width; the rest is chamfer
    const CUBE_DIST = 6.8;
    const cubeScene = new THREE.Scene();
    const cubeCam = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
    cubeCam.updateProjectionMatrix();
    const facets = [];                    // every pickable piece; userData.dir
    const cubeLines = [];
    const labelCanvases = [];             // [canvas, texture, text]

    const cubePt = (major, sMajor, others) => {
      const v = [0, 0, 0]; v[major] = sMajor;
      for (const [ax, sg] of others) v[ax] = sg * S_IN;
      return new THREE.Vector3(v[0], v[1], v[2]);
    };
    const glassMat = () => new THREE.MeshBasicMaterial({
      color: hexInt(C.dim), transparent: true, opacity: 0.38,
      side: THREE.DoubleSide, depthWrite: false, toneMapped: false,
    });
    const addFacet = (pts, dir) => {
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      g.setIndex(pts.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2]);
      const m = new THREE.Mesh(g, glassMat());
      m.userData.dir = dir.normalize();
      cubeScene.add(m); facets.push(m);
      const ln = new THREE.LineSegments(new THREE.EdgesGeometry(g),
        new THREE.LineBasicMaterial({ color: hexInt(C.ink), transparent: true, opacity: 0.55, toneMapped: false }));
      cubeScene.add(ln); cubeLines.push(ln);
    };
    // faces
    for (let a = 0; a < 3; a++) for (const sa of [1, -1]) {
      const b = (a + 1) % 3, c = (a + 2) % 3;
      addFacet([cubePt(a, sa, [[b, -1], [c, -1]]), cubePt(a, sa, [[b, 1], [c, -1]]),
        cubePt(a, sa, [[b, 1], [c, 1]]), cubePt(a, sa, [[b, -1], [c, 1]])],
      new THREE.Vector3().setComponent(a, sa));
    }
    // edge chamfers
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
      const c = 3 - a - b;
      for (const sa of [1, -1]) for (const sb of [1, -1]) {
        addFacet([cubePt(a, sa, [[b, sb], [c, -1]]), cubePt(a, sa, [[b, sb], [c, 1]]),
          cubePt(b, sb, [[a, sa], [c, 1]]), cubePt(b, sb, [[a, sa], [c, -1]])],
        new THREE.Vector3().setComponent(a, sa).setComponent(b, sb));
      }
    }
    // corner bevels
    for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
      addFacet([cubePt(0, sx, [[1, sy], [2, sz]]), cubePt(1, sy, [[0, sx], [2, sz]]), cubePt(2, sz, [[0, sx], [1, sy]])],
        new THREE.Vector3(sx, sy, sz));
    }
    // face labels: a plane floated just off each face, front-side only so a
    // label never shows through mirrored from the far side of the glass.
    const drawLabel = (cv, text) => {
      const g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height);
      g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      // Shrink long names (FORWARD, OUTWARD) to fit the face.
      let px = 58;
      do { g.font = `600 ${px}px Oswald, "Fira Sans", sans-serif`; px -= 2; }
      while (g.measureText(text).width > cv.width * 0.86 && px > 20);
      g.fillText(text, cv.width / 2, cv.height / 2 + 4);
    };
    const LABELS = [
      // Robot body frame, from the swimmer's point of view: outward = the
      // motor base axis (out of the body), forward = direction of travel,
      // up = the side opposite the outer tube's curvature at α = 0.
      ['FORWARD', [1, 0, 0], [0, Math.PI / 2, 0]], ['BACK', [-1, 0, 0], [0, -Math.PI / 2, 0]],
      ['OUTWARD', [0, 1, 0], [-Math.PI / 2, 0, 0]], ['INWARD', [0, -1, 0], [Math.PI / 2, 0, 0]],
      ['DOWN', [0, 0, 1], [0, 0, 0]], ['UP', [0, 0, -1], [0, Math.PI, 0]],
    ];
    for (const [text, n, rot] of LABELS) {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
      drawLabel(cv, text);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(2 * S_IN, 2 * S_IN),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
      pl.position.set(n[0] * 1.004, n[1] * 1.004, n[2] * 1.004);
      pl.rotation.set(rot[0], rot[1], rot[2]);
      cubeScene.add(pl);
      labelCanvases.push([cv, tex, text]);
    }

    let hovered = null;
    const styleFacet = (m, hot) => {
      m.material.color.setHex(hot ? hexInt(C.accent) : hexInt(C.dim));
      m.material.opacity = hot ? 0.82 : 0.38;
    };
    const styleCube = () => {
      facets.forEach((m) => styleFacet(m, m === hovered));
      cubeLines.forEach((l) => l.material.color.setHex(hexInt(C.ink)));
      labelCanvases.forEach(([cv, tex, text]) => { drawLabel(cv, text); tex.needsUpdate = true; });
    };
    const setHover = (m) => {
      if (hovered === m) return;
      if (hovered) styleFacet(hovered, false);
      hovered = m;
      if (m) styleFacet(m, true);
      renderer.domElement.style.cursor = m ? 'pointer' : '';
    };

    let cubeOn = true;
    const setCubeVisible = (v) => { cubeOn = v; if (!v) setHover(null); };
    const cubeSize = new THREE.Vector2(), cubeFwd = new THREE.Vector3();
    const renderCube = () => {
      if (!cubeOn) return;
      const active = planOn ? ortho : camera;
      active.getWorldDirection(cubeFwd);
      cubeCam.position.copy(cubeFwd).multiplyScalar(-CUBE_DIST);
      cubeCam.quaternion.copy(active.quaternion);
      renderer.getSize(cubeSize);
      const x = cubeSize.x - CUBE_PAD - CUBE_PX, y = cubeSize.y - CUBE_TOP - CUBE_PX;
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.setScissorTest(true);
      renderer.setViewport(x, y, CUBE_PX, CUBE_PX);
      renderer.setScissor(x, y, CUBE_PX, CUBE_PX);
      renderer.render(cubeScene, cubeCam);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, cubeSize.x, cubeSize.y);
      renderer.autoClear = true;
    };

    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    /** undefined = pointer outside the cube's square; null = inside but off
     *  the cube; otherwise the facet under the pointer. */
    const cubeHit = (e) => {
      if (!cubeOn) return undefined;
      const r = renderer.domElement.getBoundingClientRect();
      renderer.getSize(cubeSize);
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const x0 = cubeSize.x - CUBE_PAD - CUBE_PX, y0 = CUBE_TOP;
      if (px < x0 || px > x0 + CUBE_PX || py < y0 || py > y0 + CUBE_PX) return undefined;
      ndc.set(((px - x0) / CUBE_PX) * 2 - 1, -(((py - y0) / CUBE_PX) * 2 - 1));
      ray.setFromCamera(ndc, cubeCam);
      const hits = ray.intersectObjects(facets, false);
      return hits.length ? hits[0].object : null;
    };

    /* Orbit tween. Faces, edges and corners glide into place; the two axial
       views (TOP, BOTTOM) snap instead, because they need their own up
       vector -- at the pole the default +Y up is parallel to the view and
       lookAt is undefined -- and a roll cannot be tweened gracefully. TOP is
       routed to the existing orthographic plan view, which already handles
       this exactly. */
    let tween = null;
    const exitPlanQuiet = () => {
      if (!planOn) return;
      // Leave plan view WITHOUT restoring the saved orbit: the caller is
      // about to set an orientation of its own. React's setTop(false) then
      // finds nothing to restore and is a no-op.
      planOn = false; savedCam = null; scene.fog = planFog;
      setTopView(false);
    };
    const setView = (d) => {
      if (d.y > 0.999) { setTopView(true); return; }
      exitPlanQuiet();
      tween = null;
      if (d.y < -0.999) {
        // Same heading rule as the plan view, mirrored: flipping a part over
        // to see its underside swaps which edge is at the top of the screen.
        const q = snapHeading();
        cam.ang = q;
        cam.phi = Math.PI - 1e-3;
        camera.up.set(Math.sin(q), 0, Math.cos(q));
        applyCam();
        return;
      }
      camera.up.set(0, 1, 0);
      const phi = Math.acos(THREE.MathUtils.clamp(d.y, -1, 1));
      let ang = Math.atan2(d.x, d.z);
      // Take the short way round.
      ang += Math.round((cam.ang - ang) / (2 * Math.PI)) * 2 * Math.PI;
      tween = { p0: cam.phi, a0: cam.ang, p1: phi, a1: ang, t: 0 };
    };
    /* A ground track is a zero-thickness figure in the floor plane, so its
       projected area -- and therefore its visual presence -- goes to zero as
       the view approaches the plane edge-on. The rasteriser disagrees: it
       keeps at least a one-pixel sliver alive at any grazing angle, which in
       the FRONT / BACK / LEFT / RIGHT elevations shows up as a stray dashed
       line along the floor. Fading the ribbon with the camera's elevation
       above the floor restores what the geometry actually implies. Full
       strength from about 12 degrees up; gone at the horizon. Plan view sits
       at 90 degrees and is unaffected. The tie-line is a vertical segment,
       genuinely visible edge-on, and is left alone. */
    const trackFade = () => {
      const elev = Math.abs(Math.PI / 2 - cam.phi);       // above or below the floor
      const k = THREE.MathUtils.smoothstep(elev, 0.03, 0.22);
      tracks.tip.setFade(k); tracks.mid.setFade(k);
      compass.setFade(k);
    };
    const tick = (dt) => {
      trackFade();
      steerPlan(dt);
      if (!tween) return;
      tween.t = Math.min(1, tween.t + dt / 0.3);
      const e = 1 - Math.pow(1 - tween.t, 3);
      cam.phi = tween.p0 + (tween.p1 - tween.p0) * e;
      cam.ang = tween.a0 + (tween.a1 - tween.a0) * e;
      applyCam();
      if (tween.t >= 1) tween = null;
    };

    let drag = null;
    const el = renderer.domElement;
    el.style.touchAction = 'none';
    const down = (e) => {
      const h = cubeHit(e);
      if (h) { setView(h.userData.dir); return; }   // a click on the cube never orbits
      tween = null;
      drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 2 };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e) => {
      if (!drag) { setHover(cubeHit(e) || null); return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      // Plan view is a fixed orientation by definition, so a drag can only
      // ever pan it -- orbiting would silently tilt it off vertical and
      // reintroduce the very misalignment it exists to remove.
      if (planOn) {
        // cam.ty is world Z here. Move against the drag along the plan's own
        // screen axes so the scene tracks the mouse whichever way it is turned.
        cam.tx += (-dx * planRight.x - dy * planUp.x) * 0.35;
        cam.ty += (-dx * planRight.z - dy * planUp.z) * 0.35;
      } else if (drag.pan) { cam.tx -= dx * 0.35; cam.ty += dy * 0.35; }
      else {
        // An orbit always runs with +Y up; a BOTTOM snap may have left a
        // different up vector behind, and dragging out of it should not roll.
        camera.up.set(0, 1, 0);
        cam.ang -= dx * 0.006; cam.phi = Math.max(0.12, Math.min(Math.PI - 0.12, cam.phi - dy * 0.006));
      }
      applyCam();
    };
    const up = () => { drag = null; };
    const wheel = (e) => { e.preventDefault(); cam.r = Math.max(70, Math.min(900, cam.r * (1 + Math.sign(e.deltaY) * 0.09))); applyCam(); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', () => { up(); setHover(null); });
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

    three.current = { scene, camera, renderer, outer, inner, core, glow, tipOrb, arrows, matCore, matGlow, matInner, matOuter, setTop, tracks, robot, restyle, renderCube, tick, setCubeVisible, compass, setHeadingUp, guideGroup,
      cam: () => (planOn ? ortho : camera),
      reframe: () => { cam.r = frameR(); cam.tx = 0; cam.ty = 0; applyCam(); } };
    return () => {
      ro.disconnect();
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointerleave', up);
      el.removeEventListener('wheel', wheel);
      envRT.dispose();
      tracks.tip.dispose(); tracks.mid.dispose();
      compass.dispose();
      facets.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
      cubeLines.forEach((l) => { l.geometry.dispose(); l.material.dispose(); });
      labelCanvases.forEach(([, tex]) => tex.dispose());
      gridHelper.geometry.dispose(); gridHelper.material.dispose();
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

  const drawEnergy = (a, l, th, snap, mu = 0) => {
    const canvas = energyRef.current; if (!canvas) return;
    const surf = prepCanvas(canvas); if (!surf) return;
    const { ctx, w, h } = surf;
    const pad = { l: 52, r: 12, t: 14, b: 34 };
    const half = 7.2, t0 = a - half, t1 = a + half;
    const N = 600;
    let vmin = Infinity, vmax = -Infinity; const raw = [];
    for (let i = 0; i <= N; i++) {
      const t = t0 + ((t1 - t0) * i) / N, v = energy(t, a, l, mu);
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

    const pts = raw.map(([t, v]) => [X(t), Y(v), stiffness(t, l, mu) > 0]);
    strokeRuns(ctx, pts, {
      stable: { color: C.green, width: 2.2, dash: [] },
      unstable: { color: C.unstable, width: 1.8, dash: [5, 4] },
    });

    ctx.save();
    ctx.lineWidth = 1.6;
    for (let i = 1; i < raw.length; i++) {
      const g0 = gradient(raw[i - 1][0], a, l, mu), g1 = gradient(raw[i][0], a, l, mu);
      if (g0 !== 0 && g0 * g1 > 0) continue;
      let lo = raw[i - 1][0], hi = raw[i][0];
      for (let k = 0; k < 40; k++) {
        const m = (lo + hi) / 2;
        if (gradient(lo, a, l, mu) * gradient(m, a, l, mu) <= 0) hi = m; else lo = m;
      }
      const te = (lo + hi) / 2, stable = stiffness(te, l, mu) > 0;
      ctx.strokeStyle = stable ? C.cyan : C.unstable;
      ctx.setLineDash(stable ? [] : [2, 1.6]);
      ctx.beginPath(); ctx.arc(X(te), Y(energy(te, a, l, mu)), 3.4, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    strokeTrail(ctx, trail.current.map((p) => [X(p[0]), Y(p[1])]), (hexToRgb(C.sand) || [210, 181, 121]).join(","));

    const bx = X(th), by = Y(energy(th, a, l, mu));
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

  const drawSCurve = (a, l, th, mu = 0) => {
    const canvas = scurveRef.current; if (!canvas) return;
    const surf = prepCanvas(canvas); if (!surf) return;
    const { ctx, w, h } = surf;
    const pad = { l: 52, r: 12, t: 14, b: 34 };
    const TY = Math.max(3 * Math.PI, Math.abs(th) + 1.5);
    // The branch is α = θ + λ sin θ, so α reaches ±(TY + λ). Pinning the axis
    // at ±2π made the curve run off the panel as soon as λ grew.
    const AX = Math.max(2 * Math.PI, TY + l + 0.5 * mu + 0.5, Math.abs(a) + 0.5);
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
      pts.push([X(t + l * Math.sin(t) + mu * Math.sin(t) * Math.cos(t)), Y(t), stiffness(t, l, mu) > 0]);
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
      const dt = Math.min((now - last) / 1000, SOLVER.DT_MAX); last = now;
      const p = P.current;
      // Slow motion replays the IDENTICAL discrete dynamics at a fraction of
      // the substep rate — it does not soften the integrator, so the snap
      // trajectory and its landing basin are exactly the same, just slower.
      const tScale = p.slow ? 0.1 : 1;
      let a = p.alpha;
      let wrapped = false;
      /* Motion source. SOLVE FIRST, THEN DISPLAY: when sweeping, the fin
         plays back the averaged cycle of the time-domain physics solution
         (src/physics.js, solved in a worker for the current design), in
         physical time (slo-mo plays it at a tenth). Until that solution is
         ready nothing moves; nothing unsolved is ever animated. With the
         motor stopped (manual α), the fin is shown at its static
         equilibrium on the current branch (seeded from the previous twist,
         so the hysteresis is kept). */
      const ph = p.phys;
      let play = null;
      const before = theta.current;
      if (p.sweeping && ph) {
        playT.current += dt * tScale;
        if (playT.current >= ph.Tc) { playT.current -= ph.Tc; wrapped = true; trail.current = []; snapEv.current = null; }
        const kf = playT.current / ph.dt, k0 = Math.min(ph.K - 1, Math.floor(kf)), fr = Math.min(1, kf - k0);
        play = { k0, fr };
        a = ph.alpha0 + ph.Omega * playT.current;
        theta.current = ph.th[k0] + fr * (ph.th[k0 + 1] - ph.th[k0]);
        sweepAlpha.current = a;
      } else if (p.sweeping) {
        a = sweepAlpha.current;                      // waiting for the solver
      } else {
        sweepAlpha.current = a;
        theta.current = p.lamE > 0 || p.lambda > 0 ? settle(theta.current, a, p.lambda, p.mu) : 0;
      }
      // Twist rate in PHYSICAL rad/s (frame time scaled by slo-mo).
      const rate = wrapped ? 0 : Math.abs(theta.current - before) / Math.max(dt * tScale, 1e-4);
      const steps = 1;
      // A snap needs a fold to fall off; without one (λ ≤ π²/4) there is
      // nothing to detect, and the wrap frame is never a physical event.
      if (!wrapped && p.lamE > LAMBDA_CRIT && rate > SNAP_THRESHOLD) flash.current = 0.45;
      flash.current = Math.max(0, flash.current - dt);
      const snapping = flash.current > 0;
      // Track colour follows the MEASURED twist rate, not the flash timer:
      // the timer runs in wall-clock time, so at full speed it kept painting
      // ~20° of slow post-snap wind-up red (and far less in slo-mo). On a
      // frame with no substeps (slo-mo) θ did not move, so the previous
      // verdict stands.
      if (steps > 0) fastRef.current = !wrapped && p.lamE > LAMBDA_CRIT && rate > SNAP_THRESHOLD;
      const fast = fastRef.current;
      /* Snap bookkeeping for the compass. A snap is detected on the frame
         the rate first crosses the threshold, and recorded when the flash
         timer expires. What is recorded is the snap's quasi-static arc at
         the motor angle it LEFT from: θ runs downhill from where it was to
         the minimum it falls into, at that fixed α. The dynamics overshoot
         and ring about that minimum, but the tip shape is a function of
         (α, θ) alone, so the ringing retraces the same arc and adds nothing
         but noise; and the motor creep during the flash hold is wind-up for
         the NEXT snap, not part of this one. This is exactly the path the
         optimiser evaluates, so the two efficiencies agree. */
      if (snapping && !snapEv.current) snapEv.current = { th: before, a };

      trail.current.push([theta.current, energy(theta.current, a, p.lambda, p.mu)]);
      if (trail.current.length > 26) trail.current.shift();

      const T = three.current;
      if (T.renderer) {
        // Quasi-static shape (for the curvature arrows, and the shape itself
        // when not playing back); during playback the shape is the solved one.
        const qs = integrateShape(a, theta.current, p.k1, p.k2, p.Lc, p.Lext, p.w1, p.w2, p.wy);
        const { Rtip, Rmid } = qs;
        let pts = qs.pts, nOverlap = qs.nOverlap;
        if (play) {
          const n = ph.S + 1, A0 = 3 * n * play.k0, A1 = A0 + 3 * n, f = play.fr;
          pts = new Array(n);
          for (let j = 0; j < n; j++) {
            const i0 = A0 + 3 * j, i1 = A1 + 3 * j;
            pts[j] = new THREE.Vector3(ph.pts[i0] + f * (ph.pts[i1] - ph.pts[i0]),
              ph.pts[i0 + 1] + f * (ph.pts[i1 + 1] - ph.pts[i0 + 1]), ph.pts[i0 + 2] + f * (ph.pts[i1 + 2] - ph.pts[i0 + 2]));
          }
          nOverlap = ph.nOverlap;
        }
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
        if (T.guideGroup) {
          // Sized to the sheath's reach each frame: it spans the overlap in
          // local z and both sides of the axis in local y.
          T.guideGroup.visible = !!p.planar;
          if (p.planar) {
            const reach = Math.max(40, p.Lc * 1000 * 1.1);
            T.guideGroup.scale.set(1, 1, 1);
            T.guideGroup.children.forEach((c) => c.scale.set(reach * 1.4, reach * 2, 1));
            T.guideGroup.position.set(0, 0, reach * 0.5);
          }
        }
        const tipW = T.robot.localToWorld(tip.clone());
        if (!snapping && snapEv.current) {
          const ev = snapEv.current; snapEv.current = null;
          const land = ev && p.lamE > LAMBDA_CRIT ? settle(ev.th, ev.a, p.lambda, p.mu) : null;
          if (land !== null && Math.abs(land - ev.th) > 0.3) {
            const dE = energy(ev.th, ev.a, p.lambda, p.mu) - energy(land, ev.a, p.lambda, p.mu);
            const tmp = [0, 0, 0], w = new THREE.Vector3();
            const pts = snapStroke((th) => {
              tipPoint(ev.a, th, p.k1, p.k2, p.Lc, p.Lext, p.w1, p.w2, tmp, p.wy);
              T.robot.localToWorld(w.set(tmp[0], tmp[1], tmp[2]));
              return [w.x, w.z, energy(th, ev.a, p.lambda, p.mu)];
            }, ev.th, land);
            const span = Math.hypot(pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]);
            // Physical scaling as in the optimiser: E_snap = dV * k_t / L_c.
            if (dE > 1e-6 && span > 0.5) T.compass?.add({ pts, E: dE * p.kScale / p.Lc });
          }
        }
        if (T.tracks) {
          // pts live in the robot group's local frame (pitched -90 deg and
          // lifted onto the base plate), so a sample has to pass through that
          // group matrix before it means anything in floor coordinates.
          if (p.layers.tipTrack) T.tracks.tip.push(tipW, fast);
          else T.tracks.tip.hide();
          if (p.layers.midTrack) T.tracks.mid.push(T.robot.localToWorld(mid.clone()), fast);
          else T.tracks.mid.hide();
        }
        T.tipOrb.position.copy(tip);
        T.tipOrb.material.color.setHex(snapping ? hexInt(C.unstable) : hexInt(C.ink));
        const th = theta.current;
        const world = (x, y) => new THREE.Vector3(
          Rmid[0][0] * x + Rmid[0][1] * y,
          Rmid[1][0] * x + Rmid[1][1] * y,
          Rmid[2][0] * x + Rmid[2][1] * y
        ).normalize();
        const rx = p.w1 * p.k1 + p.w2 * p.k2 * Math.cos(th), ry = p.wy * p.k2 * Math.sin(th);
        const rmag = Math.hypot(rx, ry);
        // A zero-magnitude arrow still has to be hidden even when the layer is
        // lit: pointing it somewhere arbitrary would assert a direction the
        // curvature does not have.
        const vec = p.layers.vectors;
        [['k1', world(1, 0), p.k1 > 0.01],
        ['k2', world(Math.cos(th), Math.sin(th)), p.k2 > 0.01],
        ['res', rmag > 1e-4 ? world(rx, ry) : new THREE.Vector3(1, 0, 0), rmag > 1e-3]]
          .forEach(([k, dir, vis]) => {
            T.arrows[k].position.copy(mid); T.arrows[k].setDirection(dir);
            T.arrows[k].visible = vec && vis;
          });

        /* Tip motion. Travel: the tip's velocity, smoothed over a few
           frames, arrow length growing with speed. Roll: the fin's material
           direction at the tip (its own κ₂ direction, θ_tip from the
           sheath frame, carried unchanged along the free extension), i.e.
           the rotation of the tip about its own axis. Its angle is measured
           about the tip axis from FORWARD (robot-local +x) projected into
           the plane normal to that axis, right-handed about the tangent. */
        const tl = tip.clone();
        let vRaw = null;                 // unsmoothed, for the rowing integral
        if (tipPrev.current && dt > 1e-4) {
          vRaw = tl.clone().sub(tipPrev.current).divideScalar(Math.max(dt * tScale, 1e-4));   // physical mm/s
          tipVel.current.lerp(vRaw, Math.min(1, dt * 12));
        }
        tipPrev.current = tl;
        const tv = p.layers.tipVectors;
        let roll = tipRoll(Rtip, th);
        if (play) {
          // The solved roll vector, and its angle about the solved tip axis.
          const k = play.k0, f = play.fr, R = ph.roll;
          const d = [0, 1, 2].map((c) => R[3 * k + c] + f * (R[3 * k + 3 + c] - R[3 * k + c]));
          const dn = Math.hypot(...d) || 1; d[0] /= dn; d[1] /= dn; d[2] /= dn;
          const tn = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize();
          const fw = new THREE.Vector3(1, 0, 0).addScaledVector(tn, -tn.x);
          let deg = null;
          if (fw.length() > 1e-6) {
            fw.normalize();
            const dv = new THREE.Vector3(...d);
            deg = (Math.atan2(new THREE.Vector3().crossVectors(fw, dv).dot(tn), fw.dot(dv)) * 180) / Math.PI;
          }
          roll = { dir: d, deg };
        }
        const rollDir = new THREE.Vector3(...roll.dir), rollDeg = roll.deg;
        const spd = tipVel.current.length();
        T.arrows.vel.position.copy(tip); T.arrows.roll.position.copy(tip);
        if (spd > 1) {
          T.arrows.vel.setDirection(tipVel.current.clone().normalize());
          const L = Math.min(70, 14 + 12 * Math.log10(1 + spd));
          T.arrows.vel.setLength(L, Math.min(9, L * 0.35), 5);
        }
        T.arrows.vel.visible = tv && spd > 1;
        T.arrows.roll.setDirection(rollDir);
        T.arrows.roll.visible = tv;
        tipInfo.current = { spd, rollDeg };
        {
          const o = oneD.current;
          o.t += dt * tScale;                          // physical seconds
          // r̂·v on the RAW frame velocity: the smoothed one (used for the
          // arrows) lags and flattens the snap, which dominates the integral.
          const vv = vRaw ?? tipVel.current;
          /* The 1-D axis is the NET THRUST direction once snaps have been
             recorded, otherwise FORWARD. Thrust is the reaction to the push:
             the fin drives water along the net snap vector (the compass's
             Σ E·d̂, a floor direction), so the robot is pushed the opposite
             way. The compass works in floor coordinates (world x, world z);
             robot-local is (x, y) = (world x, −world z) on the floor. */
          const hd = T.compass?.heading?.();
          const ex = hd ? -hd.x : 1, ey = hd ? hd.y : 0;
          const along = (q0, q1) => q0 * ex + q1 * ey;
          // Raw floor components are kept too, so the view can re-project
          // the whole history onto the CURRENT axis when it changes.
          o.cur = { t: o.t, x: along(tip.x, tip.y), v: along(tipVel.current.x, tipVel.current.y),
            r: along(roll.dir[0], roll.dir[1]), fast, net: !!hd, ex, ey,
            px: tip.x, py: tip.y, vx: tipVel.current.x, vy: tipVel.current.y, rx: roll.dir[0], ry: roll.dir[1],
            bearing: hd ? (Math.atan2(ey, ex) * 180) / Math.PI : 0,
            f: ((roll.dir[0] * vv.x + roll.dir[1] * vv.y + roll.dir[2] * vv.z) / M2MM) ** 2,   // (r̂·v)², m²/s²
            reach: (p.Lc + p.Lext) * 1000, Tc: p.phys?.Tc ?? (2 * Math.PI) / SOLVER.SWEEP_RATE };
          o.hist.push(o.cur);
          while (o.hist.length && o.t - o.hist[0].t > ONE_D_SPAN) o.hist.shift();
        }
        T.tick?.(dt);
        T.renderer.render(T.scene, T.cam());
        T.renderCube?.();
      }

      drawEnergy(a, p.lambda, theta.current, snapping, p.mu);
      drawSCurve(a, p.lambda, theta.current, p.mu);

      hudClock += dt;
      if (hudClock > 0.08) {
        hudClock = 0;
        const kx = p.w1 * p.k1 + p.w2 * p.k2 * Math.cos(theta.current);
        const ky = p.wy * p.k2 * Math.sin(theta.current);
        setHud({ theta: theta.current, alpha: a, kres: Math.hypot(kx, ky),
          V: energy(theta.current, a, p.lambda, p.mu), Vpp: stiffness(theta.current, p.lambda, p.mu), vel: rate, snapping,
          compass: T.compass?.stats(), tip: { ...tipInfo.current } });
        if (p.sweeping) patchSim({ alphaDeg: Math.round((a * 180) / Math.PI) });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [patchSim]);

  const unstable = hud.Vpp <= 0;
  // What the model predicts for this exact design (the optimiser's number),
  // shown until snaps have been measured and kept alongside them after.
  const modelEff = useMemo(() => snapEfficiency(lambda, k1, k2, LcMm / 1000, extMm / 1000, mech),
    [lambda, k1, k2, LcMm, extMm, mech]);
  const measured = hud.compass && hud.compass.n > 0 ? hud.compass : null;
  const effShown = measured ?? modelEff;
  const torsionObj = objective === 'torsion';
  const rowObj = objective === 'rowing';
  const torEff = useMemo(() => torsionEfficiency(lambda, mu), [lambda, mu]);
  const nLayers = Object.values(layers).filter(Boolean).length;
  const anyTrack = layers.tipTrack || layers.midTrack;

  return (
    <div className="col grow">
      <div className="ctr-body">
        <div className="ctr-view" ref={mountRef}>
          {simView === '1d' && <OneDView feed={oneD} />}
          <div className="ctr-tl">
            {/* ── Modes: same look as the Data layers card, opening downward.
                Outer-tube constraint is the shared design-store setting the
                optimisation tab edits; theme is app-wide. */}
            <button className="ctr-layers-btn" onClick={() => setModesOpen((v) => !v)} aria-expanded={modesOpen}>
              <SlidersHorizontal size={15} /> Modes
              <span className="cnt">{outerMode === 'rigid' ? 'fixed' : outerMode}</span>
            </button>
            {modesOpen && (
              <div className="ctr-layers-card">
                <div className="hd"><SlidersHorizontal size={14} color={C.accent} /> Modes</div>
                <h3>View</h3>
                <div className="ctr-lyr-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
                  <LayerRow on={simView === '3d'} onChange={() => setSimView('3d')}
                    icon={Box} color={C.accent} name="3D" desc="The full 3-D scene." />
                  <LayerRow on={simView === '1d'} onChange={() => setSimView('1d')}
                    icon={MoveHorizontal} color={C.accent} name="1D"
                    desc="Forward axis only: the tip's forward position, the forward component of its travel and of its roll vector, with their recent history." />
                </div>
                <h3>Medium</h3>
                <div className="ctr-lyr-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
                  <LayerRow on={phys.medium === 'water'} onChange={() => patchPhys({ medium: 'water' })}
                    icon={Droplets} color={C.blue} name="Water"
                    desc="20 °C water, ρ 998 kg/m³, μ 1.0 mPa·s: drag and added mass damp the snap strongly." />
                  <LayerRow on={phys.medium === 'air'} onChange={() => patchPhys({ medium: 'air' })}
                    icon={Wind} color={C.blue} name="Air"
                    desc="20 °C air, ρ 1.2 kg/m³, μ 18 µPa·s: almost no fluid damping, so the fin rings after a snap." />
                </div>
                <h3>Outer tube</h3>
                <div className="ctr-lyr-grid">
                  <LayerRow on={outerMode === 'clamped'} onChange={() => setOuterMode('clamped')}
                    icon={Anchor} color={C.accent} name="Clamped"
                    desc="Clamped at base: the outer tube can twist and bend along its length." />
                  <LayerRow on={outerMode === 'planar'} onChange={() => setOuterMode('planar')}
                    icon={RectangleVertical} color={C.accent} name="Planar"
                    desc="A guide holds the outer tube in its own plane: it bends in-plane and twists, but cannot leave the plane." />
                  <LayerRow on={outerMode === 'rigid'} onChange={() => setOuterMode('rigid')}
                    icon={Lock} color={C.accent} name="Fixed"
                    desc="Fully constrained: the outer tube is rigid and cannot move; only the fin moves." />
                </div>
                <h3>Efficiency</h3>
                <div className="ctr-lyr-grid">
                  <LayerRow on={objective === 'translation'} onChange={() => setObjective('translation')}
                    icon={MoveRight} color={C.gold} name="Translation"
                    desc="η_prop = (F − B)/E: how much of the snap's energy the tip turns into net push. Optimiser scores this." />
                  <LayerRow on={torsionObj} onChange={() => setObjective('torsion')}
                    icon={RotateCw} color={C.gold} name="Torsion"
                    desc="η_T = twist energy released / ΔE: the fin as a torsional spring powering a separate propulsor. Optimiser scores this." />
                  <LayerRow on={objective === 'rowing'} onChange={() => setObjective('rowing')}
                    icon={Waves} color={C.gold} name="Rowing"
                    desc="J_row = ∮(r̂·v)² dx_fwd over one revolution: drag-like (∝ blade-normal speed²) work along forward. Optimiser scores |J_row|." />
                </div>
                <h3>Theme</h3>
                <div className="ctr-lyr-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
                  <LayerRow on={theme === 'light'} onChange={() => setTheme('light')}
                    icon={Sun} color={C.accent} name="Light" desc="Light surface" />
                  <LayerRow on={theme === 'dark'} onChange={() => setTheme('dark')}
                    icon={Moon} color={C.accent} name="Dark" desc="Dark surface (default for instrument screens)" />
                </div>
              </div>
            )}
            {/* Torsional efficiency (objective = torsion): twist share of ΔE. */}
            {layers.effCard && torsionObj && (
              <div className="ctr-eff" title={'Share of the snap\'s released energy that comes out of the twist ½(θ−α)². '
                + 'This is what a torsional-spring reservoir can hand to a separate propulsor; the rest is bending coupling.'}>
                <div className="cap-label">Snap torsional efficiency</div>
                {torEff ? (
                  <>
                    <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                      <Cx id="etaT"><span className="v">{(torEff.eta * 100).toFixed(0)}%</span></Cx>
                      <span className="ft">model · at the fold</span>
                    </div>
                    <div className="bar"><i style={{ width: `${torEff.eta * 100}%`, background: C.gold }} /></div>
                    <div className="ft">
                      <Cx id="etaT">twist {(torEff.eta * 100).toFixed(0)}% · bending {(100 - torEff.eta * 100).toFixed(0)}%</Cx>
                    </div>
                  </>
                ) : (
                  <div className="ft" style={{ marginTop: 4 }}>no snap — {mech.planar ? 'λ_eff' : 'λ'} {lamE.toFixed(2)} ≤ π²/4</div>
                )}
              </div>
            )}
            {/* Snap propulsion efficiency: η = (F − B)/E, the net push of the
                snap arc along the net snap direction over its whole energy. */}
            {layers.effCard && !torsionObj && <div className="ctr-eff" title={"Share of the snap's energy that ends up pushing along the net snap direction. "
              + 'Backward motion cancels forward; sideways motion counts as lost. Pieces of the arc are weighted '
              + 'by the energy they release. η = (forward − back) / total; a straight snap along the net scores 100%.'}>
              <div className="cap-label">Snap propulsion efficiency</div>
              {effShown ? (
                <>
                  <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                    <Cx id="eta"><span className="v">{(effShown.eta * 100).toFixed(0)}%</span></Cx>
                    <span className="ft">{measured ? `measured · ${measured.n} snap${measured.n === 1 ? '' : 's'}` : 'model · sweep α to measure'}</span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${Math.max(0, effShown.eta) * 100}%`, background: C.gold }} />
                    {measured && modelEff && <b style={{ left: `calc(${Math.max(0, modelEff.eta) * 100}% - 1px)` }} title="model" />}
                  </div>
                  <div className="ft">
                    {effShown.E > 0 ? (
                      <Cx id="split">
                        fwd {((100 * effShown.F) / effShown.E).toFixed(0)}%
                        {' · '}back {((100 * effShown.B) / effShown.E).toFixed(0)}%
                        {' · '}side {(100 * Math.max(0, 1 - (effShown.F + effShown.B) / effShown.E)).toFixed(0)}%
                      </Cx>
                    ) : 'no forward push'}
                    {measured && modelEff && <> · <Cx id="eta">model {(modelEff.eta * 100).toFixed(0)}%</Cx></>}
                  </div>
                </>
              ) : (
                <div className="ft" style={{ marginTop: 4 }}>no snap — {mech.planar ? 'λ_eff' : 'λ'} {lamE.toFixed(2)} ≤ π²/4</div>
              )}
            </div>}

          </div>

          {/* What the scene is showing. Read-only: these are owned by the
              optimisation tab, and a second editable copy here would give the
              same robot two definitions. */}
          <div className="ctr-overlay" style={{ bottom: 12, right: 12, textAlign: 'right' }}>
            <div className="ctr-spec" style={{ justifyContent: 'flex-end' }}>
              <span>κ₁ <b>{k1.toFixed(1)}</b> m⁻¹</span>
              <span>κ₂ <b>{k2.toFixed(1)}</b> m⁻¹</span>
              <span><M>{'L_c'}</M> <b>{LcMm.toFixed(0)}</b> mm</span>
              <span><M>{'L_ext'}</M> <b>{extMm.toFixed(0)}</b> mm</span>
              <span>OD <b>{(mech.t1.d_o * 1e3).toFixed(2)}</b>/<b>{(mech.t2.d_o * 1e3).toFixed(2)}</b> mm</span>
              <span style={mech.outerLocked || mech.planar ? { color: C.gold } : undefined}>
                outer <b style={mech.outerLocked || mech.planar ? { color: C.gold } : undefined}>{mech.outerLocked ? 'fully constrained' : mech.planar ? 'held planar' : 'clamped at base'}</b>
              </span>
            </div>
            <div className="ctr-spec" style={{ justifyContent: 'flex-end', marginTop: 3 }}>
              <span>physics <b>{MEDIA[phys.medium].name.toLowerCase()}</b></span>
              <span><b>{phys.rpm}</b> rpm</span>
              <span>{physSol.status === 'ready'
                ? <>solved <b>{physSol.data.cycles}</b> cycles in {physSol.elapsed?.toFixed(0)} s on {physSol.data.workers} cores{physSol.data.integrated < physSol.data.cycles ? ` (periodic after ${physSol.data.integrated})` : ''} · J <b>{physSol.data.J[0].toPrecision(3)}</b> m³/s²</>
                : physSol.status === 'solving' ? `solving ${(physSol.progress * 100).toFixed(0)}%` : physSol.status === 'none' ? 'no snap' : physSol.status}</span>
            </div>
          </div>

          {/* Sits below the view cube, which occupies the top-right corner of
              the WebGL canvas (112 px + its padding). */}
          <div className="ctr-overlay mono" style={{ top: cubeOn ? 12 + 112 + 12 : 12, right: 12, textAlign: 'right' }}>
            {layers.vectors && (
              <>
                <div style={{ color: C.blue }}>— outer tube κ₁</div>
                <div style={{ color: C.sand }}>— inner tube κ₂</div>
                <div style={{ color: C.ink }}>— resultant curvature</div>
              </>
            )}
            {layers.tipVectors && (
              <>
                <div style={{ marginTop: 6, color: C.gold }}>— tip travel {hud.tip ? `${hud.tip.spd.toFixed(0)} mm/s` : ''}</div>
                <div style={{ color: C.cyan }}>— tip roll {hud.tip && hud.tip.rollDeg !== null ? `${hud.tip.rollDeg.toFixed(0)}°` : '—'}</div>
                <div className="dim">roll 0° = forward</div>
              </>
            )}
            {layers.compass && (
              <>
                <div style={{ marginTop: 6, color: C.dim }}>snap compass</div>
                <div style={{ color: C.gold }}>— net snap vector Σ E·d̂</div>
                <div style={{ color: C.dim }}>— single snaps</div>
                {hud.compass && hud.compass.n > 0 ? (
                  <div style={{ color: C.gold }}>
                    <Cx id="net">Σ {(hud.compass.mag * 1000).toFixed(1)} mJ</Cx> · <Cx id="eta">η {(hud.compass.eta * 100).toFixed(0)}%</Cx>
                    {' · '}n {hud.compass.n}
                    {hud.compass.bearing !== null && ` · ${hud.compass.bearing.toFixed(0)}°`}
                  </div>
                ) : (
                  <div className="dim">no snaps recorded yet — sweep α</div>
                )}
              </>
            )}
            {anyTrack && (
              <>
                <div style={{ marginTop: 6, color: C.dim }}>ground track</div>
                <div style={{ color: C.accent }}>— build-up (quasi-static)</div>
                <div style={{ color: C.unstable }}>— snap (energy release)</div>
                {layers.tipTrack && layers.midTrack && (
                  <div className="dim" style={{ marginTop: 3 }}>wide = tip · narrow = overlap</div>
                )}
              </>
            )}
          </div>

          {/* ── Data layers ───────────────────────────────────────────────
              Anchored over the viewport, not docked in the sidebar, so it
              survives the sidebar being collapsed. */}
          <div className="ctr-layers">
            {layersOpen && (
              <div className="ctr-layers-card">
                <div className="hd"><Layers size={14} color={C.accent} /> Data layers</div>

                <h3>Motion</h3>
                <div className="ctr-lyr-grid">
                  <LayerRow on={layers.tipTrack} onChange={(v) => setLayer('tipTrack', v)}
                    icon={CircleDot} color={C.accent} name="Tip path"
                    desc="Floor projection of the fin tip's path, coloured by phase (build-up / snap). Never fades." />
                  <LayerRow on={layers.midTrack} onChange={(v) => setLayer('midTrack', v)}
                    icon={Waypoints} color={C.cyan} name="Overlap path"
                    desc="Floor projection of the end of the overlap, where the sheath releases the fin." />
                  <LayerRow on={layers.vectors} onChange={(v) => setLayer('vectors', v)}
                    icon={MoveUpRight} color={C.ink} name="Curvature"
                    desc="κ₁, κ₂ and their resultant at the end of the overlap." />
                  <LayerRow on={layers.tipVectors} onChange={(v) => setLayer('tipVectors', v)}
                    icon={RotateCw} color={C.gold} name="Tip vectors"
                    desc="At the tip: its direction of travel (length grows with speed) and its roll about its own axis, 0° = pointing FORWARD." />
                </div>
                <h3>Energy</h3>
                <div className="ctr-lyr-grid">
                  <LayerRow on={layers.effCard} onChange={(v) => setLayer('effCard', v)}
                    icon={Gauge} color={C.gold} name="Efficiency"
                    desc="The snap efficiency card, top left: propulsion (η_prop) or torsional (η_T), per Modes → Efficiency." />
                  <LayerRow on={layers.compass} onChange={(v) => setLayer('compass', v)}
                    icon={Zap} color={C.gold} name="Net snap"
                    desc="Each snap as a vector (the direction its arc pushes, length = energy). Bold arrow = their sum; η = propulsion efficiency along it." />
                  <LayerRow on={layers.headingUp} onChange={(v) => setLayer('headingUp', v)}
                    disabled={!layers.compass} icon={Compass} color={C.accent} name="Snap → right"
                    desc="Turn the top-down view so the net snap points screen-right. Off = north-up. Needs Net snap." />
                </div>

                {(anyTrack || layers.compass) && (
                  <>
                    <div className="sep" />
                    <button className="ctr-btn" style={{ margin: '4px 13px 6px', width: 'calc(100% - 26px)' }}
                      onClick={clearTracks}>
                      <RotateCcw size={13} /> Clear
                    </button>
                  </>
                )}
              </div>
            )}
            <button className="ctr-layers-btn" onClick={() => setLayersOpen((v) => !v)}>
              <Layers size={15} /> Layers
              {nLayers > 0 && <span className="cnt">{nLayers}</span>}
            </button>
          </div>

          {handoff && (
            <div className="ctr-badge mono">
              loaded · κ {handoff.kappa.toFixed(1)} m⁻¹ · L_c {(handoff.Lc * 1000).toFixed(0)} mm
            </div>
          )}
          {hud.snapping && (
            <div className="ctr-alert"><AlertTriangle size={15} /> Snap in progress — elastic energy releasing</div>
          )}
          {sweeping && physSol.status !== 'ready' && (
            <div className="ctr-solving mono">
              {physSol.status === 'solving' && <>Solving the physics — {MEDIA[phys.medium].name.toLowerCase()}, {Math.round(phys.cycles)} cycles · {(physSol.progress * 100).toFixed(0)}%
                {physSol.elapsed ? ` · ${physSol.elapsed.toFixed(0)} s` : ''}</>}
              {physSol.status === 'none' && <>Nothing to play back: {physSol.reason}</>}
              {physSol.status === 'error' && <>Physics solver error: {physSol.error}</>}
              <div className="dim" style={{ marginTop: 3 }}>the fin moves only once its motion has been solved</div>
            </div>
          )}
        </div>

        <SideBar title="Analysis" open={side} onToggle={() => setSide((v) => !v)}>
          <Panel title="Energy landscape" plot open={panels.energy}
            onToggle={() => togglePanel('energy')}
            icon={<Zap size={14} color={C.gold} />}
            right={`V = ${(0.5 * ((hud.theta - hud.alpha) ** 2)).toFixed(2)} + ${(lambda * (1 - Math.cos(hud.theta))).toFixed(2)}`
              + (mu > 0 ? ` + ${(0.5 * mu * Math.sin(hud.theta) ** 2).toFixed(2)}` : '')}>
            <div className="ctr-plotbox"><canvas ref={energyRef} /></div>
          </Panel>
          <Panel title="Equilibrium map" plot open={panels.scurve}
            onToggle={() => togglePanel('scurve')}
            icon={<Activity size={14} color={C.cyan} />}
            right="θ vs α">
            <div className="ctr-plotbox"><canvas ref={scurveRef} /></div>
          </Panel>
        </SideBar>
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
        </div>

        {/* α is the only live control left here: it is the actuation input the
            simulator drives, not part of the specification. Everything that
            defines the ROBOT is configured on the optimisation tab. */}
        <div className="ctr-sliders" style={{ gridTemplateColumns: 'minmax(0,1fr)', maxWidth: 320 }}>
          <Slider label="Motor base twist" symbol="α" value={alphaDeg} min={-360} max={360} step={1}
            unit="°" accent={C.cyan} onChange={(v) => { patchSim({ alphaDeg: v }); setSweeping(false); }} />
        </div>

        <div className="ctr-metrics">
          <Metric icon={<Boxes size={12} />} label={mech.planar ? 'Effective λ_eff [–]' : 'Bifurcation λ [–]'}
            value={(mech.planar ? lamE : lambda).toFixed(2)} cite={mech.planar ? 'planarCrit' : 'lambda'}
            color={lamE > LAMBDA_CRIT ? C.gold : C.dim}
            note={lamE > LAMBDA_CRIT ? "snaps" : "no fold"} />
          <Metric icon={<Zap size={12} />} label="Elastic V [–]" value={hud.V.toFixed(2)} color={C.gold} cite="V" />
          <Metric icon={<Gauge size={12} />} label="Lumped V″ [–]" value={hud.Vpp.toFixed(2)} cite="Vpp"
            color={unstable ? C.red : C.green} note={unstable ? 'unstable' : 'stable'} />
          <Metric icon={<Activity size={12} />} label="Twist rate [°/s]"
            value={`${((hud.vel * 180) / Math.PI).toFixed(0)}°/s`} color={hud.snapping ? C.red : C.dim} cite="integ" />
          <Metric icon={<Waves size={12} />} label="Resultant |K| [m⁻¹]" value={hud.kres.toFixed(2)} cite="curv"
            color={hud.kres < 0.5 ? C.unstable : C.green}
            note={hud.kres < 0.5 ? "straight" : ""} />
          <Metric icon={<Activity size={12} />} label="Tip twist θ [°]"
            value={`${((hud.theta * 180) / Math.PI).toFixed(0)}°`} color={C.cyan} cite="integ" />
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   8 · WORKSPACE B — DESIGN OPTIMISATION
   ═══════════════════════════════════════════════════════════════ */
const GRID_N = 50, SURF = 105, HEIGHT = 74;
/** Surface height (scene units) of a value in mJ inside the z bounds;
 *  anything outside them is clipped flat to the floor or the ceiling. */
const zH = (mJ, { zLo, zHi }) => Math.max(0, Math.min(1, (mJ - zLo) / (zHi - zLo))) * HEIGHT;
/** The colour channel's formula, rendered once. */
const scoreTex = (e) => katex.renderToString(
  String.raw`\displaystyle \text{Score} = \eta_{\text{hydro}}\,\frac{${e}\,\Delta E}{W_{\text{in}}}\,\exp\!\Big[-\Big(\frac{\varepsilon_{\text{eq}}}{\varepsilon_{\text{allow}}}\Big)^{4}\Big]`,
  { throwOnError: false });
const hydroTex = (e) => katex.renderToString(String.raw`\eta_{\text{hydro}} = 1 - e^{-k_\eta\,${e}\,\Delta E}`, { throwOnError: false });
const ETA_SYM = { translation: String.raw`\eta_{\text{prop}}`, torsion: String.raw`\eta_{T}` };
const SCORE_TEX = { translation: scoreTex(ETA_SYM.translation), torsion: scoreTex(ETA_SYM.torsion),
  rowing: katex.renderToString(String.raw`\displaystyle \text{Score} = |J_{\text{row}}|\,\exp\!\Big[-\Big(\frac{\varepsilon_{\text{eq}}}{\varepsilon_{\text{allow}}}\Big)^{4}\Big]`, { throwOnError: false }) };
const HYDRO_TEX = { translation: hydroTex(ETA_SYM.translation), torsion: hydroTex(ETA_SYM.torsion),
  rowing: katex.renderToString(String.raw`J_{\text{row}} = \oint_{\text{1 rev}} (\hat r\cdot\mathbf v)^2\,dx_{\text{fwd}}`, { throwOnError: false }) };

function OptimizerWorkspace() {
  /* This tab owns the whole specification. Every configured quantity in the
     app is edited here and read elsewhere, so there is exactly one definition
     of the robot at any moment. */
  const { applyDesign, sim, patchSim,
    domain, patchDomain, themeTick, tubes, patchTube, setTubes, outerLocked, setOuterLocked,
    outerPlanar, setOuterPlanar, mech, openCite, objective, setObjective, phys, patchPhys, physSol } = useDesign();
  const { LcMm, extMm, k1, k2 } = sim;
  const torsionObj = objective === 'torsion';
  const rowObj = objective === 'rowing';
  // Part 6: the allowable strain must be justified by a target cycle life,
  // not hardcoded to the 8% monotonic superelastic limit — at 8% the gate is
  // inert over the whole practical κ range and the optimum just walks to the
  // corner of the parameter box.
  const { logLife, etaK, clip, kMin, kMax, LcMinMm, LcMaxMm, zAuto, zMin, zMax, rowCycles, rowGrid } = domain;
  const setLogLife = (v) => patchDomain({ logLife: v });
  const setEtaK = (v) => patchDomain({ etaK: v });
  const setClip = (v) => patchDomain({ clip: v });
  const [hover, setHover] = useState(null);
  const [side, setSide] = useState(true);
  const [panels, togglePanel] = usePanels({
    sweet: true, design: true, tubes: true, axes: true, physics: true, scoring: false,
    tradeoff: false, safety: false,
  });
  const designLambda = bifurcation(k1, k2, LcMm / 1000, mech);
  const designLamE = lamEff(designLambda, muOf(mech, LcMm / 1000, k2));   // = λ unless planar
  const setOuterMode = (m) => { setOuterLocked(m === 'rigid'); setOuterPlanar(m === 'planar'); };
  const outerMode = mech.outerLocked ? 'rigid' : mech.planar ? 'planar' : 'clamped';

  const targetLife = Math.pow(10, logLife);
  const strainLimit = epsAllowFor(targetLife);
  const strainPct = strainLimit * 100;
  // ε_bend = κ·d₀/2 ≤ ε_allow on the LARGER of the two tubes, which governs.
  const kappaCeiling = strainLimit / (mech.outerLocked ? mech.t2.r : mech.rMax);
  // The typed x bound, optionally clipped by that fatigue ceiling.
  const kappaMax = Math.max(kMin + 0.1, clip ? Math.min(kMax, kappaCeiling) : kMax);

  /* Rowing from the PHYSICS (src/physics.js): each design is run from rest,
     the wind-up discarded, then rowCycles cycles, by a pool of workers. A
     full 50×50 grid of time-domain solutions would take hours, so rowing
     is solved on a coarse rowGrid × rowGrid lattice over the same axes and
     interpolated bilinearly onto the plot grid; the sweet spot is read off
     the interpolated surface. Designs that do not snap are skipped (J = 0).
     The previous result stays on screen until the new one is complete. */
  const [rowRes, setRowRes] = useState({ data: null, prog: 1, coarse: null, secs: 0 });
  useEffect(() => {
    if (objective !== 'rowing') return undefined;
    const n = Math.max(3, Math.round(rowGrid)), Lext = extMm / 1000;
    const LcMin = LcMinMm / 1000, LcMax = LcMaxMm / 1000;
    const kAt = (i) => kMin + ((kappaMax - kMin) * i) / (n - 1), LcAt = (j) => LcMin + ((LcMax - LcMin) * j) / (n - 1);
    const items = [];
    const coarse = new Float64Array(3 * n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const kappa = kAt(i), Lc = LcAt(j);
      const lambda = mech.C * Lc * Lc * kappa * kappa, mu = muOf(mech, Lc, kappa);
      if (lamEff(lambda, mu) > LAMBDA_CRIT) items.push({ i: j * n + i, design: { k1: kappa, k2: kappa, Lc, Lext, tubes, outerLocked: mech.outerLocked, outerPlanar: mech.planar } });
    }
    setRowRes((r) => ({ ...r, prog: 0 }));
    const t0 = performance.now();
    let cancelled = false;
    const job = solveRowingGrid(items, { ...phys, nodesOv: 4, nodesEx: 2, segOv: 24 }, Math.max(1, Math.round(rowCycles)),
      (pr) => { if (!cancelled) setRowRes((r) => ({ ...r, prog: pr, secs: (performance.now() - t0) / 1000 })); });
    job.promise.then((res) => {
      if (cancelled) return;
      res.forEach((r) => { coarse[3 * r.i] = r.J; coarse[3 * r.i + 1] = r.Jabs; coarse[3 * r.i + 2] = r.sd; });
      /* Onto the plot grid. Only SNAPPING designs carry a value: a plot cell
         that does not snap is 0, and a snapping cell is interpolated from
         the snapping coarse designs around it only (masked, normalized
         bilinear weights), falling back to the nearest snapping coarse
         design. Plain bilinear mixed the zeros of non-snapping designs into
         the onset boundary and drew false ramps and spikes there. */
      const snaps = new Uint8Array(n * n);
      res.forEach((r) => { if (r.ok) snaps[r.i] = 1; });
      const data = new Float64Array(3 * GRID_N * GRID_N);
      for (let J = 0; J < GRID_N; J++) for (let I = 0; I < GRID_N; I++) {
        const kappa = kMin + ((kappaMax - kMin) * I) / (GRID_N - 1), Lc = LcMin + ((LcMax - LcMin) * J) / (GRID_N - 1);
        const lam = mech.C * Lc * Lc * kappa * kappa;
        if (!(lamEff(lam, muOf(mech, Lc, kappa)) > LAMBDA_CRIT)) continue;
        const x = (I / (GRID_N - 1)) * (n - 1), y = (J / (GRID_N - 1)) * (n - 1);
        const i0 = Math.min(n - 2, Math.floor(x)), j0 = Math.min(n - 2, Math.floor(y)), fx = x - i0, fy = y - j0;
        const corners = [[i0, j0, (1 - fx) * (1 - fy)], [i0 + 1, j0, fx * (1 - fy)], [i0, j0 + 1, (1 - fx) * fy], [i0 + 1, j0 + 1, fx * fy]];
        let wsum = 0;
        const acc = [0, 0, 0];
        for (const [ii, jj, w] of corners) {
          if (!snaps[jj * n + ii] || w <= 0) continue;
          wsum += w; for (let c = 0; c < 3; c++) acc[c] += w * coarse[3 * (jj * n + ii) + c];
        }
        if (wsum > 0) { for (let c = 0; c < 3; c++) data[3 * (J * GRID_N + I) + c] = acc[c] / wsum; continue; }
        let best = -1, bd = Infinity;
        for (let q = 0; q < n * n; q++) if (snaps[q]) { const d = (q % n - x) ** 2 + (Math.floor(q / n) - y) ** 2; if (d < bd) { bd = d; best = q; } }
        if (best >= 0) for (let c = 0; c < 3; c++) data[3 * (J * GRID_N + I) + c] = coarse[3 * best + c];
      }
      setRowRes({ data, prog: 1, coarse: { n, J: res }, secs: (performance.now() - t0) / 1000, workers: job.workers });
    }).catch(() => { if (!cancelled) setRowRes((r) => ({ ...r, prog: 1 })); });
    return () => { cancelled = true; job.cancel(); };
  }, [objective, kMin, kappaMax, LcMinMm, LcMaxMm, mech, extMm, tubes, phys, rowCycles, rowGrid]);

  const grid = useMemo(() => buildGrid({
    nx: GRID_N, ny: GRID_N, kappaMin: kMin, kappaMax, LcMin: LcMinMm / 1000, LcMax: LcMaxMm / 1000,
    strainLimit, etaK, mech, Lext: extMm / 1000, objective,
    // Until the first averaged result exists, zeros (flat) rather than a
    // synchronous one-revolution pass that would freeze the page.
    rowData: objective === 'rowing' ? (rowRes.data ?? new Float64Array(3 * GRID_N * GRID_N)) : null,
  }), [kMin, kappaMax, LcMinMm, LcMaxMm, strainLimit, etaK, mech, extMm, objective, rowRes.data]);
  const rowBusy = objective === 'rowing' && rowRes.prog < 1;
  // z range in mJ: auto runs from 0 to the tallest design; typed bounds clip
  // the surface flat outside [zLo, zHi]. The hover loop reads it via a ref.
  const zLo = zAuto ? 0 : zMin;
  const zHi = zAuto ? Math.max(grid.maxProd * 1000, 1e-9) : Math.max(zMax, zMin + 1e-6);
  const zRef = useRef({ zLo, zHi });
  zRef.current = { zLo, zHi };

  const best = grid.best;
  const focus = hover || best;

  const mountRef = useRef(null), tipRef = useRef(null), three = useRef({});
  const gridRef = useRef(grid);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { if (themeTick) three.current.restyle?.(); }, [themeTick]);

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

    /* Palette refresh for everything built once at mount. The surface, the
       contour paths and the axis labels are rebuilt by the grid effect (which
       also runs on themeTick), so they are not touched here. */
    let floorGrid = floor;
    const restyle = () => {
      scene.background = new THREE.Color(C.bg);
      wire.material.color.setHex(hexInt(C.dim));
      onsetMat.color.setHex(hexInt(C.green));
      limitMat.color.setHex(hexInt(C.unstable));
      markBest.material.color.setHex(hexInt(C.accent));
      markHover.material.color.setHex(hexInt(C.ink));
      stem.material.color.setHex(hexInt(C.accent));
      // GridHelper bakes its two colours into vertex attributes and exposes no
      // setter, so it is the one object that has to be rebuilt.
      scene.remove(floorGrid);
      floorGrid.geometry.dispose(); floorGrid.material.dispose();
      floorGrid = new THREE.GridHelper(SURF * 2, 14, hexInt(C.dim), hexInt(C.panel));
      floorGrid.position.y = -1;
      floorGrid.material.transparent = true; floorGrid.material.opacity = 0.16;
      scene.add(floorGrid);
    };

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

    three.current = { scene, camera, renderer, surface, wire, onsetLine, limitLine, onsetMat, limitMat, axes, markBest, markHover, stem, restyle };

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
            const y = zH(cell.prod_J * 1000, zRef.current);
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
        tip.style.top = `${Math.max(8, Math.min(pt.y + 14, pt.h - 236))}px`;
      } else if (tip) tip.style.display = 'none';
    };
  }, []);

  useEffect(() => {
    const T = three.current;
    if (!T.surface) return;
    const { cells, nx, ny, maxDE, maxScore, kappaMin, kappaMax, LcMin, LcMax } = grid;
    // Surface height is the PRODUCTIVE snap energy E_snap·η in millijoules:
    // the energy a snap releases, times the share of its arc that pushes
    // along the net direction (see snapEfficiency). A big snap whose tip
    // hooks back on itself no longer outranks a smaller, straight one.
    // E_snap itself is the true energy in mJ, not the nondimensional ΔE --
    // E_snap = ΔE·(k_t/L_c), and k_t/L_c varies ~2.75x over the L_c axis.
    const zr = { zLo, zHi };                         // mJ

    /* ── 4D surface: z = E_snap·η, colour = Score ─────────────────────────
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

    // Rowing values jump from 0 to their largest right at snap onset; a
    // cubic interpolant overshoots at that cliff and drew a comb of spikes
    // along it. Height and colour use straight bilinear for rowing.
    const bilinear = (f, u, v) => {
      const i = Math.min(nx - 2, Math.floor(u)), j = Math.min(ny - 2, Math.floor(v)), fu = u - i, fv = v - j;
      return (1 - fu) * (1 - fv) * f(i, j) + fu * (1 - fv) * f(i + 1, j) + (1 - fu) * fv * f(i, j + 1) + fu * fv * f(i + 1, j + 1);
    };
    const smooth = rowObj ? bilinear : bicubic;
    const fE = (i, j) => cells[j * nx + i].prod_J * 1000;   // mJ
    const fScore = (i, j) => cells[j * nx + i].score;
    // Regime is categorical, so it is carried as a 0/1 field and hard-cut at
    // 0.5 after filtering. Blending it would smear "material failure" into
    // neighbouring survivable designs — the one thing this plot must not do.
    // Signed distance to each regime boundary, as CONTINUOUS scalars. The fill
    // and the contour lines are both zero crossings of these, which is what
    // makes them land on top of one another instead of a cell apart.
    // λ_eff: equals λ except in planar mode, where it is the snap test.
    const fLam = (i, j) => cells[j * nx + i].lamEff - LAMBDA_CRIT;   // >0 snaps
    const fEps = (i, j) => cells[j * nx + i].eeq - strainLimit;      // >0 fails
    const fLamField = (u, v) => bicubic(fLam, u, v);
    const fEpsField = (u, v) => bicubic(fEps, u, v);

    const pos = new Float32Array(rx * ry * 3), col = new Float32Array(rx * ry * 3);
    for (let b = 0; b < ry; b++)
      for (let a = 0; a < rx; a++) {
        const n = b * rx + a;
        const u = (a / (rx - 1)) * (nx - 1), v = (b / (ry - 1)) * (ny - 1);
        pos[n * 3] = -SURF + (2 * SURF * a) / (rx - 1);
        pos[n * 3 + 1] = zH(smooth(fE, u, v), zr);
        pos[n * 3 + 2] = -SURF + (2 * SURF * b) / (ry - 1);
        let rgb;
        if (fEpsField(u, v) > 0) rgb = [0.13, 0.11, 0.11];          // past ε_allow
        else if (fLamField(u, v) <= 0) rgb = [0.055, 0.075, 0.13];  // below the fold
        else rgb = colormap(maxScore > 0 ? smooth(fScore, u, v) / maxScore : 0);
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
    const dY = (i, j) => zH(cells[j * nx + i].prod_J * 1000, zr) + 0.3;
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
    const yAt = (u, v) => zH(smooth(fE, u, v), zr) + CONTOUR_LIFT;
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
    const xOf = (kappa) => -SURF + (2 * SURF * (kappa - kappaMin)) / (kappaMax - kappaMin);
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
    // Ticks at a 1-2-5 step, since the bounds are now arbitrary.
    const niceStep = (span) => {
      const raw = span / 5, p10 = 10 ** Math.floor(Math.log10(raw));
      return [1, 2, 5, 10].map((m) => m * p10).find((st) => st >= raw);
    };
    const kStep = niceStep(kappaMax - kappaMin);
    for (let k = Math.ceil(kappaMin / kStep - 1e-9) * kStep; k <= kappaMax + 1e-9; k += kStep) {
      at(label(k.toFixed(kStep < 1 ? 1 : 0), 30, TICK), xOf(k), 1, -OUT);
    }
    at(label('κ  precurvature  (m⁻¹)', 34, TITLE), 0, 1, -OUT - 12);

    // z → overlap length L_c
    const lcTicks = 4;
    for (let i = 0; i <= lcTicks; i++) {
      const v = (LcMin + ((LcMax - LcMin) * i) / lcTicks) * 1000;
      at(label(v.toFixed(0), 30, TICK), -OUT, 1, zOf(v / 1000));
    }
    at(label('L_c  overlap  (mm)', 34, TITLE), -OUT - 14, 1, 0);

    // y → productive snap energy E_snap·η, mJ.
    const eTicks = 4;
    for (let i = 0; i <= eTicks; i++) {
      const v = zr.zLo + ((zr.zHi - zr.zLo) * i) / eTicks;
      at(label(v.toFixed(zr.zHi - zr.zLo < 20 ? 1 : 0), 30, TICK), -OUT + 6, 1 + (HEIGHT * i) / eTicks, -SURF);
    }
    at(label(rowObj ? 'J_row  (m³/s²)' : torsionObj ? 'E_snap·η_T  (mJ)' : 'E_snap·η_prop  (mJ)', 34, TITLE), -OUT + 4, HEIGHT + 20, -SURF);

    if (grid.best) {
      const bi = cells.indexOf(grid.best);
      const i = bi % nx, j = Math.floor(bi / nx);
      const x = -SURF + (2 * SURF * i) / (nx - 1);
      const z = -SURF + (2 * SURF * j) / (ny - 1);
      const y = zH(grid.best.prod_J * 1000, zr);
      T.markBest.position.set(x, y + 4, z); T.markBest.visible = true;
      T.stem.geometry.dispose();
      T.stem.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, z), new THREE.Vector3(x, y + 4, z)]);
    } else T.markBest.visible = false;
    // themeTick: the surface's vertex colours, the contour tubes and every
    // axis label are built from the palette here, so a theme change has to
    // rerun this the same way a new grid does.
  }, [grid, strainLimit, themeTick, zLo, zHi, torsionObj, rowObj]);

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
      pinnedK: best && Math.abs(best.kappa - grid.kappaMax) < (grid.kappaMax - grid.kappaMin) / GRID_N,
    };
  }, [grid, best]);

  const recommend = (c) => {
    if (!c || c.dE <= 0) return { text: 'Under-powered', color: C.dim };
    if (c.regime === 'failure') return { text: 'MATERIAL FAILURE WARNING', color: C.red };
    if (grid.maxScore > 0 && c.score > 0.75 * grid.maxScore) return { text: 'Optimal', color: C.cyan };
    if (grid.maxScore > 0 && c.score > 0.3 * grid.maxScore) return { text: 'Workable', color: C.gold };
    return { text: 'Under-powered', color: C.dim };
  };
  // toExponential, not toPrecision + a literal "e6": past 1e9 toPrecision
  // itself switches to exponent form and produced strings like "4.86e+4e6".
  const fmtN = (n) => (!isFinite(n) ? '∞' : n >= 1e6 ? n.toExponential(2) : n.toPrecision(3));
  const lifeCat = (n) => (n > 1e5 ? { t: 'High-cycle', c: C.green } : n > 1e3 ? { t: 'Low-cycle', c: C.gold } : { t: 'Immediate yielding', c: C.red });

  return (
    <div className="ctr-body">
      <div className="ctr-view" ref={mountRef}>
        <div className="ctr-overlay" style={{ top: 12, left: 12 }}>
          {/* The colour channel's formula, on the plot it colours. */}
          <div className="ctr-scorecard" style={{ marginTop: 0 }} onClick={(e) => { e.stopPropagation(); openCite('score', 'Score colour', e); }}
            title="Where does this come from?">
            <div className="cap-label" style={{ marginBottom: 2 }}>Colour · Score</div>
            <div dangerouslySetInnerHTML={{ __html: SCORE_TEX[objective] }} />
            <div style={{ marginTop: 2 }} dangerouslySetInnerHTML={{ __html: HYDRO_TEX[objective] }} />
            <div className="mono t9 dim" style={{ marginTop: 4 }}>
              k_η = {etaK} · <M>{'ε_allow'}</M> = {strainPct.toFixed(2)}% · colour = Score / max
            </div>
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
        {rowBusy && (
          <div className="ctr-overlay mono" style={{ top: 12, left: '50%', transform: 'translateX(-50%)', color: C.gold }}>
            solving the physics for J_row: {Math.round(rowGrid)}×{Math.round(rowGrid)} designs × {Math.round(rowCycles)} cycles, {MEDIA[phys.medium].name.toLowerCase()} · {(rowRes.prog * 100).toFixed(0)}% · {rowRes.secs.toFixed(0)} s
            {rowRes.data ? ' (showing the previous result)' : ''}
          </div>
        )}

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
                <Row k="Propulsion eff." v={`${(hover.etaP * 100).toFixed(0)} %`} c={torsionObj ? C.dim : C.gold} />
                <Row k="Torsional eff." v={`${(hover.etaT * 100).toFixed(0)} %`} c={torsionObj ? C.gold : C.dim} />
                {rowObj
                  ? <Row k="Rowing J" v={`${hover.rowJ.toPrecision(3)} m³/s²`} c={C.gold} />
                  : <Row k="Productive" v={`${(hover.prod_J * 1000).toFixed(2)} mJ`} c={C.gold} />}
                <Row k="λ [–]" v={hover.lambda.toFixed(2)} c={hover.lamEff > LAMBDA_CRIT ? C.gold : C.dim} />
                {mech.planar && <Row k="λ_eff [–]" v={hover.lamEff.toFixed(2)} c={hover.lamEff > LAMBDA_CRIT ? C.gold : C.dim} />}
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

      <SideBar title="Specification" open={side} onToggle={() => setSide((v) => !v)} scroll>

        <Panel title="The sweet spot" open={panels.sweet} onToggle={() => togglePanel('sweet')}
          icon={<Target size={14} color={C.cyan} />}>
          {best && best.dE > 0 ? (
            <>
              <div className="mono" style={{ color: C.cyan, fontSize: 14, lineHeight: 1.6 }}>
                <Cx id="sweet">κ = {best.kappa.toFixed(2)} m⁻¹</Cx><br />
                <Cx id="sweet">L_c = {(best.Lc * 1000).toFixed(0)} mm</Cx>
              </div>
              <p className="ctr-p">
                Releases <Cx id="scale">{(best.dE_J * 1000).toFixed(1)} mJ</Cx> per snap,{' '}
                {rowObj
                  ? <>with a rowing integral of <Cx id="rowing">{best.rowJ.toPrecision(3)} m³/s²</Cx> per cycle
                    (± {best.rowSd.toPrecision(2)} sd across {Math.round(rowCycles)} cycles, {MEDIA[phys.medium].name.toLowerCase()} physics; {best.rowAbs > 0 ? ((100 * Math.abs(best.rowJ)) / best.rowAbs).toFixed(0) : 0}% net, {best.rowJ >= 0 ? 'forward' : 'backward'} stroke), at{' '}</>
                  : <>{torsionObj
                    ? <><Cx id="etaT">{(best.etaT * 100).toFixed(0)}%</Cx> of it released as twist</>
                    : <><Cx id="eta">{(best.etaP * 100).toFixed(0)}%</Cx> of it pushing forward</>}
                  {' '}(<Cx id="prod">{(best.prod_J * 1000).toFixed(1)} mJ</Cx> productive), at{' '}</>}
                <Cx id="eeq">{(best.eeq * 100).toFixed(2)}%</Cx> equivalent strain, against a fatigue
                allowable of <Cx id="allow">{strainPct.toFixed(2)}%</Cx>. Predicted life{' '}
                <Cx id="life">{fmtN(best.N)}</Cx> cycles at λ = <Cx id="lambda">{best.lambda.toFixed(2)}</Cx>.
              </p>
              <button className="ctr-btn primary" onClick={() => applyDesign(best)}>
                <ArrowUpRight size={14} /> Adopt as current design
              </button>
            </>
          ) : rowBusy ? (
            <p className="ctr-p">Solving the rowing physics for the design grid… the sweet spot appears when it is done.</p>
          ) : (
            <p className="ctr-p">
              No design inside the graph axes crosses λ = π²/4, so nothing snaps. Raise the allowable
              strain or widen the κ and L_c bounds under Graph axes.
            </p>
          )}
          {best && best.dE > 0 && (analysis.pinnedLc || analysis.pinnedK) && (
            <div className="ctr-note">
              <strong>Boundary-limited optimum. </strong>
              {analysis.pinnedLc && 'Score still rises at the longest overlap, so L_c is set by your fin envelope, not by physics. '}
              {analysis.pinnedK && 'Curvature sits on the fatigue ceiling — the material, not the energetics, is binding.'}
            </div>
          )}
        </Panel>

        {/* ── The specification catalogue ───────────────────────────────────
            Current design first, because it is the thing the other tabs
            render. The sweep domain is deliberately a SEPARATE group further
            down: it bounds the search, it is not part of the robot. */}
        <Panel title="Current design" open={panels.design} onToggle={() => togglePanel('design')}
          icon={<Ruler size={14} color={C.blue} />}
          right={`λ ${designLambda.toFixed(2)}`}>
          <p className="ctr-p" style={{ fontSize: 11.5 }}>
            The geometry every other tab renders and evaluates
            {mech.outerLocked ? ', outer tube fully constrained' : mech.planar ? ', outer tube held planar' : ''}.
            λ = C·L_c²·κ₁κ₂
            {' = '}<Cx id="lambda"><b style={{ color: designLambda > LAMBDA_CRIT ? C.gold : C.dim }}>{designLambda.toFixed(2)}</b></Cx>
            {mech.planar && <> · λ_eff = <Cx id="planarCrit">{designLamE.toFixed(2)}</Cx></>}
            {designLamE > LAMBDA_CRIT ? ' — past the fold, so it snaps.' : ' — below π²/4, so it cannot snap.'}
          </p>
          {/* Typed, not slid: any value can be entered, so no slider range
              (and no separate ceiling for it) constrains the design. */}
          <div className="ctr-fields">
            <FieldRow label="Outer precurvature" sym="κ₁" unit="m⁻¹" value={k1} min={0} max={1000}
              digits={2} step={0.1} onCommit={(v) => patchSim({ k1: v })} />
            <FieldRow label="Inner precurvature" sym="κ₂" unit="m⁻¹" value={k2} min={0} max={1000}
              digits={2} step={0.1} onCommit={(v) => patchSim({ k2: v })} />
            <FieldRow label="Overlap length" sym="L_c" unit="mm" value={LcMm} min={0.1} max={100000}
              digits={1} step={1} onCommit={(v) => patchSim({ LcMm: v })} />
            <FieldRow label="Fin extension" sym="L_ext" unit="mm" value={extMm} min={0} max={100000}
              digits={1} step={1} onCommit={(v) => patchSim({ extMm: v })} />
          </div>
          <div className="mono t10 dim" style={{ lineHeight: 1.6 }}>
            L_ext is the distal run past the sheath, where the fin carries its own
            κ₂ at full magnitude. It changes the shape and the swept track, but
            not λ — only the overlap stores the torsion that folds.
          </div>
        </Panel>

        <Panel title="Tubes & constraint" open={panels.tubes} onToggle={() => togglePanel('tubes')}
          icon={<Boxes size={14} color={C.blue} />}
          right={outerMode === 'rigid' ? 'outer locked' : outerMode === 'planar' ? 'outer planar' : 'outer free'}>
          {(() => {
            // Three linked fields per tube; any one can be edited and the
            // other two follow. Wall = (OD − ID)/2. Editing OD holds the wall.
            const row = (which, label) => {
              const t = tubes[which], wall = (t.od - t.id) / 2;
              return (
                <React.Fragment key={which}>
                  <span className="t">{label}</span>
                  <NumField value={t.od} min={0.1} max={10} title="outer diameter, mm"
                    onCommit={(od) => patchTube(which, { od, id: Math.max(0, od - 2 * wall) })} />
                  <NumField value={t.id} min={0} max={t.od - 0.005} title="inner diameter, mm"
                    onCommit={(id) => patchTube(which, { id })} />
                  <NumField value={wall} min={0.005} max={t.od / 2} step={0.005} title="wall thickness, mm"
                    onCommit={(w) => patchTube(which, { id: Math.max(0, t.od - 2 * w) })} />
                </React.Fragment>
              );
            };
            const lamFree = mech.Cfree * (LcMm / 1000) ** 2 * k1 * k2;
            const lamLock = mech.Clocked * (LcMm / 1000) ** 2 * k1 * k2;
            // Planar keeps the free λ; its snap test is λ_eff.
            const lamPlan = lamEff(lamFree, mech.CmuPlanar * (LcMm / 1000) ** 2 * k2 * k2);
            const verdict = (lam, act, name, cid) => (
              <div className={act ? 'act' : ''}>
                <div className="cap-label">{name}</div>
                <div className="mono t13" style={{ color: lam > LAMBDA_CRIT ? C.gold : C.dim }}>
                  <Cx id={cid}>λ = {lam.toFixed(2)}</Cx>
                </div>
                <div className="t11" style={{ color: lam > LAMBDA_CRIT ? C.gold : C.dim }}>
                  {lam > LAMBDA_CRIT ? 'snaps' : 'no snap — below π²/4'}
                </div>
              </div>
            );
            return (
              <>
                <div className="ctr-sect">
                  <span />
                  <span className="h">OD mm</span><span className="h">ID mm</span><span className="h">wall mm</span>
                  {row('outer', 'Outer · κ₁')}
                  {row('inner', 'Inner fin · κ₂')}
                </div>
                <div className="mono t10" style={{ color: mech.clearance > 0 ? C.dim : C.unstable, lineHeight: 1.6 }}>
                  Radial fit: outer ID − inner OD = <Cx id="fit">{mech.clearance.toFixed(3)} mm</Cx>
                  {mech.clearance > 0 ? '' : ' — the inner tube does not fit inside the outer one.'}
                </div>
                <div className="mono t10 dim" style={{ lineHeight: 1.6 }}>
                  k_b <Cx id="stiff">{(mech.t1.kb * 1e3).toFixed(3)} / {(mech.t2.kb * 1e3).toFixed(3)}</Cx> mN·m² ·
                  k_t <Cx id="stiff">{(mech.t1.kt * 1e3).toFixed(3)} / {(mech.t2.kt * 1e3).toFixed(3)}</Cx> mN·m² (outer / inner)
                </div>
                <button className="ctr-link" onClick={() => setTubes(DEFAULT_TUBES)}>
                  Reset to the original pair (1.02 / 0.82 mm, both)
                </button>

                <div className="cap-label" style={{ marginTop: 4 }}>Outer tube constraint</div>
                <div className="ctr-seg">
                  <button className={outerMode === 'clamped' ? 'on' : ''} onClick={() => setOuterMode('clamped')}>
                    Clamped at base
                  </button>
                  <button className={outerMode === 'planar' ? 'on' : ''} onClick={() => setOuterMode('planar')}>
                    Planar
                  </button>
                  <button className={outerMode === 'rigid' ? 'on' : ''} onClick={() => setOuterMode('rigid')}>
                    Fully constrained
                  </button>
                </div>
                <p className="ctr-p" style={{ fontSize: 11.5 }}>
                  Clamped at base: the outer tube can twist and bend along its length, so the
                  overlap's shape changes as the fin turns. Fully constrained: the outer tube
                  is rigid — it holds its own precurved arc, the fin conforms to it, and only
                  the fin beyond the sheath moves. Planar: a guide keeps the outer tube in its
                  own plane — it still bends within that plane and twists about its axis, but
                  cannot curve out of it, so the fin is pulled toward the plane and the snap
                  test becomes λ_eff.
                </p>
                <div className="ctr-verdict" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                  {verdict(lamFree, outerMode === 'clamped', 'clamped', 'lambda')}
                  {verdict(lamPlan, outerMode === 'planar', 'planar · λ_eff', 'planarCrit')}
                  {verdict(lamLock, outerMode === 'rigid', 'fully constr.', 'rigid')}
                </div>
                <p className="ctr-p" style={{ fontSize: 11.5 }}>
                  Same λ in clamped and fully constrained modes, for any diameters: with both
                  tubes Nitinol, k_b/k_t = 1+ν for every circular section, so
                  λ = (1+ν)·L_c²·κ₁κ₂ whether the sheath is compliant or rigid. A rigid sheath
                  stops the fin sharing its twist (less compliance) but also stops it bending
                  the sheath (stronger coupling), and the two cancel. Whether it snaps is
                  unchanged; the shape, strain and energy per snap are not.
                </p>
                <p className="ctr-p" style={{ fontSize: 11.5 }}>
                  Planar keeps that λ but adds ½μ sin²θ to the energy, μ = <Cx id="planarV">{(mech.CmuPlanar * (LcMm / 1000) ** 2 * k2 * k2).toFixed(2)}</Cx>:
                  the guide's cost of holding the fin's out-of-plane curvature flat. It
                  steadies the antialigned state and moves the fold, so snapping is judged
                  by λ_eff = −min(λ cos θ + μ cos 2θ) against π²/4.
                </p>
              </>
            );
          })()}
        </Panel>

        {/* ── Graph axes ─────────────────────────────────────────────────
            The box the surface spans and the optimiser searches: bounds of
            the plot, not properties of the robot. All typed. */}
        <Panel title="Graph axes" open={panels.axes} onToggle={() => togglePanel('axes')}
          icon={<Sliders size={14} color={C.dim} />} right={`${GRID_N}×${GRID_N}`}>
          <div className="cap-label">Optimise for</div>
          <div className="ctr-seg" style={{ marginBottom: 8 }}>
            <button className={objective === 'translation' ? 'on' : ''} onClick={() => setObjective('translation')}
              title="η_prop = (F − B)/E: the tip's net push along the snap direction">
              Translation · η_prop
            </button>
            <button className={torsionObj ? 'on' : ''} onClick={() => setObjective('torsion')}
              title="η_T = ΔE_twist / ΔE: the share of the snap released as twist, for a torsional-spring reservoir driving a separate propulsor">
              Torsion · η_T
            </button>
            <button className={rowObj ? 'on' : ''} onClick={() => setObjective('rowing')}
              title="J_row = ∮(r̂·v)² dx_fwd over one revolution, after F_D = ½ρC_D A v² with ρ, C_D, A left out (they do not depend on κ or L_c). Score uses |J_row|.">
              Rowing · J_row
            </button>
          </div>
          {rowObj && (
            <>
              <div className="ctr-axes" style={{ marginBottom: 4 }}>
                <span className="t">cycles</span>
                <NumField value={rowCycles} min={1} max={20} digits={0} step={1}
                  title="physics cycles averaged per design (after the wind-up)" onCommit={(v) => patchDomain({ rowCycles: v })} />
                <span className="t">grid</span>
                <NumField value={rowGrid} min={4} max={30} digits={0} step={2}
                  title="designs per axis solved with the physics, interpolated onto the plot" onCommit={(v) => patchDomain({ rowGrid: v })} />
              </div>
              <div className="mono dim t9" style={{ marginBottom: 8 }}>
                J_row comes from the time-domain physics ({MEDIA[phys.medium].name.toLowerCase()}, {phys.rpm} rpm) on a coarse
                grid with a coarser mesh (4/2 nodes, ±10% in J): roughly 2–4 s per design-cycle in water, ×3 in air,
                spread over your CPU cores.
              </div>
            </>
          )}
          <div className="ctr-axes">
            <span /><span className="h">min</span><span className="h">max</span><span />
            <span className="t">x · κ</span>
            <NumField value={kMin} min={0} max={Math.max(0, kMax - 0.1)} digits={1} step={0.5}
              title="κ axis minimum, m⁻¹" onCommit={(v) => patchDomain({ kMin: v })} />
            <NumField value={kMax} min={kMin + 0.1} max={1000} digits={1} step={0.5}
              title="κ axis maximum, m⁻¹" onCommit={(v) => patchDomain({ kMax: v })} />
            <span className="u">m⁻¹</span>
            <span className="t">y · <M>{'L_c'}</M></span>
            <NumField value={LcMinMm} min={0.1} max={Math.max(0.1, LcMaxMm - 0.1)} digits={1} step={5}
              title="overlap axis minimum, mm" onCommit={(v) => patchDomain({ LcMinMm: v })} />
            <NumField value={LcMaxMm} min={LcMinMm + 0.1} max={100000} digits={1} step={5}
              title="overlap axis maximum, mm" onCommit={(v) => patchDomain({ LcMaxMm: v })} />
            <span className="u">mm</span>
            <span className="t">z · {rowObj ? <M>{'J_row'}</M> : <><M>{'E_snap'}</M>·{torsionObj ? <M>{'η_T'}</M> : 'η'}</>}</span>
            <NumField value={zLo} min={0} max={Math.max(0, zHi - 0.001)} digits={1} step={10}
              title={`height axis minimum, ${rowObj ? 'm³/s²' : 'mJ'}`} onCommit={(v) => patchDomain({ zAuto: false, zMin: v, zMax: zHi })} />
            <NumField value={zHi} min={zLo + 0.001} max={1e7} digits={1} step={10}
              title={`height axis maximum, ${rowObj ? 'm³/s²' : 'mJ'}`} onCommit={(v) => patchDomain({ zAuto: false, zMin: zLo, zMax: v })} />
            <span className="u">{rowObj ? 'm³/s²' : 'mJ'}</span>
          </div>
          <label className="ctr-check">
            <input type="checkbox" checked={zAuto}
              onChange={(e) => patchDomain({ zAuto: e.target.checked, zMin: zLo, zMax: zHi })} />
            <span>Auto z range: 0 to the tallest design. Typing a z bound turns this off.</span>
          </label>
          <label className="ctr-check">
            <input type="checkbox" checked={clip} onChange={(e) => setClip(e.target.checked)} />
            <span>
              Clip the κ axis at the fatigue ceiling{' '}
              <span className="mono dim">(κ ≤ 2ε/d₀ = <Cx id="kceil">{kappaCeiling.toFixed(1)} m⁻¹</Cx>)</span>
              {clip && kappaCeiling < kMax ? ', which is below your κ max.' : '.'}
            </span>
          </label>
        </Panel>

        <Panel title="Physics" open={panels.physics} onToggle={() => togglePanel('physics')}
          icon={<Waves size={14} color={C.blue} />} right={MEDIA[phys.medium].name.toLowerCase()}>
          <div className="ctr-seg" style={{ marginBottom: 8 }}>
            <button className={phys.medium === 'water' ? 'on' : ''} onClick={() => patchPhys({ medium: 'water' })}>Water</button>
            <button className={phys.medium === 'air' ? 'on' : ''} onClick={() => patchPhys({ medium: 'air' })}>Air</button>
          </div>
          <FieldRow label="Motor speed" sym="Ω" unit="rpm" value={phys.rpm} min={0.5} max={600} digits={1} step={0.5}
            onCommit={(v) => patchPhys({ rpm: v })} />
          <FieldRow label="Material loss factor" sym="η" unit="–" value={phys.loss} min={0} max={0.5} digits={3} step={0.005}
            onCommit={(v) => patchPhys({ loss: v })} />
          <FieldRow label="Cycles for the 3-D sim" sym="N" unit="cyc" value={phys.cycles} min={1} max={50} digits={0} step={1}
            onCommit={(v) => patchPhys({ cycles: v })} />
          <p className="ctr-p" style={{ fontSize: 11.5 }}>
            Time-domain dynamics: bending with the tubes' real mass (Nitinol 6450 kg/m³), the
            fluid's added mass and drag, the twist following quasi-statically and jumping when its
            basin vanishes. Status: {physSol.status === 'ready'
              ? <>solved {physSol.data.cycles} cycles in {physSol.elapsed?.toFixed(0)} s; first bending mode {physSol.data.omega1.toFixed(0)} rad/s</>
              : physSol.status === 'solving' ? `solving the current design, ${(physSol.progress * 100).toFixed(0)}%` : physSol.status === 'none' ? 'the current design does not snap' : physSol.status}.
            <Cx id="dynEOM"> Equations</Cx>.
          </p>
        </Panel>

        <Panel title="Fatigue & scoring" open={panels.scoring} onToggle={() => togglePanel('scoring')}
          icon={<ShieldAlert size={14} color={C.dim} />}>
          <Slider label="Target cycle life" symbol="N" value={logLife} min={6} max={12} step={0.1}
            unit="" digits={1} accent={C.red} onChange={setLogLife} />
          <div className="mono t10 dim" style={{ marginTop: -4 }}>
            10^{logLife.toFixed(1)} cycles → ε_allow = (10/N)^(1/5) = <Cx id="allow">{strainPct.toFixed(2)} %</Cx>.
            Inverted Coffin-Manson, not the {(EPS_SUPERELASTIC * 100).toFixed(0)}% monotonic
            superelastic limit — that one is a one-time strain, not a per-cycle gate.
          </div>
          <Slider label="Hydro saturation" symbol="k_η" value={etaK} min={0.005} max={0.5} step={0.005}
            unit="" digits={3} accent={C.blue} onChange={setEtaK} />
          <div className="mono t10 dim" style={{ marginTop: -4, lineHeight: 1.6 }}>
            <Cx id="hydro"><M>{'η_hydro = 1 − exp(−k_η · ΔE)'}</M></Cx>. Engineering placeholder — no
            physical derivation, and not a value taken from the burst-and-coast
            literature. RAISING it saturates η toward 1 for every snap, so the
            score stops rewarding size and collapses onto pure round-trip
            efficiency (λ → 3.65). LOWERING it leaves η ≈ k_η·ΔE, so the score
            scales as ΔE²/W_in and chases larger, less efficient snaps.
          </div>
          <div className="mono t10 dim">
            λ/(L²κ₁κ₂) = <Cx id="lambda">{mech.C.toFixed(3)}</Cx> · energy scale{' '}
            <Cx id="scale">{(mech.kScale * 1e3).toFixed(3)} mN·m²</Cx>
          </div>
        </Panel>

        <Panel title="Big snaps vs small snaps" open={panels.tradeoff}
          onToggle={() => togglePanel('tradeoff')}
          icon={<Waves size={14} color={C.gold} />}>
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
              The largest survivable snap in this domain is <Cx id="scale">{(analysis.biggest.dE_J * 1000).toFixed(1)} mJ</Cx>
              at κ = {analysis.biggest.kappa.toFixed(1)} m⁻¹, scoring{' '}
              {grid.maxScore > 0 ? (analysis.biggest.score / grid.maxScore).toFixed(2) : '0'} against the
              optimum: motor work per revolution rises faster than usable energy, and the hydrodynamic
              term (1 − e^−k_η·ΔE) has already saturated. Past saturation, extra snap energy buys strain,
              not thrust.
            </p>
          )}
        </Panel>

        <Panel title="Safety check" open={panels.safety} onToggle={() => togglePanel('safety')}
          icon={<ShieldAlert size={14} color={C.dim} />}
          right={hover ? 'hovered' : 'optimum'}>
          {focus && (
            <>
              <ZoneGauge label="Peak bending strain" value={focus.eb * 100} cite="eb"
                display={`${(focus.eb * 100).toFixed(2)} %`} max={Math.max(2, strainPct * 2)}
                bands={[
                  { upto: strainPct, color: C.green, name: `Within fatigue allowable (${strainPct.toFixed(2)}%)` },
                  { upto: EPS_SUPERELASTIC * 100, color: C.gold, name: 'Past fatigue allowable, still superelastic' },
                  { upto: 99, color: C.red, name: 'Beyond superelastic limit' },
                ]} />
              <ZoneGauge label="Equivalent strain (bend + torsion)" value={focus.eeq * 100} cite="eeq"
                display={`${(focus.eeq * 100).toFixed(2)} %`} max={Math.max(2, strainPct * 2)}
                bands={[
                  { upto: strainPct, color: C.green, name: `Within ε_allow (${strainPct.toFixed(2)}%)` },
                  { upto: EPS_SUPERELASTIC * 100, color: C.gold, name: 'Over fatigue allowable' },
                  { upto: 99, color: C.red, name: 'Beyond superelastic limit' },
                ]} />
              <ZoneGauge label="Torsional energy stored" value={focus.stored_J * 1000} cite="stored"
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
                  {lifeCat(focus.N).t} · <Cx id="life">{fmtN(focus.N)}</Cx>
                </span>
              </div>
            </>
          )}
        </Panel>
      </SideBar>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   8b · CITATION POPOVER
   What a click on a calculated number opens: the formula, its provenance
   and its sources, with the way through to the full entry.
   ═══════════════════════════════════════════════════════════════ */
const KIND_CSS = {
  adopted: 'var(--signal-good)', derived: 'var(--riverside-blue-500)', assumed: 'var(--signal-watch)',
};

/* ═══════════════════════════════════════════════════════════════
   LOGS · tip translation and roll over one cycle, from the physics
   ═══════════════════════════════════════════════════════════════
   The time-domain solution of src/physics.js: started from rest, the
   wind-up to the first snap discarded, then N cycles of one motor turn
   each, every cycle starting 20° of motor turn before the fold (so it
   holds exactly one snap). Velocities are the solver's own (exact tip
   velocity J·q̇), not differences of positions. Cycles line up exactly in
   time (the motor is prescribed), so they are averaged sample by sample. */

/** Roll angle of unit vector d about tip tangent t, from FORWARD (+x). */
function rollAngle(d, t) {
  const f = [1 - t[0] * t[0], -t[0] * t[1], -t[0] * t[2]];
  const fn = Math.hypot(...f);
  if (fn < 1e-6) return null;
  f[0] /= fn; f[1] /= fn; f[2] /= fn;
  const cr = [f[1] * d[2] - f[2] * d[1], f[2] * d[0] - f[0] * d[2], f[0] * d[1] - f[1] * d[0]];
  return (Math.atan2(cr[0] * t[0] + cr[1] * t[1] + cr[2] * t[2], f[0] * d[0] + f[1] * d[1] + f[2] * d[2]) * 180) / Math.PI;
}

/** Log tables from a physics result (worker 'cycles' with tip data). */
function buildLogsFromPhysics(R) {
  const { K, dt, Omega } = R, n = R.raw.length;
  const raw = R.raw.map((c, ci) => {
    const rows = [];
    for (let k = 0; k <= K; k++) {
      const v3 = (A) => [A[3 * k], A[3 * k + 1], A[3 * k + 2]];
      const p = v3(c.tip).map((x) => x * 1000), v = v3(c.tipV).map((x) => x * 1000), rdir = v3(c.roll), t = v3(c.tipT);
      const rn = Math.hypot(...rdir) || 1;
      rows.push({ a: R.alpha0 + Omega * (k * dt) + 2 * Math.PI * ci, th: c.th[k], p, v, rdir: rdir.map((x) => x / rn), roll: rollAngle(rdir.map((x) => x / rn), t) });
    }
    return rows;
  });
  const avg = [];
  for (let k = 0; k < K; k++) {
    const m = { p: [0, 0, 0], d: [0, 0, 0], v: [0, 0, 0], rd: [0, 0, 0], spd: 0, spd2: 0, rs: 0, rc: 0, snap: 0, nr: 0 };
    for (let c = 0; c < n; c++) {
      const s0 = raw[c][k], s1 = raw[c][k + 1];
      for (let i = 0; i < 3; i++) { m.p[i] += s0.p[i]; m.d[i] += s1.p[i] - s0.p[i]; m.v[i] += s0.v[i]; m.rd[i] += s0.rdir[i]; }
      const sp = Math.hypot(...s0.v);
      m.spd += sp; m.spd2 += sp * sp;
      if (s0.roll !== null) { m.rs += Math.sin((s0.roll * Math.PI) / 180); m.rc += Math.cos((s0.roll * Math.PI) / 180); m.nr++; }
      if (Math.abs(s1.th - s0.th) / dt > SNAP_THRESHOLD) m.snap++;
    }
    const sp = m.spd / n, Rr = m.nr ? Math.hypot(m.rs, m.rc) / m.nr : 0, rn = Math.hypot(...m.rd) || 1;
    avg.push({
      t: k * dt, alpha: (Omega * k * dt * 180) / Math.PI,
      p: m.p.map((x) => x / n), d: m.d.map((x) => x / n), v: m.v.map((x) => x / n),
      spd: sp, spdSd: Math.sqrt(Math.max(0, m.spd2 / n - sp * sp)),
      roll: m.nr ? (Math.atan2(m.rs, m.rc) * 180) / Math.PI : null,
      rollSd: m.nr && Rr > 0 ? (Math.sqrt(-2 * Math.log(Math.min(1, Rr))) * 180) / Math.PI : null,
      rdir: m.rd.map((x) => x / rn), snap: m.snap / n,
    });
  }
  const mean = (f) => R.per.reduce((a, c) => a + f(c), 0) / R.per.length;
  return { K, dt, cycles: n, avg, raw, Tc: R.Tc, Omega, per: R.per, J: R.J,
    E: { motor: mean((c) => c.Wmotor), drag: mean((c) => c.Wdrag), mat: mean((c) => c.Wmat), jump: mean((c) => c.Wjump),
      resid: Math.max(...R.per.map((c) => Math.abs(c.resid ?? 0))) },
    lead: CYCLE_LEAD_DEG, omega1: R.omega1, ms: R.ms };
}
const CYCLE_LEAD_DEG = 20;

const f4 = (x) => (x === null || !Number.isFinite(x) ? '' : x.toFixed(4));
function logsAveragedCsv(L, head) {
  const cols = ['t_s', 'alpha_since_cycle_start_deg',
    'tip_forward_mm', 'tip_up_mm', 'tip_outward_mm',
    'dtrans_forward_mm', 'dtrans_up_mm', 'dtrans_outward_mm',
    'vel_forward_mm_s', 'vel_up_mm_s', 'vel_outward_mm_s',
    'speed_mean_mm_s', 'speed_sd_mm_s',
    'roll_mean_deg', 'roll_circ_sd_deg', 'roll_dir_forward', 'roll_dir_up', 'roll_dir_outward',
    'snap_fraction'];
  const lines = L.avg.map((r) => [r.t, r.alpha, ...r.p, ...r.d, ...r.v, r.spd, r.spdSd,
    r.roll, r.rollSd, ...r.rdir, r.snap].map(f4).join(','));
  return head + cols.join(',') + '\n' + lines.join('\n') + '\n';
}
function logsRawCsv(L, head) {
  const cols = ['cycle', 't_s', 'alpha_since_cycle_start_deg', 'alpha_motor_deg', 'theta_tip_rad',
    'tip_forward_mm', 'tip_up_mm', 'tip_outward_mm',
    'dtrans_forward_mm', 'dtrans_up_mm', 'dtrans_outward_mm',
    'vel_forward_mm_s', 'vel_up_mm_s', 'vel_outward_mm_s',
    'roll_deg', 'roll_dir_forward', 'roll_dir_up', 'roll_dir_outward'];
  const out = [];
  L.raw.forEach((rows, c) => {
    for (let k = 0; k < L.K; k++) {
      const s0 = rows[k], s1 = rows[k + 1];
      out.push([c + 1, k * L.dt, (L.Omega * k * L.dt * 180) / Math.PI,
        (((s0.a * 180) / Math.PI) % 360 + 360) % 360, s0.th, ...s0.p,
        ...[0, 1, 2].map((i) => s1.p[i] - s0.p[i]), ...s0.v, s0.roll, ...s0.rdir]
        .map((x, i) => (i === 0 ? String(x) : f4(x))).join(','));
    }
  });
  return head + cols.join(',') + '\n' + out.join('\n') + '\n';
}
function saveText(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Mean line with a ±sd band, over one cycle. */
function LogPlot({ rows, get, sd, label, unit, color, wrap }) {
  const Wd = 640, H = 150, P = 34;
  const ys = rows.map(get).filter((v) => v !== null);
  if (!ys.length) return null;
  let lo = wrap ? -180 : Math.min(0, ...rows.map((r) => (get(r) ?? 0) - (sd?.(r) ?? 0)));
  let hi = wrap ? 180 : Math.max(...rows.map((r) => (get(r) ?? 0) + (sd?.(r) ?? 0)), 1e-9);
  const X = (i) => P + ((Wd - P - 8) * i) / Math.max(1, rows.length - 1);
  const Y = (v) => 8 + (H - 24) * (1 - (v - lo) / (hi - lo));
  const segs = []; let cur = [];
  rows.forEach((r, i) => {
    const v = get(r);
    if (v === null) { if (cur.length) segs.push(cur); cur = []; return; }
    if (wrap && cur.length && Math.abs(v - get(rows[i - 1])) > 180) { segs.push(cur); cur = []; }
    cur.push(`${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
  });
  if (cur.length) segs.push(cur);
  const band = sd && !wrap ? rows.map((r, i) => `${X(i)},${Y(get(r) + sd(r))}`).join(' ') + ' '
    + rows.map((r, i) => `${X(i)},${Y(Math.max(lo, get(r) - sd(r)))}`).reverse().join(' ') : null;
  return (
    <div className="ctr-logplot">
      <div className="cap-label">{label} <span className="dim">({unit})</span></div>
      <svg viewBox={`0 0 ${Wd} ${H}`} width="100%" preserveAspectRatio="none" style={{ height: H }}>
        <line x1={P} x2={Wd - 8} y1={Y(wrap ? 0 : lo)} y2={Y(wrap ? 0 : lo)} stroke={C.line} />
        {band && <polygon points={band} fill={color} opacity="0.15" />}
        {segs.map((sg, i) => <polyline key={i} points={sg.join(' ')} fill="none" stroke={color} strokeWidth="1.6" />)}
        <text x={2} y={Y(hi) + 4} fontSize="10" fill={C.dim}>{hi.toFixed(0)}</text>
        <text x={2} y={Y(lo)} fontSize="10" fill={C.dim}>{lo.toFixed(0)}</text>
        <text x={P} y={H - 2} fontSize="10" fill={C.dim}>cycle start (fold − 20°)</text>
        <text x={Wd - 8} y={H - 2} fontSize="10" fill={C.dim} textAnchor="end">+{rows.length ? rows[rows.length - 1].alpha.toFixed(0) : 0}° of motor turn</text>
      </svg>
    </div>
  );
}

function LogsPage() {
  const { sim, mech, tubes, outerLocked, outerPlanar, phys } = useDesign();
  const { LcMm, extMm, k1, k2 } = sim;
  const [cfg, setCfg] = useState({ dtMs: 5, cycles: 10 });
  const patch = (p) => setCfg((c) => ({ ...c, ...p }));
  const [busy, setBusy] = useState(null);
  const [L, setL] = useState(null);
  const [err, setErr] = useState(null);
  const jobRef = useRef(null);
  useEffect(() => () => jobRef.current?.cancel(), []);
  const lambda = bifurcation(k1, k2, LcMm / 1000, mech);
  const lamE = lamEff(lambda, muOf(mech, LcMm / 1000, k2));
  const mode = mech.outerLocked ? 'fully constrained' : mech.planar ? 'planar' : 'clamped';
  const Omega = (phys.rpm * 2 * Math.PI) / 60, period = (2 * Math.PI) / Omega;
  const designKey = JSON.stringify([k1, k2, LcMm, extMm, mode, tubes, phys]);
  const stale = L && L.key !== designKey;

  const run = async () => {
    setBusy(0); setErr(null);
    const t0 = performance.now();
    const job = solveCycles({ design: designMsg(sim, tubes, outerLocked, outerPlanar), phys,
      cycles: Math.max(1, Math.round(cfg.cycles)), dtOut: cfg.dtMs / 1000, tip: true }, (f) => setBusy(f));
    jobRef.current = job;
    try {
      const res = await job.promise;
      if (res.none) setL({ none: true, reason: res.reason, key: designKey, cfg: { ...cfg } });
      else setL({ ...buildLogsFromPhysics(res), lambda, key: designKey, cfg: { ...cfg }, phys: { ...phys },
        secs: (performance.now() - t0) / 1000 });
    } catch (e) { setErr(e.message); }
    setBusy(null);
  };
  const header = (Lg) => [
    `# CTR fin tip log · ${new Date().toISOString()}`,
    `# design: k1 ${k1} 1/m, k2 ${k2} 1/m, Lc ${LcMm} mm, Lext ${extMm} mm, outer ${mode}, lambda ${Lg.lambda.toFixed(4)}`,
    `# physics: time-domain Lagrangian model (src/physics.js), ${MEDIA[Lg.phys.medium].name.toLowerCase()}, motor ${Lg.phys.rpm} rpm, material loss factor ${Lg.phys.loss}, TR-BDF2 integration`,
    `# ${Lg.cycles} cycles of one motor turn each, from rest with the wind-up discarded; each cycle starts ${CYCLE_LEAD_DEG} deg of motor turn before the fold (one snap per cycle); timestep ${Lg.cfg.dtMs} ms (${Lg.K} samples/cycle)`,
    `# energy per cycle (mean, mJ): motor ${(Lg.E.motor * 1e3).toFixed(3)} = drag ${(Lg.E.drag * 1e3).toFixed(3)} + material ${(Lg.E.mat * 1e3).toFixed(3)} + twist-snap ${(Lg.E.jump * 1e3).toFixed(3)} (max balance residual ${Lg.E.resid.toExponential(1)})`,
    `# axes (robot body frame): forward, up, outward (= motor base axis); roll 0 deg = forward, right-handed about the tip axis`,
    `# vel = the solver's tip velocity; dtrans = tip displacement over the next timestep`,
    ''].join('\n');
  const fname = (kind) => `ctr-tip-${kind}-${L.phys.medium}-k${k2}-Lc${LcMm}-${L.cfg.dtMs}ms-${L.cycles}cyc.csv`;
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const mJ = (x) => `${(x * 1e3).toFixed(2)} mJ`;

  return (
    <div className="ctr-logs">
      <div className="ctr-logs-in">
        <h2><ScrollText size={16} color={C.accent} /> Tip logs</h2>
        <p className="ctr-p">
          Tip translation and roll over one cycle, for the current design, from the time-domain
          physics: the fin's bending with its real mass, the fluid's added mass and drag, and the
          motor turning at a set speed. The run starts from rest, the wind-up to the first snap is
          thrown away, and each later cycle (one motor turn, starting just before a snap) is logged
          and averaged. Medium, motor speed and material loss come from Modes and the Physics
          panel on the Design tab.
        </p>
        <div className="ctr-logs-design mono">
          κ₁ {k1.toFixed(2)} · κ₂ {k2.toFixed(2)} m⁻¹ · L_c {LcMm.toFixed(0)} mm · L_ext {extMm.toFixed(0)} mm
          {' · '}outer {mode} · {mech.planar ? 'λ_eff' : 'λ'} {(mech.planar ? lamE : lambda).toFixed(2)}
          {lamE > LAMBDA_CRIT ? ' · snaps' : ' · no snap'}
          {' · '}{MEDIA[phys.medium].name.toLowerCase()} · {phys.rpm} rpm · loss η {phys.loss}
        </div>

        <div className="ctr-logs-cfg">
          <label><span>Timestep</span><NumField value={cfg.dtMs} min={0.5} max={500} digits={1} step={1}
            title="sample spacing, ms" onCommit={(v) => patch({ dtMs: v })} /><i>ms</i></label>
          <label><span>Cycles</span><NumField value={cfg.cycles} min={1} max={500} digits={0} step={5}
            title="cycles averaged" onCommit={(v) => patch({ cycles: v })} /><i>cyc</i></label>
        </div>
        <div className="mono dim t9" style={{ marginBottom: 10 }}>
          one cycle = one motor turn = {period.toFixed(3)} s at {phys.rpm} rpm → {Math.floor(period / (cfg.dtMs / 1000))} samples
          per cycle · solving takes roughly 3 s per cycle in water, 10 s in air
        </div>
        <button className="ctr-btn primary" onClick={run} disabled={busy !== null}>
          {busy !== null ? `Solving… ${(busy * 100).toFixed(0)}%` : <><Play size={13} /> Solve {Math.round(cfg.cycles)} cycles</>}
        </button>
        {err && <div className="ctr-logs-warn" style={{ marginTop: 8 }}>Solver error: {err}</div>}

        {L && (
          <div className="ctr-logs-res">
            {stale && <div className="ctr-logs-warn">The design or physics settings changed since this run. Solve again to log the current one.</div>}
            {L.none && <div className="ctr-logs-warn">Nothing to log: {L.reason}.</div>}
            {!L.none && <>
              <div className="ctr-logs-stats mono">
                <span>{L.cycles} cycles · {L.K} samples/cycle · Δt {L.cfg.dtMs} ms · solved in {L.secs.toFixed(0)} s</span>
                <span>energy per cycle: motor {mJ(L.E.motor)} = drag {mJ(L.E.drag)} + material {mJ(L.E.mat)} + twist-snap {mJ(L.E.jump)} · balance residual ≤ {L.E.resid.toExponential(1)}</span>
                <span>rowing J {L.J[0].toPrecision(3)} ± {L.J[1].toPrecision(2)} m³/s² across cycles · first bending mode {L.omega1.toFixed(0)} rad/s</span>
                <span>mean tip speed {mean(L.avg.map((r) => r.spd)).toFixed(1)} mm/s · peak {Math.max(...L.avg.map((r) => r.spd)).toFixed(0)} mm/s</span>
              </div>
              <LogPlot rows={L.avg} get={(r) => r.spd} sd={(r) => r.spdSd} label="Tip speed, mean ± sd across cycles" unit="mm/s" color={C.gold} />
              <LogPlot rows={L.avg} get={(r) => r.roll} label="Tip roll, circular mean" unit="deg, 0 = forward" color={C.cyan} wrap />
              <LogPlot rows={L.avg} get={(r) => r.snap * 100} label="Cycles snapping at this instant" unit="%" color={C.unstable} />
              <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button className="ctr-btn primary" onClick={() => saveText(fname('avg'), logsAveragedCsv(L, header(L)))}>
                  <Download size={13} /> Averaged CSV ({L.K} rows)
                </button>
                <button className="ctr-btn" onClick={() => saveText(fname('raw'), logsRawCsv(L, header(L)))}>
                  <Download size={13} /> Every cycle CSV ({(L.K * L.cycles).toLocaleString()} rows)
                </button>
              </div>
              <p className="ctr-p" style={{ fontSize: 11.5, marginTop: 10 }}>
                Axes are the robot body frame: forward, up, outward (the motor base axis), in mm.
                Velocity is the solver's tip velocity; dtrans is the tip's displacement over the next
                timestep. Roll vector = the fin's material direction at the tip, perpendicular to the
                tip; roll angle 0° = forward, right-handed about the tip axis. Rows start
                {' '}{CYCLE_LEAD_DEG}° of motor turn before the fold, so the snap comes early in the row
                order. The physics is deterministic, so once the start-up has died out the cycles
                repeat; the sd columns show how closely.
              </p>
            </>}
          </div>
        )}
      </div>
    </div>
  );
}

function CitePop({ pop, onGo }) {
  const e = EQ_BY_ID[pop.id];
  const html = useMemo(() => katex.renderToString(e.tex, { throwOnError: false }), [e]);
  const W = 340;
  const left = Math.max(12, Math.min(pop.x - 20, window.innerWidth - W - 12));
  const below = pop.y + 16 + 230 < window.innerHeight;
  const style = { '--k': KIND_CSS[e.kind], left, ...(below ? { top: pop.y + 16 } : { bottom: window.innerHeight - pop.y + 12 }) };
  return (
    <div className="ctr-pop" style={style} onClick={(ev) => ev.stopPropagation()} role="dialog">
      <div className="hd">
        <span className="k">{KIND[e.kind].label}</span>
        <span className="n">§{EQ_NUM[e.id]}</span>
        <span className="ttl">{e.title}</span>
      </div>
      <div className="eq" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="src">
        {e.src?.length
          ? e.src.map(([k, at]) => `${REF_BY_KEY[k].short}, ${at}`).join(' · ')
          : 'Standard result, no project source'}
      </div>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <span className="val" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {pop.value ? `value: ${pop.value}` : ''}
        </span>
        <button className="ctr-btn primary" style={{ flex: 'none', width: 'auto' }} onClick={onGo}><BookOpen size={13} /> Open citation</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   9 · ROOT
   ═══════════════════════════════════════════════════════════════ */
/** The physical solution for the current design: N cycles solved in a
 *  worker and averaged, re-solved (debounced, previous run cancelled) when
 *  the design or the physics settings change. Solve first, then display. */
const SIM_DT = 0.004;                                 // s between stored frames
function usePhysicsSolution(store) {
  const { sim, tubes, outerLocked, outerPlanar, phys } = store;
  const design = useMemo(() => designMsg(sim, tubes, outerLocked, outerPlanar),
    [sim.k1, sim.k2, sim.LcMm, sim.extMm, tubes, outerLocked, outerPlanar]);
  const key = JSON.stringify([design, phys]);
  const [sol, setSol] = useState({ status: 'idle', progress: 0, data: null, key: null });
  useEffect(() => {
    let job = null, cancelled = false;
    setSol((s) => ({ ...s, status: 'solving', progress: 0 }));
    const t0 = performance.now();
    const timer = setTimeout(() => {
      job = solveCycles({ design, phys, cycles: Math.max(1, Math.round(phys.cycles)), dtOut: SIM_DT, tip: false },
        (pr) => { if (!cancelled) setSol((s) => ({ ...s, progress: pr, elapsed: (performance.now() - t0) / 1000 })); });
      job.promise.then((data) => {
        if (cancelled) return;
        setSol({ status: data.none ? 'none' : 'ready', progress: 1, data: data.none ? null : data, reason: data.reason,
          key, elapsed: (performance.now() - t0) / 1000 });
      }).catch((e) => { if (!cancelled) setSol({ status: 'error', error: e.message, progress: 0, data: null, key }); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); job?.cancel(); };
  }, [key]);
  return sol;
}

export default function CTRWorkbench() {
  const store = useDesignStore();
  const physSol = usePhysicsSolution(store);
  const [tab, setTab] = useState('sim');
  // Click-to-cite: the popover a number opens, the entry to land on, and
  // the tab to offer a way back to.
  const [pop, setPop] = useState(null);
  const [citeFocus, setCiteFocus] = useState(null);
  const [backTab, setBackTab] = useState(null);
  const openCite = useCallback((id, value, ev) => {
    if (!EQ_BY_ID[id]) return;
    setPop({ id, value, x: ev.clientX, y: ev.clientY });
  }, []);
  useEffect(() => {
    if (!pop) return undefined;
    const close = () => setPop(null);
    const key = (e) => { if (e.key === 'Escape') setPop(null); };
    window.addEventListener('click', close);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('click', close); window.removeEventListener('keydown', key); };
  }, [pop]);
  const goCite = () => {
    setCiteFocus({ id: pop.id, value: pop.value, stamp: Date.now() });
    setBackTab(tab === 'cite' ? backTab : tab);
    setPop(null);
    setTab('cite');
  };
  // Instrument/data-dense screens default to the dark surface (BRAND.md
  // component defaults). The token file supports both, so the choice is a
  // default rather than a lock-in.
  const [theme, setTheme] = useState('dark');
  /* Bumped after the tokens are re-read, to tell each workspace to RESTYLE
     itself. It deliberately does not key the workspaces any more.

     Remounting them was the old way to repaint after a theme change, and it
     worked, but a remount destroys the WebGL context along with everything
     accumulated in it: the running animation, the integrator state, and every
     ground-track segment drawn so far. Changing the colour of a surface is
     not a reason to throw away the physics being displayed on it. Each scene
     now re-reads the palette and updates its own materials in place. */
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // getComputedStyle here forces the style recalc, so the tokens read below
    // are the NEW theme's, not the outgoing one's.
    syncTokens();
    setThemeTick((n) => n + 1);
  }, [theme]);
  useEffect(() => { if (store.handoff) setTab('sim'); }, [store.handoff?.stamp]);

  const tabs = [
    { id: 'sim', label: 'Interactive 3D simulator', icon: Activity },
    { id: 'opt', label: 'Design optimization', icon: Boxes },
    { id: 'logs', label: 'Logs', icon: ScrollText },
    { id: 'cite', label: 'Citations', icon: BookOpen },
  ];

  return (
    <DesignCtx.Provider value={{ ...store, themeTick, openCite, theme, setTheme, physSol }}>
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
        {tab === 'sim' && <SimulatorWorkspace />}
        {tab === 'opt' && <OptimizerWorkspace />}
        {tab === 'logs' && <LogsPage />}
        {tab === 'cite' && (
          <CitationsPage focus={citeFocus}
            backLabel={tabs.find((t) => t.id === backTab)?.label}
            onBack={backTab ? () => setTab(backTab) : null} />
        )}
        {pop && <CitePop pop={pop} onGo={goCite} />}
      </div>
    </DesignCtx.Provider>
  );
}
