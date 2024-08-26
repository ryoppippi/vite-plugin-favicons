import { expect, it } from 'vitest';

it('snapshot virtual output', async () => {
	const { default: favicons } = await import ('virtual:favicons');
	/* remove commets */
	const html = favicons.replace(/<!--.*?-->/gs, '');
	await expect(html).toMatchFileSnapshot('./favicons.html');
});
