# Live site editor Worker

This Worker is the authenticated write boundary for the site's hidden live editor. The browser never
receives a GitHub token. It receives a random, tab-scoped session ID; the corresponding GitHub token
is encrypted before it is stored in Workers KV.

The Worker enforces all of these rules on every request:

- the browser origin must be listed in `SITE_ORIGINS`;
- the GitHub user ID must be `7112252` (`swappysh`);
- the GitHub user token is restricted to repository ID `55292565`;
- reads and writes are limited to kebab-case Markdown paths below `content/`;
- writes use the current file SHA, so concurrent edits fail instead of overwriting each other.

## One-time setup

### 1. Create a private GitHub App

[Open GitHub's prefilled app form](https://github.com/settings/apps/new?name=swapnil-live-editor&description=Owner-only%20editor%20for%20swappysh.github.io&url=https%3A%2F%2Fswappysh.github.io&callback_urls%5B%5D=https%3A%2F%2Fsite-editor.swappysh.workers.dev%2Fauth%2Fcallback&public=false&webhook_active=false&contents=write),
or open **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App** and use:

- **GitHub App name:** a unique private name such as `Swapnil live editor`
- **Homepage URL:** `https://swappysh.github.io`
- **Callback URL:** `https://site-editor.swappysh.workers.dev/auth/callback`
- **Webhook:** inactive
- **Repository permissions → Contents:** Read and write
- **All other repository and account permissions:** No access (Metadata read access is automatic)
- **Where can this GitHub App be installed?:** Only on this account

Keep expiring user-to-server tokens enabled. After creating the app, generate a client secret and
install the app on **only** `swappysh/swappysh.github.io`.

### 2. Create the session namespace

The production and preview namespaces are already provisioned, and their IDs are recorded in
`wrangler.toml`. KV namespace IDs are public resource identifiers; they do not grant access to the
namespace or the Cloudflare account. To recreate them, run from this directory:

```bash
npx wrangler kv namespace create SESSIONS
npx wrangler kv namespace create SESSIONS --preview
```

Copy the returned IDs into the two `SESSIONS` entries in `wrangler.toml`.

### 3. Deploy the Worker shell

```bash
npm install
npm run check
npm run deploy
```

The public site does not call the Worker until edit mode is activated, and edit mode remains closed
until all three secrets below are present.

### 4. Add Worker secrets

Run each command and paste the value when Wrangler prompts. Cloudflare stores the values encrypted;
only their names are present in the repository. Never add the values to a tracked file. Local
`.dev.vars*` files are ignored as a second line of defense.

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put SESSION_ENCRYPTION_KEY
```

Use the GitHub App's client ID and client secret for the first two values. Generate the encryption
key with `openssl rand -base64 32` and paste its output for the third.

If the deployed Worker URL differs from `https://site-editor.swappysh.workers.dev`, update
`params.editorApiURL` in `config.toml`.

## Using the editor

On any site page, type `:edit`. On a touch device, press and hold the `$ bash ./swapnil.sh` logo.
After GitHub verifies the owner account, click a paragraph, heading, or list to edit it in place.

- **Save** commits the inline changes to `master`.
- **Page** edits the current page's name, navigation name, description, draft state, and Markdown.
  Renaming a page keeps its URL unchanged. Leave the navigation name blank to use its default label.
- **Pages** opens every Markdown file, including drafts.
- **+ New** creates a page or blog post.
- **Exit** closes insert mode while leaving the tab authenticated.
- **Lock** destroys the server session and removes the tab's session ID.

Every commit to `master` starts the existing GitHub Pages deployment workflow.
