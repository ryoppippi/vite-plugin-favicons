# vite-plugin-favicons 🎨

[![npm version](https://img.shields.io/npm/v/vite-plugin-favicons?color=yellow)](https://npmjs.com/package/vite-plugin-favicons)
[![npm downloads](https://img.shields.io/npm/dm/vite-plugin-favicons?color=yellow)](https://npmjs.com/package/vite-plugin-favicons)

Generate favicons for your Vite project with ease!

## 🚀 Features

- Automatically generates favicons for your Vite project
- Supports various favicon formats and sizes
- Easy integration with Vite build process
- Caching mechanism for faster builds
- TypeScript support

## 📦 Installation

```bash
npm install vite-plugin-favicons --save-dev
# or
yarn add vite-plugin-favicons --dev
# or
pnpm add vite-plugin-favicons -D
```

## 🛠️ Usage

1. Import the plugin in your Vite config file:

```javascript
import { defineConfig } from 'vite';
import { faviconsPlugin } from 'vite-plugin-favicons';

export default defineConfig({
	plugins: [
		faviconsPlugin({
			imgSrc: './src/assets/favicon.png',
			// other options...
		}),
	],
});
```

You must pass options defined in [index.d.ts](./src/index.d.ts) to the plugin.
You can also pass options from the [Favicons](https://www.npmjs.com/package/favicons) package.

2. Use the generated favicons in your HTML:

```javascript
import faviconLinks from 'virtual:favicons';

// You can see the output result
console.log(faviconLinks);
```

### 🖼️ Svelte Example

Import the `FaviconsHead` component from the `virtual:favicons` module, and add it inside `<svelte:head>` tag in your Svelte component.

```svelte
<script>
	import { FaviconsHead } from 'virtual:favicons';
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html FaviconsHead}
</svelte:head>
```

Then use this component to inject the favicon links into the head tag in your Svelte app.

You can see [SvelteKit Example Project](./example/).

### 🔄 Usage in Other Frameworks

While the example above is Svelte-specific, you can use this plugin with any framework that works with Vite. The key is to import the favicon links from `virtual:favicons` and insert them into your HTML head section using the appropriate method for your framework.

## ⚙️ Configuration

The plugin accepts the following options:

- `imgSrc` (required): Path to the source image for generating favicons
- `path` (required): Public path for generated favicon assets. It must start with `/`
- `cache` (optional): Whether to cache generated favicons (default: `false` in production, `true` in development)
- `useBunImage` (optional): Use `Bun.Image` via `Bun.module` for supported resize operations, falling back to `sharp` for image operations that Bun does not expose. Bun imports enable this by default. You can also import from `vite-plugin-favicons/bun` to opt in explicitly
- Other options from the `Favicons` package

The additional options are based on the `Favicons` library. For a full list of options and their descriptions, please refer to the [Favicons package documentation](https://www.npmjs.com/package/favicons).

## 🧩 TypeScript Support

This plugin includes TypeScript definitions. You can import types as follows:

```typescript
import type { Options } from 'vite-plugin-favicons';
```

## 🔄 Caching

The plugin implements a caching mechanism to avoid regenerating favicons unnecessarily. It uses an MD5 hash of the configuration and source image to determine if regeneration is needed.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgements

This plugin is built on top of the excellent [Favicons](https://www.npmjs.com/package/favicons) package.

## 📝 Related Projects

- [unplugin-favicons](https://github.com/anolilab/unplugin-favicons) - works mostly fine, but too complecated and not works in SvelteKit because SvelteKit does not support `transformIndexHtml` hook
- [vite-plugin-favicons-inject](https://github.com/JohnPremKumar/vite-plugin-favicons-inject) - also not works in SvelteKit
