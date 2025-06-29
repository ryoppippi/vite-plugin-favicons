import path from 'node:path';
import { faviconsPlugin } from 'vite-plugin-favicons';
import { defineConfig } from 'vitest/config';

function relativePath(...p: string[]) {
	return path.resolve(__dirname, ...p);
}

export default defineConfig({
	plugins: [
		faviconsPlugin({
			/** ===== favicon ===== */
			imgSrc: relativePath('./example/static/favicon.png'),
			/** ========================= */

			/* ===== metadata===== */
			path: `/favicons`,
			theme_color: '#ffffff',
			background: '#ffffff',
			appName: 'example',
			appShortName: 'example',
			appDescription: 'example app',
			lang: 'ja-JP',
			orientation: 'portrait',
			/* ========================= */
		}),
	],
});
