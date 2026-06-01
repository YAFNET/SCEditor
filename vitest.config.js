import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';
import { playwright } from '@vitest/browser-playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			src: path.resolve(__dirname, 'src'),
			tests: path.resolve(__dirname, 'tests'),
			dist: path.resolve(__dirname, 'dist'),
		}
	},
	test: {
		browser: {
			enabled: true,
			headless: true,
			provider: playwright(),
			instances: [
				{ browser: 'chromium' },
			],
		},
		setupFiles: ['tests/unit/setup.js'],
		include: [
			'tests/unit/lib/*.test.js',
			'tests/unit/formats/**/*.test.js'
		],
		coverage: {
			provider: 'v8',
			include: ['src/**'],
		}
	}
});
