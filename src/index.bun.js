import { faviconsPlugin as baseFaviconsPlugin } from './index.js';

/**
 * Favicon plugin for Vite using Bun.Image by default.
 * @param {import('./index').Options} options - The plugin options.
 * @returns {import('vite').Plugin} - The Vite plugin object.
 */
export function faviconsPlugin(options) {
	return baseFaviconsPlugin({
		useBunImage: true,
		...options,
	});
}
