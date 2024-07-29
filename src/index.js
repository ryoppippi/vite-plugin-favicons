import { createHash } from 'node:crypto';
import path from 'pathe';
import fs from 'fs-extra';
import { favicons } from 'favicons';
import { isProduction } from 'std-env';

import { logger } from './logger.js';

const virtualModuleId = `virtual:favicon`;
const resolvedVirtualModuleId = `\0${virtualModuleId}`;

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
export function faviconPlugin(options) {
	const { imgSrc, faviconAssetsDest, ...faviconConfig } = options;

	const htmlDest = path.resolve(faviconAssetsDest, './favicon.html');

	return {
		name: `favicons`,
		enforce: `pre`,

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

			/** Cache key */
			const cacheKey = `<!-- ${
				createHash('md5').update(
					JSON.stringify(options) + await fs.readFile(imgSrc, 'utf-8'),
				).digest('hex')
			} -->`;

			/* Skip regeneration if a cache exists */
			if (fs.existsSync(htmlDest) && !isProduction) {
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
		},
	};
}
