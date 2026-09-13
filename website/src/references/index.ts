import type { APIRoute, GetStaticPaths } from 'astro';
import architecture from '../../../docs/architecture.md?raw';
import authoring from '../../../docs/authoring.md?raw';
import fixtures from '../../../docs/fixtures.md?raw';
import harnessing from '../../../docs/harnessing.md?raw';
import liveEvaluation from '../../../docs/live-evaluation.md?raw';
import development from '../../../docs/development.md?raw';
import implementation from '../../../docs/implementation.md?raw';

const documents = { architecture, authoring, fixtures, harnessing, 'live-evaluation': liveEvaluation, development, implementation };

export const getStaticPaths: GetStaticPaths = () => Object.entries(documents)
  .map(([document, text]) => ({ params: { document }, props: { text } }));

export const GET: APIRoute = ({ props }) => new Response(props['text'] as string, {
  headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
});
