# Design Critique Report: Swapnil Sharma (swappysh.github.io)

This report provides a holistic design review of the current codebase, focusing on recent fixes and identifying opportunities for further polish, boldness, and delight.

## 1. Recent Fixes Verification

| Fix Item | Status | Observations |
| :--- | :--- | :--- |
| **Logo Font** | **WORKING** | Correctly uses `JetBrains Mono` via the `--font-mono` variable. Verified in `_logo.scss` and `head.html`. |
| **Recent Posts Date** | **WORKING** | Uses `JetBrains Mono` in a "pill" style with a subtle background (`rgba($accent, 0.08)` / `0.12`). Verified in `main.scss`. |
| **Social Icon Scale** | **WORKING** | Smooth `transform: scale(1.1)` transition on hover. Verified in `main.scss`. |
| **Footer Polish** | **WORKING** | Clean, centered layout with bullet separators. Verified in `_footer.scss` and `footer.html`. |
| **Light-Theme Glow** | **WORKING** | Subtle `radial-gradient` in `::before` pseudo-element for `.home__inner`. Verified in `main.scss`. |

---

## 2. Anti-Patterns Verdict
**PASS**: The interface does **not** look like typical AI-generated "slop."
- **Why**: It uses high-quality, professional typography (IBM Plex Sans & JetBrains Mono) that feels intentional for an engineer. The layout is minimalist and functional, avoiding generic glassmorphism, aggressive gradients, or over-the-top hero sections found in many AI-generated boilerplates. The "glow" is subtle and targeted rather than being a core aesthetic crutch.

---

## 3. Overall Impression
The design is clean, technical, and confident. It effectively communicates the persona of an AI/ML engineer through its choice of typography, color palette, and minimalist structure. The reveal animations add a layer of sophistication, and the hierarchy is clear.

---

## 4. Priority Issues & Suggestions

### Priority 1: Typography Polish (Missing Font Weight)
- **What**: The Google Fonts import in `head.html` is missing the `500` (Medium) weight, but `500` is used extensively in `main.scss` for subtitles, bio text, and list item titles.
- **Why it matters**: Browsers will fall back to `400` (Regular), making these elements look less distinct and slightly less "premium."
- **Fix**: Update the Google Fonts URL to include `wght@400;500;600;700`.
- **Command**: `/polish`

### Priority 2: Accent Color Consistency (Logo Cursor)
- **What**: The Logo cursor is currently `$logo-cursor: #fe5186;` (Pink-ish), while the rest of the site uses `$accent: #f59e0b;` (Amber/Orange).
- **Why it matters**: While the pink is a theme default, switching it to the Amber accent color would unify the brand identity and feel more "designed" and less "out of the box."
- **Fix**: Update `$logo-cursor` to use `$accent` in `assets/scss/main.scss`.
- **Command**: `/normalize`

### Priority 3: Footer Delight & Utility
- **What**: The footer is currently very minimal (just two lines of text).
- **Why it matters**: It's a missed opportunity to reinforce social links and provide a "landing spot" for users who scroll to the bottom.
- **Fix**: Add a secondary set of social icons to the footer and perhaps a more distinctive layout (e.g., three columns or centered group).
- **Command**: `/delight`

### Priority 4: Social Icon Refinement
- **What**: The social icons in the homepage use `&nbsp;` for spacing (from the theme partial).
- **Why it matters**: It's brittle and inconsistent. The icons themselves could also benefit from a more "branded" hover state.
- **Fix**: Override `social-icons.html` to remove `&nbsp;` and use Flexbox `gap`. Add a subtle color shift on hover (e.g., to the platform's brand color).
- **Command**: `/polish`

---

## 5. Minor Observations
- **Hero Title Size**: The `4.5rem` hero title is very bold (Good!). Ensure it scales well on very small screens (below 320px).
- **Light-Theme Glow**: The light-theme glow (`0.03` opacity) is *very* subtle. Increasing it slightly to `0.05` would make it more perceptible without being distracting.
- **Bio Text Line Height**: Currently `1.7`. This is great for readability.

---

## 6. Questions to Consider
- "What if the Logo text had a 'typewriter' reveal animation on load to match the terminal theme?"
- "Does the 'Back to top' button need a label, or is the arrow sufficient for the target audience?"
- "Could the 'Resume' CTA use a more unique shape or a glowing border to make it even more 'Bold'?"

---

## 7. Suggested Implementation Commands

```bash
# Update font loading to include Medium (500) weight
sed -i '' 's/IBM+Plex+Sans:wght@400;600;700/IBM+Plex+Sans:wght@400;500;600;700/g' layouts/partials/head.html

# Sync Logo cursor with site accent
# (In assets/scss/main.scss, change $logo-cursor value or usage)

# Slightly increase light-theme glow visibility
# (In assets/scss/main.scss, change rgba($accent, 0.03) to 0.05)
```
