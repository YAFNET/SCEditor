import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import SCEditor from 'src/lib/SCEditor.js';
import PluginManager from 'src/lib/PluginManager.js';
import defaultCommands from 'src/lib/defaultCommands.js';
import defaultOptions from 'src/lib/defaultOptions.js';
import 'src/formats/bbcode.js';
import 'src/plugins/markdowninsert.js';

const markdownToHtml = PluginManager.plugins.markdowninsert.markdownToHtml;

describe('plugins/markdowninsert - markdownToHtml()', () => {
	it('returns an empty string for empty input', () => {
		expect(markdownToHtml('')).toBe('');
		expect(markdownToHtml(null)).toBe('');
	});

	it('converts ATX headings', () => {
		expect(markdownToHtml('# One')).toBe('<h1>One</h1>');
		expect(markdownToHtml('###### Six')).toBe('<h6>Six</h6>');
		expect(markdownToHtml('## Closed ##')).toBe('<h2>Closed</h2>');
	});

	it('does not treat a hash without a space as a heading', () => {
		expect(markdownToHtml('#tag')).toBe('<p>#tag</p>');
	});

	it('wraps paragraphs and joins consecutive lines', () => {
		expect(markdownToHtml('one\ntwo\n\nthree'))
			.toBe('<p>one\ntwo</p>\n<p>three</p>');
	});

	it('normalizes CRLF and CR line endings', () => {
		expect(markdownToHtml('one\r\n\r\ntwo\r\rthree'))
			.toBe('<p>one</p>\n<p>two</p>\n<p>three</p>');
	});

	it('converts bold, italic and bold italic', () => {
		expect(markdownToHtml('**b** __b__'))
			.toBe('<p><strong>b</strong> <strong>b</strong></p>');
		expect(markdownToHtml('*i* _i_'))
			.toBe('<p><em>i</em> <em>i</em></p>');
		expect(markdownToHtml('***bi*** ___bi___'))
			.toBe('<p><strong><em>bi</em></strong> <strong><em>bi</em></strong></p>');
	});

	it('converts strikethrough', () => {
		expect(markdownToHtml('~~gone~~')).toBe('<p><s>gone</s></p>');
	});

	it('converts hard line breaks', () => {
		expect(markdownToHtml('one  \ntwo')).toBe('<p>one<br>\ntwo</p>');
	});

	it('converts inline code and escapes its content', () => {
		expect(markdownToHtml('use `<b>**x**</b>`'))
			.toBe('<p>use <code>&lt;b&gt;**x**&lt;/b&gt;</code></p>');
	});

	it('escapes HTML in plain text', () => {
		expect(markdownToHtml('<script>alert("x")</script> & co'))
			.toBe('<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co</p>');
	});

	it('converts fenced code blocks with and without a language', () => {
		expect(markdownToHtml('```\na < b\n**no**\n```'))
			.toBe('<pre><code>a &lt; b\n**no**</code></pre>');
		expect(markdownToHtml('```js\nlet a;\n```'))
			.toBe('<pre><code class="language-js">let a;</code></pre>');
	});

	it('converts an unterminated fenced code block to the end', () => {
		expect(markdownToHtml('```\ncode'))
			.toBe('<pre><code>code</code></pre>');
	});

	it('converts horizontal rules', () => {
		expect(markdownToHtml('---')).toBe('<hr>');
		expect(markdownToHtml('* * *')).toBe('<hr>');
		expect(markdownToHtml('___')).toBe('<hr>');
		expect(markdownToHtml('- - - - -')).toBe('<hr>');
		expect(markdownToHtml('*****  ')).toBe('<hr>');
	});

	it('does not treat mixed or short rule characters as a rule', () => {
		expect(markdownToHtml('-*-')).toBe('<p>-*-</p>');
		expect(markdownToHtml('--')).toBe('<p>--</p>');
	});

	it('converts blockquotes including nested markdown', () => {
		expect(markdownToHtml('> **quoted**\n> text'))
			.toBe('<blockquote><strong>quoted</strong>\ntext</blockquote>');
		expect(markdownToHtml('> # Title'))
			.toBe('<blockquote><h1>Title</h1></blockquote>');
	});

	it('converts unordered lists', () => {
		expect(markdownToHtml('- one\n* two\n+ **three**'))
			.toBe('<ul><li>one</li><li>two</li><li><strong>three</strong></li></ul>');
	});

	it('converts ordered lists', () => {
		expect(markdownToHtml('1. one\n2. two'))
			.toBe('<ol><li>one</li><li>two</li></ol>');
	});

	it('ends a paragraph when a block element starts', () => {
		expect(markdownToHtml('text\n- item'))
			.toBe('<p>text</p>\n<ul><li>item</li></ul>');
		expect(markdownToHtml('text\n# Head'))
			.toBe('<p>text</p>\n<h1>Head</h1>');
	});

	it('converts links with and without a title', () => {
		expect(markdownToHtml('[site](http://example.com)'))
			.toBe('<p><a href="http://example.com">site</a></p>');
		expect(markdownToHtml('[site](http://example.com "The title")'))
			.toBe('<p><a href="http://example.com" title="The title">site</a></p>');
	});

	it('formats link text', () => {
		expect(markdownToHtml('[**bold**](http://example.com)'))
			.toBe('<p><a href="http://example.com"><strong>bold</strong></a></p>');
	});

	it('converts images with and without a title', () => {
		expect(markdownToHtml('![alt](http://example.com/a.png)'))
			.toBe('<p><img src="http://example.com/a.png" alt="alt"></p>');
		expect(markdownToHtml('![alt](http://example.com/a.png "T")'))
			.toBe('<p><img src="http://example.com/a.png" alt="alt" title="T"></p>');
	});

	it('does not apply emphasis inside URLs or attributes', () => {
		expect(markdownToHtml('[x](http://example.com/a_b_c/*d*)'))
			.toBe('<p><a href="http://example.com/a_b_c/*d*">x</a></p>');
		expect(markdownToHtml('![_a_](http://example.com/__b__.png)'))
			.toBe('<p><img src="http://example.com/__b__.png" alt="_a_"></p>');
	});

	it('keeps query strings escaped', () => {
		expect(markdownToHtml('[x](http://example.com/?a=1&b=2)'))
			.toBe('<p><a href="http://example.com/?a=1&amp;b=2">x</a></p>');
	});

	it('neutralizes javascript: URLs', () => {
		const div = document.createElement('div');
		div.innerHTML = markdownToHtml('[x](javascript:alert(1\\))') +
			markdownToHtml('[y](javascript:alert)') +
			markdownToHtml('![z](javascript:alert)');

		div.querySelectorAll('a').forEach((a) => {
			expect(a.getAttribute('href')).not.toMatch(/^javascript:/i);
		});
		div.querySelectorAll('img').forEach((img) => {
			expect(img.getAttribute('src')).not.toMatch(/^javascript:/i);
		});
	});

	it('cannot break out of attributes', () => {
		const div = document.createElement('div');
		div.innerHTML = markdownToHtml(
			'[x](http://example.com/"onmouseover="alert(1) "t" onclick="y")'
		);

		const a = div.querySelector('a');
		expect(a).not.toBeNull();
		expect(a.hasAttribute('onmouseover')).toBe(false);
		expect(a.hasAttribute('onclick')).toBe(false);
	});
});

