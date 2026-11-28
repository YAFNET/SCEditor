/**
 * SCEditor Markdown Insert Plugin
 * http://www.sceditor.com/
 *
 * Adds a toolbar button that accepts Markdown input and converts it
 * to the active editor format (BBCode, etc.) before inserting.
 *
 * The Markdown -> HTML converter is self-contained in this file, so no
 * separate Markdown format needs to be loaded.
 *
 * Copyright (C) 2011-2026, Sam Clarke (samclarke.com)
 *
 * SCEditor is licensed under the MIT license:
 *	http://www.opensource.org/licenses/mit-license.php
 *
 * @author Sam Clarke
 */
import SCEditor from '../lib/SCEditor.js';
import PluginManager from '../lib/PluginManager.js';
import defaultOptions from '../lib/defaultOptions.js';
import { uriScheme as escapeUriScheme } from '../lib/escape.js';
import { sizeToPercent } from '../lib/fontSizes.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const HR_REGEX = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const UL_REGEX = /^[ ]{0,3}[-*+]\s/;
const OL_REGEX = /^[ ]{0,3}\d+\.\s/;

/**
 * Escapes HTML special characters
 */
function escapeHtml(str: string): string {
	return (str || '').replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Converts inline Markdown syntax to HTML
 */
function parseInline(text: string): string {
	const codeSpans: string[] = [];

	// Protect inline code spans before any other processing
	text = text.replace(/`([^`\n]+)`/g, function (_match, code: string) {
		const idx = codeSpans.length;
		codeSpans.push('<code>' + escapeHtml(code) + '</code>');
		return '\x00' + idx + '\x00';
	});

	// Escape HTML entities in non-code text
	text = escapeHtml(text);

	// Attribute values (URLs, titles, alt text) are swapped out for
	// placeholders so the emphasis rules below can't alter them,
	// e.g. the underscores in http://example.com/a_b_c
	const attrs: string[] = [];
	const protect = function (value: string): string {
		attrs.push(value);
		return '\x01' + (attrs.length - 1) + '\x01';
	};
	const safeUrl = function (url: string): string {
		// The text has already been HTML escaped so unescape the &amp;
		// before validating the scheme, then escape it again
		return escapeHtml(escapeUriScheme(url.replace(/&amp;/g, '&')));
	};

	// Images (must come before links)
	text = text.replace(
		/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g,
		function (_m, alt: string, src: string, title?: string) {
			return '<img src="' + protect(safeUrl(src)) + '" alt="' +
				protect(alt) + '"' +
				(title ? ' title="' + protect(title) + '"' : '') + '>';
		}
	);

	// Links
	text = text.replace(
		/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g,
		function (_m, linkText: string, href: string, title?: string) {
			return '<a href="' + protect(safeUrl(href)) + '"' +
				(title ? ' title="' + protect(title) + '"' : '') + '>' +
				linkText + '</a>';
		}
	);

	// Bold + Italic (must come before bold and italic individually)
	text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
	text = text.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');

	// Bold
	text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
	text = text.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');

	// Italic
	text = text.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
	text = text.replace(/_([^_\n]+)_/g, '<em>$1</em>');

	// Strikethrough
	text = text.replace(/~~([^~\n]+)~~/g, '<s>$1</s>');

	// Hard line break: two or more spaces before newline
	text = text.replace(/ {2,}\n/g, '<br>\n');

	// Restore protected attribute values and code spans
	text = text.replace(/\x01(\d+)\x01/g, function (_m, idx: string) {
		return attrs[parseInt(idx, 10)];
	});
	text = text.replace(/\x00(\d+)\x00/g, function (_m, idx: string) {
		return codeSpans[parseInt(idx, 10)];
	});

	return text;
}

/**
 * Converts Markdown source to HTML
 */
function markdownToHtml(source: string, isFragment = false): string {
	if (!source) {
		return '';
	}

	const output: string[] = [];
	const lines = source.replace(/\r\n?/g, '\n').split('\n');
	const n = lines.length;
	let i = 0;

	while (i < n) {
		const line = lines[i];

		// Fenced code block
		if (/^```/.test(line)) {
			const lang = line.slice(3).trim();
			const codeLines: string[] = [];
			i++;
			while (i < n && !/^```/.test(lines[i])) {
				codeLines.push(lines[i]);
				i++;
			}
			i++; // skip closing ```
			output.push(
				'<pre><code' +
				(lang ? ' class="language-' + escapeHtml(lang) + '"' : '') +
				'>' + escapeHtml(codeLines.join('\n')) + '</code></pre>'
			);
			continue;
		}

		// ATX heading
		const headMatch = line.match(/^(#{1,6})\s+(.*?)(?:\s+#+\s*)?$/);
		if (headMatch) {
			const level = headMatch[1].length;
			output.push(
				'<h' + level + '>' +
				parseInline(headMatch[2]) +
				'</h' + level + '>'
			);
			i++;
			continue;
		}

		// Horizontal rule (3+ of -, *, _ optionally separated by spaces)
		if (HR_REGEX.test(line)) {
			output.push('<hr>');
			i++;
			continue;
		}

		// Blockquote
		if (/^>/.test(line)) {
			const bqLines: string[] = [];
			while (i < n && /^>/.test(lines[i])) {
				bqLines.push(lines[i].replace(/^>\s?/, ''));
				i++;
			}
			output.push(
				'<blockquote>' +
				markdownToHtml(bqLines.join('\n'), true) +
				'</blockquote>'
			);
			continue;
		}

		// Unordered list
		if (UL_REGEX.test(line)) {
			const ulItems: string[] = [];
			while (i < n && UL_REGEX.test(lines[i])) {
				ulItems.push(
					'<li>' +
					parseInline(lines[i].replace(/^[ ]{0,3}[-*+]\s+/, '')) +
					'</li>'
				);
				i++;
			}
			output.push('<ul>' + ulItems.join('') + '</ul>');
			continue;
		}

		// Ordered list
		if (OL_REGEX.test(line)) {
			const olItems: string[] = [];
			while (i < n && OL_REGEX.test(lines[i])) {
				olItems.push(
					'<li>' +
					parseInline(lines[i].replace(/^[ ]{0,3}\d+\.\s+/, '')) +
					'</li>'
				);
				i++;
			}
			output.push('<ol>' + olItems.join('') + '</ol>');
			continue;
		}

		// Blank line
		if (line.trim() === '') {
			i++;
			continue;
		}

		// Paragraph: collect lines until a blank line or block element starts
		const paraLines: string[] = [];
		while (
			i < n &&
			lines[i].trim() !== '' &&
			!/^```/.test(lines[i]) &&
			!/^#{1,6}\s/.test(lines[i]) &&
			!HR_REGEX.test(lines[i]) &&
			!/^>/.test(lines[i]) &&
			!UL_REGEX.test(lines[i]) &&
			!OL_REGEX.test(lines[i])
		) {
			paraLines.push(lines[i]);
			i++;
		}

		if (paraLines.length > 0) {
			const paraHtml = parseInline(paraLines.join('\n'));
			output.push(isFragment ? paraHtml : '<p>' + paraHtml + '</p>');
		}
	}

	return output.join('\n');
}

/**
 * Converts Markdown to the source format of the editor
 * (e.g. BBCode). Falls back to HTML if the editor has no format.
 */
function markdownToSource(editor: Any, markdown: string): string {
	const html = markdownToEditorHtml(editor, markdown);
	const FormatCtor = SCEditor.formats[editor.opts.format];

	if (!FormatCtor) {
		return html;
	}

	const targetFmt: Any = new FormatCtor();

	if (typeof targetFmt.fragmentToSource !== 'function') {
		return html;
	}

	if (typeof targetFmt.init === 'function') {
		targetFmt.init.call({
			commands: {},
			opts: editor.opts,
			__UNSTABLE__sanitize: editor.__UNSTABLE__sanitize
		});
	}

	return targetFmt.fragmentToSource(html, document);
}

/**
 * BBCode has no headings (the editor showed them, the post lost them):
 * a heading becomes bold text, # and ## also larger ([size=7], [size=6])
 */
function headingsToBoldText(html: string): string {
	return html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, function (_: string, level: string, content: string) {
		const size = level === '1' ? 7 : level === '2' ? 6 : 0;
		const text = size ? `<span style="font-size:${sizeToPercent(size)}%">${content}</span>` : content;

		return `<p><strong>${text}</strong></p>`;
	});
}

/**
 * Converts Markdown to the HTML for the editor and its format
 */
function markdownToEditorHtml(editor: Any, markdown: string): string {
	const html = markdownToHtml(markdown);

	return editor.opts.format === 'bbcode' ? headingsToBoldText(html) : html;
}

/**
 * Builds and opens the Markdown input dropdown.
 */
function openDropdown(editor: Any, caller: HTMLElement, sourceMode: boolean) {
	// Same Bootstrap form structure as the link / media dropdowns
	const content = document.createElement('div');

	const form = document.createElement('form');
	// The dropdown itself gets the 'sceditor-markdown-insert' class
	form.className = 'sceditor-dropdown-form';
	form.noValidate = true;
	content.appendChild(form);

	const group = document.createElement('div');
	group.className = 'mb-3';
	form.appendChild(group);

	const label = document.createElement('label');
	label.className = 'form-label';
	label.htmlFor = 'markdowninsert';
	label.textContent = editor._('Markdown:');
	group.appendChild(label);

	const textarea = document.createElement('textarea');
	textarea.id = 'markdowninsert';
	textarea.className = 'form-control textarea-input';
	textarea.rows = 6;
	textarea.placeholder =
		'# Heading\n\n**bold**, *italic*, `code`\n\n' +
		'- list item\n\n[link](url)';
	group.appendChild(textarea);

	const hint = document.createElement('div');
	hint.className = 'form-text sceditor-markdown-insert-hint';
	hint.textContent = editor._('Ctrl+Enter to insert');
	group.appendChild(hint);

	const footer = document.createElement('div');
	footer.className = 'sceditor-dropdown-footer';
	form.appendChild(footer);

	const cancelBtn = document.createElement('button');
	cancelBtn.type = 'button';
	cancelBtn.className = 'btn btn-sm btn-outline-secondary sceditor-cancel';
	cancelBtn.textContent = editor._('Cancel');
	footer.appendChild(cancelBtn);

	const insertBtn = document.createElement('button');
	insertBtn.type = 'button';
	insertBtn.className = 'btn btn-sm btn-primary button';
	insertBtn.textContent = editor._('Insert');
	footer.appendChild(insertBtn);

	function doInsert() {
		const markdown = textarea.value;

		if (markdown.trim()) {
			if (sourceMode) {
				editor.insertText(markdownToSource(editor, markdown));
			} else {
				editor.wysiwygEditorInsertHtml(markdownToEditorHtml(editor, markdown));
			}
		}

		editor.closeDropDown(true);
	}

	insertBtn.addEventListener('click', function (e) {
		e.preventDefault();
		doInsert();
	});

	textarea.addEventListener('keydown', function (e) {
		// Ctrl+Enter or Cmd+Enter submits
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			doInsert();
		}
	});

	editor.createDropDown(caller, 'markdown-insert', content);

	setTimeout(function () {
		textarea.focus();
	}, 0);
}

/**
 * SCEditor Markdown Insert plugin
 *
 * Adds a 'markdowninsert' toolbar command that opens a Markdown editor
 * dropdown. On insert the Markdown is converted to the active editor
 * format (BBCode etc.) and placed at the cursor.
 *
 * Usage:
 *   plugins: 'markdowninsert'
 *   toolbar: '...,markdowninsert'
 *
 * If the default toolbar is used, the button is added automatically in
 * front of the 'source' button.
 */
PluginManager.plugins.markdowninsert = function (this: Any) {
	this.init = function (this: Any) {
		const editor = this;

		editor.commands.markdowninsert = {
			exec: function (this: Any, caller: HTMLElement) {
				openDropdown(this, caller, false);
			},
			txtExec: function (this: Any, caller: HTMLElement) {
				openDropdown(this, caller, true);
			},
			tooltip: 'Insert Markdown'
		};

		// Add to the toolbar before 'source' if using the default toolbar
		if (editor.opts.toolbar === defaultOptions.toolbar &&
			!/(^|[,|])markdowninsert([,|]|$)/.test(editor.opts.toolbar)) {
			editor.opts.toolbar = editor.opts.toolbar.replace(
				/(^|[,|])source([,|]|$)/,
				'$1markdowninsert,source$2'
			);
		}
	};
} as Any;

// Exposed for unit testing / reuse
(PluginManager.plugins.markdowninsert as Any).markdownToHtml = markdownToHtml;
