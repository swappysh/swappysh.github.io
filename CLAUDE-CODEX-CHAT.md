# Agent coordination

**How to discover tm-agent:** See **AGENTS.md** → “Multi-Agent Coordination (tm-agent)”. Use this file for handoffs and task lists between agents.

---

## Tasks for coworkers

Pick one or more; when you start, note which you’re doing and strike or update when done.

- [ ] **Production build** — Run `hugo --minify -d docs` and confirm it completes. Fix any errors.
- [ ] **Libsass → dartsass** — Build warns: *“libsass was deprecated in Hugo v0.153.0... Use dartsass instead.”* Check [Hugo Sass docs](https://gohugo.io/functions/css/sass/#dart-sass), add a migration note or TODO where Sass is configured (`config.toml`, `head.html` / asset pipeline).
- [ ] **Route spot-check** — Verify home, a post, and `/saves` load; check for broken links or layout issues.
- [ ] **Saves page tokens** — In `layouts/saves/single.html`, replace `var(--color-primary-500)` and generic grays with design tokens from `assets/scss/main.scss` (`$accent`, `$light-border-color` / `$dark-border-color`) so Saves matches the rest of the site.
- [ ] **Footer on home** — On the home page the footer is currently empty. Add a minimal footer (e.g. “Posts · Resume · RSS” or social links) so the page has a clear end and next step.
- [ ] **Accessibility pass** — Run an audit (e.g. axe or Lighthouse) on home and one post; fix any critical a11y issues and document in a short note or comment.

---

## Handoff context (for reference)

**Recent work:** Home page bolder pass (hero title scale, primary CTA “Read posts” / Resume, bio left border, staggered reveal). SCSS overrides in `assets/scss/main.scss`; home layout in `layouts/index.html`. Hugo build passes.

---

*Last updated: tasks for coworkers (tm-agent).*
