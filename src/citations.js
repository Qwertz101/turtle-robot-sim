/* ═══════════════════════════════════════════════════════════════
   EQUATION CATALOGUE — every number the app calculates or shows, with
   where it comes from.

   Three kinds of provenance, and ONLY three, so a reader can tell at a
   glance how much weight a number carries:

     adopted  taken directly from a cited paper (equation / page given)
     derived  follows from an adopted result or the project's model by
              standard physics or mathematics, with no new assumption
     assumed  a modelling choice, placeholder, project input or
              convention: it is where the app could be wrong

   Page numbers are the JOURNAL page numbers printed on each paper
   (Gilbert et al. runs pp. 20-35, Saini et al. pp. 4690-4697), checked
   against the PDFs. A "standard result" is textbook mechanics that no
   project source states, and it is labelled as such rather than given a
   borrowed-looking citation.
   ═══════════════════════════════════════════════════════════════ */

export const KIND = {
  adopted: { label: 'Adopted', blurb: 'Taken directly from a cited paper.' },
  derived: { label: 'Derived', blurb: 'Follows from adopted results or the model by standard physics.' },
  assumed: { label: 'Assumed', blurb: 'A modelling choice, placeholder or project input.' },
};

const RULES_URL = 'https://github.com/Qwertz101/turtle-robot-sim/blob/master/CTR_PHYSICS_RULES.txt';

export const REFERENCES = [
  {
    key: 'G16', n: 1, short: 'Gilbert et al. 2016',
    text: 'H. B. Gilbert, R. J. Hendrick, R. J. Webster III, “Elastic stability of concentric tube robots: a stability measure and design test,” IEEE Transactions on Robotics, vol. 32, no. 1, pp. 20–35, 2016.',
    doi: '10.1109/TRO.2015.2500422',
    role: 'The mechanics source: λ, the critical value π²/4, the backbone-curvature law and the stability operator.',
  },
  {
    key: 'S25', n: 2, short: 'Saini et al. 2025',
    text: 'S. Saini et al., “Towards a steerable neurosurgical robot for debulking of brain mass lesions,” IEEE Robotics and Automation Letters, vol. 10, no. 5, pp. 4690–4697, 2025.',
    doi: '10.1109/LRA.2025.3548352',
    role: 'Plausibility only: measured precurvatures of real Nitinol tubes. No snapping physics.',
  },
  {
    key: 'Q26', n: 3, short: 'Quinn 2026',
    text: 'D. B. Quinn, “Is intermittent swimming lazy or clever?” Science Robotics, vol. 11, eaee3862, 2026 (2 pp.).',
    doi: '10.1126/scirobotics.aee3862',
    role: 'Motivation only: why burst-and-coast swimming can save power. Supplies no formula used here.',
  },
  {
    key: 'A26', n: 4, short: 'Athavale 2026 (proposal)',
    text: 'N. Athavale, “Underwater robot with concentric tube mechanisms for dynamic motion,” UCR Research Minigrant proposal, 2026 (unpublished).',
    role: 'The project goal: exploit the snap for burst-and-coast propulsion and evaluate its propulsion efficiency.',
  },
  {
    key: 'R', n: 5, short: 'Project physics rules',
    text: 'CTR snap-physics ground-truth rules, project file CTR_PHYSICS_RULES.txt (this repository).',
    url: RULES_URL,
    role: 'The project’s own record of which formulas are exact, simplified or placeholder, and the material constants.',
  },
  {
    key: 'P', n: 6, short: 'Project material file',
    text: 'Physical Parameters.txt, project material file headed “Physical Parameters (Estimated for Nitinol Tubes)” (this repository).',
    url: 'https://github.com/Qwertz101/turtle-robot-sim/blob/master/Physical%20Parameters.txt',
    role: 'Source of E, ν and the section formulas. Its own heading marks the values as estimates; its tube is 1.47/1.28 mm, not the app’s 1.02/0.82 mm default.',
  },
  {
    key: 'CM', n: 7, short: 'Coffin–Manson',
    text: 'L. F. Coffin Jr., Trans. ASME 76 (1954); S. S. Manson, NACA TN-2933 (1953) — the Coffin–Manson strain-life law.',
    role: 'Functional form of the fatigue law only. The constants used here are not from these works.',
  },
];
export const REF_BY_KEY = Object.fromEntries(REFERENCES.map((r) => [r.key, r]));

