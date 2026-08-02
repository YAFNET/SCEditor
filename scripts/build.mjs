/**
 * Build script for SCEditor.
 *
 * Replaces the old Gruntfile.js pipeline:
 *  - sass -> postcss (autoprefixer + cssnano + banner)   => dist/sceditor.min.css
 *  - vite (rollup) bundles src/sceditor.ts - which imports the built-in
 *    formats/icons/plugins as ES modules - into iife/es/umd variants, each
 *    minified with terser:
 *      iife => dist/sceditor.min.js(.map)          (drop-in <script> global)
 *      es   => dist/sceditor.esm.min.js(.map)       (native <script type=module>/bundlers)
 *      umd  => dist/sceditor.umd.min.js(.map)       (CommonJS/AMD/global fallback)
 *  - each languages/*.js file is minified individually    => dist/languages/*.js(.map)
 */
import { rm, mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as viteBuild } from 'vite';
import { minify } from 'terser';
import * as sass from 'sass';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import postcssHeader from 'postcss-header';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, 'dist');

const pkg = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'));
const banner = `/* SCEditor v${pkg.version} | (C) 2017-${new Date().getFullYear()}, Sam Clarke | sceditor.com/license */\n`;

// languages/*.ts files are plain global-style scripts (no imports/exports,
// loaded individually and opt-in - see buildLanguages()), so this just
// type-strips them via vite/rolldown (the TypeScript package no longer
// ships an in-process transpile API - see https://github.com/microsoft/typescript-go).
async function transpileTsFiles(files) {
	const result = await viteBuild({
		root: rootDir,
		configFile: false,
		logLevel: 'warn',
		build: {
			write: false,
			minify: false,
			rollupOptions: {
				input: Object.fromEntries(files.map((file) => [file, path.join(rootDir, file)])),
				output: { format: 'es' }
			}
		}
	});

	const [{ output }] = Array.isArray(result) ? result : [result];
	const codeByFile = new Map();

	for (const item of output) {
		if (item.type === 'chunk') {
			codeByFile.set(item.name, item.code);
		}
	}

	return codeByFile;
}

async function clean() {
	await rm(distDir, { recursive: true, force: true });
	await rm(path.join(rootDir, 'coverage'), { recursive: true, force: true });
	await mkdir(path.join(distDir, 'languages'), { recursive: true });
}

async function buildCss() {
	const compiled = sass.compile(path.join(rootDir, 'src/sceditor.scss'), {
		sourceMap: false
	});

	const result = await postcss([
		autoprefixer(),
		cssnano(),
		postcssHeader({ header: banner })
	]).process(compiled.css, { from: undefined });

	await writeFile(path.join(distDir, 'sceditor.min.css'), result.css);
}

async function copyContent() {
	const contentDir = path.join(rootDir, 'src/content');

	if (!existsSync(contentDir)) {
		return;
	}

	await cp(contentDir, distDir, {
		recursive: true,
		filter: (src) => !src.endsWith('.css'),
	});
}

// src/sceditor.ts has a default export (for the es/umd builds) as well as
// its `window.sceditor = ...` side effect (kept for iife/umd drop-in
// <script> usage). Using `build.lib` (rather than a plain `rollupOptions.input`
// app-style build) is what makes Vite/rolldown treat the entry's export as
// a real library export instead of tree-shaking it away as unused.
async function bundleCoreJs(format) {
	const result = await viteBuild({
		root: rootDir,
		configFile: false,
		logLevel: 'warn',
		build: {
			write: false,
			minify: false,
			lib: {
				entry: path.join(rootDir, 'src/sceditor.ts'),
				name: 'sceditor',
				formats: [format],
				fileName: () => 'sceditor.js'
			}
		}
	});

	const [{ output }] = Array.isArray(result) ? result : [result];
	const chunk = output.find((item) => item.type === 'chunk');

	return chunk.code;
}

async function minifyAndWrite(code, outName, { module = false } = {}) {
	const minified = await minify({ [outName]: code }, {
		module,
		compress: true,
		mangle: true,
		sourceMap: {
			filename: outName,
			url: `${outName}.map`,
			includeSources: true
		},
		format: {
			preamble: banner.trimEnd(),
			comments: false
		}
	});

	await writeFile(path.join(distDir, outName), minified.code);
	await writeFile(path.join(distDir, `${outName}.map`), minified.map);
}

async function buildJs() {
	const [iifeCode, esCode, umdCode] = await Promise.all([
		bundleCoreJs('iife'),
		bundleCoreJs('es'),
		bundleCoreJs('umd')
	]);

	await Promise.all([
		minifyAndWrite(iifeCode, 'sceditor.min.js'),
		minifyAndWrite(esCode, 'sceditor.esm.min.js', { module: true }),
		minifyAndWrite(umdCode, 'sceditor.umd.min.js')
	]);
}

async function buildLanguages() {
	const { readdir } = await import('node:fs/promises');
	const languagesDir = path.join(rootDir, 'languages');
	const entries = (await readdir(languagesDir)).filter((name) => name.endsWith('.ts'));
	const files = entries.map((name) => path.join('languages', name));
	const transpiled = await transpileTsFiles(files);

	for (const name of entries) {
		const code = transpiled.get(path.join('languages', name));
		const outName = name.replace(/\.ts$/, '.js');

		const minified = await minify({ [`../../languages/${outName}`]: code }, {
			compress: true,
			mangle: true,
			sourceMap: {
				filename: outName,
				url: `${outName}.map`,
				includeSources: true
			},
			format: {
				preamble: banner.trimEnd(),
				comments: false
			}
		});

		await writeFile(path.join(distDir, 'languages', outName), minified.code);
		await writeFile(path.join(distDir, 'languages', `${outName}.map`), minified.map);
	}
}

async function main() {
	await clean();
	await Promise.all([
		buildCss(),
		copyContent(),
		buildJs(),
		buildLanguages()
	]);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
