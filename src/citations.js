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
  {
    key: 'MO50', n: 8, short: 'Morison et al. 1950',
    text: 'J. R. Morison, M. P. O’Brien, J. W. Johnson, S. A. Schaaf, “The force exerted by surface waves on piles,” Petroleum Transactions AIME, vol. 189, pp. 149–154, 1950.',
    role: 'The drag-plus-inertia force on a cylinder in a fluid, applied per segment to the normal velocity.',
  },
  {
    key: 'BR82', n: 9, short: 'Brennen 1982',
    text: 'C. E. Brennen, “A review of added mass and fluid inertial forces,” Report CR 82.010, Naval Civil Engineering Laboratory, Port Hueneme, 1982.',
    url: 'https://authors.library.caltech.edu/records/6819e-vnh65',
    role: 'Added mass of a body accelerating in a fluid; for a circular cylinder in potential flow, one displaced fluid mass per unit length.',
  },
  {
    key: 'WM06', n: 10, short: 'White & Majdalani 2006',
    text: 'F. M. White, J. Majdalani, Viscous Fluid Flow, 3rd ed., McGraw-Hill, 2006 — circular-cylinder drag fit, as reproduced and compared in H. A. Elghannay, Y. M. F. El Hasadi, Al-Mukhtar Journal of Engineering Research 7(1), pp. 20–28, 2023.',
    role: 'C_D(Re) of a circular cylinder in cross-flow below the drag crisis (Re < 2.5·10⁵), built on Tritton’s and Wieselsberger’s data.',
  },
  {
    key: 'GO17', n: 11, short: 'Gomez et al. 2017',
    text: 'M. Gomez, D. E. Moulton, D. Vella, “Critical slowing down in purely elastic ‘snap-through’ instabilities,” Nature Physics, vol. 13, pp. 142–145, 2017.',
    doi: '10.1038/nphys3915',
    role: 'Snap-through near a fold is slow even without dissipation; inertial bottleneck time ∝ Δμ^(−1/4). Used to validate the solver.',
  },
  {
    key: 'HS96', n: 12, short: 'Hosea & Shampine 1996',
    text: 'M. E. Hosea, L. F. Shampine, “Analysis and implementation of TR-BDF2,” Applied Numerical Mathematics, vol. 20, pp. 21–37, 1996.',
    role: 'The stiff integrator: TR-BDF2 as an L-stable DIRK 2(3) pair (§2) and its stiffness-corrected error estimate (§6).',
  },
  {
    key: 'BA85', n: 13, short: 'Bank et al. 1985',
    text: 'R. E. Bank, W. M. Coughran Jr., W. Fichtner, E. H. Grosse, D. J. Rose, R. K. Smith, “Transient simulation of silicon devices and circuits,” IEEE Trans. Computer-Aided Design, vol. 4, pp. 436–451, 1985.',
    role: 'Origin of TR-BDF2.',
  },
  {
    key: 'KKO', n: 14, short: 'Kokotović et al. 1986',
    text: 'P. V. Kokotović, H. K. Khalil, J. O’Reilly, Singular Perturbation Methods in Control: Analysis and Design, Academic Press, 1986.',
    role: 'Tikhonov-type reduction: a fast variable (here the twist) stays on its quasi-static manifold except where that manifold folds.',
  },
  {
    key: 'NI', n: 15, short: 'Nitinol data (ASTM F2063)',
    text: 'Nitinol (NiTi, ASTM F2063) density 6.45 g/cm³, as published in supplier data sheets (e.g. Johnson Matthey, “Comparison of properties of Nitinol and stainless steel”).',
    url: 'https://matthey.com/products-and-services/medical-components/resource-library/comparison-of-properties-of-nitinol-and-stainless-steel',
    role: 'Mass of the tube walls.',
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
  { id: 'dyn', title: 'Dynamics (physics solver)' },
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
  {
    id: 'planarCrit', sec: 'bif', title: 'Snap test with a planar outer tube', kind: 'derived',
    tex: r`\lambda_{\text{eff}} = -\min_\theta\big(\lambda\cos\theta + \mu\cos 2\theta\big) > \frac{\pi^2}{4}`,
    src: [['G16', 'p. 25, Eq. (19) operator; p. 26, comparison argument for the trivial branch']],
    note: 'With the planar term the second-variation operator becomes Sh = −h″ + (λ cos θ + μ cos 2θ)h. Gilbert et al.’s comparison argument then guarantees stability while λ_eff ≤ π²/4, a sufficient condition that is exact when μ = 0 (λ_eff = λ). Closed form: λ − μ if λ ≥ 4μ, otherwise λ²/8μ + μ.',
    uses: ['planarV', 'crit'],
    shown: ['Sim · λ_eff card (planar)', 'Design · Tubes & constraint', 'Design · onset contour (planar)'],
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
    id: 'integ', sec: 'nrg', title: 'Simulator motion source', kind: 'derived',
    tex: r`\begin{gathered} \text{sweep: } (\alpha, \theta, \text{shape})(t) = \text{averaged physics cycle (§9)} \\ \text{motor stopped: } V'(\theta;\alpha) = 0 \text{ on the current branch} \end{gathered}`,
    src: [['R', 'Part 4']],
    note: 'Solve first, then display: when sweeping, the 3-D view plays back the time-domain physics solution for the current design (nothing moves until it is solved). With the motor stopped, the fin is shown at its static equilibrium, continued from the previous twist so hysteresis is kept. A snap is flagged when the physical twist rate exceeds 4 rad/s. (An earlier heavy-ball “solver” with arbitrary step and speed cap is no longer used for motion.)',
    uses: ['V', 'dynEOM'],
    shown: ['Sim · Twist rate', 'Sim · Tip twist θ', 'Sim · snap flash'],
  },
  {
    id: 'planarV', sec: 'nrg', title: 'Planar outer tube: energy term', kind: 'derived',
    tex: r`V = \tfrac12(\theta-\alpha)^2 - \lambda\cos\theta + \tfrac12\mu\sin^2\theta, \qquad \mu = L_c^2\,\kappa_2^2\,\frac{k_{2b}^2}{k_{1b}+k_{2b}}\,\frac{k_{1t}+k_{2t}}{k_{1t}k_{2t}}`,
    src: [['G16', 'p. 22, Eq. (2) energy, minimised with K_y = 0']],
    note: 'Holding the overlap in the outer tube’s plane leaves the fin’s out-of-plane precurvature κ₂ sin θ to be held flat by the guide instead of shared with the sheath. The extra bending energy, scaled like λ, is ½μ sin²θ. For identical tubes μ = (1+ν)L_c²κ₂², the same size as λ. It pulls the fin toward the plane and moves the fold. μ = 0 in the other modes.',
    uses: ['V', 'stiff', 'planarK'],
    shown: ['Sim · energy landscape, equilibrium map, V and V″ (planar)', 'Design · Tubes & constraint'],
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
  {
    id: 'planarK', sec: 'kin', title: 'Planar outer tube: the constraint', kind: 'assumed',
    tex: r`K_y = 0 \ \text{on}\ s \in [0, L_c], \qquad K_x = w_1\kappa_1 + w_2\kappa_2\cos\theta`,
    note: 'An idealised frictionless guide: the sheath may bend in its own plane and twist about its axis, but its centreline cannot leave that plane. λ, the torsional compliance and the energy scale stay the clamped ones. The fin beyond the sheath is not guided and still leaves the plane.',
    uses: ['curv'],
    shown: ['Sim · 3-D shape and guide plane (planar)'],
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
    id: 'etaT', sec: 'prop', title: 'Snap torsional efficiency', kind: 'derived',
    tex: r`\begin{gathered} \eta_T = \frac{\Delta E_T}{\Delta E}, \qquad \Delta E_T = \tfrac12(\theta_{\text{peak}}-\alpha_{\text{snap}})^2 - \tfrac12(\theta_{\text{stable}}-\alpha_{\text{snap}})^2 \\ \Delta E = V(\theta_{\text{peak}}) - V(\theta_{\text{stable}}) \end{gathered}`,
    note: 'Share of the snap released by the twist term of V, for a fin used as a torsional spring that powers a separate propulsor. The remainder is the bending coupling (−λ cos θ) and, planar, the guide term. Selected with Modes → Efficiency → Torsion; the optimiser then scores η_T in place of η_prop.',
    uses: ['fold', 'dE'],
    shown: ['Sim · efficiency card (torsion)', 'Design · sweet spot', 'Design · tooltip'],
  },
  {
    id: 'rowing', sec: 'prop', title: 'Rowing integral', kind: 'assumed',
    tex: r`\begin{gathered} J_{\text{row}} = \oint_{\text{1 rev}} (\hat r\cdot\mathbf v)^2\,dx_{\text{fwd}} \;\approx\; \sum_k \Big(\frac{\hat r_k\cdot\Delta\mathbf p_k}{\Delta t}\Big)^{2} \Delta x_{\text{fwd},k} \\ \text{Score}_{\text{row}} = |J_{\text{row}}|\; g, \qquad W_{\text{drag}} \approx \tfrac12\rho\, C_D A\, J_{\text{row}} \end{gathered}`,
    vars: [
      [r`J_{\text{row}}`, 'Rowing integral over one steady motor revolution, m³/s²; relative between designs only'],
      [r`\hat r`, 'Unit roll vector at the tip: the fin’s blade-normal (κ₂) direction. Squared, so either face of the symmetric blade scores the same'],
      [r`\mathbf v`, 'Tip velocity, m/s; Δp is the tip displacement over one solver frame Δt'],
      [r`(\hat r\cdot\mathbf v)^2`, 'Relative force: blade-normal speed squared, the v² of the drag law'],
      [r`dx_{\text{fwd}}`, 'Tip displacement along FORWARD, m'],
      [r`\rho, C_D, A`, 'Water density, drag coefficient, blade area: left out, since κ and L_c do not change them'],
      [r`g`, 'Fatigue gate (§8.2)'],
    ],
    note: 'Project definition for comparing configurations as a rowing stroke, after the drag law F_D = ½ρC_D A v². Multiplying by ½ρC_D A turns it into drag work along forward per revolution (J). Computed with the live view’s solver at a fixed 60 fps: one warm-up revolution from rest, then one measured revolution. Selected with Optimise for → Rowing, or Modes → Efficiency → Rowing.',
    uses: ['eta'],
    shown: ['Design · surface height (rowing)', 'Design · sweet spot', 'Design · tooltip', 'Sim · 1D view'],
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
    vars: [
      [r`\eta_{\text{hydro}}`, 'Hydrodynamic saturation, 0 to 1'],
      [r`k_\eta`, 'Saturation rate, a tunable placeholder (Fatigue & scoring panel)'],
      [r`\eta_{\text{prop}}\,\Delta E`, 'Productive snap energy: snap energy times the share pushing forward (η_T in Torsion mode)'],
    ],
    note: 'Engineering placeholder with no physical derivation. Quinn motivates saturating returns from bursts but gives no formula.',
    uses: ['dE', 'eta'],
    shown: ['Design · Score', 'Design · Fatigue & scoring'],
  },
  {
    id: 'gate', sec: 'opt', title: 'Fatigue gate', kind: 'assumed',
    tex: r`g = \exp\!\left[-\left(\frac{\varepsilon_{\text{eq}}}{\varepsilon_{\text{allow}}}\right)^{4}\right]`,
    src: [['R', 'Part 6']],
    vars: [
      [r`g`, 'Fatigue gate, 0 to 1, multiplies the score'],
      [r`\varepsilon_{\text{eq}}`, 'Equivalent strain in the tubes'],
      [r`\varepsilon_{\text{allow}}`, 'Allowable strain for the target cycle life'],
    ],
    note: 'Smooth penalty that collapses the score past the allowable strain. The exponent 4 is a choice.',
    uses: ['eeq', 'allow'],
  },
  {
    id: 'score', sec: 'opt', title: 'Score (surface colour)', kind: 'assumed',
    tex: r`\begin{gathered} \text{Score} = \eta_{\text{hydro}}\;\frac{\eta_{\text{prop}}\,\Delta E}{W_{\text{in}}}\;\exp\!\left[-\left(\frac{\varepsilon_{\text{eq}}}{\varepsilon_{\text{allow}}}\right)^{4}\right] \\ \text{colour} = \frac{\text{Score}}{\max\text{Score}} \end{gathered}`,
    src: [['R', 'Part 6']],
    vars: [
      [r`\text{Score}`, 'Figure of merit for one design (κ, L_c); only its size relative to other designs matters'],
      [r`\eta_{\text{hydro}}`, 'Hydrodynamic saturation, 0 to 1: diminishing returns from a bigger burst (§8.1)'],
      [r`\eta_{\text{prop}}`, 'Snap propulsion efficiency, 0 to 1: share of the snap energy that pushes forward (§6.3). Replaced by η_T, the torsional share, when the objective is set to Torsion'],
      [r`\Delta E`, 'Snap energy: potential released by one snap, dimensionless (§4.1)'],
      [r`W_{\text{in}}`, 'Motor work put in over one revolution, same units as ΔE (§4.4)'],
      [r`\varepsilon_{\text{eq}}`, 'Equivalent strain in the tubes: bending plus twist (§7.3)'],
      [r`\varepsilon_{\text{allow}}`, 'Allowable strain for the target cycle life, set in the Fatigue & scoring panel (§7.5)'],
      [r`\exp[\cdots]`, 'Fatigue gate g, 0 to 1: about 1 well below ε_allow, collapses past it (§8.2)'],
      [r`\text{colour}`, 'Surface colour: Score divided by the best Score on the graph, 0 to 1'],
    ],
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
  /* ── 9 · Dynamics ─────────────────────────────────────────────── */
  {
    id: 'dynScale', sec: 'dyn', title: 'True strain energy', kind: 'derived',
    tex: r`U = \frac{k_{\text{eff}}}{L_c}\,V(\theta,\alpha) + \tfrac12\!\sum_{\text{seg}} k_B\,\Delta s\,\lvert u - u_{\text{eq}}(\theta,\alpha)\rvert^2,\qquad k_{\text{eff}} = \Big(\frac{1}{k_{1t}} + \frac{1}{k_{2t}}\Big)^{-1}`,
    src: [['G16', 'Eq. (2) p. 22, Eq. (16) p. 25']],
    vars: [
      [r`k_{\text{eff}}`, 'Torsional stiffness of the relative twist: the tubes carry it in series (k2t alone with a rigid sheath)'],
      [r`V`, 'The reduced energy of §3, exactly as the rest of the app uses it'],
      [r`u,\ u_{\text{eq}}`, 'Centreline curvature (state) and its equilibrium value, the stiffness-weighted mean of the tubes’ precurvatures'],
      [r`k_B`, 'k1b + k2b on the overlap, k2b on the extension'],
    ],
    note: 'Kirchhoff rod energy with its ½. The bending part is split by completing the square: Σ½k_ib|u − κ_i e_i|² = ½(Σk_ib)|u − ū|² + terms in θ only, so at rest (u = u_eq) U is exactly the reduced model scaled to joules. Gilbert et al. write Eq. (2) without the ½; that is harmless for equilibria, but makes the app’s display energy scale k_t/L_c twice the physical value. The solver uses the physical one; displayed E_snap values elsewhere keep the app’s convention.',
    uses: ['V', 'lambda'],
    shown: ['Physics solver (all dynamics)'],
  },
  {
    id: 'dynMass', sec: 'dyn', title: 'Kinetic energy and added mass', kind: 'adopted',
    tex: r`T = \tfrac12 \sum_{\text{seg}} \big( m\,\lvert v\rvert^2 + m_a\,\lvert P_n v\rvert^2 \big),\quad m_a = C_a\,\rho_f\,\tfrac{\pi}{4}D^2\,\Delta s,\quad P_n = I - t t^{\mathsf T}`,
    src: [['BR82', 'added mass of a circular cylinder, C_a = 1'], ['NI', 'density']],
    vars: [
      [r`m`, 'Nitinol walls (6450 kg/m³) plus the fluid carried inside the tubes, per segment'],
      [r`m_a`, 'Added mass: fluid the segment drags along when it moves sideways'],
      [r`P_n`, 'Projection onto the plane normal to the segment tangent t'],
      [r`C_a`, 'Added-mass coefficient, 1 for a circular cylinder in potential flow'],
    ],
    note: 'Added mass acts on the normal velocity only (slender-body approximation). Spin inertia of the tubes about their own axes is not used: torsion is ~500× faster than bending here (see the twist entry).',
    uses: [],
    shown: ['Physics solver'],
  },
  {
    id: 'dynDrag', sec: 'dyn', title: 'Fluid drag per segment', kind: 'adopted',
    tex: r`\begin{gathered} f = -\tfrac12\,\rho_f\,C_D(\mathrm{Re})\,D\,\Delta s\,\lvert v_n\rvert\,v_n,\qquad \mathrm{Re} = \frac{\rho_f \lvert v_n\rvert D}{\mu_f} \\ C_D = 1 + 10\,\mathrm{Re}^{-2/3} \end{gathered}`,
    src: [['MO50', 'drag term'], ['WM06', 'cylinder fit, valid below the drag crisis']],
    vars: [
      [r`v_n`, 'Segment velocity normal to its axis (independence principle: only the cross-flow component counts)'],
      [r`\rho_f,\ \mu_f`, 'Water 998.2 kg/m³, 1.002 mPa·s; air 1.204 kg/m³, 18.13 µPa·s (20 °C)'],
      [r`D`, 'Outer diameter: the sheath on the overlap, the fin on the extension'],
    ],
    note: 'Quasi-steady drag: the coefficient is the steady-flow value at the instantaneous Reynolds number. Tangential skin friction, wake memory and interaction between segments are not modelled.',
    uses: [],
    shown: ['Physics solver', 'Medium mode (water / air)'],
  },
  {
    id: 'dynTwist', sec: 'dyn', title: 'Quasi-static twist and the twist snap', kind: 'derived',
    tex: r`\begin{gathered} \theta(t) = \text{local min of } U(\theta;\,q,\alpha) \text{ in the current basin} \\ \partial^2_\theta U \to 0 \;\Rightarrow\; \text{jump to the next basin},\quad W_{\text{jump}} = U(\theta^-) - U(\theta^+) \end{gathered}`,
    src: [['KKO', 'singular perturbation (Tikhonov) reduction'], ['R', 'Part 4: seed from the previous state']],
    note: 'Torsional waves in Nitinol run at √(G/ρ) ≈ 1.7 km/s; the twist mode of the overlap is ~5·10⁴ rad/s against ~10² rad/s for bending, so the twist sits at its minimum for the current shape. Where that minimum disappears the twist snaps on the torsional time scale, effectively instantly; the energy it sheds rings out as torsional vibration and is booked as a loss, W_jump. The basin is continued from the last accepted step, so the hysteresis survives.',
    uses: ['dynScale'],
    shown: ['Physics solver', 'Logs · energy per cycle'],
  },
  {
    id: 'dynLoss', sec: 'dyn', title: 'Material loss', kind: 'assumed',
    tex: r`Q_m = -\beta\,k_B\,\Delta s\,\dot u,\qquad \beta = \frac{\eta}{\omega_1}`,
    vars: [
      [r`\eta`, 'Loss factor of the Nitinol (default 0.01; austenite’s intrinsic damping is very low, superelastic hysteresis is not modelled)'],
      [r`\omega_1`, 'First bending mode of the fin at rest, so the damping ratio there is η/2'],
    ],
    note: 'Kelvin–Voigt damping on the bending strain rate. Higher modes are damped more (stiffness-proportional). Inter-tube friction is not modelled.',
    uses: ['dynScale'],
    shown: ['Physics panel (loss factor)'],
  },
  {
    id: 'dynEOM', sec: 'dyn', title: 'Equations of motion', kind: 'derived',
    tex: r`\begin{gathered} M(q)\,\ddot q = Q_e + Q_d + Q_m - \sum_{\text{seg}} \Big[ J^{\mathsf T} M_s\, c + J^{\mathsf T} \dot M_s\, v - \tfrac12\, v^{\mathsf T} \partial_q M_s\, v \Big] \\ v = J\dot q,\quad c = \dot J\,\dot q,\quad Q_e = -\partial_q U,\quad \alpha(t) = \Omega t \end{gathered}`,
    src: [['G16', 'Eqs. (3)–(4) p. 23: Bishop-frame centreline']],
    vars: [
      [r`q`, 'Centreline curvature at nodes (6 on the overlap, 3 on the extension, two components each), piecewise linear in arc length'],
      [r`J`, 'Exact Jacobian ∂p/∂q of the Bishop-frame march (SO(3) right Jacobian per segment)'],
      [r`M_s`, 'Segment mass tensor m I + m_a P_n'],
      [r`Q_d`, 'Drag (§9.3) mapped by Jᵀ'],
      [r`\Omega`, 'Motor speed (stiff motor, prescribed)'],
    ],
    note: 'Lagrange’s equations with the twist adiabatic. Written this way, T + U is conserved exactly when drag, loss and the motor are off. Checks: straight-tube cantilever modes within 1.7–3% of Euler–Bernoulli; motor work = drag + loss + twist-snap + Δ(T+U) to within 10⁻⁵ per cycle (the motor torque comes from the separate α equation); snap escape time near the fold ∝ δ^(−1/4) as Gomez et al. find; J and dissipation converge to ~10% and ~3% under mesh refinement.',
    uses: ['dynScale', 'dynMass', 'dynDrag', 'dynTwist', 'dynLoss', 'curv'],
    shown: ['3-D sim (sweep playback)', 'Logs', 'Rowing objective'],
  },
  {
    id: 'dynInt', sec: 'dyn', title: 'Time integration and cycles', kind: 'adopted',
    tex: r`\begin{gathered} \text{TR-BDF2: }\ \gamma = 2-\sqrt2,\ d = \gamma/2,\ w = \sqrt2/4,\quad \text{Est} = (I - h d J)^{-1}\,\text{est} \\ \text{cycle } n:\ \alpha \in [\alpha_{\text{snap}} - 20^\circ + 2\pi n,\ \alpha_{\text{snap}} - 20^\circ + 2\pi(n+1)) \end{gathered}`,
    src: [['HS96', '§2 tableau, §6 error estimate'], ['BA85', 'method']],
    note: 'The nodal bending model is stiff (highest discrete modes ~10⁵ rad/s), so an L-stable implicit method is used, with a simplified Newton iteration and a reused Jacobian. A step that crosses a twist snap is taken at ≤ 2 µs. Runs start from rest; the wind-up to the first fold is discarded; each cycle is one motor turn starting 20° before the fold, so it holds exactly one snap and two snaps can never share a cycle.',
    uses: ['dynEOM', 'fold'],
    shown: ['3-D sim', 'Logs', 'Rowing objective'],
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
