import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://noopolis.github.io',
  base: '/paideia',
  trailingSlash: 'always',
  integrations: [{
    name: 'paideia-source-references',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        injectRoute({ pattern: '/reference/[document].md', entrypoint: './src/references/index.ts' });
      },
    },
  }, starlight({
    title: 'Paideia',
    description: 'Evaluate native agents, inspect their evidence, and improve declared prompts.',
    customCss: ['./src/styles/custom.css'],
    sidebar: [{
      label: 'Paideia',
      items: [
        { label: 'What works', slug: '' },
        { label: 'Run locally', slug: 'run-locally' },
        { label: 'Author a dataset', slug: 'datasets' },
        { label: 'Live evaluation', slug: 'live-evaluation' },
        { label: 'Training and replay', slug: 'training-and-replay' },
      ],
    }],
  })],
});
