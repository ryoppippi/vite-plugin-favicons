declare module 'virtual:favicons' {
	const html: string;
	export default html;
}

/**
 * Process-wide registry of in-flight favicon generations, keyed by output
 * destination and content hash. Stored on `globalThis` so separate plugin
 * instances in the same Node process share it.
 */
// eslint-disable-next-line no-var, vars-on-top
declare var __vitePluginFaviconsBuildPromises:
	| Map<string, Promise<void>>
	| undefined;
