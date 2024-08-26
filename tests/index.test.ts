import { expect, it } from 'vitest';

it('snapshot virtual output', async () => {
	const { default: favicons } = await import ('virtual:favicons');
	await expect(favicons).toMatchFileSnapshot('./favicons.html');
});
