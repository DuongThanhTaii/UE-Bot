import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'utils/index': 'src/utils/index.ts',
    'constants/index': 'src/constants/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
  },
  tsconfig: 'tsconfig.json',
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
});