describe('plugins/markdowninsert - editor integration', () => {
	const $fixture = document.getElementById('qunit-module-fixture');
	let textarea;
	let editor;

	const createEditor = (options = {}) => {
		editor = new SCEditor(textarea, {
			format: 'bbcode',
			plugins: 'markdowninsert',
			...options
		});
		return editor;
	};

	const container = () => $fixture.querySelector('.sceditor-container');

	const openDropdown = () => {
		const button = container()
			.querySelector('.sceditor-button-markdowninsert');
		button.click();

		return container()
			.querySelector('.sceditor-dropdown.sceditor-markdown-insert');
	};

	beforeEach(() => {
		SCEditor.commands       = defaultCommands;
		SCEditor.defaultOptions = defaultOptions;

		textarea = document.createElement('textarea');
		$fixture.replaceChildren();
		$fixture.append(textarea);
	});

	afterEach(() => {
		if (editor) {
			editor.destroy();
			editor = null;
		}
	});

	it('registers the markdowninsert command', () => {
		createEditor();

		expect(editor.commands.markdowninsert).toBeDefined();
		expect(typeof editor.commands.markdowninsert.exec).toBe('function');
		expect(typeof editor.commands.markdowninsert.txtExec).toBe('function');
		expect(editor.commands.markdowninsert.tooltip).toBe('Insert Markdown');
	});

	it('adds the button before source on the default toolbar', () => {
		createEditor();

		expect(editor.opts.toolbar).toContain('markdowninsert,source');

		const buttons = Array.from(
			container().querySelectorAll('.sceditor-button')
		).map((btn) => btn.className);
		const mdIdx = buttons.findIndex(c => c.includes('sceditor-button-markdowninsert'));
		const srcIdx = buttons.findIndex(c => c.includes('sceditor-button-source'));

		expect(mdIdx).toBeGreaterThan(-1);
		expect(mdIdx).toBe(srcIdx - 1);
	});

	it('does not modify a custom toolbar', () => {
		createEditor({ toolbar: 'bold,italic|source' });

		expect(editor.opts.toolbar).toBe('bold,italic|source');
		expect(container()
			.querySelector('.sceditor-button-markdowninsert')).toBeNull();
	});

	it('opens a dropdown with a textarea and insert button', () => {
		createEditor({ toolbar: 'bold,markdowninsert' });

		const dropdown = openDropdown();

		expect(dropdown).not.toBeNull();
		expect(dropdown.querySelector('textarea')).not.toBeNull();
		expect(dropdown.querySelector('.button').textContent).toBe('Insert');
		expect(dropdown.querySelector('.sceditor-markdown-insert-hint'))
			.not.toBeNull();
	});

	it('inserts converted HTML in WYSIWYG mode', () => {
		createEditor({ toolbar: 'bold,markdowninsert' });

		const dropdown = openDropdown();
		dropdown.querySelector('textarea').value = '**bold** and *italic*';
		dropdown.querySelector('.button').click();

		const body = editor.getBody();
		expect(body.querySelector('strong').textContent).toBe('bold');
		expect(body.querySelector('em').textContent).toBe('italic');
		expect(container()
			.querySelector('.sceditor-markdown-insert')).toBeNull();
		expect(editor.val()).toContain('[b]bold[/b] and [i]italic[/i]');
	});

	it('inserts converted BBCode in source mode', () => {
		createEditor({ toolbar: 'bold,markdowninsert' });
		editor.sourceMode(true);

		const dropdown = openDropdown();
		dropdown.querySelector('textarea').value =
			'**bold** [link](http://example.com)\n\n- one\n- two';
		dropdown.querySelector('.button').click();

		const value = editor.getSourceEditorValue(false);
		expect(value).toContain('[b]bold[/b]');
		expect(value).toContain('[url=http://example.com]link[/url]');
		expect(value).toMatch(
			/\[list\]\s*\[li\]one\[\/li\]\s*\[li\]two\[\/li\]\s*\[\/list\]/
		);
		expect(value).not.toContain('<');
		expect(container()
			.querySelector('.sceditor-markdown-insert')).toBeNull();
	});

	it('inserts headings as bold (and larger) text, BBCode has no headings', () => {
		createEditor({ toolbar: 'bold,markdowninsert' });

		const dropdown = openDropdown();
		dropdown.querySelector('textarea').value = '# Big\n\n## Medium\n\n### Small';
		dropdown.querySelector('.button').click();

		const value = editor.val();
		expect(value).toContain('[b][size=7]Big[/size][/b]');
		expect(value).toContain('[b][size=6]Medium[/size][/b]');
		expect(value).toContain('[b]Small[/b]');
		expect(editor.getBody().querySelector('h1, h2, h3')).toBeNull();
	});

	it('inserts headings as bold (and larger) text in source mode', () => {
		createEditor({ toolbar: 'bold,markdowninsert' });
		editor.sourceMode(true);

		const dropdown = openDropdown();
		dropdown.querySelector('textarea').value = '# Big\n\n### Small';
		dropdown.querySelector('.button').click();

		const value = editor.getSourceEditorValue(false);
		expect(value).toContain('[b][size=7]Big[/size][/b]');
		expect(value).toContain('[b]Small[/b]');
	});

	it('inserts on Ctrl+Enter', () => {
		createEditor({ toolbar: 'bold,markdowninsert' });
		editor.sourceMode(true);

		const dropdown = openDropdown();
		const input = dropdown.querySelector('textarea');
		input.value = '~~struck~~';
		input.dispatchEvent(new KeyboardEvent('keydown', {
			key: 'Enter',
			ctrlKey: true,
			bubbles: true
		}));

		expect(editor.getSourceEditorValue(false)).toContain('[s]struck[/s]');
	});

	it('does not insert on plain Enter', () => {
		createEditor({ toolbar: 'bold,markdowninsert' });
		editor.sourceMode(true);

		const dropdown = openDropdown();
		const input = dropdown.querySelector('textarea');
		input.value = '**x**';
		input.dispatchEvent(new KeyboardEvent('keydown', {
			key: 'Enter',
			bubbles: true
		}));

		expect(editor.getSourceEditorValue(false)).toBe('');
		expect(container()
			.querySelector('.sceditor-markdown-insert')).not.toBeNull();
	});

	it('closes without inserting when the input is empty', () => {
		createEditor({ toolbar: 'bold,markdowninsert' });
		editor.sourceMode(true);

		const dropdown = openDropdown();
		dropdown.querySelector('textarea').value = '   \n  ';
		dropdown.querySelector('.button').click();

		expect(editor.getSourceEditorValue(false)).toBe('');
		expect(container()
			.querySelector('.sceditor-markdown-insert')).toBeNull();
	});
});
