import React, { useRef, useEffect, useState, useMemo, useCallback, createContext, useContext } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Play, Pause, RotateCcw, Zap, Activity, Sliders, Gauge, AlertTriangle,
  Boxes, Target, ArrowUpRight, ShieldAlert, Waves,
  Layers, ChevronDown, ChevronLeft, ChevronRight, Ruler,
  CircleDot, Waypoints, MoveUpRight, Compass, Keyboard, BookOpen,
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import CitationsPage from './CitationsPage.jsx';
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
.ctr-view{position:relative;flex:1;min-width:0;background:var(--paper-50);}
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
function integrateShape(alpha, thetaTip, k1, k2, Lc, Lext, w1 = 0.5, w2 = 0.5) {
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
    const Ky = w2 * k2 * Math.sin(th);
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
function tipPoint(alpha, thetaTip, k1, k2, Lc, Lext, w1, w2, out) {
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
    step(w1 * k1 + w2 * k2 * ct, w2 * k2 * st, ds);
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
function foldSnap(lambda) {
  if (!(lambda > LAMBDA_CRIT)) return null;
  const thetaPeak = Math.acos(-1 / lambda);              // fold: V″ = 0
  const alphaSnap = thetaPeak + lambda * Math.sin(thetaPeak);
  const g = (t) => t - alphaSnap + lambda * Math.sin(t);
  for (let t = thetaPeak + 0.02; t < thetaPeak + 6 * Math.PI; t += 0.02) {
    if (g(t) > 0 && stiffness(t, lambda) > 0) {
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
function settle(th0, a, lambda) {
  let th = th0;
  for (let i = 0; i < 20000; i++) {
    const g = gradient(th, a, lambda), k = stiffness(th, lambda);
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
function snapEfficiency(lambda, k1, k2, Lc, Lext, mech, fold = foldSnap(lambda)) {
  if (!fold) return null;
  const { thetaPeak, alphaSnap, thetaStable } = fold;
  const tmp = [0, 0, 0];
  const pts = snapStroke((th) => {
    tipPoint(alphaSnap, th, k1, k2, Lc, Lext, mech.w1, mech.w2, tmp);
    return [tmp[0], tmp[1], energy(th, alphaSnap, lambda)];
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
function pairMechanics(tubes, outerLocked) {
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
const bifurcation = (k1, k2, Lc, mech) => mech.C * Lc * Lc * k1 * k2;

function evaluateDesign(kappa, Lc, strainLimit, etaK = 0.05, mech, Lext = 0) {
  const lambda = mech.C * Lc * Lc * kappa * kappa;     // κ₁ = κ₂ = κ (sweep diagonal)
  // Bending strain per tube, ε = κ·d_o/2 on each tube's OWN diameter (Part 6:
  // never mix diameters); the larger governs.
  const eb = kappa * (mech.outerLocked ? mech.t2.r : mech.rMax);
  const base = {
    kappa, Lc, lambda, eb, gamma: 0, eeq: eb, dE: 0, dE_J: 0, Win: 0, eta: 0,
    etaP: 0, prod_J: 0,
    score: 0, thetaPeak: 0, thetaStable: 0, stored_J: 0, N: fatigueLife(eb), regime: 'stable',
  };
  const fold = foldSnap(lambda);
  if (!fold) return base;
  const { thetaPeak, alphaSnap, thetaStable } = fold;

  const dE = energy(thetaPeak, alphaSnap, lambda) - energy(thetaStable, alphaSnap, lambda);
  const scale = mech.kScale / Lc;
  // Snap propulsion efficiency: the share of the snap's arc that pushes along
  // its own net direction. It depends on the tip's path, so on L_ext too.
  const etaP = Math.max(0, snapEfficiency(lambda, kappa, kappa, Lc, Lext, mech, fold)?.eta ?? 0);
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
  const Win = motorWork(lambda);
  // ENGINEERING PLACEHOLDER (Part 6). etaK has no physical derivation and is
  // NOT from the burst-and-coast swimming paper, which supplies qualitative
  // motivation only — which is exactly why it is exposed as a control rather
  // than buried as a literal. It carries units of 1/ΔE, so its numeric value
  // is only meaningful against the dimensionless ΔE.
  // Productive energy: only the share of the snap that pushes forward
  // counts, in both the saturation term and the energy-per-work ratio.
  const dEp = etaP * dE;
  const eta = 1 - Math.exp(-etaK * dEp);
  const gate = Math.exp(-Math.pow(eeq / strainLimit, 4));
  return {
    kappa, Lc, lambda, eb, gamma, eeq, dE, dE_J: dE * scale, Win, eta, gate,
    etaP, prod_J: dE * scale * etaP,           // productive snap energy, J
    score: Win > 1e-9 ? eta * (dEp / Win) * gate : 0,
    thetaPeak, thetaStable, alphaSnap,
    stored_J: 0.5 * (thetaPeak - alphaSnap) ** 2 * scale,
    N: fatigueLife(eeq),
    regime: eeq > strainLimit ? 'failure' : 'snapping',
  };
}

function buildGrid({ nx, ny, kappaMin = 0, kappaMax, LcMin, LcMax, strainLimit, etaK, mech, Lext }) {
  const cells = [];
  let best = null, maxDE = 0, maxMJ = 0, maxProd = 0, maxScore = 0;
  for (let j = 0; j < ny; j++) {
    const Lc = LcMin + ((LcMax - LcMin) * j) / (ny - 1);
    for (let i = 0; i < nx; i++) {
      const d = evaluateDesign(kappaMin + ((kappaMax - kappaMin) * i) / (nx - 1), Lc, strainLimit, etaK, mech, Lext);
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
    logLife: 10, etaK: 0.05, clip: true,
    kMin: 0, kMax: 25, LcMinMm: 10, LcMaxMm: 150, zAuto: true, zMin: 0, zMax: 300,
  });
  // Data-layer visibility on the 3-D view. This belongs in the shared store,
  // not local state on SimulatorWorkspace: the root remounts every workspace
  // on a theme switch (key={`${tab}${ready}`}, so the canvases and WebGL
  // scenes repaint), and local state does not survive its component
  // unmounting — a theme toggle was silently switching every layer back off.
  const [layers, setLayers] = useState({ tipTrack: false, midTrack: false, vectors: true, compass: false, headingUp: false });
  // Tube cross-sections (mm) and the outer tube's rotational constraint.
  // Part of the SPECIFICATION, so owned here like every other configured
  // quantity; `mech` is derived once and read by every view.
  const [tubes, setTubes] = useState(DEFAULT_TUBES);
  const [outerLocked, setOuterLocked] = useState(false);
  const mech = useMemo(() => pairMechanics(tubes, outerLocked), [tubes, outerLocked]);
  const [handoff, setHandoff] = useState(null);

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
    tubes, patchTube, setTubes, outerLocked, setOuterLocked, mech };
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
function SimulatorWorkspace() {
  const { sim, patchSim, handoff, layers, patchLayers, themeTick, mech } = useDesign();
  const { alphaDeg, LcMm, extMm, k1, k2 } = sim;
  const lambda = bifurcation(k1, k2, LcMm / 1000, mech);
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [side, setSide] = useState(true);
  const [panels, togglePanel] = usePanels({ energy: true, scurve: true });
  const [hud, setHud] = useState({ theta: 0, alpha: 0, kres: 0, V: 0, Vpp: 1, vel: 0, snapping: false });

  const P = useRef({ alpha: 0, lambda, k1, k2, Lc: LcMm / 1000, Lext: extMm / 1000,
    sweeping: false, slow: false, layers, w1: mech.w1, w2: mech.w2, kScale: mech.kScale });
  useEffect(() => {
    P.current = { alpha: (alphaDeg * Math.PI) / 180, lambda, k1, k2,
      Lc: LcMm / 1000, Lext: extMm / 1000, sweeping, slow, layers,
      w1: mech.w1, w2: mech.w2, kScale: mech.kScale };
  }, [alphaDeg, lambda, k1, k2, LcMm, extMm, sweeping, slow, layers, mech]);

  const theta = useRef(0), vel = useRef(0), flash = useRef(0), subAccum = useRef(0);
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
      arrows.k1.setColor(new THREE.Color(hexInt(C.blue)));
      arrows.k2.setColor(new THREE.Color(hexInt(C.sand)));
      arrows.res.setColor(new THREE.Color(hexInt(C.ink)));
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
      g.font = '600 58px Oswald, "Fira Sans", sans-serif';
      g.fillText(text, cv.width / 2, cv.height / 2 + 4);
    };
    const LABELS = [
      ['RIGHT', [1, 0, 0], [0, Math.PI / 2, 0]], ['LEFT', [-1, 0, 0], [0, -Math.PI / 2, 0]],
      ['TOP', [0, 1, 0], [-Math.PI / 2, 0, 0]], ['BOTTOM', [0, -1, 0], [Math.PI / 2, 0, 0]],
      ['FRONT', [0, 0, 1], [0, 0, 0]], ['BACK', [0, 0, -1], [0, Math.PI, 0]],
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

    three.current = { scene, camera, renderer, outer, inner, core, glow, tipOrb, arrows, matCore, matGlow, matInner, matOuter, setTop, tracks, robot, restyle, renderCube, tick, setCubeVisible, compass, setHeadingUp,
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
          // A snap in flight moves with the state it belongs to.
          if (snapEv.current) { snapEv.current.th -= Math.PI * 4; snapEv.current.a -= Math.PI * 4; }
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

      trail.current.push([theta.current, energy(theta.current, a, p.lambda)]);
      if (trail.current.length > 26) trail.current.shift();

      const T = three.current;
      if (T.renderer) {
        const { pts, Rtip, Rmid, nOverlap } = integrateShape(a, theta.current, p.k1, p.k2, p.Lc, p.Lext, p.w1, p.w2);
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
        const tipW = T.robot.localToWorld(tip.clone());
        if (!snapping && snapEv.current) {
          const ev = snapEv.current; snapEv.current = null;
          const land = ev && p.lambda > LAMBDA_CRIT ? settle(ev.th, ev.a, p.lambda) : null;
          if (land !== null && Math.abs(land - ev.th) > 0.3) {
            const dE = energy(ev.th, ev.a, p.lambda) - energy(land, ev.a, p.lambda);
            const tmp = [0, 0, 0], w = new THREE.Vector3();
            const pts = snapStroke((th) => {
              tipPoint(ev.a, th, p.k1, p.k2, p.Lc, p.Lext, p.w1, p.w2, tmp);
              T.robot.localToWorld(w.set(tmp[0], tmp[1], tmp[2]));
              return [w.x, w.z, energy(th, ev.a, p.lambda)];
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
          if (p.layers.tipTrack) T.tracks.tip.push(tipW, snapping);
          else T.tracks.tip.hide();
          if (p.layers.midTrack) T.tracks.mid.push(T.robot.localToWorld(mid.clone()), snapping);
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
        const rx = p.w1 * p.k1 + p.w2 * p.k2 * Math.cos(th), ry = p.w2 * p.k2 * Math.sin(th);
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
        T.tick?.(dt);
        T.renderer.render(T.scene, T.cam());
        T.renderCube?.();
      }

      drawEnergy(a, p.lambda, theta.current, snapping);
      drawSCurve(a, p.lambda, theta.current);

      hudClock += dt;
      if (hudClock > 0.08) {
        hudClock = 0;
        const kx = p.w1 * p.k1 + p.w2 * p.k2 * Math.cos(theta.current);
        const ky = p.w2 * p.k2 * Math.sin(theta.current);
        setHud({ theta: theta.current, alpha: a, kres: Math.hypot(kx, ky),
          V: energy(theta.current, a, p.lambda), Vpp: stiffness(theta.current, p.lambda), vel: rate, snapping,
          compass: T.compass?.stats() });
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
  const nLayers = Object.values(layers).filter(Boolean).length;
  const anyTrack = layers.tipTrack || layers.midTrack;

  return (
    <div className="col grow">
      <div className="ctr-body">
        <div className="ctr-view" ref={mountRef}>
          <div className="ctr-tl">
            {/* Snap propulsion efficiency: η = (F − B)/E, the net push of the
                snap arc along the net snap direction over its whole energy. */}
            <div className="ctr-eff" title={"Share of the snap's energy that ends up pushing along the net snap direction. "
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
                <div className="ft" style={{ marginTop: 4 }}>no snap — λ {lambda.toFixed(2)} ≤ π²/4</div>
              )}
            </div>

            <button className={`ctr-help-btn${helpOpen ? ' on' : ''}`} onClick={() => setHelpOpen((v) => !v)}
              aria-expanded={helpOpen}>
              <Keyboard size={12} /> controls
              {topView && <span style={{ color: C.accent }}>· plan view</span>}
            </button>
            {helpOpen && (
              <div className="ctr-help">
                <div>drag · orbit</div><div>shift + drag · pan</div><div>scroll · zoom</div>
                <div>view cube · click a face, edge or corner</div>
                <div>space · {cubeOn ? 'hide' : 'show'} view cube</div>
                {topView && <div style={{ color: C.accent }}>plan view · click a cube face to leave</div>}
                {anyTrack && !topView && (
                  <div style={{ color: C.accent }}>tracks drawn on floor — view from TOP</div>
                )}
              </div>
            )}
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
              <span style={mech.outerLocked ? { color: C.gold } : undefined}>
                outer <b style={mech.outerLocked ? { color: C.gold } : undefined}>{mech.outerLocked ? 'fully constrained' : 'clamped at base'}</b>
              </span>
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
                </div>
                <h3>Energy</h3>
                <div className="ctr-lyr-grid">
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
        </div>

        <SideBar title="Analysis" open={side} onToggle={() => setSide((v) => !v)}>
          <Panel title="Energy landscape" plot open={panels.energy}
            onToggle={() => togglePanel('energy')}
            icon={<Zap size={14} color={C.gold} />}
            right={`V = ${(0.5 * ((hud.theta - hud.alpha) ** 2)).toFixed(2)} + ${(lambda * (1 - Math.cos(hud.theta))).toFixed(2)}`}>
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
          <Metric icon={<Boxes size={12} />} label="Bifurcation λ [–]" value={lambda.toFixed(2)} cite="lambda"
            color={lambda > LAMBDA_CRIT ? C.gold : C.dim}
            note={lambda > LAMBDA_CRIT ? "snaps" : "no fold"} />
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
const SCORE_TEX = katex.renderToString(
  String.raw`\displaystyle \text{Score} = \eta_{\text{hydro}}\,\frac{\eta_{\text{prop}}\,\Delta E}{W_{\text{in}}}\,\exp\!\Big[-\Big(\frac{\varepsilon_{\text{eq}}}{\varepsilon_{\text{allow}}}\Big)^{4}\Big]`,
  { throwOnError: false });
const HYDRO_TEX = katex.renderToString(String.raw`\eta_{\text{hydro}} = 1 - e^{-k_\eta\,\eta_{\text{prop}}\,\Delta E}`, { throwOnError: false });

function OptimizerWorkspace() {
  /* This tab owns the whole specification. Every configured quantity in the
     app is edited here and read elsewhere, so there is exactly one definition
     of the robot at any moment. */
  const { applyDesign, sim, patchSim,
    domain, patchDomain, themeTick, tubes, patchTube, setTubes, outerLocked, setOuterLocked,
    mech, openCite } = useDesign();
  const { LcMm, extMm, k1, k2 } = sim;
  // Part 6: the allowable strain must be justified by a target cycle life,
  // not hardcoded to the 8% monotonic superelastic limit — at 8% the gate is
  // inert over the whole practical κ range and the optimum just walks to the
  // corner of the parameter box.
  const { logLife, etaK, clip, kMin, kMax, LcMinMm, LcMaxMm, zAuto, zMin, zMax } = domain;
  const setLogLife = (v) => patchDomain({ logLife: v });
  const setEtaK = (v) => patchDomain({ etaK: v });
  const setClip = (v) => patchDomain({ clip: v });
  const [hover, setHover] = useState(null);
  const [side, setSide] = useState(true);
  const [panels, togglePanel] = usePanels({
    sweet: true, design: true, tubes: true, axes: true, scoring: false,
    tradeoff: false, safety: false,
  });
  const designLambda = bifurcation(k1, k2, LcMm / 1000, mech);

  const targetLife = Math.pow(10, logLife);
  const strainLimit = epsAllowFor(targetLife);
  const strainPct = strainLimit * 100;
  // ε_bend = κ·d₀/2 ≤ ε_allow on the LARGER of the two tubes, which governs.
  const kappaCeiling = strainLimit / (mech.outerLocked ? mech.t2.r : mech.rMax);
  // The typed x bound, optionally clipped by that fatigue ceiling.
  const kappaMax = Math.max(kMin + 0.1, clip ? Math.min(kMax, kappaCeiling) : kMax);

  const grid = useMemo(() => buildGrid({
    nx: GRID_N, ny: GRID_N, kappaMin: kMin, kappaMax, LcMin: LcMinMm / 1000, LcMax: LcMaxMm / 1000,
    strainLimit, etaK, mech, Lext: extMm / 1000,
  }), [kMin, kappaMax, LcMinMm, LcMaxMm, strainLimit, etaK, mech, extMm]);
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

    const fE = (i, j) => cells[j * nx + i].prod_J * 1000;   // mJ
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
        pos[n * 3 + 1] = zH(bicubic(fE, u, v), zr);
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
    const yAt = (u, v) => zH(bicubic(fE, u, v), zr) + CONTOUR_LIFT;
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
    at(label('E_snap·η_prop  (mJ)', 34, TITLE), -OUT + 4, HEIGHT + 20, -SURF);

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
  }, [grid, strainLimit, themeTick, zLo, zHi]);

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
            <div dangerouslySetInnerHTML={{ __html: SCORE_TEX }} />
            <div style={{ marginTop: 2 }} dangerouslySetInnerHTML={{ __html: HYDRO_TEX }} />
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
                <Row k="Propulsion eff." v={`${(hover.etaP * 100).toFixed(0)} %`} c={C.gold} />
                <Row k="Productive" v={`${(hover.prod_J * 1000).toFixed(2)} mJ`} c={C.gold} />
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
                <Cx id="eta">{(best.etaP * 100).toFixed(0)}%</Cx> of it pushing forward
                (<Cx id="prod">{(best.prod_J * 1000).toFixed(1)} mJ</Cx> productive), at{' '}
                <Cx id="eeq">{(best.eeq * 100).toFixed(2)}%</Cx> equivalent strain, against a fatigue
                allowable of <Cx id="allow">{strainPct.toFixed(2)}%</Cx>. Predicted life{' '}
                <Cx id="life">{fmtN(best.N)}</Cx> cycles at λ = <Cx id="lambda">{best.lambda.toFixed(2)}</Cx>.
              </p>
              <button className="ctr-btn primary" onClick={() => applyDesign(best)}>
                <ArrowUpRight size={14} /> Adopt as current design
              </button>
            </>
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
            The geometry every other tab renders and evaluates{outerLocked ? ', outer tube fully constrained' : ''}.
            λ = C·L_c²·κ₁κ₂
            {' = '}<Cx id="lambda"><b style={{ color: designLambda > LAMBDA_CRIT ? C.gold : C.dim }}>{designLambda.toFixed(2)}</b></Cx>
            {designLambda > LAMBDA_CRIT ? ' — past the fold, so it snaps.' : ' — below π²/4, so it cannot snap.'}
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
          right={outerLocked ? 'outer locked' : 'outer free'}>
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

                <div className="cap-label" style={{ marginTop: 4 }}>Outer tube rotation</div>
                <div className="ctr-seg">
                  <button className={!outerLocked ? 'on' : ''} onClick={() => setOuterLocked(false)}>
                    Clamped at base
                  </button>
                  <button className={outerLocked ? 'on' : ''} onClick={() => setOuterLocked(true)}>
                    Fully constrained
                  </button>
                </div>
                <p className="ctr-p" style={{ fontSize: 11.5 }}>
                  Clamped at base: the outer tube can twist and bend along its length, so the
                  overlap's shape changes as the fin turns. Fully constrained: the outer tube
                  is rigid — it holds its own precurved arc, the fin conforms to it, and only
                  the fin beyond the sheath moves.
                </p>
                <div className="ctr-verdict">
                  {verdict(lamFree, !outerLocked, 'clamped at base', 'lambda')}
                  {verdict(lamLock, outerLocked, 'fully constrained', 'rigid')}
                </div>
                <p className="ctr-p" style={{ fontSize: 11.5 }}>
                  Same λ in both modes, for any diameters: with both tubes Nitinol,
                  k_b/k_t = 1+ν for every circular section, so λ = (1+ν)·L_c²·κ₁κ₂ whether
                  the sheath is compliant or rigid. A rigid sheath stops the fin sharing its
                  twist (less compliance) but also stops it bending the sheath (stronger
                  coupling), and the two cancel. Whether it snaps is unchanged; the shape,
                  strain and energy per snap are not.
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
            <span className="t">z · <M>{'E_snap'}</M>·η</span>
            <NumField value={zLo} min={0} max={Math.max(0, zHi - 0.001)} digits={1} step={10}
              title="height axis minimum, mJ" onCommit={(v) => patchDomain({ zAuto: false, zMin: v, zMax: zHi })} />
            <NumField value={zHi} min={zLo + 0.001} max={1e7} digits={1} step={10}
              title="height axis maximum, mJ" onCommit={(v) => patchDomain({ zAuto: false, zMin: zLo, zMax: v })} />
            <span className="u">mJ</span>
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
export default function CTRWorkbench() {
  const store = useDesignStore();
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
    { id: 'cite', label: 'Citations', icon: BookOpen },
  ];

  return (
    <DesignCtx.Provider value={{ ...store, themeTick, openCite }}>
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
