import path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { faviconsPlugin } from 'vite-plugin-favicons';

function relativePath(...p: string[]) {
  return path.resolve(__dirname, ...p);
}

export default defineConfig({
	plugins: [
		faviconsPlugin({
			/** ===== favicon ===== */
			imgSrc: relativePath('./static/favicon.png'),
			faviconAssetsDest: relativePath('./static/favicons'),
			/** ========================= */

			/* ===== metadata===== */
			path: `/favicons`,
			theme_color: "#ffffff",
			background: "#ffffff",
			appName: "example",
			appShortName: "example",
			appDescription: "example app",
			lang: 'ja-JP',
			orientation: 'portrait',
			/* ========================= */
		}),
		sveltekit(),
	],
});
