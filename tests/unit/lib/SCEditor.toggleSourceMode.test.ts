import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import SCEditor from 'src/lib/SCEditor.js';
import defaultCommands from 'src/lib/defaultCommands.js';
import defaultOptions from 'src/lib/defaultOptions.js';
import rangy from 'rangy';
import 'src/formats/bbcode.js';

// Isolated from SCEditor.test.ts because importing the real bbcode format
// registers it on the shared SCEditor.formats registry, which changes the
// default format used by every editor instance created in this module.

let sceditor;
const $fixture = document.getElementById('qunit-module-fixture');

const reloadEditor = (config) => {
	if (sceditor) {
		sceditor.destroy();
	}

	const textarea = document.createElement('textarea');

	$fixture.replaceChildren();
	$fixture.append(textarea);

	sceditor = new SCEditor(textarea, config || {});
	sceditor.focus();
};

describe('lib/SCEditor - toggleSourceMode() with the real bbcode format', () => {
	beforeEach(() => {
		SCEditor.commands = defaultCommands;
		SCEditor.defaultOptions = defaultOptions;

		reloadEditor({ format: 'bbcode' });
	});

	afterEach(() => {
		if (sceditor) {
			sceditor.destroy();
			sceditor = null;
		}
	});

	it('does not leak the caret marker and preserves the caret - WYSIWYG to source', () => {
		sceditor.val('<p>The quick brown fox jumps over the lazy dog.</p>');

		const iframe = sceditor.getContentAreaContainer();
		const body = sceditor.getBody();
		const textNode = body.firstChild.firstChild;
		const range = rangy.createRange(body.ownerDocument);
		const sel = rangy.getSelection(iframe);
		const offset = textNode.nodeValue.indexOf('brown');

		range.setStart(textNode, offset);
		range.collapse(true);
		sel.setSingleRange(range);

		sceditor.toggleSourceMode();

		expect(sceditor.sourceMode()).toBe(true);

		const sourceEditor = sceditor.getSourceEditor();

		// The bug this guards against: dom.removeWhiteSpace() strips zero
		// width spaces during the WYSIWYG -> BBCode conversion, so a caret
		// marker wrapped in them loses its wrapper and can no longer be
		// found/removed - leaking the bare marker text into the content.
		expect(sourceEditor.value).not.toMatch(/caret-marker/);
		expect(sourceEditor.selectionStart).toBe(sourceEditor.selectionEnd);
		expect(sourceEditor.value.slice(0, sourceEditor.selectionStart))
			.toMatch(/The quick $/);
		expect(sourceEditor.value.slice(sourceEditor.selectionStart))
			.toMatch(/^brown fox jumps over the lazy dog\./);
	});

	it('does not leak the caret marker and preserves the caret - source to WYSIWYG', () => {
		sceditor.sourceMode(true);
		sceditor.val('The quick brown fox jumps over the lazy dog.');

		const sourceEditor = sceditor.getSourceEditor();
		const pos = sourceEditor.value.indexOf('brown');

		sceditor.sourceEditorCaret({ start: pos, end: pos });

		sceditor.toggleSourceMode();

		expect(sceditor.sourceMode()).toBe(false);

		const body = sceditor.getBody();
		expect(body.textContent).not.toMatch(/caret-marker/);

		const range = sceditor.getRangeHelper().selectedRange();

		expect(range.collapsed).toBe(true);
		expect((range.startContainer.nodeValue || '').slice(0, range.startOffset))
			.toMatch(/The quick $/);
		expect((range.startContainer.nodeValue || '').slice(range.startOffset))
			.toMatch(/^brown fox jumps over the lazy dog\./);
	});
});
