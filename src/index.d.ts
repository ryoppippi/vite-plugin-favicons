import type { FaviconOptions } from 'favicons';

declare module 'virtual:favicon' {
	const html: string;
	export default html;
}

/**
 * plugin options
 */
export type Options = {
	/** path of favicon image */
	imgSrc: string;

	/** output path of favicon image */
	faviconAssetsDest: string;
} & FaviconOptions;
