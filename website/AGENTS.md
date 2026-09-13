# Product Documentation Website

Owns the local Astro/Starlight product documentation, separate from viewer/.
The site builds with the /paideia/ project base; publishing remains disabled.

- Study sibling sites' layouts, content collections, navigation and components
  before implementation; reuse the established system, not isolated visual tokens.
- The initial deployment target is GitHub Pages with the repository project base
  path. No custom domain, CNAME or copied production analytics configuration.
- Publishing stays disabled until real native-agent optimization is demonstrated
  and a release is approved. This seed must not add deployment automation.
- Keep docs factual and runnable examples tied to actual tested contracts.
  Private evidence and local experiment state never enter site content or builds.
- As implementation grows, group pages/content/components/styles by their real
  responsibilities and seed focused guide/symlink pairs for maintained children.
- Site acceptance later includes build output, navigation and assets under the
  project base path. A root-domain preview alone cannot prove Pages compatibility.

Use the standalone package scripts: npm ci, npm run check, npm run build, and
npm run dev -- --host 127.0.0.1. Keep the Starlight shell and navigation standard;
custom CSS supplies a small palette, not another page framework. Root docs and
native examples remain canonical; do not copy private runtime evidence into builds.
