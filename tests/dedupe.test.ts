import type { Options } from '../src/index.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, expect, it, vi } from 'vitest';

/* Mock the heavy `favicons` generator so the tests only assert how often the
   plugin reaches it, not the real image generation. */
const faviconsMock = vi.hoisted(() => vi.fn());
vi.mock('favicons', () => ({ favicons: faviconsMock }));

const { faviconsPlugin } = await import('../src/index.js');

const imgSrc = path.resolve(import.meta.dirname, '../example/static/favicon.png');

let publicDir: string;

/**
 * Read the process-wide dedupe registry stored on `globalThis`.
 * @returns the registry map, or undefined if no generation has run yet.
 */
function getRegistry(): Map<string, Promise<void>> | undefined {
	return (globalThis as { __vitePluginFaviconsBuildPromises?: Map<string, Promise<void>> })
		.__vitePluginFaviconsBuildPromises;
}

type Hook = (this: unknown, ...args: unknown[]) => unknown;

/**
 * Extract the callable handler from a Vite/Rollup hook, which may be either a
 * bare function or an `{ handler }` object form.
 * @param hook - the plugin hook value.
 * @returns the underlying handler function.
 */
function getHook(hook: unknown): Hook {
	return (typeof hook === 'function' ? hook : (hook as { handler: Hook }).handler) as Hook;
}

/**
 * Create a configured plugin instance pointed at the test's temp `publicDir`.
 * @param overrides - extra options merged over the defaults.
 * @returns the resolved Vite plugin.
 */
async function makePlugin(overrides: Partial<Options> = {}) {
	const plugin = faviconsPlugin({ imgSrc, path: '/favicons', ...overrides });
	await getHook(plugin.configResolved).call(plugin, { publicDir });
	return plugin;
}

/**
 * Invoke a plugin's `buildStart` hook directly.
 * @param plugin - a plugin returned by {@link makePlugin}.
 */
async function runBuildStart(plugin: Awaited<ReturnType<typeof makePlugin>>) {
	await getHook(plugin.buildStart).call({});
}

beforeEach(async () => {
	faviconsMock.mockReset();
	faviconsMock.mockResolvedValue({
		images: [],
		files: [],
		html: ['<link rel="icon" href="/favicons/favicon.svg">'],
	});
	getRegistry()?.clear();

	publicDir = await mkdtemp(path.join(tmpdir(), 'vpf-'));
	return async () => {
		await rm(publicDir, { recursive: true, force: true });
	};
});

it('dedupes favicon generation across plugin instances in the same process', async () => {
	const a = await makePlugin();
	const b = await makePlugin();

	await runBuildStart(a);
	await runBuildStart(b);

	expect(faviconsMock).toHaveBeenCalledTimes(1);
});

it('regenerates for every build when dedupe is disabled', async () => {
	/* Also disable the disk cache, which would otherwise short-circuit the
	   second build and hide whether dedupe was the cause. */
	const a = await makePlugin({ dedupe: false, cache: false });
	const b = await makePlugin({ dedupe: false, cache: false });

	await runBuildStart(a);
	await runBuildStart(b);

	expect(faviconsMock).toHaveBeenCalledTimes(2);
});

it('regenerates when the previous output was removed externally', async () => {
	const a = await makePlugin();
	await runBuildStart(a);
	expect(faviconsMock).toHaveBeenCalledTimes(1);

	/* Simulate a manual clean of the output between builds (e.g. in watch mode). */
	await rm(path.join(publicDir, 'favicons'), { recursive: true, force: true });

	const b = await makePlugin();
	await runBuildStart(b);
	expect(faviconsMock).toHaveBeenCalledTimes(2);
});

it('keeps at most one registry entry per destination across content changes', async () => {
	/* Two builds for the same destination but different configs produce different
	   hashes; the newer one should evict the older so the registry stays bounded. */
	await runBuildStart(await makePlugin({ theme_color: '#000000' }));
	await runBuildStart(await makePlugin({ theme_color: '#ffffff' }));

	const entries = [...(getRegistry()?.keys() ?? [])].filter(key => key.includes('favicons'));
	expect(entries).toHaveLength(1);
});