export const SECTIONS = [
  { id: 'mat', title: 'Material and cross-section' },
  { id: 'bif', title: 'Bifurcation' },
  { id: 'nrg', title: 'Reduced energy model' },
  { id: 'snap', title: 'Snap energy' },
  { id: 'kin', title: 'Kinematics' },
  { id: 'prop', title: 'Propulsion efficiency' },
  { id: 'fat', title: 'Strain and fatigue' },
  { id: 'opt', title: 'Optimiser score' },
];

const r = String.raw;

/* src: [refKey, location]. uses: ids of the entries a formula consumes. */
export const EQUATIONS = [
  /* ── 1 · Material and cross-section ─────────────────────────────── */
  {
    id: 'E', sec: 'mat', title: 'Young’s modulus', kind: 'assumed',
    tex: r`E = 50\ \mathrm{GPa}`,
    src: [['P', 'line 3, “estimated”'], ['R', 'Parts 0.5, 8']],
    note: 'Estimated project input for Nitinol. Its real modulus depends on phase and temperature, and none of the papers supplies a value.',
    shown: ['every stiffness, energy and strain'],
  },
  {
    id: 'nu', sec: 'mat', title: 'Poisson’s ratio', kind: 'assumed',
    tex: r`\nu = 0.33`,
    src: [['P', 'line 4, “estimated”'], ['R', 'Parts 0.5, 8']],
    note: 'Estimated project input.',
    shown: ['G, and so every torsional quantity'],
  },
  {
    id: 'G', sec: 'mat', title: 'Shear modulus', kind: 'derived',
    tex: r`G = \frac{E}{2(1+\nu)}`,
    src: [['P', 'line 5'], ['R', 'Part 0.5']],
    note: 'Standard isotropic elasticity. The rules require G to be derived, never set independently.',
    uses: ['E', 'nu'],
  },
  {
    id: 'section', sec: 'mat', title: 'Section moments', kind: 'derived',
    tex: r`I = \frac{\pi}{64}\left(d_o^4 - d_i^4\right), \qquad J = 2I`,
    src: [['P', 'lines 9–10'], ['R', 'Part 0.5']],
    note: 'Standard result for an annulus; J = 2I is exact for a circular section.',
    shown: ['Design · Tubes & constraint'],
  },
  {
    id: 'stiff', sec: 'mat', title: 'Bending and torsional stiffness', kind: 'adopted',
    tex: r`k_{ib} = E I_i, \qquad k_{it} = G J_i`,
    src: [['G16', 'p. 22, constitutive map before Eq. (2)'], ['P', 'lines 12–13']],
    note: 'Gilbert et al. define each tube by k_ib and k_it in a diagonal constitutive map; the products EI and GJ are the standard beam values.',
    uses: ['E', 'G', 'section'],
    shown: ['Design · Tubes & constraint (k_b, k_t)'],
  },
  {
    id: 'tubes', sec: 'mat', title: 'Default tube pair', kind: 'assumed',
    tex: r`d_o = 1.02\ \mathrm{mm}, \quad d_i = 0.82\ \mathrm{mm}\ \ (\text{both tubes})`,
    src: [['R', 'Part 0.5']],
    note: 'The fin capillary the project started from, not the 1.47/1.28 mm tube in the material file. As a pair it cannot nest (the radial fit is negative); the Tubes panel flags this.',
    shown: ['Design · Tubes & constraint'],
  },
  {
    id: 'fit', sec: 'mat', title: 'Radial fit', kind: 'derived',
    tex: r`c = d_{i,1} - d_{o,2} \;>\; 0`,
    note: 'Geometry: the outer tube’s bore must clear the fin.',
    shown: ['Design · Tubes & constraint'],
  },

  /* ── 2 · Bifurcation ───────────────────────────────────────────── */
  {
    id: 'lambda', sec: 'bif', title: 'Bifurcation parameter', kind: 'adopted',
    tex: r`\lambda = L_c^2\,\kappa_1\kappa_2\;\frac{k_{1b}k_{2b}}{k_{1b}+k_{2b}}\;\frac{k_{1t}+k_{2t}}{k_{1t}k_{2t}}`,
    src: [['G16', 'p. 24, definition after Eq. (8)'], ['R', 'Part 2']],
    note: 'Exact for two constant-precurvature tubes with equal transmission length. It depends on the product κ₁κ₂, never on one curvature squared. The coefficient λ/(L_c²κ₁κ₂) is shown as C.',
    uses: ['stiff'],
    shown: ['Sim · λ card', 'Design · Current design', 'Design · Tubes & constraint', 'Design · sweet spot'],
  },
  {
    id: 'rigid', sec: 'bif', title: 'λ with a rigid outer tube', kind: 'derived',
    tex: r`\begin{aligned} \lambda_{\text{rigid}} &= \lim_{k_{1b},\,k_{1t}\to\infty}\lambda = L_c^2\,\kappa_1\kappa_2\,\frac{k_{2b}}{k_{2t}} \\ &= (1+\nu)\,L_c^2\,\kappa_1\kappa_2 \end{aligned}`,
    src: [['G16', 'p. 24 (λ); p. 23 (stiffness limits of an absent tube)']],
    note: 'Limit of the adopted λ. For two Nitinol tubes it equals the free λ exactly, for any diameters, so rigidity changes the shape and energy of a snap but not whether it happens.',
    uses: ['lambda'],
    shown: ['Design · Tubes & constraint (fully constrained)'],
  },
  {
    id: 'crit', sec: 'bif', title: 'Critical value', kind: 'adopted',
    tex: r`\lambda_0 = \frac{\pi^2}{4} \approx 2.467 \qquad (\beta_\sigma = 0)`,
    src: [['G16', 'p. 24, Result 1, Eq. (9) with zero transmission length']],
    note: 'The app assumes zero transmission length β_σ. A straight transmission section pushes the bifurcation to lower λ (Gilbert et al., p. 24, Fig. 3), so the threshold is optimistic for a real mount.',
    shown: ['snaps / no snap everywhere', 'Design · onset contour'],
  },
  {
    id: 'diag', sec: 'bif', title: 'Sweep diagonal', kind: 'assumed',
    tex: r`\kappa_1 = \kappa_2 = \kappa`,
    src: [['R', 'Part 6']],
    note: 'The optimiser sweeps one curvature for both tubes. The current design may set them separately.',
    shown: ['Design · surface x-axis'],
  },

  /* ── 3 · Reduced energy model ─────────────────────────────────── */
  {
    id: 'V', sec: 'nrg', title: 'Lumped torsional energy', kind: 'derived',
    tex: r`V(\theta) = \tfrac12(\theta-\alpha)^2 - \lambda\cos\theta`,
    src: [['G16', 'p. 25, Eq. (16)'], ['R', 'Part 4']],
    note: 'The paper’s energy functional collapsed to one degree of freedom by taking the linear twist profile (§3.2). A reduced-order model, not the paper’s boundary-value solution.',
    uses: ['lambda', 'twist'],
    shown: ['Sim · Elastic V', 'Sim · energy landscape'],
  },
  {
    id: 'twist', sec: 'nrg', title: 'Twist profile along the overlap', kind: 'assumed',
    tex: r`\theta(s) = \alpha + (\theta_{\text{tip}} - \alpha)\,s, \qquad s\in[0,1]`,
    src: [['R', 'Part 5'], ['G16', 'p. 24, Eq. (8a) is the exact profile']],
    note: 'Linear interpolation instead of solving θ″ = λ sin θ. Exact only in the small-deflection, zero-transmission limit.',
    shown: ['Sim · tube shape'],
  },
  {
    id: 'Vpp', sec: 'nrg', title: 'Lumped stability margin', kind: 'derived',
    tex: r`V''(\theta) = 1 + \lambda\cos\theta`,
    src: [['G16', 'p. 25, Eqs. (18)–(19), the operator it reduces']],
    note: 'The lumped counterpart of the second-variation operator Sh = −h″ + λ cos θ h. Negative means the current well has vanished. It is NOT the paper’s stability measure.',
    uses: ['V'],
    shown: ['Sim · Lumped V″', 'Sim · energy landscape (dashed = unstable)'],
  },
  {
    id: 'eqmap', sec: 'nrg', title: 'Equilibrium map', kind: 'derived',
    tex: r`V'(\theta) = 0 \;\Longleftrightarrow\; \alpha = \theta + \lambda\sin\theta`,
    src: [['G16', 'p. 26, Fig. 4 (the S-curve it mirrors)']],
    note: 'Plotted as θ against α; stretches with V″ ≤ 0 are the unstable, dashed part of the S.',
    uses: ['V'],
    shown: ['Sim · equilibrium map'],
  },
  {
    id: 'fold', sec: 'nrg', title: 'Fold (snap onset)', kind: 'derived',
    tex: r`\theta_{\text{peak}} = \arccos\!\left(-\tfrac{1}{\lambda}\right), \qquad \alpha_{\text{snap}} = \theta_{\text{peak}} + \lambda\sin\theta_{\text{peak}}`,
    src: [['R', 'Part 6']],
    note: 'Solves V″ = 0 and V′ = 0 together: the motor angle at which the occupied well disappears.',
    uses: ['Vpp', 'eqmap'],
  },
  {
    id: 'land', sec: 'nrg', title: 'Landing state', kind: 'derived',
    tex: r`\theta_{\text{stable}}:\; V'(\theta)=0,\; V''(\theta)>0,\; \theta > \theta_{\text{peak}}`,
    src: [['R', 'Part 6']],
    note: 'Found numerically (bisection), the first stable root past the fold.',
    uses: ['fold'],
  },
  {
    id: 'integ', sec: 'nrg', title: 'Real-time integrator', kind: 'assumed',
    tex: r`\begin{gathered} v_{k+1} = 0.85\,v_k - 0.02\,V'(\theta_k), \quad |v| \le 0.25 \\ \theta_{k+1} = \theta_k + v_{k+1} \end{gathered}`,
    src: [['R', 'Part 4']],
    note: 'Numerical choices, six substeps per frame. The rules require seeding from the previous frame so hysteresis appears. A snap is flagged when the twist rate exceeds 4 rad/s.',
    uses: ['V'],
    shown: ['Sim · Twist rate', 'Sim · Tip twist θ', 'Sim · snap flash'],
  },

  /* ── 4 · Snap energy ──────────────────────────────────────────── */
  {
    id: 'dE', sec: 'snap', title: 'Snap energy (dimensionless)', kind: 'derived',
    tex: r`\Delta E = V(\theta_{\text{peak}}) - V(\theta_{\text{stable}})`,
    src: [['R', 'Part 6']],
    note: 'Exact within the reduced model: the height of the drop the state falls through.',
    uses: ['fold', 'land'],
  },
  {
    id: 'scale', sec: 'snap', title: 'Snap energy in joules', kind: 'assumed',
    tex: r`E_{\text{snap}} = \Delta E\;\frac{2\,k_{\text{eff}}}{L_c}, \qquad k_{\text{eff}} = \left(\frac{1}{k_{1t}} + \frac{1}{k_{2t}}\right)^{-1}`,
    src: [['R', 'Part 4']],
    note: 'Reduces to the rules’ ΔE·k_t/L_c for identical tubes. A direct derivation gives k_eff/L_c, so this convention may be 2× high. The factor is uniform, so rankings are unaffected.',
    uses: ['dE', 'stiff'],
    shown: ['Design · sweet spot mJ', 'Design · tooltip', 'Sim · compass Σ'],
  },
  {
    id: 'stored', sec: 'snap', title: 'Torsional energy stored at the fold', kind: 'derived',
    tex: r`E_{\text{stored}} = \tfrac12\left(\theta_{\text{peak}} - \alpha_{\text{snap}}\right)^2 \frac{2\,k_{\text{eff}}}{L_c}`,
    note: 'The twist term of V at the fold, in joules. The gauge’s colour bands are heuristic.',
    uses: ['fold', 'scale'],
    shown: ['Design · Safety check'],
  },
  {
    id: 'Win', sec: 'snap', title: 'Motor work per revolution', kind: 'derived',
    tex: r`W_{\text{in}} = \oint \left|\tau\,d\alpha\right| = \int_0^{2\pi}\left|\lambda\sin\theta\,(1+\lambda\cos\theta)\right|d\theta`,
    src: [['R', 'Part 6']],
    note: 'τ = −λ sin θ from V′ = 0 and dα = (1 + λ cos θ) dθ from the equilibrium map. Exact within the model.',
    uses: ['eqmap'],
    shown: ['Design · Score'],
  },

  /* ── 5 · Kinematics ───────────────────────────────────────────── */
  {
    id: 'curv', sec: 'kin', title: 'Backbone curvature', kind: 'adopted',
    tex: r`\begin{gathered} K_x = w_1\kappa_1 + w_2\kappa_2\cos\theta,\quad K_y = w_2\kappa_2\sin\theta \\ w_i = \frac{k_{ib}}{k_{1b}+k_{2b}} \end{gathered}`,
    src: [['G16', 'p. 23, Eq. (3)'], ['R', 'Part 5']],
    note: 'The overlap bends to the stiffness-weighted sum of the two precurvature vectors (planar-precurvature case).',
    uses: ['stiff'],
    shown: ['Sim · Resultant |K|', 'Sim · curvature arrows'],
  },
  {
    id: 'bishop', sec: 'kin', title: 'Centreline integration', kind: 'derived',
    tex: r`p_{i+1} = p_i + R_i\,e_3\,\Delta s, \qquad R_{i+1} = R_i \exp\!\big(\widehat{K}_i\,\Delta s\big), \quad N = 50`,
    src: [['G16', 'p. 21, Bishop frames'], ['R', 'Part 5']],
    note: 'Discrete Bishop-frame march with Rodrigues rotations (standard). N = 50 steps per overlap.',
    uses: ['curv', 'twist'],
    shown: ['Sim · 3-D shape', 'Sim · ground tracks'],
  },
  {
    id: 'ext', sec: 'kin', title: 'Distal fin extension', kind: 'derived',
    tex: r`K = \kappa_2\left(\cos\theta_{\text{tip}},\ \sin\theta_{\text{tip}},\ 0\right), \qquad s \in [L_c,\ L_c + L_{\text{ext}}]`,
    src: [['G16', 'p. 23, Eq. (3) with one tube present']],
    note: 'Beyond the sheath only the fin is present, so it carries its own curvature. Treating it as torsion-free out there is an assumption.',
    uses: ['curv'],
    shown: ['Sim · fin tip', 'propulsion efficiency'],
  },
  {
    id: 'rigidK', sec: 'kin', title: 'Rigid-sheath weights', kind: 'derived',
    tex: r`k_{1b}\to\infty:\quad w_1 = 1,\ \ w_2 = 0`,
    note: 'The limit of §5.1: a rigid sheath keeps its own arc and the fin conforms to it.',
    uses: ['curv'],
    shown: ['Design · fully constrained'],
  },

  /* ── 6 · Propulsion efficiency ────────────────────────────────── */
  {
    id: 'stroke', sec: 'prop', title: 'Snap stroke', kind: 'assumed',
    tex: r`\begin{gathered} \theta:\ \theta_{\text{peak}}\to\theta_{\text{stable}}\ \text{at fixed}\ \alpha_{\text{snap}} \\ \Delta E_k = V(\theta_k) - V(\theta_{k+1}) \end{gathered}`,
    note: 'The snap is taken as the quasi-static tip path, split into pieces weighted by the energy each releases. Fluid loading and inertia are ignored.',
    uses: ['fold', 'land', 'bishop', 'ext'],
  },
  {
    id: 'net', sec: 'prop', title: 'Net snap vector', kind: 'assumed',
    tex: r`\mathbf N = \sum_i E_i\,\hat u_i, \qquad \hat u_i \propto \sum_k \Delta E_k\,\hat d_k`,
    note: 'Each snap points where its arc pushes (the energy-weighted mean direction), with length equal to its energy.',
    uses: ['stroke', 'scale'],
    shown: ['Sim · snap compass (Σ, bearing)'],
  },
  {
    id: 'eta', sec: 'prop', title: 'Snap propulsion efficiency', kind: 'assumed',
    tex: r`\begin{gathered} \eta_{\text{prop}} = \frac{F - B}{E}, \qquad E = \sum_k \Delta E_k \\ F = \sum_k \Delta E_k \max(\hat d_k\!\cdot\!\hat n,\, 0) \\ B = \sum_k \Delta E_k \max(-\hat d_k\!\cdot\!\hat n,\, 0) \end{gathered}`,
    src: [['A26', 'p. 1, objective to evaluate propulsion efficiency']],
    note: 'Project definition. A straight snap along the net vector scores 100%. Backward motion cancels forward; sideways motion counts as lost.',
    uses: ['stroke', 'net'],
    shown: ['Sim · efficiency card', 'Sim · compass η', 'Design · sweet spot', 'Design · tooltip'],
  },
  {
    id: 'split', sec: 'prop', title: 'Forward / back / side shares', kind: 'derived',
    tex: r`\text{fwd} = \frac{F}{E}, \quad \text{back} = \frac{B}{E}, \quad \text{side} = 1 - \frac{F+B}{E}`,
    note: 'The three add to 100%, and η = fwd − back.',
    uses: ['eta'],
    shown: ['Sim · efficiency card'],
  },
  {
    id: 'prod', sec: 'prop', title: 'Productive snap energy', kind: 'assumed',
    tex: r`E_{\text{prod}} = E_{\text{snap}}\;\eta_{\text{prop}}`,
    note: 'The optimiser’s surface height: the energy a snap releases, times the share that pushes forward.',
    uses: ['scale', 'eta'],
    shown: ['Design · surface height', 'Design · sweet spot', 'Design · tooltip'],
  },

  /* ── 7 · Strain and fatigue ───────────────────────────────────── */
  {
    id: 'eb', sec: 'fat', title: 'Bending strain', kind: 'derived',
    tex: r`\varepsilon_b = \kappa\,\frac{d_o}{2}`,
    src: [['R', 'Part 6']],
    note: 'Standard beam bending, on each tube’s own diameter, with the larger governing. A rigid sheath is excluded.',
    uses: ['tubes'],
    shown: ['Design · Safety check'],
  },
  {
    id: 'gamma', sec: 'fat', title: 'Torsional shear strain', kind: 'assumed',
    tex: r`\gamma = \frac{\left|\theta_{\text{stable}} - \theta_{\text{peak}}\right|}{L_c}\,\frac{d_o}{2}`,
    src: [['R', 'Part 6']],
    note: 'Engineering estimate: the snap’s angle jump spread evenly over L_c. Each free tube is charged the full jump, a conservative choice.',
    uses: ['fold', 'land'],
  },
  {
    id: 'eeq', sec: 'fat', title: 'Equivalent strain', kind: 'assumed',
    tex: r`\varepsilon_{\text{eq}} = \sqrt{\varepsilon_b^2 + 0.33\,\gamma^2}`,
    src: [['R', 'Part 6']],
    note: 'Approximate combined metric. The 0.33 is a deliberate stand-in, and this is not the von Mises strain.',
    uses: ['eb', 'gamma'],
    shown: ['Design · sweet spot', 'Design · Safety check', 'Design · tooltip', 'Design · fatigue contour'],
  },
  {
    id: 'life', sec: 'fat', title: 'Fatigue life', kind: 'assumed',
    tex: r`N = 10\,\varepsilon_{\text{eq}}^{-5}`,
    src: [['CM', 'functional form'], ['R', 'Part 6']],
    note: 'The constants 10 and −5 are illustrative, not fitted to Nitinol data. Use for ranking only; absolute cycle counts are optimistic by orders of magnitude.',
    uses: ['eeq'],
    shown: ['Design · sweet spot', 'Design · Safety check', 'Design · tooltip'],
  },
  {
    id: 'allow', sec: 'fat', title: 'Allowable strain', kind: 'derived',
    tex: r`\varepsilon_{\text{allow}} = \left(\frac{10}{N_{\text{target}}}\right)^{1/5}`,
    src: [['R', 'Part 6']],
    note: 'Inverts §7.4 for the target life, so it inherits that law’s assumed constants.',
    uses: ['life'],
    shown: ['Design · sweet spot', 'Design · Fatigue & scoring'],
  },
  {
    id: 'se', sec: 'fat', title: 'Superelastic limit', kind: 'assumed',
    tex: r`\varepsilon_{\text{SE}} \approx 8\%`,
    src: [['R', 'Part 6']],
    note: 'Commonly quoted one-time (monotonic) limit. Used only for the gauge colour bands, never as a cyclic gate.',
    shown: ['Design · Safety check'],
  },
  {
    id: 'kceil', sec: 'fat', title: 'Fatigue curvature ceiling', kind: 'derived',
    tex: r`\kappa_{\max} = \frac{2\,\varepsilon_{\text{allow}}}{d_o}`,
    src: [['R', 'Part 6']],
    note: 'The curvature at which bending strain alone reaches the allowable. It optionally clips the κ axis.',
    uses: ['eb', 'allow'],
    shown: ['Design · Graph axes'],
  },
  {
    id: 'kaxis', sec: 'fat', title: 'Default curvature range', kind: 'assumed',
    tex: r`0 \le \kappa \le 25\ \mathrm{m^{-1}}`,
    src: [['S25', 'p. 4692, fabricated tube 13.51 m⁻¹; p. 4695, assembly ≈ 7.2 m⁻¹']],
    note: 'Default only. Saini et al. give real Nitinol precurvatures inside this range.',
    shown: ['Design · Graph axes'],
  },

  /* ── 8 · Optimiser score ──────────────────────────────────────── */
  {
    id: 'hydro', sec: 'opt', title: 'Hydrodynamic saturation', kind: 'assumed',
    tex: r`\eta_{\text{hydro}} = 1 - e^{-k_\eta\,\eta_{\text{prop}}\,\Delta E}, \qquad k_\eta = 0.05`,
    src: [['Q26', 'p. 1, qualitative motivation only'], ['R', 'Part 6']],
    note: 'Engineering placeholder with no physical derivation. Quinn motivates saturating returns from bursts but gives no formula.',
    uses: ['dE', 'eta'],
    shown: ['Design · Score', 'Design · Fatigue & scoring'],
  },
  {
    id: 'gate', sec: 'opt', title: 'Fatigue gate', kind: 'assumed',
    tex: r`g = \exp\!\left[-\left(\frac{\varepsilon_{\text{eq}}}{\varepsilon_{\text{allow}}}\right)^{4}\right]`,
    src: [['R', 'Part 6']],
    note: 'Smooth penalty that collapses the score past the allowable strain. The exponent 4 is a choice.',
    uses: ['eeq', 'allow'],
  },
  {
    id: 'score', sec: 'opt', title: 'Score (surface colour)', kind: 'assumed',
    tex: r`\begin{gathered} \text{Score} = \eta_{\text{hydro}}\;\frac{\eta_{\text{prop}}\,\Delta E}{W_{\text{in}}}\;\exp\!\left[-\left(\frac{\varepsilon_{\text{eq}}}{\varepsilon_{\text{allow}}}\right)^{4}\right] \\ \text{colour} = \frac{\text{Score}}{\max\text{Score}} \end{gathered}`,
    src: [['R', 'Part 6']],
    note: 'Engineering composite: productive snap energy (η_prop·ΔE, the share that pushes forward) per unit motor work, times hydrodynamic saturation of that same productive energy, times the fatigue gate.',
    uses: ['hydro', 'dE', 'eta', 'Win', 'gate'],
    shown: ['Design · surface colour', 'Design · tooltip Score'],
  },
  {
    id: 'sweet', sec: 'opt', title: 'Sweet spot', kind: 'derived',
    tex: r`(\kappa^*, L_c^*) = \arg\max_{\text{grid}}\ \text{Score}, \qquad 50\times 50\ \text{grid}`,
    note: 'Numerical search over the axis bounds you set. If it lies on an edge of the box, the bounds rather than the physics set it.',
    uses: ['score'],
    shown: ['Design · The sweet spot'],
  },
  {
    id: 'verdict', sec: 'opt', title: 'Design verdicts', kind: 'assumed',
    tex: r`\begin{gathered} \text{Optimal}: >0.75\max,\quad \text{Workable}: >0.3\max \\ \text{Failure}: \varepsilon_{\text{eq}} > \varepsilon_{\text{allow}} \end{gathered}`,
    note: 'Display thresholds, with life classes high-cycle above 10⁵ and low-cycle above 10³. Labels only; nothing is computed from them.',
    uses: ['score', 'life'],
    shown: ['Design · tooltip', 'Design · Safety check'],
  },
];

export const EQ_BY_ID = Object.fromEntries(EQUATIONS.map((e) => [e.id, e]));

/* §-numbers: section index . entry index within the section, LaTeX style. */
export const EQ_NUM = (() => {
  const out = {};
  SECTIONS.forEach((s, si) => {
    EQUATIONS.filter((e) => e.sec === s.id).forEach((e, ei) => { out[e.id] = `${si + 1}.${ei + 1}`; });
  });
  return out;
})();
