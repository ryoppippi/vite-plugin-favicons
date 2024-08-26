import { ryoppippi } from '@ryoppippi/eslint-config';

export default ryoppippi({
	svelte: false,
	tailwindcss: false,
	ignores: ['example'],
	typescript: {
		tsconfigPath: './tsconfig.json',
	},
});
