import type { SCEditorInstance, SCEditorGlobal } from '../lib/types.js';

/**
 * Ambient DOM augmentations for ad-hoc properties SCEditor.js attaches
 * directly to real DOM elements (see src/lib/SCEditor.js):
 *  - toolbar buttons get `_sceTxtMode`/`_sceWysiwygMode` flags recording
 *    which editor mode they're usable in.
 *  - the source `<textarea>` gets a `_sceditor` back-reference to the
 *    editor instance so `sceditor.instance(el)` (src/sceditor.js) can
 *    retrieve it.
 *
 * Also declares the `sceditor` global itself: src/sceditor.js sets
 * `window.sceditor = {...}` and the legacy global-style scripts
 * (src/formats/**, src/icons/**, src/plugins/**, languages/**) are plain
 * scripts (no imports) that read/mutate it as an ambient global at load
 * time, relying on script load order rather than a module graph.
 */

/**
 * `tests/manual/manualTestRunner.js` defines this class and assigns
 * `window.runner = new TestRunner()`. It's a dev-only interactive QA
 * harness (never run by CI/vitest), so its test callbacks and the shared
 * per-test `this` context (an arbitrary ad-hoc property bag) are typed
 * loosely rather than modelled precisely.
 */
interface ManualTestRunner {
	assert: Any;
	test(options: Any, test: Any): void;
	setup(init: Any): void;
	run(): void;
	_done(passed: boolean): void;
}

declare global {
	// Shared loose-typing escape hatch for the legacy global-style scripts
	// (src/formats/**, src/icons/**, src/plugins/**, tests/manual/**), which
	// duck-type heavily against the ambient `sceditor` object at runtime.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type Any = any;

	interface HTMLElement {
		_sceTxtMode?: boolean;
		_sceWysiwygMode?: boolean;
	}

	interface HTMLTextAreaElement {
		_sceditor?: SCEditorInstance;
	}

	interface Window {
		sceditor: SCEditorGlobal;
		runner: ManualTestRunner;
		patchConsole: (outputDiv?: HTMLElement) => void;
		instance?: SCEditorInstance;
	}

	var sceditor: SCEditorGlobal;
	var runner: ManualTestRunner;
	var patchConsole: (outputDiv?: HTMLElement) => void;
}

export {};
