import type { FaviconOptions } from 'favicons';
import type { Plugin } from 'vite';
import './ambient.js';

/**
 * plugin options
 */
export type Options = {
	/** path of favicon image */
	imgSrc: string;

	/**
	 * output path of favicon images & manifest
	 * @default `${assetsDir}/favicons`
	 */
	faviconAssetsDest?: string;
} & FaviconOptions;

/**
 * Favicon plugin for Vite.
 * @param options - The plugin options.
 * @returns - The Vite plugin object.
 */
export function faviconsPlugin(options: Options): Plugin;
