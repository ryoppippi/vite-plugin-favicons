import type { Handle } from '@sveltejs/kit';
import faviconLinks from 'virtual:favicons';

// eslint-disable-next-line ts/unbound-method
export const handle = (async ({ event, resolve }) => {
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('</head>', `${faviconLinks}</head>`),
	});
	return response;
}) satisfies Handle;

