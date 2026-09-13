# Paideia documentation

Local Astro/Starlight documentation using the same content collection, sidebar,
responsive shell and search system as the sibling documentation sites. The
small theme preserves standard Starlight controls and system fonts.

From the repository root:

```sh
npm ci --prefix website
npm run check --prefix website
npm run build --prefix website
npm run preview --prefix website -- --host 127.0.0.1
```

Open `http://127.0.0.1:4321/paideia/`. `npm run dev --prefix website` provides
the development server. The static output is `website/dist/`.

The configuration uses `https://noopolis.github.io` with project base `/paideia`.
This prepares asset and navigation paths for GitHub Pages; it does not publish.
There is no deployment workflow, CNAME, custom domain or analytics configuration.

Canonical [authoring](../docs/authoring.md), [fixtures](../docs/fixtures.md),
[harnessing](../docs/harnessing.md), [live policy](../docs/live-evaluation.md),
[architecture](../docs/architecture.md), [development](../docs/development.md)
and [implementation status](../docs/implementation.md)
remain in the root documentation. An explicit static endpoint allowlist serves
those same source bytes as Markdown downloads. No private runtime artifacts are
included in the build.
