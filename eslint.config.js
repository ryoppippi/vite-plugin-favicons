import { ryoppippi } from '@ryoppippi/eslint-config';

export default ryoppippi({
	svelte: true,
	tailwindcss: false,
	ignores: ['example'],
	typescript: {
		tsconfigPath: './tsconfig.json',
	},
});
