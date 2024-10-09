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

	/**
  * parent sub path of favicon assets
  * @default "/favicon"
  */
	path: `/${string}`;

	/** whether to cache the generated favicons (default: false on Production, true on Development) */
	cache?: boolean;
}

/**
 * Favicon plugin for Vite.
 * @param options - The plugin options.
 * @returns - The Vite plugin object.
 */
export function faviconsPlugin(options: Options): Plugin;
