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

	/**
	 * whether to collapse identical favicon generations within a single Node
	 * process into one run. Useful when the same plugin runs multiple times in
	 * one `vite build` (e.g. SvelteKit's client and server builds), which would
	 * otherwise regenerate the same favicons twice.
	 *
	 * This is distinct from `cache`: `cache` reuses generated output across
	 * separate builds via the disk, while `dedupe` shares a single in-flight
	 * generation between plugin instances in the same process.
	 * @default true
	 */
	dedupe?: boolean;
}

/**
 * Favicon plugin for Vite.
 * @param options - The plugin options.
 * @returns - The Vite plugin object.
 */
export function faviconsPlugin(options: Options): Plugin;
