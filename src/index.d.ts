/* eslint-disable ts/consistent-type-definitions */

import type { FaviconOptions } from 'favicons';
import type { Plugin } from 'vite';
import './ambient.js';

/**
 * plugin options
 * @extends FaviconOptions
 */
export interface Options extends FaviconOptions {
	/** path of favicon image */
	imgSrc: string;

}

/**
 * Favicon plugin for Vite.
 * @param options - The plugin options.
 * @returns - The Vite plugin object.
 */
export function faviconsPlugin(options: Options): Plugin;
