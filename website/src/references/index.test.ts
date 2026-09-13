import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { GET, getStaticPaths } from './index.js';

it('publishes exactly the approved root documents with their original bytes', async () => {
  const routes = await getStaticPaths({} as Parameters<typeof getStaticPaths>[0]);
  expect(routes.map(route => route.params.document).sort()).toEqual([
    'architecture', 'authoring', 'development', 'fixtures', 'harnessing', 'implementation', 'live-evaluation',
  ]);
  for (const route of routes) {
    const response = await GET({ props: route.props } as Parameters<typeof GET>[0]);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    const source = await readFile(new URL(`../../../docs/${route.params.document}.md`, import.meta.url));
    expect(Buffer.from(await response.arrayBuffer())).toEqual(source);
  }
});
