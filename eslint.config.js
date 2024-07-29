import { ryoppippi } from '@ryoppippi/eslint-config';

export default ryoppippi({
	svelte: false,
	tailwindcss: false,
	typescript: {
		tsconfigPath: './tsconfig.json',
	},
});
