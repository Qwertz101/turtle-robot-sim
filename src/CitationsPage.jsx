import React, { useEffect, useMemo, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ArrowLeft, Search } from 'lucide-react';
import {
  EQUATIONS, EQ_BY_ID, EQ_NUM, KIND, REFERENCES, REF_BY_KEY, SECTIONS,
} from './citations.js';

/* ═══════════════════════════════════════════════════════════════
   CITATIONS — the encyclopedia of equations.

   Set as a LaTeX document rather than an app panel: numbered sections,
   display equations with their number flush right, bracketed citations
   that resolve to a bibliography. Each entry is an Obsidian-style callout
   whose left rule is coloured by provenance, so the page can be skimmed
   for "what here is assumed?" without reading a word of it.
   ═══════════════════════════════════════════════════════════════ */

const CSS = `
.cz{flex:1;min-height:0;display:flex;background:var(--paper-50);color:var(--ink-900);}
.cz-toc{width:228px;flex-shrink:0;border-right:1px solid var(--line-300);overflow-y:auto;
  padding:22px 14px 30px 20px;font-family:var(--font-body);font-size:12.5px;}
.cz-toc .h{font-family:var(--font-display);font-weight:500;font-size:11px;letter-spacing:.07em;
  text-transform:uppercase;color:var(--ink-600);margin:0 0 10px;}
.cz-toc a{display:block;padding:3px 0;color:var(--ink-600);text-decoration:none;cursor:pointer;}
.cz-toc a:hover{color:var(--ink-900);}
.cz-toc a .n{display:inline-block;width:22px;color:var(--ink-600);font-family:var(--font-mono);font-size:11px;}
.cz-toc .sub{padding-left:22px;font-size:11.5px;}
.cz-scroll{flex:1;min-width:0;overflow-y:auto;}
.cz-doc{max-width:820px;margin:0 auto;padding:34px 40px 80px;
  font-family:KaTeX_Main,'Times New Roman',serif;font-size:16.5px;line-height:1.55;}
.cz-doc h1{font-family:KaTeX_Main,serif;font-weight:700;font-size:30px;line-height:1.2;
  margin:0 0 6px;text-align:center;}
.cz-doc .byline{text-align:center;color:var(--ink-600);font-size:14.5px;margin-bottom:22px;}
.cz-abs{margin:0 34px 22px;font-size:15px;}
.cz-abs b{font-variant:small-caps;letter-spacing:.03em;}
.cz-doc h2{font-family:KaTeX_Main,serif;font-weight:700;font-size:21px;margin:34px 0 12px;
  display:flex;gap:16px;align-items:baseline;scroll-margin-top:16px;}
.cz-kinds{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:6px 0 18px;}
.cz-kind{border:1px solid var(--line-300);border-left-width:4px;border-radius:6px;padding:8px 11px;
  background:var(--surface);cursor:pointer;text-align:left;font:inherit;color:inherit;}
.cz-kind .t{font-variant:small-caps;font-weight:700;font-size:15px;letter-spacing:.04em;}
.cz-kind .c{float:right;font-family:var(--font-mono);font-size:12px;color:var(--ink-600);}
.cz-kind .d{font-size:13px;color:var(--ink-600);line-height:1.4;margin-top:2px;}
.cz-kind.off{opacity:.38;}
.cz-bar{display:flex;gap:10px;align-items:center;margin-bottom:6px;flex-wrap:wrap;}
.cz-search{flex:1;min-width:180px;display:flex;align-items:center;gap:7px;padding:6px 10px;
  border:1px solid var(--line-300);border-radius:6px;background:var(--surface);}
.cz-search input{flex:1;border:0;outline:0;background:transparent;color:var(--ink-900);
  font-family:var(--font-body);font-size:13px;}
.cz-back{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:6px;cursor:pointer;
  border:1px solid var(--line-300);background:var(--surface);color:var(--ink-900);
  font-family:var(--font-display);font-weight:500;font-size:11.5px;letter-spacing:.03em;text-transform:uppercase;}
.cz-back:hover{border-color:var(--rams-500);}
.cz-e{position:relative;margin:12px 0;padding:10px 16px 11px 16px;border-radius:0 7px 7px 0;
  border-left:4px solid var(--k);background:color-mix(in srgb, var(--k) 6%, var(--surface));
  scroll-margin-top:24px;transition:box-shadow .3s;}
.cz-e.hit{box-shadow:0 0 0 2px var(--k);}
.cz-e .hd{display:flex;align-items:baseline;gap:12px;}
.cz-e .num{font-family:var(--font-mono);font-size:12px;color:var(--ink-600);min-width:30px;}
.cz-e .ttl{font-weight:700;font-size:16.5px;}
.cz-chip{margin-left:auto;font-variant:small-caps;font-weight:700;font-size:13.5px;letter-spacing:.05em;
  color:var(--k);white-space:nowrap;}
.cz-eq{display:flex;align-items:center;gap:14px;margin:4px 0 2px 42px;}
.cz-eq .m{flex:1;min-width:0;overflow-x:auto;overflow-y:hidden;}
.cz-eq .m .katex-display{margin:.45em 0;}
.cz-eq .m .katex{font-size:1.1em;}
.cz-eq .tag{font-family:KaTeX_Main,serif;color:var(--ink-600);flex-shrink:0;}
.cz-note{margin:2px 0 0 42px;font-size:15px;}
.cz-meta{margin:6px 0 0 42px;display:flex;flex-wrap:wrap;gap:4px 18px;font-family:var(--font-body);
  font-size:12px;color:var(--ink-600);line-height:1.5;}
.cz-meta b{font-weight:600;color:var(--ink-900);}
.cz-meta a{color:var(--riverside-blue-500);cursor:pointer;text-decoration:none;}
.cz-meta a:hover{text-decoration:underline;}
.cz-where{display:inline-block;margin:1px 4px 1px 0;padding:0 7px;border-radius:999px;
  border:1px solid var(--line-300);background:var(--surface);font-size:11px;line-height:17px;}
.cz-cite{color:var(--riverside-blue-500);cursor:pointer;}
.cz-cite:hover{text-decoration:underline;}
.cz-val{display:inline-block;margin:6px 0 0 42px;padding:2px 9px;border-radius:999px;
  font-family:var(--font-mono);font-size:12px;
  background:color-mix(in srgb, var(--k) 16%, var(--surface));color:var(--ink-900);}
.cz-refs{font-size:15px;}
.cz-ref{display:grid;grid-template-columns:34px 1fr;gap:6px;margin:0 0 12px;scroll-margin-top:24px;}
.cz-ref .n{color:var(--ink-600);}
.cz-ref .role{font-size:13.5px;color:var(--ink-600);}
.cz-ref a{color:var(--riverside-blue-500);font-family:var(--font-mono);font-size:12.5px;word-break:break-all;}
.cz-empty{color:var(--ink-600);font-style:italic;margin:18px 0;}
@media (max-width: 900px){ .cz-toc{display:none;} .cz-doc{padding:24px 16px 60px;} .cz-kinds{grid-template-columns:1fr;} }
`;

