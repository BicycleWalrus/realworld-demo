# Issue #1 — Dark mode / theme toggle — Implementation Plan

## Issue summary

Add a dark color theme, switchable from a navbar control, in addition to
the current light appearance. Requirements: toggle works from any page
without a reload; the choice persists per-browser across reloads/visits;
an unset preference defaults to the OS/browser `prefers-color-scheme`;
every existing page/component stays legible in both themes; and the
light theme must remain pixel-equivalent to today when dark mode isn't
selected (purely additive).

## Relevant code today

- Styling is **not** component-scoped CSS-in-JS. The vast majority of
  visual styling (colors, borders, backgrounds) comes from a large
  static Bootstrap-4-derived stylesheet at `frontend/public/main.css`
  (~5,300 lines, ~584 color-related rules), loaded via a plain `<link>`
  in `frontend/index.html`. `frontend/src/index.css` is tiny (~28 lines,
  a handful of layout/utility rules) and is the only stylesheet that
  goes through Vite's build.
- `frontend/src/main.jsx` wraps the whole `HashRouter` tree in a single
  `AuthProvider` (`frontend/src/context/AuthContext.jsx`) — this is the
  established pattern for app-wide state: a `createContext` + provider
  component that reads an initial value from `localStorage`, exposes a
  `useX()` hook, and is mounted once at the top of `main.jsx`.
- `frontend/src/App.jsx` renders `<Navbar />` inside a plain `<header>`
  and wraps all routed pages — this is the natural mount point for a
  toggle control usable from any page.
