# Repository Guidelines

## Project Structure & Module Organization
- `content/`: Markdown pages and posts (use `content/posts/` for blog posts).
- `layouts/`: Hugo templates overriding the theme when needed.
- `static/`: Public assets (e.g., `static/images/…`, `static/css/…`).
- `themes/hello-friend-ng/`: Theme as a Git submodule.
- `docs/`: Built site output served by GitHub Pages.
- `archetypes/`, `resources/`: Hugo archetypes and cached build artifacts.
- Config: `config.toml` (site metadata, theme, params).

## Build, Test, and Development Commands
- Install: Hugo (extended) and Git submodules.
  - `brew install hugo` (macOS) and `git submodule update --init --recursive`.
- Develop: `hugo server -D`
  - Runs local server with drafts; hot reload at `http://localhost:1313/`.
- Build: `hugo --minify -d docs`
  - Produces production build into `docs/` for Pages.
- Clean cache (optional): `hugo --gc`
  - Garbage‑collects unused resources during build.

## Coding Style & Naming Conventions
- Content: Markdown with TOML/YAML front matter; wrap at ~100 cols.
- Filenames: kebab‑case (`my-new-post.md`).
- Images: place under `static/images/` and reference as `/images/<name>.<ext>`.
- Templates: prefer small overrides in `layouts/` rather than editing the theme.
- Formatting: keep Markdown headings hierarchical (`#`, `##`, `###`), use fenced code blocks.

## Testing Guidelines
- Local verification: run `hugo --minify --printPathWarnings --printI18nWarnings` and ensure zero errors/warnings.
- Links/assets: manually spot‑check critical pages; ensure images resolve under `/images/`.
- Drafts: remove `draft: true` before publishing.

## Commit & Pull Request Guidelines
- Style: Prefer Conventional Commits (`feat:`, `fix:`, `docs:`). History shows a mix; standardizing on this going forward improves clarity.
- Scope examples: `feat(posts): add rust traits article`, `fix(layouts): correct meta tags`.
- PRs: include clear description, before/after screenshot if UI changes, and reference related issues (e.g., `Closes #12`). Keep PRs focused and atomic.

## Security & Configuration Tips
- Do not commit secrets or tokens. Use only trusted, version‑pinned third‑party scripts over HTTPS.
- Keep the theme submodule updated judiciously; test locally before merging theme bumps.