/** What an entry with no citation rests on, by kind. */
const NO_SRC = {
  adopted: 'see the paper cited in the entries it uses',
  derived: 'follows from the entries it uses; no new source needed',
  assumed: 'project definition; no external source',
};

const KIND_VAR = {
  adopted: 'var(--signal-good)',
  derived: 'var(--riverside-blue-500)',
  assumed: 'var(--signal-watch)',
};

/** Bracketed citations, "[1, p. 24]", each linking to its bibliography entry. */
function Cites({ src, jump }) {
  return (src || []).map(([key, at], i) => {
    const ref = REF_BY_KEY[key];
    return (
      <React.Fragment key={i}>
        {i > 0 && '; '}
        <span className="cz-cite" onClick={() => jump(`ref-${key}`)}>[{ref.n}, {at}]</span>
      </React.Fragment>
    );
  });
}

function Entry({ e, hit, value, jump }) {
  const html = useMemo(() => katex.renderToString(e.tex, { displayMode: true, throwOnError: false }), [e.tex]);
  return (
    <div id={`eq-${e.id}`} className={`cz-e${hit ? ' hit' : ''}`} style={{ '--k': KIND_VAR[e.kind] }}>
      <div className="hd">
        <span className="num">{EQ_NUM[e.id]}</span>
        <span className="ttl">{e.title}</span>
        <span className="cz-chip">{KIND[e.kind].label}</span>
      </div>
      <div className="cz-eq">
        <div className="m" dangerouslySetInnerHTML={{ __html: html }} />
        <span className="tag">({EQ_NUM[e.id]})</span>
      </div>
      <div className="cz-note">{e.note}</div>
      <div className="cz-meta">
        <span><b>Source</b>{' '}
          {e.src?.length ? <Cites src={e.src} jump={jump} /> : NO_SRC[e.kind]}
        </span>
        {e.uses?.length > 0 && (
          <span><b>Uses</b>{' '}
            {e.uses.map((u, i) => (
              <React.Fragment key={u}>{i > 0 && ', '}
                <a onClick={() => jump(`eq-${u}`)}>§{EQ_NUM[u]} {EQ_BY_ID[u].title.toLowerCase()}</a>
              </React.Fragment>
            ))}
          </span>
        )}
        {e.shown?.length > 0 && (
          <span><b>Shown in</b>{' '}{e.shown.map((w) => <span key={w} className="cz-where">{w}</span>)}</span>
        )}
      </div>
      {value && <div className="cz-val">you clicked: {value}</div>}
    </div>
  );
}

