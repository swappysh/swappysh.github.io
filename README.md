# swappysh.github.io

This repository contains the source code for my personal blog and website, hosted using GitHub Pages.

## Technology

- **Static Site Generator:** [Hugo](https://gohugo.io/) (Extended version)
- **Theme:** [hello-friend-ng](https://github.com/rhazdon/hugo-theme-hello-friend-ng) (used as a Git submodule in `themes/hello-friend-ng`)
- **Hosting:** [GitHub Pages](https://pages.github.com/)

## Development

1.  **Clone:** `git clone --recurse-submodules https://github.com/swappysh/swappysh.github.io.git` (the `--recurse-submodules` is important to fetch the theme).
2.  **Install Hugo:** Follow the official Hugo installation guide for your OS: [Hugo Install](https://gohugo.io/installation/). Make sure to install the **extended** version.
3.  **Run Locally:** Navigate to the repository directory and run `hugo server -D`. This will start a local development server (usually at `http://localhost:1313/`) and include draft posts.
4.  **Create Content:** New blog posts go into the `content/posts/` directory as Markdown files. Other pages are typically in `content/`. Use `hugo new posts/your-post-title.md` to create a new post with pre-filled front matter.

## Deployment

- **Automation:** Deployment is handled automatically by a GitHub Actions workflow (`.github/workflows/deploy_gh_pages.yaml`).
- **Trigger:** The workflow runs whenever changes are pushed to the `master` branch (e.g., when a Pull Request is merged).
- **Process:**
  1.  The workflow checks out the code (including the theme submodule).
  2.  It sets up the latest extended version of Hugo.
  3.  It runs `hugo --minify` to build the static website into the `./public` directory.
  4.  It pushes the contents of the `./public` directory to the `gh-pages` branch (or deploys using a dedicated action configured in the workflow), which updates the live site.

## Branches

- `master`: The main branch containing the source code. Pushing to this branch triggers deployment.
- `gh-pages`: (Typically) Contains the built static website files served by GitHub Pages. This branch is usually automatically managed by the deployment workflow.