- There is no existing dark-theme CSS, no theme-related dependency, and
  no build step that processes `public/main.css` (it's served as-is).

## Three implementation approaches

### Approach 1 — CSS variables + `data-theme` attribute, hand-authored dark overrides

**Mechanism:** Introduce CSS custom properties for the palette (text,
background, border, link, muted colors, etc.) and put a `data-theme="dark"`
attribute on `<html>` (or `<body>`) when dark mode is active. Write a new
stylesheet (e.g. `frontend/src/theme.css`, imported after `index.css`)
containing `[data-theme="dark"] { ... }` overrides for the CSS variables,
plus a curated set of `[data-theme="dark"] .some-bootstrap-class { ... }`
overrides for the highest-traffic Bootstrap rules in `main.css` that hardcode
colors directly (buttons, `.navbar`, `.card`, form inputs, `.article-preview`,
etc.) rather than rewriting `main.css` itself.

**State & persistence:** New `ThemeContext`/`ThemeProvider` mirroring
`AuthContext.jsx`: reads `localStorage.getItem("theme")` on init; if unset,
falls back to `window.matchMedia("(prefers-color-scheme: dark)").matches`.
Exposes `theme` and `toggleTheme`/`setTheme`. A `useEffect` sets
`document.documentElement.setAttribute("data-theme", theme)` and writes to
`localStorage` whenever `theme` changes. Also subscribe to the
`matchMedia` change event so a live OS-preference change is picked up
*if* the user has never explicitly chosen (don't override an explicit
choice).

**OS-preference detection:** `window.matchMedia("(prefers-color-scheme: dark)")`,
checked once at init and optionally listened to via `.addEventListener("change", …)`.

**File-level changes:**
- New: `frontend/src/context/ThemeContext.jsx`, `frontend/src/theme.css` (or `.jsx`-scoped styles).
- Edit: `frontend/src/main.jsx` (mount `ThemeProvider` alongside/inside `AuthProvider`), `frontend/src/App.jsx` or `Navbar.jsx` (mount the toggle control), `frontend/index.html` or `main.jsx` (import the new stylesheet).
- No changes to `public/main.css` itself (avoids risk of breaking the pixel-equivalent light theme).

**Tradeoffs/risks:**
- Lowest risk to the "light theme unchanged" constraint — nothing in `main.css` is touched, only additive overrides scoped under `[data-theme="dark"]`.
- Highest authoring effort: someone has to manually enumerate and override enough of the ~584 color rules in `main.css` to make every existing page legible in dark mode (navbar, forms, buttons, article body, tags, comments, settings, pagination, dropdowns). Easy to miss a component and ship a low-contrast/invisible element (violates AC directly).
- No FOUC risk if the `data-theme` attribute is set synchronously before paint (see the inline-script mitigation in Approach 2) — otherwise a brief light-theme flash is possible on dark-preferring browsers since `index.html` has no theme logic today.
- Maintenance burden going forward: every future style addition to `main.css` needs a matching dark override remembered by hand — nothing enforces parity.

### Approach 2 — Full CSS-variable rewrite of `main.css`'s color usage

**Mechanism:** Do a one-time pass converting `main.css`'s hardcoded
color values (hex/rgb literals) into `var(--color-*)` custom properties
defined once at `:root` for light values, with a second `:root[data-theme="dark"]`
(or `.dark`) block redefining the same variables. This makes *every*
existing rule theme-aware automatically instead of needing per-component
override rules.

**State & persistence:** Same `ThemeContext` pattern as Approach 1
(localStorage + `matchMedia` default + context/hook). To avoid a
light-theme flash, add a tiny inline `<script>` in `frontend/index.html`
(before `main.css` loads) that reads `localStorage`/`matchMedia`
synchronously and sets `document.documentElement.dataset.theme` before
first paint; the React `ThemeProvider` then just reconciles/updates it.

**OS-preference detection:** Same `matchMedia` check, additionally
duplicated in the inline bootstrap script for pre-paint correctness.

**File-level changes:**
- New: `frontend/src/context/ThemeContext.jsx`.
- Edit: `frontend/public/main.css` (large mechanical edit — replace
  color literals with `var(--...)`, add root variable blocks), `frontend/index.html` (inline theme-bootstrap script), `frontend/src/main.jsx`, `Navbar.jsx`/`App.jsx` for the toggle.

**Tradeoffs/risks:**
- Best long-term maintainability and most consistent dark-mode coverage (nothing gets missed component-by-component since the base rules themselves are theme-aware).
- Directly touches the file the "pixel-equivalent light theme" constraint cares most about — a mechanical color→variable substitution is low-conceptual-risk but high-line-count (hundreds of edits across ~5,300 lines), and any transcription mistake (wrong variable, missed selector, changed specificity/cascade order) could visibly alter the *light* theme, which is the one thing this issue says must not change. Requires careful visual diffing (e.g. screenshot comparison) across every page/component to prove pixel-equivalence.
- `main.css` is currently unversioned/hand-maintained (no source Sass/Less, no build step) — this is effectively a manual refactor of a generated Bootstrap theme, not idiomatic to edit further by hand, and future upstream theme updates would need to be re-applied through the same substitution again.
- Largest PR by line-count of the three approaches, harder to review.

### Approach 3 — CSS filter/invert-based "dark mode" (no palette authoring)

**Mechanism:** Apply a CSS `filter: invert(1) hue-rotate(180deg)` (with
compensating `filter: invert(1) hue-rotate(180deg)` re-inversion on
images/icons/avatars so photos don't look like photo-negatives) to the
whole document when dark mode is active, via a class/attribute on `<html>`.
This is the technique some browser extensions and quick-and-dirty
dark-mode toggles use — it doesn't require touching `main.css` or
authoring a palette at all.

**State & persistence:** Same `ThemeContext` pattern as the other two
approaches (localStorage + `matchMedia` default).

**OS-preference detection:** Same `matchMedia` check.

**File-level changes:**
- New: `frontend/src/context/ThemeContext.jsx`, small CSS block (in `index.css`) defining the `.dark-mode` filter rule and an `img, .avatar, [data-no-invert] { filter: invert(1) hue-rotate(180deg); }` counter-rule for images/icons.
- Edit: `frontend/src/main.jsx`, `Navbar.jsx`/`App.jsx` for the toggle.

**Tradeoffs/risks:**
- By far the least implementation effort and lowest risk of touching/breaking the light theme (zero edits to `main.css`; the filter is applied conditionally and removed entirely when not selected, so light mode is trivially pixel-identical).
- Visual quality is the weakest of the three: colors get hue-shifted rather than intentionally chosen (e.g. brand blues can turn odd shades, gradients/shadows can look muddy), and every image/icon needs an explicit counter-filter or it inverts too — the ionicons icon font in particular may need testing since icon glyphs are usually monochrome and may invert fine, but this needs verification. Risk of an "it works but looks bad/off-brand" result that technically satisfies "legible" but not much more.
- Filter-based inversion can produce contrast or color-blindness-accessibility surprises in edge cases (e.g. `outline`/box-shadow color shifts) that are harder to reason about than a hand-chosen dark palette.
- Least respected as a "real" dark mode by users familiar with the pattern; more of a stopgap.

## Decision

**Going forward with Approach 1** (CSS variables + `data-theme` attribute,
hand-authored dark overrides layered on top of the existing `main.css`).

## Recommendation

**Approach 1** (CSS variables + `data-theme` attribute with hand-authored,
scoped dark overrides layered on top of the existing `main.css`, not
inside it). It satisfies the "purely additive, pixel-equivalent light
theme" constraint with the least risk, since it never edits `main.css`
— the file the constraint is protecting — at all. It costs more manual
effort than Approach 3 to reach good coverage, but produces a properly
designed dark palette rather than an inverted-filter approximation, and
it's a much smaller, more reviewable diff than Approach 2's full
variable-ization of a 5,300-line generated stylesheet. Mitigate the
FOUC/missed-component risks called out above by (a) setting the
`data-theme` attribute synchronously via a small inline script in
`index.html` before `main.css`/React load, and (b) doing a manual
page-by-page pass (home, article, editor, profile, settings, login/signup,
navbar dropdowns) to check contrast before calling the dark palette done.

## Pros and Cons Analysis

### Approach 1 — CSS variables + `data-theme` attribute, hand-authored dark overrides

**Pros:**
- *Ease of use (dev):* Straightforward, well-understood pattern (context + `data-attribute` + scoped CSS); no new dependency to learn.
- *Ease of use (end user):* Toggle is instant, no reload, and a well-authored palette gives a proper dark-mode look (not an approximation).
- *Performance:* Only a small new stylesheet is added; no changes to the existing 5,300-line `main.css`, so no risk of regressing parse/paint cost of the existing bundle. Toggling is just an attribute + class swap, cheap at runtime.
- *Maintainability:* Dark styling lives in one clearly-scoped, additive file (`theme.css`), easy to locate and reason about independent of `main.css`.
- *Simplicity of code:* Small, self-contained diff — new context, new stylesheet, two mount points. Low cognitive overhead to review.

**Cons:**
- *Ease of use (dev):* Authoring overrides for enough of ~584 color rules is tedious, manual, and easy to under-cover — a missed component silently fails the legibility AC.
- *Ease of use (end user):* If coverage is incomplete, some pages/components may look broken or low-contrast in dark mode until backfilled.
- *Performance:* Negligible negative — slightly more CSS to download/parse, though trivial at this scale.
- *Maintainability:* No structural enforcement of parity — every new component/style added to `main.css` in the future needs someone to remember to add a matching dark override; drift is likely over time.
- *Simplicity of code:* The override list will grow long and somewhat repetitive as coverage increases, even though each individual rule is simple.

### Approach 2 — Full CSS-variable rewrite of `main.css`'s color usage

**Pros:**
- *Ease of use (dev):* Once done, adding new UI automatically works in both themes for free — no more "did I remember the dark override?" step.
- *Ease of use (end user):* Most complete and consistent dark-mode coverage of the three approaches — nothing gets missed component-by-component.
- *Performance:* CSS custom properties have negligible runtime cost; no meaningful performance difference from Approach 1 once converted.
- *Maintainability:* Best long-term maintainability — theme-awareness is structural (variables), not a parallel override list that can drift out of sync.
- *Simplicity of code:* Conceptually simple end state — one set of rules, two variable blocks — easier to reason about *after* the conversion is complete.

**Cons:**
- *Ease of use (dev):* Very high one-time effort — hundreds of manual substitutions across ~5,300 lines, with no build step or source Sass/Less to lean on; effectively hand-refactoring a generated stylesheet.
- *Ease of use (end user):* Highest risk of visibly changing the *light* theme by accident (wrong variable, missed selector, altered cascade/specificity) — directly threatens the "pixel-equivalent light theme" constraint, the one thing this issue must not break.
- *Performance:* No real performance cost either way; not a differentiator here.
- *Maintainability:* Any future upstream Bootstrap theme update would need the same manual substitution re-applied, since there's no automated pipeline generating this file.
- *Simplicity of code:* Largest PR by line count of the three approaches — hardest to review, hardest to verify correctness of (requires screenshot/visual diffing across every page to prove pixel-equivalence).

### Approach 3 — CSS filter/invert-based "dark mode" (no palette authoring)

**Pros:**
- *Ease of use (dev):* By far the least implementation effort — no palette authoring, no `main.css` edits at all, near-zero risk of touching the protected light theme.
- *Ease of use (end user):* Works everywhere instantly, with guaranteed full "coverage" (every pixel is inverted, so nothing is missed the way manual overrides can be).
- *Performance:* CSS `filter` on a large subtree can be measurably more expensive to composite/repaint than plain color rules, especially on lower-end devices, but for a mostly-static content site this is likely a minor concern rather than a hard blocker.
- *Maintainability:* Trivial to maintain — one filter rule and one counter-rule for images; nothing to keep in sync as new components are added.
- *Simplicity of code:* Smallest possible diff of the three — a couple of CSS rules plus the shared context/toggle scaffolding.

**Cons:**
- *Ease of use (dev):* Every image/icon needs an explicit counter-filter or it inverts incorrectly (photo-negative look); requires verification across avatars, article images, and the icon font.
- *Ease of use (end user):* Weakest visual quality — hue-shifted brand colors, muddy gradients/shadows, and a result that's technically legible but often looks "off" or unpolished rather than intentionally designed; least likely to be perceived as a "real" dark mode by users familiar with the pattern.
- *Performance:* Filter-based inversion is the most likely of the three to introduce paint/composite overhead, since the browser must apply a filter effect over the whole viewport rather than just swapping color values.
- *Maintainability:* Deceptively low-maintenance day-to-day, but any future design element (new icon, new image treatment) needs to be remembered as a potential invert-exception — an easy detail to forget since it's not enforced anywhere.
- *Simplicity of code:* Simple to write, but the *visual* result is the hardest of the three to control or reason about, since hue-rotation/inversion effects are less predictable than explicit variable values.
