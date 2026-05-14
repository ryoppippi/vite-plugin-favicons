import { Buffer } from 'node:buffer';
import { PNG } from 'pngjs';

const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };
const WHITE = { r: 255, g: 255, b: 255, a: 255 };
const BLACK = { r: 0, g: 0, b: 0, a: 255 };

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
	#rotate = 0;
	#format;
	#raw = false;
	#colorspace;

	constructor(input, options = {}) {
		this.#input = input;
		this.#options = options;
	}

	async metadata() {
		assertBunImage();

		if (this.#input?.create) {
			return {
				width: this.#input.create.width,
				height: this.#input.create.height,
				format: 'png',
			};
		}

		const svgMetadata = readSvgMetadata(this.#input);
		if (svgMetadata) {
			return svgMetadata;
		}

		return await new globalThis.Bun.Image(this.#input, this.#options).metadata();
	}

	ensureAlpha() {
		return this;
	}

	resize(options) {
		this.#resize = options;
		return this;
	}

	composite(overlays) {
		this.#overlays = overlays;
		return this;
	}

	rotate(degrees = 90) {
		this.#rotate = degrees;
		return this;
	}

	toColorspace(colorspace) {
		this.#colorspace = colorspace;
		return this;
	}

	raw() {
		this.#raw = true;
		return this;
	}

	png() {
		this.#format = 'png';
		return this;
	}

	async toBuffer(options = {}) {
		const png = await this.#toPng();

		if (!this.#raw) {
			return PNG.sync.write(png);
		}

		const data = Buffer.from(png.data);

		if (options.resolveWithObject) {
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
		const png = this.#input?.create
			? createBlankPng(this.#input.create)
			: await this.#loadPng();

		let output = png;

		for (const overlay of this.#overlays) {
			const input = PNG.sync.read(Buffer.from(overlay.input));
			compositePng(output, input, overlay.left ?? 0, overlay.top ?? 0);
		}

		if (this.#rotate % 360 !== 0) {
			output = rotatePng(output, this.#rotate);
		}

		return output;
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

function rotatePng(png, degrees) {
	const normalized = ((degrees % 360) + 360) % 360;

	if (normalized === 0) {
		return png;
	}

	if (normalized !== 90) {
		throw new Error(`Bun.Image sharp shim only supports 90 degree rotation`);
	}

	const rotated = new PNG({
		width: png.height,
		height: png.width,
	});

	for (let y = 0; y < png.height; y += 1) {
		for (let x = 0; x < png.width; x += 1) {
			const sourceOffset = (y * png.width + x) * 4;
			const targetX = png.height - y - 1;
			const targetY = x;
			const targetOffset = (targetY * rotated.width + targetX) * 4;
			png.data.copy(rotated.data, targetOffset, sourceOffset, sourceOffset + 4);
		}
	}

	return rotated;
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
