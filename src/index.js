import { createHash } from 'node:crypto';
import { favicons } from 'favicons';
import fs from 'fs-extra';
import path from 'pathe';
import { isProduction } from 'std-env';

import { logger } from './logger.js';

const virtualModuleId = `virtual:favicons`;
const resolvedVirtualModuleId = `\0${virtualModuleId}`;

/**
 * Process-wide registry of in-flight favicon generations, keyed by output
 * destination and content hash.
 *
 * It lives on `globalThis` rather than in module scope so that separate plugin
 * instances within the same Node process share it even if this module ends up
 * instantiated more than once (e.g. SvelteKit's client and server builds load
 * the config independently). Storing the `Promise` — not just a boolean — lets
 * a later instance `await` an ongoing generation instead of starting its own.
 * @type {Map<string, Promise<void>>}
 */
const buildPromises = (globalThis.__vitePluginFaviconsBuildPromises ??= new Map());

/**
 * Get the parent directory path of a given path.
 * @param {string} p - The path to get the parent directory from.
 * @returns {string} - The parent directory path.
 */
function getParentDirPath(p) {
	return path.dirname(p);
}

/**
 * Favicon plugin for Vite.
 * @param {import('./index').Options} options - The plugin options.
 * @returns {Plugin} - The Vite plugin object.
 */
export function faviconsPlugin(options) {
	const {
		imgSrc,
		cache = !isProduction,
		dedupe = true,
		...faviconConfig
	} = options;

	let faviconAssetsDest = '';
	let htmlDest = '';

	return {
		name: `favicons`,
		enforce: `pre`,

		async configResolved(config) {
			if (!faviconConfig.path.startsWith('/')) {
				logger.error('Favicon path must start with a forward slash');
				throw new Error('Favicon path must start with a forward slash');
			}

			const pathWithoutSlash = faviconConfig.path.slice(1);

			faviconAssetsDest = path.resolve(path.resolve(config.publicDir, pathWithoutSlash));

			htmlDest = path.resolve(faviconAssetsDest, './favicon.html');
		},

		/* resolveId hook to resolve the virtual module ID */
		resolveId(id) {
			if (id === virtualModuleId) {
				return resolvedVirtualModuleId;
			}
		},
		/* load hook to generate the virtual module */
		async load(id) {
			if (id === resolvedVirtualModuleId) {
				if (fs.existsSync(htmlDest)) {
					logger.info('Favicon html found');
					const html = await fs.readFile(htmlDest, 'utf-8');
					return `const html = ${JSON.stringify(html)}; export default html;`;
				}

				logger.warn('No favicon html found');
				return `const html = ''; export default html;`;
			}
		},

		async buildStart() {
			logger.info('build start');

			/* Read the source image as raw bytes. It is hashed as a Buffer rather
			   than a UTF-8 string because the input is binary, where lossy UTF-8
			   decoding would weaken the hash. */
			const img = await fs.readFile(imgSrc);

			/* Content hash over the output destination, the favicon config and the
			   image bytes. It identifies a unique generation: a different config or
			   output dir must not be deduped against this one. */
			const hash = createHash('sha256')
				.update(JSON.stringify({ faviconAssetsDest, faviconConfig }))
				.update(img)
				.digest('hex');

			/** Cache key appended to the generated HTML to detect disk cache hits */
			const cacheKey = `<!-- ${hash} -->`;

			/**
			 * Generate the favicons once, honouring the on-disk cache.
			 * @returns {Promise<void>}
			 */
			const generate = async () => {
				/* Skip regeneration if a cache exists */
				if (fs.existsSync(htmlDest) && cache) {
					const oldHTML = await fs.readFile(htmlDest, 'utf-8');
					/* Skip regeneration if the cache key is found at the end of the HTML file */
					if (oldHTML.endsWith(cacheKey)) {
						logger.info('Cache Hit');
						return;
					}
				}

				/* Delete existing files */
				if (fs.existsSync(faviconAssetsDest)) {
					await fs.rm(faviconAssetsDest, { recursive: true });
				}

				/* Delete existing HTML */
				if (fs.existsSync(htmlDest)) {
					await fs.rm(htmlDest);
				}

				/* Create favicon directory in the static assets */
				await fs.mkdir(faviconAssetsDest, { recursive: true });
				await fs.mkdir(getParentDirPath(htmlDest), { recursive: true });

				/* Generate favicons */
				const response = await favicons(imgSrc, faviconConfig);

				await Promise.all([
					/* Write the generated favicon images */
					...response.images.map(async image =>
						fs.writeFile(
							path.resolve(faviconAssetsDest, image.name),
							image.contents,
						),
					),
					/* Write the generated favicon files */
					...response.files.map(async file =>
						fs.writeFile(
							path.resolve(faviconAssetsDest, file.name),
							file.contents,
						),
					),
					/*
					Write the generated HTML and append the cache key at the end */
					fs.writeFile(htmlDest, response.html.join('\n') + cacheKey),
				]);

				logger.info(`Favicon generated at ${faviconAssetsDest}`);
			};

			/* Without dedupe, generate inline every time buildStart runs. */
			if (!dedupe) {
				await generate();
				return;
			}

			/* Process-level dedupe: if an identical generation is already running
			   (or finished) in this process, await it instead of regenerating.
			   This collapses the double generation seen when one `vite build` runs
			   the plugin for both the client and server builds. */
			const processKey = `${faviconAssetsDest}:${hash}`;
			const existing = buildPromises.get(processKey);
			if (existing != null) {
				logger.info('Favicon generation already handled in this process');
				await existing;
				return;
			}

			/* Store the promise before awaiting so a concurrent instance can join
			   the same in-flight generation. */
			const promise = generate();
			buildPromises.set(processKey, promise);
			/* Drop a failed generation from the registry so a later build (e.g. in
			   watch mode) can retry instead of replaying the cached rejection. */
			promise.catch(() => buildPromises.delete(processKey));
			await promise;
		},
	};
}
