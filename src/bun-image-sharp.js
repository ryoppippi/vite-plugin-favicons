import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import { PNG } from 'pngjs';

const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };
const WHITE = { r: 255, g: 255, b: 255, a: 255 };
const BLACK = { r: 0, g: 0, b: 0, a: 255 };
const BUN_IMAGE_MAX_PIXELS = 192 * 192;
const require = createRequire(import.meta.url);
const realSharp = createRequire(require.resolve('favicons'))('sharp');

const sharp = Object.assign(
	(input, options) => new BunImageSharpPipeline(input, options),
	{
		fit: {
			contain: 'contain',
		},
	},
);

let registered = false;

export function registerBunImageSharpModule() {
	assertBunImage();

	if (registered) {
		return;
	}

	globalThis.Bun.plugin({
		name: 'vite-plugin-favicons:bun-image-sharp',
		setup(builder) {
			builder.module('sharp', () => ({
				loader: 'object',
				exports: {
					default: sharp,
				},
			}));
		},
	});

	registered = true;
}

function assertBunImage() {
	if (!globalThis.Bun?.Image) {
		throw new Error('Bun.Image is required when useBunImage is enabled');
	}
}

class BunImageSharpPipeline {
	#input;
	#options;
	#resize;
	#overlays = [];
	#rotate;
	#format;
	#rawOptions;
	#colorspace;
	#ensureAlpha = false;
	#delegate;

	constructor(input, options) {
		this.#input = input;
		this.#options = options;

		if (input?.create) {
			this.#delegateToSharp();
		}
	}

	async metadata() {
		assertBunImage();

		if (this.#delegate) {
			return await this.#delegate.metadata();
		}

		const svgMetadata = readSvgMetadata(this.#input);
		if (svgMetadata) {
			return svgMetadata;
		}

		return await new globalThis.Bun.Image(this.#input, this.#options).metadata();
	}

	ensureAlpha() {
		this.#ensureAlpha = true;
		if (this.#delegate) {
			this.#delegate = this.#delegate.ensureAlpha();
		}
		return this;
	}

	resize(options) {
		this.#resize = options;
		if (this.#delegate) {
			this.#delegate = this.#delegate.resize(options);
		}
		return this;
	}

	composite(overlays) {
		this.#overlays = overlays;
		if (this.#delegate) {
			this.#delegate = this.#delegate.composite(overlays);
		}
		else {
			this.#delegateToSharp();
		}
		return this;
	}

	rotate(degrees = 90) {
		this.#rotate = degrees;
		if (this.#delegate) {
			this.#delegate = this.#delegate.rotate(degrees);
		}
		else {
			this.#delegateToSharp();
		}
		return this;
	}

	toColorspace(colorspace) {
		this.#colorspace = colorspace;
		if (this.#delegate) {
			this.#delegate = this.#delegate.toColorspace(colorspace);
		}
		return this;
	}

	raw(options) {
		this.#rawOptions = options ?? {};
		if (this.#delegate) {
			this.#delegate = this.#delegate.raw(this.#rawOptions);
		}
		else {
			this.#delegateToSharp();
		}
		return this;
	}

	png() {
		this.#format = 'png';
		if (this.#delegate) {
			this.#delegate = this.#delegate.png();
		}
		return this;
	}

	async toBuffer(options) {
		if (this.#delegate || !this.#canUseBunImage()) {
			const pipeline = this.#delegateToSharp();
			return options === undefined
				? await pipeline.toBuffer()
				: await pipeline.toBuffer(options);
		}

		const png = await this.#toPng();

		if (!this.#rawOptions) {
			return PNG.sync.write(png);
		}

		const data = Buffer.from(png.data);

		if (options?.resolveWithObject) {
			return {
				data,
				info: {
					width: png.width,
					height: png.height,
					channels: 4,
					size: data.length,
					format: this.#format ?? 'raw',
					space: this.#colorspace,
				},
			};
		}

		return data;
	}

	async #toPng() {
		return await this.#loadPng();
	}

	async #loadPng() {
		assertBunImage();

		const image = new globalThis.Bun.Image(this.#input, this.#options);
		const pipeline = this.#resize
			? image.resize(this.#resize.width, this.#resize.height, {
					fit: this.#resize.fit === sharp.fit.contain ? 'inside' : 'fill',
					filter: this.#resize.kernel,
				})
			: image;

		const buffer = await pipeline.png().buffer();
		const png = PNG.sync.read(Buffer.from(buffer));

		if (!this.#resize) {
			return png;
		}

		if (png.width === this.#resize.width && png.height === this.#resize.height) {
			return png;
		}

		const canvas = createBlankPng({
			width: this.#resize.width,
			height: this.#resize.height,
			channels: 4,
			background: this.#resize.background,
		});
		const left = Math.floor((canvas.width - png.width) / 2);
		const top = Math.floor((canvas.height - png.height) / 2);
		compositePng(canvas, png, left, top);
		return canvas;
	}

