import { ryoppippi } from '@ryoppippi/eslint-config';

export default ryoppippi({
	svelte: true,
	tailwindcss: false,
	ignores: ['example', 'tests/*.html'],
	typescript: {
		tsconfigPath: './tsconfig.json',
	},
});
