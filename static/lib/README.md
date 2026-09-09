# Tegaki JS (v0.10.0)

Tegaki is an ESM-only package with no standalone UMD build.

Files:
- tegaki-core.mjs  — core engine (imports @chenglou/pretext from CDN)
- tegaki-wc.mjs    — web components wrapper (imports tegaki-core.mjs)
- tegaki.js        — placeholder / CDN loader shim

Usage via CDN (recommended for browser):
  <script type="module">
    import { TegakiEngine } from 'https://esm.sh/tegaki@0.10.0';
  </script>

Or use an importmap:
  <script type="importmap">
  {"imports": {"tegaki": "https://esm.sh/tegaki@0.10.0"}}
  </script>