	#delegateToSharp() {
		if (this.#delegate) {
			return this.#delegate;
		}

		let pipeline = this.#options === undefined
			? realSharp(this.#input)
			: realSharp(this.#input, this.#options);

		if (this.#ensureAlpha) {
			pipeline = pipeline.ensureAlpha();
		}

		if (this.#resize) {
			pipeline = pipeline.resize(this.#resize);
		}

		if (this.#overlays.length > 0) {
			pipeline = pipeline.composite(this.#overlays);
		}

		if (this.#rotate !== undefined) {
			pipeline = pipeline.rotate(this.#rotate);
		}

		if (this.#colorspace) {
			pipeline = pipeline.toColorspace(this.#colorspace);
		}

		if (this.#rawOptions) {
			pipeline = pipeline.raw(this.#rawOptions);
		}

		if (this.#format === 'png') {
			pipeline = pipeline.png();
		}

		this.#delegate = pipeline;
		return this.#delegate;
	}

	#canUseBunImage() {
		if (!this.#resize || this.#overlays.length > 0 || this.#rotate !== undefined || this.#rawOptions) {
			return false;
		}

		const { width, height } = this.#resize;
		return width * height <= BUN_IMAGE_MAX_PIXELS;
	}
}

function createBlankPng(options) {
	const png = new PNG({
		width: options.width,
		height: options.height,
	});
	const color = parseColor(options.background, options.channels);

	for (let offset = 0; offset < png.data.length; offset += 4) {
		png.data[offset] = color.r;
		png.data[offset + 1] = color.g;
		png.data[offset + 2] = color.b;
		png.data[offset + 3] = color.a;
	}

	return png;
}

function parseColor(background, channels = 4) {
	if (!background || background === 'transparent') {
		return channels === 3 ? WHITE : TRANSPARENT;
	}

	if (background === 'white') {
		return WHITE;
	}

	if (background === 'black') {
		return BLACK;
	}

	if (typeof background !== 'string' || !background.startsWith('#')) {
		return WHITE;
	}

	const hex = background.slice(1);
	const values = hex.length <= 4
		? [...hex].map(value => Number.parseInt(value + value, 16))
		: hex.match(/.{1,2}/g).map(value => Number.parseInt(value, 16));

	return {
		r: values[0] ?? 255,
		g: values[1] ?? 255,
		b: values[2] ?? 255,
		a: values[3] ?? 255,
	};
}

function compositePng(base, overlay, left, top) {
	for (let y = 0; y < overlay.height; y += 1) {
		for (let x = 0; x < overlay.width; x += 1) {
			const targetX = x + left;
			const targetY = y + top;

			if (targetX < 0 || targetY < 0 || targetX >= base.width || targetY >= base.height) {
				continue;
			}

			const sourceOffset = (y * overlay.width + x) * 4;
			const targetOffset = (targetY * base.width + targetX) * 4;
			const sourceAlpha = overlay.data[sourceOffset + 3] / 255;
			const targetAlpha = base.data[targetOffset + 3] / 255;
			const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

			if (outputAlpha === 0) {
				base.data[targetOffset] = 0;
				base.data[targetOffset + 1] = 0;
				base.data[targetOffset + 2] = 0;
				base.data[targetOffset + 3] = 0;
				continue;
			}

			for (let channel = 0; channel < 3; channel += 1) {
				base.data[targetOffset + channel] = Math.round(
					(overlay.data[sourceOffset + channel] * sourceAlpha
						+ base.data[targetOffset + channel] * targetAlpha * (1 - sourceAlpha))
					/ outputAlpha,
				);
			}

			base.data[targetOffset + 3] = Math.round(outputAlpha * 255);
		}
	}
}

function readSvgMetadata(input) {
	if (!Buffer.isBuffer(input)) {
		return;
	}

	const source = input.toString('utf8');
	if (!source.trimStart().startsWith('<svg')) {
		return;
	}

	const width = Number.parseFloat(source.match(/\bwidth=["']?([0-9.]+)/)?.[1]);
	const height = Number.parseFloat(source.match(/\bheight=["']?([0-9.]+)/)?.[1]);
	const viewBox = source.match(/\bviewBox=["']?([0-9.\s-]+)/)?.[1]
		?.trim()
		.split(/\s+/)
		.map(value => Number.parseFloat(value));

	return {
		width: Number.isFinite(width) ? width : viewBox?.[2],
		height: Number.isFinite(height) ? height : viewBox?.[3],
		format: 'svg',
		density: 72,
	};
}

export default sharp;
