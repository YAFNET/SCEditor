/**
 * Strip-transpiles tests/manual/**\/*.ts to sibling .js files so the
 * existing static HTML pages (tests/manual/*\/index.html), which load them
 * via plain <script src="test.js"> tags against the built dist bundle, keep
 * working unchanged. These are dev-only interactive QA pages, not part of
 * the vitest run - the generated .js files are gitignored build output.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const manualDir = path.join(rootDir, 'tests', 'manual');

async function findTsFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...await findTsFiles(full));
		} else if (entry.name.endsWith('.ts')) {
			files.push(full);
		}
	}

	return files;
}

async function main() {
	const files = await findTsFiles(manualDir);

	for (const file of files) {
		const code = await readFile(file, 'utf8');

		const result = ts.transpileModule(code, {
			compilerOptions: {
				target: ts.ScriptTarget.ES2020,
				module: ts.ModuleKind.None,
				sourceMap: false
			}
		});

		await writeFile(file.replace(/\.ts$/, '.js'), result.outputText);
	}

	console.log(`Transpiled ${files.length} tests/manual/**/*.ts file(s).`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
