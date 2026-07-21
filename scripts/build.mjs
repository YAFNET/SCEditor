/* eslint-env node */
/**
 * Build script for SCEditor.
 *
 * Replaces the old Gruntfile.js pipeline:
 *  - sass -> postcss (autoprefixer + cssnano + banner)   => dist/sceditor.min.css
 *  - vite (rollup) bundles src/sceditor.js as an IIFE, then that bundle is
 *    concatenated with the legacy global-style plugin/format/icon scripts
 *    and minified together with terser                  => dist/sceditor.min.js(.map)
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

// Legacy global-style scripts concatenated onto the core bundle, in this
// exact order, then minified together (mirrors the old uglify:build config).
const legacyFiles = [
	'src/formats/bbcode.js',
	'src/icons/fontawesome.js',
	'src/plugins/alternative-lists.js',
	'src/plugins/dragdrop.js',
	'src/plugins/undo.js',
	'src/plugins/plaintext.js',
	'src/plugins/mentions.js'
];

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

async function bundleCoreJs() {
	const result = await viteBuild({
		root: rootDir,
		configFile: false,
		logLevel: 'warn',
		build: {
			write: false,
			minify: false,
			rollupOptions: {
				input: path.join(rootDir, 'src/sceditor.js'),
				output: { format: 'iife' }
			}
		}
	});

	const [{ output }] = Array.isArray(result) ? result : [result];
	const chunk = output.find((item) => item.type === 'chunk');

	return chunk.code;
}

async function buildJs() {
	const coreCode = await bundleCoreJs();

	const files = { 'sceditor.min.js': coreCode };

	for (const file of legacyFiles) {
		files[`../${file}`] = await readFile(path.join(rootDir, file), 'utf8');
	}

	const minified = await minify(files, {
		compress: true,
		mangle: true,
		sourceMap: {
			filename: 'sceditor.min.js',
			url: 'sceditor.min.js.map',
			includeSources: true
		},
		format: {
			preamble: banner.trimEnd(),
			comments: false
		}
	});

	await writeFile(path.join(distDir, 'sceditor.min.js'), minified.code);
	await writeFile(path.join(distDir, 'sceditor.min.js.map'), minified.map);
}

async function buildLanguages() {
	const { readdir } = await import('node:fs/promises');
	const languagesDir = path.join(rootDir, 'languages');
	const entries = (await readdir(languagesDir)).filter((name) => name.endsWith('.js'));

	for (const name of entries) {
		const code = await readFile(path.join(languagesDir, name), 'utf8');

		const minified = await minify({ [`../../languages/${name}`]: code }, {
			compress: true,
			mangle: true,
			sourceMap: {
				filename: name,
				url: `${name}.map`,
				includeSources: true
			},
			format: {
				preamble: banner.trimEnd(),
				comments: false
			}
		});

		await writeFile(path.join(distDir, 'languages', name), minified.code);
		await writeFile(path.join(distDir, 'languages', `${name}.map`), minified.map);
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