export default function CitationsPage({ focus, backLabel, onBack }) {
  const scrollRef = useRef(null);
  const [kinds, setKinds] = useState({ adopted: true, derived: true, assumed: true });
  const [q, setQ] = useState('');
  const [hit, setHit] = useState(null);

  const jump = (anchor) => {
    const el = scrollRef.current?.querySelector(`#${CSS_ESC(anchor)}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Arriving from a clicked number: make sure the entry is not filtered out,
  // centre it, and ring it briefly.
  useEffect(() => {
    if (!focus?.id) return;
    const e = EQ_BY_ID[focus.id];
    if (!e) return;
    setKinds((k) => ({ ...k, [e.kind]: true }));
    setQ('');
    setHit(focus.id);
    const t0 = setTimeout(() => {
      scrollRef.current?.querySelector(`#eq-${CSS_ESC(focus.id)}`)?.scrollIntoView({ block: 'center' });
    }, 30);
    const t1 = setTimeout(() => setHit(null), 2600);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [focus?.stamp]);

  const counts = useMemo(() => {
    const c = { adopted: 0, derived: 0, assumed: 0 };
    EQUATIONS.forEach((e) => { c[e.kind] += 1; });
    return c;
  }, []);

  const ql = q.trim().toLowerCase();
  const visible = (e) => kinds[e.kind] && (!ql
    || `${e.title} ${e.note} ${(e.shown || []).join(' ')} ${e.id}`.toLowerCase().includes(ql));

  return (
    <div className="cz">
      <style>{CSS}</style>
      <nav className="cz-toc">
        <div className="h">Contents</div>
        {SECTIONS.map((s, i) => (
          <a key={s.id} onClick={() => jump(`sec-${s.id}`)}><span className="n">{i + 1}</span>{s.title}</a>
        ))}
        <a onClick={() => jump('sec-refs')}><span className="n" />References</a>
      </nav>

      <div className="cz-scroll" ref={scrollRef}>
        <article className="cz-doc">
          <h1>Equations and Sources</h1>
          <div className="byline">Every quantity the workbench calculates, where it comes from, and how far to trust it</div>

          <p className="cz-abs">
            <b>How to read this.</b> Each entry states one formula as the app evaluates it, then its
            provenance: <i>adopted</i> directly from a paper, <i>derived</i> from those results by
            standard physics, or <i>assumed</i>, a modelling choice, placeholder or estimate.
            Citations give the journal page. The central simplification is §3.1: the app collapses
            the distributed rod model of [1] to one twist angle, so every energy, strain and
            efficiency downstream inherits it. Click any number on the other tabs to land on its
            entry here.
          </p>

          <div className="cz-kinds">
            {Object.entries(KIND).map(([k, v]) => (
              <button key={k} className={`cz-kind${kinds[k] ? '' : ' off'}`} style={{ borderLeftColor: KIND_VAR[k] }}
                onClick={() => setKinds((s) => ({ ...s, [k]: !s[k] }))} title="Show or hide this kind">
                <span className="c">{counts[k]}</span>
                <div className="t" style={{ color: KIND_VAR[k] }}>{v.label}</div>
                <div className="d">{v.blurb}</div>
              </button>
            ))}
          </div>

          <div className="cz-bar">
            <label className="cz-search">
              <Search size={14} color="var(--ink-600)" />
              <input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Filter, e.g. strain, efficiency, λ" />
            </label>
            {onBack && (
              <button className="cz-back" onClick={onBack}><ArrowLeft size={13} /> Back to {backLabel}</button>
            )}
          </div>

          {SECTIONS.map((s, i) => {
            const list = EQUATIONS.filter((e) => e.sec === s.id && visible(e));
            if (!list.length) return null;
            return (
              <section key={s.id}>
                <h2 id={`sec-${s.id}`}><span>{i + 1}</span><span>{s.title}</span></h2>
                {list.map((e) => (
                  <Entry key={e.id} e={e} jump={jump} hit={hit === e.id}
                    value={focus?.id === e.id ? focus.value : null} />
                ))}
              </section>
            );
          })}
          {!EQUATIONS.some(visible) && <p className="cz-empty">No entry matches this filter.</p>}

          <h2 id="sec-refs"><span />References</h2>
          <div className="cz-refs">
            {REFERENCES.map((r) => (
              <div key={r.key} id={`ref-${r.key}`} className="cz-ref">
                <span className="n">[{r.n}]</span>
                <div>
                  {r.text}{' '}
                  {r.doi && <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">doi:{r.doi}</a>}
                  {r.url && <a href={r.url} target="_blank" rel="noreferrer">view file</a>}
                  <div className="role">{r.role}</div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

/** Ids here are plain words, but escape anyway so a future id cannot break
 *  the selector. */
function CSS_ESC(s) {
  return window.CSS?.escape ? window.CSS.escape(s) : s;
}
