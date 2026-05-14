import { Buffer } from 'node:buffer';
import { PNG } from 'pngjs';
import { afterEach, expect, it } from 'vitest';

import sharp, { registerBunImageSharpModule } from '../src/bun-image-sharp.js';

type Metadata = {
	width: number;
	height: number;
	format: string;
};

type RawBuffer = {
	data: Buffer;
	info: {
		width: number;
		height: number;
		channels: number;
	};
};

type SharpPipeline = {
	metadata: () => Promise<Metadata>;
	ensureAlpha: () => SharpPipeline;
	resize: (options: {
		width: number;
		height: number;
		fit: string;
		background: string;
		kernel: string;
	}) => SharpPipeline;
	composite: (overlays: Array<{ input: Buffer; left: number; top: number }>) => SharpPipeline;
	raw: () => SharpRawPipeline;
	toBuffer: () => Promise<Buffer>;
};

type SharpRawPipeline = Omit<SharpPipeline, 'toBuffer'> & {
	toBuffer: (options: { resolveWithObject: true }) => Promise<RawBuffer>;
};

type SharpFunction = ((input: unknown, options?: unknown) => SharpPipeline) & {
	fit: {
		contain: string;
	};
};

type BunModuleCallback = () => {
	loader: string;
	exports: {
		default: typeof sharp;
	};
};

const bunSharp = sharp as unknown as SharpFunction;

type MinimalBun = {
	Image: typeof FakeImage;
	plugin: (plugin: {
		name: string;
		setup: (builder: {
			module: (specifier: string, callback: BunModuleCallback) => unknown;
		}) => void;
	}) => void;
};

const globalWithBun = globalThis as typeof globalThis & { Bun?: MinimalBun };
const originalBun = globalWithBun.Bun;

afterEach(() => {
	globalWithBun.Bun = originalBun;
});

it('registers a Bun.module replacement for sharp', () => {
	const modules = new Map<string, BunModuleCallback>();
	globalWithBun.Bun = {
		Image: FakeImage,
		plugin(plugin) {
			plugin.setup({
				module(specifier, callback) {
					modules.set(specifier, callback);
					return this;
				},
			});
		},
	};

	registerBunImageSharpModule();

	const module = modules.get('sharp')?.();
	expect(module?.loader).toBe('object');
	expect(module?.exports.default).toBe(sharp);
});

it('uses Bun.Image output for resize, composite, and raw buffers', async () => {
	globalWithBun.Bun = {
		Image: FakeImage,
		plugin() {},
	};

	const source = createPng(4, 2, { r: 255, g: 0, b: 0, a: 255 });
	const metadata = await bunSharp(source).metadata();
	expect(metadata).toMatchObject({ width: 4, height: 2, format: 'png' });

	const resized = await bunSharp(source)
		.ensureAlpha()
		.resize({
			width: 2,
			height: 2,
			fit: bunSharp.fit.contain,
			background: '#00000000',
			kernel: 'nearest',
		})
		.toBuffer();

	const raw = await bunSharp({
		create: {
			width: 4,
			height: 4,
			channels: 4,
			background: '#00000000',
		},
	})
		.composite([{ input: resized, left: 1, top: 1 }])
		.raw()
		.toBuffer({ resolveWithObject: true });

	expect(raw.info).toMatchObject({ width: 4, height: 4, channels: 4 });
	expect(raw.data[(1 * 4 + 1) * 4]).toBe(255);
	expect(raw.data[(1 * 4 + 1) * 4 + 3]).toBe(255);
});

class FakeImage {
	#png: PNG;
	#resize?: { width: number; height: number };

	constructor(input: Buffer) {
		this.#png = PNG.sync.read(Buffer.from(input));
	}

	async metadata() {
		return {
			width: this.#png.width,
			height: this.#png.height,
			format: 'png',
		};
	}

	resize(width: number, height: number) {
		this.#resize = { width, height };
		return this;
	}

	png() {
		return this;
	}

	async buffer() {
		const width = this.#resize?.width ?? this.#png.width;
		const height = this.#resize?.height ?? this.#png.height;
		const output = new PNG({ width, height });

		for (let index = 0; index < output.data.length; index += 4) {
			output.data[index] = this.#png.data[0];
			output.data[index + 1] = this.#png.data[1];
			output.data[index + 2] = this.#png.data[2];
			output.data[index + 3] = this.#png.data[3];
		}

		return PNG.sync.write(output);
	}
}

function createPng(width: number, height: number, color: { r: number; g: number; b: number; a: number }) {
	const png = new PNG({ width, height });

	for (let index = 0; index < png.data.length; index += 4) {
		png.data[index] = color.r;
		png.data[index + 1] = color.g;
		png.data[index + 2] = color.b;
		png.data[index + 3] = color.a;
	}

	return PNG.sync.write(png);
}
