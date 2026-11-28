import { describe, it, expect } from 'vitest';
import defaultOptions from 'src/lib/defaultOptions.js';
import 'src/sceditor.js';
import 'src/formats/bbcode.js';

describe('formats/bbcode - quote', () => {
	const createEditor = () => {
		const mockEditor = { opts: defaultOptions, __UNSTABLE__sanitize: x => x };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		return mockEditor;
	};

	const toElement = (html) => {
		const container = document.createElement('div');
		container.innerHTML = html;

		return container;
	};

	it('shows the name of a quote of a post without the post id and keeps the id', () => {
		const editor = createEditor();

		const html = editor.fromBBCode('[quote=admin;12]hi[/quote]');
		const cite = toElement(html).querySelector('cite');

		expect(cite.textContent).toBe('admin');
		expect(editor.toBBCode(html).trim()).toBe('[quote=admin;12]hi[/quote]');
	});

	it('keeps a name without a post id', () => {
		const editor = createEditor();

		const html = editor.fromBBCode('[quote=Alice]hi[/quote]');

		expect(toElement(html).querySelector('cite').textContent).toBe('Alice');
		expect(editor.toBBCode(html).trim()).toBe('[quote=Alice]hi[/quote]');
	});

	it('keeps a name with a semicolon that is not followed by a post id', () => {
		const editor = createEditor();

		const html = editor.fromBBCode('[quote=Tom;Jerry]hi[/quote]');

		expect(toElement(html).querySelector('cite').textContent).toBe('Tom;Jerry');
		expect(editor.toBBCode(html).trim()).toBe('[quote=Tom;Jerry]hi[/quote]');
	});

	it('keeps the post ids of nested quotes', () => {
		const editor = createEditor();
		const bbcode = '[quote=admin;1]outer[quote=Alice;2]inner[/quote][/quote]';

		const html = editor.fromBBCode(bbcode);

		expect(Array.from(toElement(html).querySelectorAll('cite')).map(c => c.textContent).sort())
			.toEqual(['Alice', 'admin']);
		expect(editor.toBBCode(html).replace(/\n/g, '')).toBe(bbcode);
	});

	it('shows the author above the text, in a blockquote', () => {
		const editor = createEditor();

		const quote = toElement(editor.fromBBCode('[quote=Alice]hi[/quote]')).querySelector('blockquote');

		expect(quote.className).toBe('bbcode-quote');
		expect(quote.firstElementChild.tagName).toBe('CITE');
	});

	it('converts the quotes of the old editor', () => {
		const editor = createEditor();
		const html = '<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm">hi' +
			'<cite class="card-text text-end d-block text-body-secondary small">Alice</cite></div>';

		expect(editor.toBBCode(html).trim()).toBe('[quote=Alice]hi[/quote]');
	});

	it('a quote whose name was deleted has no name', () => {
		const editor = createEditor();

		expect(editor.toBBCode('<blockquote class="bbcode-quote"><cite class="bbcode-quote-header" data-post-id="3"> </cite>hi</blockquote>').trim())
			.toBe('[quote]hi[/quote]');
	});

	it('a blockquote (e.g. a Markdown quote) is a quote', () => {
		const editor = createEditor();

		expect(editor.toBBCode('<blockquote>quoted</blockquote>').trim()).toBe('[quote]quoted[/quote]');
	});
});
