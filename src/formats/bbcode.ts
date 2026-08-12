/**
 * SCEditor BBCode Plugin
 * http://www.sceditor.com/
 *
 * Copyright (C) 2011-2026, Sam Clarke (samclarke.com)
 *
 * SCEditor is licensed under the MIT license:
 *	http://www.opensource.org/licenses/mit-license.php
 *
 * @fileoverview SCEditor BBCode Format
 * @author Sam Clarke
 */
/*eslint max-depth: off*/
import { entities as escapeEntities, uriScheme as escapeUriScheme } from '../lib/escape.js';
import * as dom from '../lib/dom.js';
import * as utils from '../lib/utils.js';
import SCEditor from '../lib/SCEditor.js';

interface BBCodeAttrs {
	defaultattr?: string;
	[key: string]: string | undefined;
}

interface BBCodeToken {
	type: string;
	name: string;
	val: string;
	attrs: BBCodeAttrs;
	children: BBCodeToken[];
	closing: BBCodeToken | null;
	clone(): BBCodeToken;
	splitAt(splitAt: BBCodeToken): BBCodeToken;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface BBCodeHandler {
	tags?: Record<string, Record<string, unknown> | null>;
	styles?: Record<string, string[] | null>;
	format?: string | ((this: Any, element: Any, content: string) => string);
	html?: string | ((token: BBCodeToken, attrs: BBCodeAttrs, content: string) => string);
	isInline?: boolean;
	isHtmlInline?: boolean;
	isSelfClosing?: boolean;
	isPreFormatted?: boolean;
	allowsEmpty?: boolean;
	allowedChildren?: string[];
	closedBy?: string[];
	skipLastLineBreak?: boolean;
	excludeClosing?: boolean;
	breakBefore?: boolean;
	breakStart?: boolean;
	breakEnd?: boolean;
	breakAfter?: boolean;
	quoteType?: number | ((str: string, name: string) => string);
	strictMatch?: boolean;
	[key: string]: unknown;
}

const css = dom.css as (node: Any, rule: Any, value?: Any) => Any;
const attr = dom.attr as (node: Any, attr: string, value?: Any) => Any;
const is = dom.is as (node: Any, selector?: string) => boolean;
const extend = utils.extend as (target: Any, ...sources: Any[]) => Any;
const each = utils.each as (obj: Any, fn: (key: Any, value: Any) => void) => void;

let editorOptions: Any;

const getEditorCommand = SCEditor.command.get as (name: string) => Any;

const QuoteType = {
	/** @lends BBCodeParser.QuoteType */
	/**
	 * Always quote the attribute value
	 * @type {Number}
	 */
	always: 1,

	/**
	 * Never quote the attributes value
	 * @type {Number}
	 */
	never: 2,

	/**
	 * Only quote the attributes value when it contains spaces to equals
	 * @type {Number}
	 */
	auto: 3
};

const defaultCommandsOverrides: Record<string, Any> = {
	bold: {
		txtExec: ['[b]', '[/b]']
	},
	italic: {
		txtExec: ['[i]', '[/i]']
	},
	underline: {
		txtExec: ['[u]', '[/u]']
	},
	strike: {
		txtExec: ['[s]', '[/s]']
	},
	mark: {
		txtExec: ['[h]', '[/h]']
	},
	left: {
		txtExec: ['[left]', '[/left]']
	},
	center: {
		txtExec: ['[center]', '[/center]']
	},
	right: {
		txtExec: ['[right]', '[/right]']
	},
	justify: {
		txtExec: ['[justify]', '[/justify]']
	},
	font: {
		txtExec: function (this: Any, caller: Any) {
			const editor = this;

			getEditorCommand('font')._dropDown(
				editor,
				caller,
				function (fontName: string) {
					editor.insertText(
						`[font=${fontName}]`,
						'[/font]'
					);
				}
			);
		}
	},
	size: {
		txtExec: function (this: Any, caller: Any) {
			const editor = this;

			getEditorCommand('size')._dropDown(
				editor,
				caller,
				function (fontSize: string) {
					editor.insertText(
						`[size=${fontSize}]`,
						'[/size]'
					);
				}
			);
		}
	},
	color: {
		txtExec: function (this: Any, caller: Any) {
			const editor = this;

			getEditorCommand('color')._dropDown(
				editor,
				caller,
				function (color: string) {
					editor.insertText(
						`[color=${color}]`,
						'[/color]'
					);
				}
			);
		}
	},
	bulletlist: {
		txtExec: function (this: Any, caller: Any, selected: string) {
			this.insertText(
				`[list]\n[list]${selected.split(/\r?\n/).join('[/li]\n[li]')}[/li]\n[/ul]`
			);
		}
	},
	orderedlist: {
		txtExec: function (this: Any, caller: Any, selected: string) {
			this.insertText(
				`[list=I]\n[li]${selected.split(/\r?\n/).join('[/li]\n[li]')}[/li]\n[/list]`
			);
		}
	},
	table: {
		txtExec: ['[table][tr][td]', '[/td][/tr][/table]']
	},
	code: {
		txtExec: function (this: Any, caller: Any) {
			const editor = this;

			getEditorCommand('code')._dropDown(
				editor,
				caller,
				function (language: string) {
					editor.insertText(
						`[code=${language}]`,
						'[/code]'
					);
				}
			);
		}
	},
	note: {
		txtExec: function (this: Any, caller: Any) {
			const editor = this;

			getEditorCommand('note')._dropDown(
				editor,
				caller,
				function (type: string) {
					editor.insertText(
						`[note=${type}]`,
						'[/note]'
					);
				}
			);
		}
	},
	extensions: {
		txtExec: function (this: Any, caller: Any) {
			const editor = this;

			getEditorCommand('extensions')._dropDown(
				editor,
				caller,
				function (extension: string) {
					editor.insertText(
						`[${extension}]`,
						`[/${extension}]`
					);
				}
			);
		}
	},
	image: {
		txtExec: function (this: Any, caller: Any, selected: string) {
			const editor = this;

			getEditorCommand('image')._dropDown(
				editor,
				caller,
				function (url: string, text: string) {
					if (text || selected) {
						editor.insertText(
							`[img=${url}]${text || selected || url}[/img]`
						);
					} else {
						editor.insertText(`[img]${url}[/img]`);
					}
				}
			);
		}
	},
	email: {
		txtExec: function (this: Any, caller: Any, selected: string) {
			const editor = this;

			getEditorCommand('email')._dropDown(
				editor,
				caller,
				function (url: string, text: string) {
					editor.insertText(
						`[email=${url}]${text || selected || url}[/email]`
					);
				}
			);
		}
	},
	link: {
		txtExec: function (this: Any, caller: Any, selected: string) {
			const editor = this;

			getEditorCommand('link')._dropDown(
				editor,
				caller,
				function (url: string, text: string) {
					if (selected || text) {
						editor.insertText(
							`[url=${url}]${text || selected || url}[/url]`
						);
					} else {
						editor.insertText(`[url]${url}[/url]`);
					}

				}
			);
		}
	},
	quote: {
		txtExec: ['[quote]', '[/quote]']
	},

	userlink: {
		txtExec: ['[userlink]', '[/userlink]']
	},
	albums: {
		txtExec: function (this: Any, caller: Any) {
			const editor = this;

			getEditorCommand('albums')._dropDown(
				editor,
				caller,
				function (url: string) {
					editor.insertText(`[albumid]${url}[/albumid]`);
				}
			);
		}
	},
	attachments: {
		txtExec: function (this: Any, caller: Any) {
			const editor = this;

			getEditorCommand('attachments')._dropDown(
				editor,
				caller,
				function (url: string) {
					editor.insertText(`[attach]${url}[/attach]`);
				}
			);
		}
	},
	media: {
		txtExec: function (this: Any, caller: Any) {
			const editor = this;

			getEditorCommand('media')._dropDown(
				editor,
				caller,
				function (url: string) {
					editor.insertText(`[media]${url}[/media]`);
				}
			);
		}
	},
	vimeo: {
		txtExec: function (this: Any, caller: Any) {
			const editor = this;

			getEditorCommand('vimeo')._dropDown(
				editor,
				caller,
				function (url: string) {
					editor.insertText(`[vimeo]${url}[/vimeo]`);
				}
			);
		}
	},
	instagram: {
		txtExec: function (this: Any, caller: Any) {
			const editor = this;

			getEditorCommand('instagram')._dropDown(
				editor,
				caller,
				function (url: string) {
					editor.insertText(`[instagram]${url}[/instagram]`);
				}
			);
		}
	},
	facebook: {
		txtExec: function (this: Any, caller: Any) {
			const editor = this;

			getEditorCommand('facebook')._dropDown(
				editor,
				caller,
				function (url: string) {
					editor.insertText(`[facebook]${url}[/facebook]`);
				}
			);
		}
	},
	youtube: {
		txtExec: function (this: Any, caller: Any) {
			const editor = this;

			getEditorCommand('youtube')._dropDown(
				editor,
				caller,
				function (url: string) {
					editor.insertText(`[youtube]${url}[/youtube]`);
				}
			);
		}
	}
};

const bbcodeHandlers: Record<string, BBCodeHandler> = {
	// START_COMMAND: Bold
	b: {
		tags: {
			b: null,
			strong: null
		},
		styles: {
			// 401 is for FF 3.5
			'font-weight': ['bold', 'bolder', '401', '700', '800', '900']
		},
		format: '[b]{0}[/b]',
		html: '<strong>{0}</strong>'
	},
	// END_COMMAND

	// START_COMMAND: Italic
	i: {
		tags: {
			i: null,
			em: null
		},
		styles: {
			'font-style': ['italic', 'oblique']
		},
		format: '[i]{0}[/i]',
		html: '<em>{0}</em>'
	},
	// END_COMMAND

	// START_COMMAND: Underline
	u: {
		tags: {
			u: null
		},
		styles: {
			'text-decoration': ['underline']
		},
		format: '[u]{0}[/u]',
		html: '<u>{0}</u>'
	},
	// END_COMMAND

	// START_COMMAND: Strikethrough
	s: {
		tags: {
			s: null,
			strike: null
		},
		styles: {
			'text-decoration': ['line-through']
		},
		format: '[s]{0}[/s]',
		html: '<s>{0}</s>'
	},
	// END_COMMAND

	// START_COMMAND: Subscript
	sub: {
		tags: {
			sub: null
		},
		format: '[sub]{0}[/sub]',
		html: '<sub>{0}</sub>'
	},
	// END_COMMAND

	// START_COMMAND: Superscript
	sup: {
		tags: {
			sup: null
		},
		format: '[sup]{0}[/sup]',
		html: '<sup>{0}</sup>'
	},
	// END_COMMAND

	// START_COMMAND: mark
	h: {
		tags: {
			h: null,
			mark: null
		},
		format: '[h]{0}[/h]',
		html: '<mark>{0}</mark>'
	},
	// END_COMMAND


	// START_COMMAND: Font
	font: {
		tags: {
			font: {
				face: null
			}
		},
		styles: {
			'font-family': null
		},
		quoteType: QuoteType.never,
		format: function (element: Any, content: string) {
			let font;

			if (!is(element, 'font') || !(font = attr(element, 'face'))) {
				font = css(element, 'font-family');
			}

			return `[font=${_stripQuotes(font)}]${content}[/font]`;
		},
		html: '<font face="{defaultattr}">{0}</font>'
	},
	// END_COMMAND

	// START_COMMAND: Size
	size: {
		tags: {
			font: {
				size: null
			}
		},
		styles: {
			'font-size': null
		},
		format: function (element: Any, content: string) {
			let fontSize = attr(element, 'size');
			let size: Any = 2;

			if (!fontSize) {
				fontSize = css(element, 'fontSize');
			}

			// Most browsers return px value but IE returns 1-7
			if (fontSize.indexOf('px') > -1) {
				// convert size to an int
				fontSize = fontSize.replace('px', '') - 0;

				if (fontSize < 12) {
					size = 1;
				}
				if (fontSize > 15) {
					size = 3;
				}
				if (fontSize > 17) {
					size = 4;
				}
				if (fontSize > 23) {
					size = 5;
				}
				if (fontSize > 31) {
					size = 6;
				}
				if (fontSize > 47) {
					size = 7;
				}
			} else {
				size = fontSize;
			}

			return `[size=${size}]${content}[/size]`;
		},
		html: '<font size="{defaultattr}">{!0}</font>'
	},
	// END_COMMAND

	// START_COMMAND: Color
	color: {
		tags: {
			font: {
				color: null
			}
		},
		styles: {
			color: null
		},
		quoteType: QuoteType.never,
		format: function (elm: Any, content: string) {
			let color;

			if (!is(elm, 'font') || !(color = attr(elm, 'color'))) {
				color = elm.style.color || css(elm, 'color');
			}

			return `[color=${_normaliseColour(color)}]${content}[/color]`;
		},
		html: function (token: BBCodeToken, attrs: BBCodeAttrs, content: string) {
			return `<font color="${escapeEntities(_normaliseColour(attrs.defaultattr), true)}">${content}</font>`;
		}
	},
	// END_COMMAND

	// START_COMMAND: Lists
	ul: {
		tags: {
			ul: null
		},
		breakStart: true,
		isInline: false,
		skipLastLineBreak: true,
		format: '[list]{0}[/list]',
		html: '<ul>{0}</ul>'
	},
	list: {
		breakStart: true,
		isInline: false,
		skipLastLineBreak: true,
		format: '[list]{0}[/list]',
		html: '<ul>{0}</ul>'
	},
	ol: {
		tags: {
			ol: null
		},
		breakStart: true,
		isInline: false,
		skipLastLineBreak: true,
		format: '[list=I]{0}[/list]',
		html: '<ol>{0}</ol>'
	},
	li: {
		tags: {
			li: null
		},
		isInline: false,
		closedBy: ['/ul', '/ol', '/list', '*', 'li'],
		format: '[li]{0}[/li]',
		html: '<li>{0}</li>'
	},
	'*': {
		isInline: false,
		closedBy: ['/ul', '/ol', '/list', '*', 'li'],
		html: '<li>{0}</li>'
	},
	// END_COMMAND

	// START_COMMAND: Table
	table: {
		tags: {
			table: null
		},
		isInline: false,
		isHtmlInline: true,
		skipLastLineBreak: true,
		format: '[table]{0}[/table]',
		html: '<table class="table">{0}</table>'
	},
	tr: {
		tags: {
			tr: null
		},
		isInline: false,
		skipLastLineBreak: true,
		format: '[tr]{0}[/tr]',
		html: '<tr>{0}</tr>'
	},
	th: {
		tags: {
			th: null
		},
		allowsEmpty: true,
		isInline: false,
		format: '[th]{0}[/th]',
		html: '<th>{0}</th>'
	},
	td: {
		tags: {
			td: null
		},
		allowsEmpty: true,
		isInline: false,
		format: '[td]{0}[/td]',
		html: '<td class="border">{0}</td>'
	},
	// END_COMMAND

	// START_COMMAND: Horizontal Rule
	hr: {
		tags: {
			hr: null
		},
		allowsEmpty: true,
		isSelfClosing: true,
		isInline: false,
		format: '[hr]{0}',
		html: '<hr />'
	},
	// END_COMMAND

	// START_COMMAND: Image
	img: {
		allowsEmpty: true,
		tags: {
			img: {
				src: null,
				class: 'img-user-posted img-thumbnail'
			}
		},
		allowedChildren: ['#'],
		quoteType: QuoteType.never,
		format: function (element: Any) {
			let desc;

			desc = attr(element, 'alt');

			if (desc) {
				return `[img=${attr(element, 'src')}]${desc}[/img]`;
			}

			return `[img]${attr(element, 'src')}[/img]`;
		},
		html: function (token: BBCodeToken, attrs: BBCodeAttrs, content: string) {
			attrs.defaultattr =
				escapeEntities(attrs.defaultattr ?? null, true) || content;

			return `<img src="${escapeUriScheme(attrs.defaultattr)}" alt="${content
			}" class="img-user-posted img-thumbnail" />`;
		}
	},
	// END_COMMAND

	// START_COMMAND: userlink
	userlink: {
		allowsEmpty: true,
		tags: {
			span: {
				class: 'badge rounded-pill text-bg-secondary fs-6'
			}
		},
		format: function (element: Any) {
			return `[userlink]${attr(element, 'data-user')}[/userlink]`;
		},
		html: function (token: BBCodeToken, attrs: BBCodeAttrs, content: string) {
			// content is already entity-escaped by convertToHTML - don't re-escape
			return `<span class="badge rounded-pill text-bg-secondary fs-6" data-user="${content
			}">${content}</span>`;
		}
	},
	// END_COMMAND

	// START_COMMAND: albumimg
	albumimg: {
		allowsEmpty: true,
		tags: {
			div: {
				src: null,
				class: 'card text-bg-dark'
			}
		},
		allowedChildren: ['#'],
		quoteType: QuoteType.never,
		format: function (element: Any) {
			return `[albumimg]${attr(element, 'alt')}[/albumimg]`;
		},
		html: function (token: BBCodeToken, attrs: BBCodeAttrs, content: string) {
			attrs.defaultattr =
				escapeEntities(attrs.defaultattr ?? null, true) || content;

			return `<div class="card text-bg-dark" style="max-width:200px" alt="${content}"><img src="${
				editorOptions.albumsPreviewUrl}${escapeUriScheme(attrs.defaultattr)
			}" class="img-user-posted card-img-top" style="max-height:200px;max-width:200px;object-fit:contain""></div>`;
		}
	},
	// END_COMMAND

	// START_COMMAND: URL
	url: {
		allowsEmpty: true,
		tags: {
			a: {
				href: null
			}
		},
		quoteType: QuoteType.never,
		format: function (element: Any, content: string) {
			const url = attr(element, 'href');

			// make sure this link is not an e-mail,
			// if it is return e-mail BBCode
			if (url.substr(0, 7) === 'mailto:') {
				return `[email="${url.substr(7)}"]${content}[/email]`;
			}

			return `[url=${url}]${content}[/url]`;
		},
		html: function (token: BBCodeToken, attrs: BBCodeAttrs, content: string) {
			attrs.defaultattr =
				escapeEntities(attrs.defaultattr ?? null, true) || content;

			return `<a href="${escapeUriScheme(attrs.defaultattr)}" class="link">${content}</a>`;
		}
	},
	// END_COMMAND

	// START_COMMAND: E-mail
	email: {
		quoteType: QuoteType.never,
		html: function (token: BBCodeToken, attrs: BBCodeAttrs, content: string) {
			return `<a href="mailto:${escapeEntities(attrs.defaultattr ?? null, true) || content}">${content}</a>`;
		}
	},
	// END_COMMAND

	// START_COMMAND: Quote
	quote: {
		tags: {
			div: {
				class: 'border rounded mx-3 mb-3 p-3 border-secondary shadow-sm'
			}
		},
		isInline: false,
		quoteType: QuoteType.never,
		format: function (this: Any, element: Any, content: string) {
			let author = '';
			let cite: Any;
			const children = element.children;

			for (let i = 0; !cite && i < children.length; i++) {
				if (is(children[i], 'cite')) {
					cite = children[i];
				}
			}

			if (cite) {
				author = cite && cite.textContent;

				if (cite) {
					element.removeChild(cite);
				}

				content = this.elementToBbcode(element);

				author = `=${author.trim()}`;

				if (cite) {
					element.insertBefore(cite, element.firstChild);
				}
			}

			return `[quote${author}]${content}[/quote]`;
		},
		html: function (token: BBCodeToken, attrs: BBCodeAttrs, content: string) {
			if (attrs.defaultattr) {
				content = content +
					'<cite class="card-text text-end d-block text-body-secondary small">' +
					escapeEntities(attrs.defaultattr) +
					'</cite>';
			}

			return `<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm"><span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>${
				content}</div>`;
		}
	},
	// END_COMMAND

	// START_COMMAND: Code
	code: {
		tags: {
			code: {
				class: null
			}
		},
		isInline: false,
		allowedChildren: ['#', '#newline'],
		format: function (element: Any, content: string) {
			let codeLanguage;

			if (!is(element, 'code') || !(codeLanguage = attr(element, 'class'))) {
				codeLanguage = element.className.replace('lang-', '');
			}

			return `[code=${codeLanguage.replace('lang-', '')}]${content}[/code]`;
		},
		html:
			'<pre class="border border-danger rounded m-2 p-2"><code class="lang-{defaultattr}">{0}</code></pre>'
	},

	// END_COMMAND

	// START_COMMAND: Note
	note: {
		tags: {
			div: {
				role: 'alert'
			}
		},
		isInline: false,
		allowedChildren: ['#', '#newline'],
		format: function (element: Any, content: string) {
			let type;

			if (!(type = attr(element, 'class'))) {
				type = element.className.replace('alert alert-', '');
			}

			return `[note=${type.replace('alert alert-', '')}]${content}[/note]`;
		},
		html:
			'<div class="alert alert-{defaultattr}" role="alert">{0}</div>'
	},

	// END_COMMAND


	// START_COMMAND: Left
	left: {
		styles: {
			'text-align': [
				'left',
				'-webkit-left',
				'-moz-left',
				'-khtml-left'
			]
		},
		isInline: false,
		allowsEmpty: true,
		format: '[left]{0}[/left]',
		html: '<div align="left">{0}</div>'
	},
	// END_COMMAND

	// START_COMMAND: Centre
	center: {
		styles: {
			'text-align': [
				'center',
				'-webkit-center',
				'-moz-center',
				'-khtml-center'
			]
		},
		isInline: false,
		allowsEmpty: true,
		format: '[center]{0}[/center]',
		html: '<div align="center">{0}</div>'
	},
	// END_COMMAND

	// START_COMMAND: Right
	right: {
		styles: {
			'text-align': [
				'right',
				'-webkit-right',
				'-moz-right',
				'-khtml-right'
			]
		},
		isInline: false,
		allowsEmpty: true,
		format: '[right]{0}[/right]',
		html: '<div align="right">{0}</div>'
	},
	// END_COMMAND

	// START_COMMAND: Justify
	justify: {
		styles: {
			'text-align': [
				'justify',
				'-webkit-justify',
				'-moz-justify',
				'-khtml-justify'
			]
		},
		isInline: false,
		allowsEmpty: true,
		format: '[justify]{0}[/justify]',
		html: '<div align="justify">{0}</div>'
	},
	// END_COMMAND

	// START_COMMAND: Facebook
	facebook: {
		allowsEmpty: true,
		tags: {
			div: {
				'data-facebook-url': null
			}
		},
		format: function (element: Any) {
			element = attr(element, 'data-facebook-url');

			return element ? `[facebook]${element}[/facebook]` : element;
		},
		html: function (token: BBCodeToken, attrs: BBCodeAttrs, content: string) {
			const url = content;

			return `<div class="ratio ratio-1x1" data-oembed-url="${url}" data-facebook-url="${url
			}"><iframe src="https://www.facebook.com/plugins/post.php?href=${url}"></iframe></div>`;
		}
	},
	// END_COMMAND

	// START_COMMAND: Instagram
	instagram: {
		allowsEmpty: true,
		tags: {
			div: {
				'data-instagram-url': null
			}
		},
		format: function (element: Any) {
			element = attr(element, 'data-instagram-url');

			return element ? `[instagram]${element}[/instagram]` : element;
		},
		html: function (token: BBCodeToken, attrs: BBCodeAttrs, content: string) {
			const url = content;
			const match = url.match(/\/(p|tv|reel)\/(.*?)(?:\/|$)/);

			if (!match) {
				return `<a href="${escapeUriScheme(url)}">${url}</a>`;
			}

			const id = match[2];

			return `<div class="ratio ratio-1x1" data-oembed-url="https://www.instagram.com/p/${id
			}" data-instagram-url="${url}"><iframe src="https://www.instagram.com/p/${id
			}/embed/captioned/"></iframe></div>`;
		}
	},
	// END_COMMAND

	// START_COMMAND: Vimeo
	vimeo: {
		allowsEmpty: true,
		tags: {
			div: {
				'data-vimeo-url': null
			}
		},
		format: function (element: Any) {
			element = attr(element, 'data-vimeo-url');

			return element ? `[vimeo]${element}[/vimeo]` : element;
		},
		html: function (token: BBCodeToken, attrs: BBCodeAttrs, content: string) {
			const url = content;
			const match = url.match(/vimeo\..*\/(\d+)(?:$|\/)/);

			if (!match) {
				return `<a href="${escapeUriScheme(url)}">${url}</a>`;
			}

			const id = match[1];

			return `<div data-oembed-url="https://vimeo.com/${id}" data-vimeo-url="${url
			}" class="ratio ratio-16x9 border"><iframe src="https://player.vimeo.com/video/${id
			}?show_title=1&show_byline=1&show_portrait=1&fullscreen=1"></iframe></div>`;
		}
	},
	// END_COMMAND


	// START_COMMAND: YouTube
	youtube: {
		allowsEmpty: true,
		tags: {
			div: {
				'data-youtube-url': null
			}
		},
		format: function (element: Any) {
			element = attr(element, 'data-youtube-url');

			return element ? `[youtube]${element}[/youtube]` : element;
		},
		html: function (token: BBCodeToken, attrs: BBCodeAttrs, content: string) {
			const url = content;
			const match = content.match(/(?:v=|v\/|embed\/|youtu.be\/)?([a-zA-Z0-9_-]{11})/);

			if (!match) {
				return `<a href="${escapeUriScheme(url)}">${url}</a>`;
			}

			const id = match[1];

			return `<div data-oembed-url="https://youtube.com/embed/${id}" data-youtube-url="${url
			}" class="ratio ratio-16x9 border"><iframe src="https://youtube.com/embed/${id
			}?hd=1"></iframe></div>`;
		}
	},
	// END_COMMAND


	// START_COMMAND: Rtl
	rtl: {
		styles: {
			direction: ['rtl']
		},
		isInline: false,
		format: '[rtl]{0}[/rtl]',
		html: '<div style="direction: rtl">{0}</div>'
	},
	// END_COMMAND

	// START_COMMAND: Ltr
	ltr: {
		styles: {
			direction: ['ltr']
		},
		isInline: false,
		format: '[ltr]{0}[/ltr]',
		html: '<div style="direction: ltr">{0}</div>'
	},
	// END_COMMAND

	// this is here so that commands above can be removed
	// without having to remove the , after the last one.
	// Needed for IE.
	ignore: {}
};

/**
 * Formats a string replacing {name} with the values of
 * obj.name properties.
 *
 * If there is no property for the specified {name} then
 * it will be left intact.
 *
 * @since 2.0.0
 */
function formatBBCodeString(str: string, obj: Record<string, Any>): string {
	return str.replace(/\{([^}]+)\}/g,
		function (match, group) {
			const undef = undefined;
			let escape = true;

			if (group.charAt(0) === '!') {
				escape = false;
				group = group.substring(1);
			}

			if (group === '0') {
				escape = false;
			}

			if (obj[group] === undef) {
				return match;
			}

			return escape ? escapeEntities(obj[group], true) : obj[group];
		});
}

function isFunction(fn: Any): boolean {
	return typeof fn === 'function';
}

/**
 * Removes any leading or trailing quotes ('")
 *
 * @since v1.4.0
 */
function _stripQuotes(str: string): string {
	return str ? str.replace(/\\(.)/g, '$1').replace(/^(["'])(.*?)\1$/, '$2') : str;
}

/**
 * Formats a string replacing {0}, {1}, {2}, ect. with
 * the params provided
 *
 * @param str The string to format
 * @since v1.4.0
 */
function _formatString(str: string, ...args: string[]): string {
	const undef = undefined;

	return str.replace(/\{(\d+)\}/g,
		function (_, matchNum) {
			return args[Number(matchNum)] !== undef ? args[Number(matchNum)] : `{${matchNum}}`;
		});
}

const TOKEN_OPEN = 'open';
const TOKEN_CONTENT = 'content';
const TOKEN_NEWLINE = 'newline';
const TOKEN_CLOSE = 'close';


/*
 * @typedef {Object} TokenizeToken
 * @property {string} type
 * @property {string} name
 * @property {string} val
 * @property {Object.<string, string>} attrs
 * @property {array} children
 * @property {TokenizeToken} closing
 */

/**
 * Tokenize token object
 *
 * @param  type The type of token this is,
 *              should be one of tokenType
 * @param  name The name of this token
 * @param  val The originally matched string
 * @param  attrs Any attributes. Only set on
 *               TOKEN_TYPE_OPEN tokens
 * @param  children Any children of this token
 * @param  closing This tokens closing tag.
 *                 Only set on TOKEN_TYPE_OPEN tokens
 * @class {TokenizeToken}
 * @name {TokenizeToken}
 * @memberOf BBCodeParser.prototype
 */
function TokenizeToken(
	this: BBCodeToken,
	type: string,
	name: string,
	val: string,
	attrs?: BBCodeAttrs,
	children?: BBCodeToken[],
	closing?: BBCodeToken | null
) {
	const base = this;

	base.type = type;
	base.name = name;
	base.val = val;
	base.attrs = attrs || {};
	base.children = children || [];
	base.closing = closing || null;
}

const TokenizeTokenCtor = TokenizeToken as unknown as new (
	type: string,
	name: string,
	val: string,
	attrs?: BBCodeAttrs,
	children?: BBCodeToken[],
	closing?: BBCodeToken | null
) => BBCodeToken;

TokenizeToken.prototype = {
	/** @lends BBCodeParser.prototype.TokenizeToken */
	/**
	 * Clones this token
	 */
	clone: function (this: BBCodeToken) {
		const base = this;

		return new TokenizeTokenCtor(
			base.type,
			base.name,
			base.val,
			extend({}, base.attrs),
			[],
			base.closing ? base.closing.clone() : null
		);
	},
	/**
	 * Splits this token at the specified child
	 *
	 * @param splitAt The child to split at
	 * @return The right half of the split token or
	 *         empty clone if invalid splitAt lcoation
	 */
	splitAt: function (this: BBCodeToken, splitAt: BBCodeToken) {
		let offsetLength;
		const base = this;
		const clone = base.clone();
		const offset = base.children.indexOf(splitAt);

		if (offset > -1) {
			// Work out how many items are on the right side of the split
			// to pass to splice()
			offsetLength = base.children.length - offset;
			clone.children = base.children.splice(offset, offsetLength);
		}

		return clone;
	}
};


/**
 * SCEditor BBCode parser class
 *
 * @class BBCodeParser
 * @name BBCodeParser
 * @since v1.4.0
 */
function BBCodeParser(this: Any, options?: Any) {
	const base = this;

	base.opts = extend({}, BBCodeParser.defaults, options);

	/**
	 * Takes a BBCode string and splits it into open,
	 * content and close tags.
	 *
	 * It does no checking to verify a tag has a matching open
	 * or closing tag or if the tag is valid child of any tag
	 * before it. For that the tokens should be passed to the
	 * parse function.
	 *
	 * @memberOf BBCodeParser.prototype
	 */
	base.tokenize = function (str: string): BBCodeToken[] {
		let matches, type, i;
		const tokens: BBCodeToken[] = [];
		// The token types in reverse order of precedence
		// (they're looped in reverse)
		const tokenTypes = [
			{
				type: TOKEN_CONTENT,
				regex: /^([^\[\r\n]+|\[)/
			},
			{
				type: TOKEN_NEWLINE,
				regex: /^(\r\n|\r|\n)/
			},
			{
				type: TOKEN_OPEN,
				regex: /^\[[^\[\]]+\]/
			},
			// Close must come before open as they are
			// the same except close has a / at the start.
			{
				type: TOKEN_CLOSE,
				regex: /^\[\/[^\[\]]+\]/
			}
		];

		strloop:
		while (str.length) {
			i = tokenTypes.length;
			while (i--) {
				type = tokenTypes[i].type;

				// Check if the string matches any of the tokens
				if (!(matches = str.match(tokenTypes[i].regex)) ||
						!matches[0]) {
					continue;
				}

				// Add the match to the tokens list
				tokens.push(tokenizeTag(type, matches[0]));

				// Remove the match from the string
				str = str.substr(matches[0].length);

				// The token has been added so start again
				continue strloop;
			}

			// If there is anything left in the string which doesn't match
			// any of the tokens then just assume it's content and add it.
			if (str.length) {
				tokens.push(tokenizeTag(TOKEN_CONTENT, str));
			}

			str = '';
		}

		return tokens;
	};

	/**
	 * Extracts the name an params from a tag
	 *
	 * @private
	 */
	function tokenizeTag(type: string, val: string): BBCodeToken {
		let matches;
		let attrs;
		let name = '';
		const openRegex = /\[([^\]\s=]+)(?:([^\]]+))?\]/;
		const closeRegex = /\[\/([^\[\]]+)\]/;

		// Extract the name and attributes from opening tags and
		// just the name from closing tags.
		if (type === TOKEN_OPEN && (matches = val.match(openRegex))) {
			name = lower(matches[1]);

			if (matches[2] && (matches[2] = matches[2].trim())) {
				attrs = tokenizeAttrs(matches[2]);
			}
		}

		if (type === TOKEN_CLOSE &&
			(matches = val.match(closeRegex))) {
			name = lower(matches[1]);
		}

		if (type === TOKEN_NEWLINE) {
			name = '#newline';
		}

		// Treat all tokens without a name and
		// all unknown BBCodes as content
		if (!name ||
		((type === TOKEN_OPEN || type === TOKEN_CLOSE) &&
			!bbcodeHandlers[name])) {

			type = TOKEN_CONTENT;
			name = '#';
		}

		return new TokenizeTokenCtor(type, name, val, attrs);
	}

	/**
	 * Extracts the individual attributes from a string containing
	 * all the attributes.
	 *
	 * @return Assoc array of attributes
	 * @private
	 */
	function tokenizeAttrs(attrs: string): BBCodeAttrs {
		// Bound input length to avoid worst-case backtracking in the
		// unquoted-value branch of attrRegex on pathologically long tags
		const maxAttrsLength = 10000;
		if (attrs.length > maxAttrsLength) {
			attrs = attrs.substring(0, maxAttrsLength);
		}

		let matches
			/*
			([^\s=]+)				Anything that's not a space or equals
			=						Equals sign =
			(?:
				(?:
					(["'])					The opening quote
					(
						(?:\\\2|[^\2])*?	Anything that isn't the
											unescaped opening quote
					)
					\2						The opening quote again which
											will close the string
				)
					|				If not a quoted string then match
				(
					(?:.(?!\s\S+=))*.?		Anything that isn't part of
											[space][non-space][=] which
											would be a new attribute
				)
			)
			*/;
		const attrRegex = /([^\s=]+)=(?:(?:(["'])((?:\\\2|[^\x02])*?)\2)|((?:.(?!\s\S+=))*.))/g;
		const ret: BBCodeAttrs = {};

		// if only one attribute then remove the = from the start and
		// strip any quotes
		if (attrs.charAt(0) === '=' && attrs.indexOf('=', 1) < 0) {
			ret.defaultattr = _stripQuotes(attrs.substr(1));
		} else {
			if (attrs.charAt(0) === '=') {
				attrs = `defaultattr${attrs}`;
			}

			// No need to strip quotes here, the regex will do that.
			while ((matches = attrRegex.exec(attrs))) {
				ret[lower(matches[1])] =
					_stripQuotes(matches[3]) || matches[4];
			}
		}

		return ret;
	}

	/**
	 * Parses a string into an array of BBCodes
	 *
	 * @param  preserveNewLines If to preserve all new lines, not
	 *                          strip any based on the passed
	 *                          formatting options
	 * @return Array of BBCode objects
	 * @memberOf BBCodeParser.prototype
	 */
	base.parse = function (str: string, preserveNewLines?: boolean): BBCodeToken[] {
		const ret = parseTokens(base.tokenize(str));
		const opts = base.opts;

		if (opts.fixInvalidNesting) {
			fixNesting(ret);
		}

		normaliseNewLines(ret, null, preserveNewLines);

		if (opts.removeEmptyTags) {
			removeEmpty(ret);
		}

		return ret;
	};

	/**
	 * Checks if an array of TokenizeToken's contains the
	 * specified token.
	 *
	 * Checks the tokens name and type match another tokens
	 * name and type in the array.
	 *
	 * @private
	 */
	function hasTag(name: string, type: string, arr: BBCodeToken[]): boolean {
		let i = arr.length;

		while (i--) {
			if (arr[i].type === type && arr[i].name === name) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Checks if the child tag is allowed as one
	 * of the parent tags children.
	 *
	 * @private
	 */
	function isChildAllowed(parent: BBCodeToken | null | undefined, child: BBCodeToken): boolean {
		const parentBBCode: BBCodeHandler = parent ? bbcodeHandlers[parent.name] : {};
		const allowedChildren = parentBBCode.allowedChildren;

		if (base.opts.fixInvalidChildren && allowedChildren) {
			return allowedChildren.indexOf(child.name || '#') > -1;
		}

		return true;
	}

	// TODO: Tidy this parseTokens() function up a bit.
	/**
	 * Parses an array of tokens created by tokenize()
	 *
	 * @return Parsed tokens
	 * @see tokenize()
	 * @private
	 */
	function parseTokens(toks: BBCodeToken[]): BBCodeToken[] {
		let token: BBCodeToken | undefined;
		let bbcode: BBCodeHandler | undefined;
		let curTok: BBCodeToken | undefined;
		let clone;
		let i;
		let next: BBCodeToken | undefined;
		const cloned: BBCodeToken[] = [];
		const output: BBCodeToken[] = [];
		const openTags: BBCodeToken[] = [];
		/**
		 * Returns the currently open tag or undefined
		 */
		const currentTag = function () {
			return last(openTags);
		};
		/**
		 * Adds a tag to either the current tags children
		 * or to the output array.
		 */
		const addTag = function (token: BBCodeToken) {
			const current = currentTag();
			if (current) {
				current.children.push(token);
			} else {
				output.push(token);
			}
		};
		/**
		 * Checks if this tag closes the current tag
		 */
		const closesCurrentTag = function (name: string) {
			const current = currentTag();
			return !!(current &&
				(bbcode = bbcodeHandlers[current.name]) &&
				bbcode.closedBy &&
				bbcode.closedBy.indexOf(name) > -1);
		};

		while ((token = toks.shift())) {
			next = toks[0];

			/*
			 * Fixes any invalid children.
			 *
			 * If it is an element which isn't allowed as a child of it's
			 * parent then it will be converted to content of the parent
			 * element. i.e.
			 *     [code]Code [b]only[/b] allows text.[/code]
			 * Will become:
			 *     <code>Code [b]only[/b] allows text.</code>
			 * Instead of:
			 *     <code>Code <b>only</b> allows text.</code>
			 */
			// Ignore tags that can't be children
			if (!isChildAllowed(currentTag(), token)) {

				// exclude closing tags of current tag
				const current = currentTag();
				if (token.type !== TOKEN_CLOSE ||
					!current ||
					token.name !== current.name) {
					token.name = '#';
					token.type = TOKEN_CONTENT;
				}
			}

			switch (token.type) {
				case TOKEN_OPEN:
				// Check it this closes a parent,
				// e.g. for lists [*]one [*]two
					if (closesCurrentTag(token.name)) {
						openTags.pop();
					}

					addTag(token);
					bbcode = bbcodeHandlers[token.name];

					// If this tag is not self closing and it has a closing
					// tag then it is open and has children so add it to the
					// list of open tags. If has the closedBy property then
					// it is closed by other tags so include everything as
					// it's children until one of those tags is reached.
					if (bbcode &&
					!bbcode.isSelfClosing &&
					(bbcode.closedBy ||
						hasTag(token.name, TOKEN_CLOSE, toks))) {
						openTags.push(token);
					} else if (!bbcode || !bbcode.isSelfClosing) {
						token.type = TOKEN_CONTENT;
					}
					break;

				case TOKEN_CLOSE: {
				// check if this closes the current tag,
				// e.g. [/list] would close an open [*]
					const current = currentTag();
					if (current &&
					token.name !== current.name &&
					closesCurrentTag(`/${token.name}`)) {

						openTags.pop();
					}

					// If this is closing the currently open tag just pop
					// the close tag off the open tags array
					const current2 = currentTag();
					if (current2 && token.name === current2.name) {
						current2.closing = token;
						openTags.pop();

					// If this is closing an open tag that is the parent of
					// the current tag then clone all the tags including the
					// current one until reaching the parent that is being
					// closed. Close the parent and then add the clones back
					// in.
					} else if (hasTag(token.name, TOKEN_OPEN, openTags)) {

						// Remove the tag from the open tags
						while ((curTok = openTags.pop())) {

							// If it's the tag that is being closed then
							// discard it and break the loop.
							if (curTok.name === token.name) {
								curTok.closing = token;
								break;
							}

							// Otherwise clone this tag and then add any
							// previously cloned tags as it's children
							clone = curTok.clone();

							if (cloned.length) {
								clone.children.push(last(cloned) as BBCodeToken);
							}

							cloned.push(clone);
						}

						// Place block linebreak before cloned tags
						if (next && next.type === TOKEN_NEWLINE) {
							bbcode = bbcodeHandlers[token.name];
							if (bbcode && bbcode.isInline === false) {
								addTag(next);
								toks.shift();
							}
						}

						// Add the last cloned child to the now current tag
						// (the parent of the tag which was being closed)
						addTag(last(cloned) as BBCodeToken);

						// Add all the cloned tags to the open tags list
						i = cloned.length;
						while (i--) {
							openTags.push(cloned[i]);
						}

						cloned.length = 0;

					// This tag is closing nothing so treat it as content
					} else {
						token.type = TOKEN_CONTENT;
						addTag(token);
					}
					break;
				}

				case TOKEN_NEWLINE: {
				// handle things like
				//     [*]list\nitem\n[*]list1
				// where it should come out as
				//     [*]list\nitem[/*]\n[*]list1[/*]
				// instead of
				//     [*]list\nitem\n[/*][*]list1[/*]
					const current = currentTag();
					if (current &&
					next &&
					closesCurrentTag(
						(next.type === TOKEN_CLOSE ? '/' : '') +
						next.name
					)) {
					// skip if the next tag is the closing tag for
					// the option tag, i.e. [/*]
						if (!(next.type === TOKEN_CLOSE &&
						next.name === current.name)) {
							bbcode = bbcodeHandlers[current.name];

							if (bbcode && bbcode.breakAfter) {
								openTags.pop();
							} else if (bbcode &&
							bbcode.isInline === false &&
							base.opts.breakAfterBlock &&
							bbcode.breakAfter !== false) {
								openTags.pop();
							}
						}
					}

					addTag(token);
					break;
				}

				default: // content
					addTag(token);
					break;
			}
		}

		return output;
	}

	/**
	 * Normalise all new lines
	 *
	 * Removes any formatting new lines from the BBCode
	 * leaving only content ones. I.e. for a list:
	 *
	 * [list]
	 * [*] list item one
	 * with a line break
	 * [*] list item two
	 * [/list]
	 *
	 * would become
	 *
	 * [list] [*] list item one
	 * with a line break [*] list item two [/list]
	 *
	 * Which makes it easier to convert to HTML or add
	 * the formatting new lines back in when converting
	 * back to BBCode
	 */
	function normaliseNewLines(children: BBCodeToken[], parent?: BBCodeToken | null, onlyRemoveBreakAfter?: boolean): void {
		let token, left, right, parentBBCode: BBCodeHandler | undefined, bbcode, removedBreakEnd, removedBreakBefore, remove;
		const childrenLength = children.length;
		// TODO: this function really needs tidying up
		if (parent) {
			parentBBCode = bbcodeHandlers[parent.name];
		}

		let i = childrenLength;
		while (i--) {
			if (!(token = children[i])) {
				continue;
			}

			if (token.type === TOKEN_NEWLINE) {
				left = i > 0 ? children[i - 1] : null;
				right = i < childrenLength - 1 ? children[i + 1] : null;
				remove = false;

				// Handle the start and end new lines
				// e.g. [tag]\n and \n[/tag]
				if (!onlyRemoveBreakAfter &&
					parentBBCode &&
					parentBBCode.isSelfClosing !== true) {
					// First child of parent so must be opening line break
					// (breakStartBlock, breakStart) e.g. [tag]\n
					if (!left) {
						if (parentBBCode.isInline === false &&
							base.opts.breakStartBlock &&
							parentBBCode.breakStart !== false) {
							remove = true;
						}

						if (parentBBCode.breakStart) {
							remove = true;
						}
						// Last child of parent so must be end line break
						// (breakEndBlock, breakEnd)
						// e.g. \n[/tag]
						// remove last line break (breakEndBlock, breakEnd)
					} else if (!removedBreakEnd && !right) {
						if (parentBBCode.isInline === false &&
							base.opts.breakEndBlock &&
							parentBBCode.breakEnd !== false) {
							remove = true;
						}

						if (parentBBCode.breakEnd) {
							remove = true;
						}

						removedBreakEnd = remove;
					}
				}

				if (left && left.type === TOKEN_OPEN) {
					if ((bbcode = bbcodeHandlers[left.name])) {
						if (!onlyRemoveBreakAfter) {
							if (bbcode.isInline === false &&
								base.opts.breakAfterBlock &&
								bbcode.breakAfter !== false) {
								remove = true;
							}

							if (bbcode.breakAfter) {
								remove = true;
							}
						} else if (bbcode.isInline === false) {
							remove = true;
						}
					}
				}

				if (!onlyRemoveBreakAfter &&
					!removedBreakBefore &&
					right &&
					right.type === TOKEN_OPEN) {

					if ((bbcode = bbcodeHandlers[right.name])) {
						if (bbcode.isInline === false &&
							base.opts.breakBeforeBlock &&
							bbcode.breakBefore !== false) {
							remove = true;
						}

						if (bbcode.breakBefore) {
							remove = true;
						}

						removedBreakBefore = remove;

						if (remove) {
							children.splice(i, 1);
							continue;
						}
					}
				}

				if (remove) {
					children.splice(i, 1);
				}

				// reset double removedBreakBefore removal protection.
				// This is needed for cases like \n\n[\tag] where
				// only 1 \n should be removed but without this they both
				// would be.
				removedBreakBefore = false;
			} else if (token.type === TOKEN_OPEN) {
				normaliseNewLines(token.children,
					token,
					onlyRemoveBreakAfter);
			}
		}
	}

	/**
	 * Fixes any invalid nesting.
	 *
	 * If it is a block level element inside 1 or more inline elements
	 * then those inline elements will be split at the point where the
	 * block level is and the block level element placed between the split
	 * parts. i.e.
	 *     [inline]A[blocklevel]B[/blocklevel]C[/inline]
	 * Will become:
	 *     [inline]A[/inline][blocklevel]B[/blocklevel][inline]C[/inline]
	 *
	 * @param {array} [parents] Null if there is no parents
	 * @param {boolea} [insideInline] If inside an inline element
	 * @param {array} [rootArr] Root array if there is one
	 * @private
	 */
	function fixNesting(children: BBCodeToken[], parents?: BBCodeToken[], insideInline?: boolean, rootArr?: BBCodeToken[]): void {
		let token, i, parent, parentIndex, parentParentChildren, right;

		const isInline = function (token: BBCodeToken) {
			const bbcode = bbcodeHandlers[token.name];

			return !bbcode || bbcode.isInline !== false;
		};

		parents = parents || [];
		rootArr = rootArr || children;

		// This must check the length each time as it can change when
		// tokens are moved to fix the nesting.
		for (i = 0; i < children.length; i++) {
			if (!(token = children[i]) || token.type !== TOKEN_OPEN) {
				continue;
			}

			if (insideInline && !isInline(token)) {
				// if this is a blocklevel element inside an inline one then
				// split the parent at the block level element
				parent = last(parents) as BBCodeToken;
				right = parent.splitAt(token);

				parentParentChildren = parents.length > 1 ? parents[parents.length - 2].children : rootArr;

				// If parent inline is allowed inside this tag, clone it and
				// wrap this tags children in it.
				if (isChildAllowed(token, parent)) {
					const clone = parent.clone();
					clone.children = token.children;
					token.children = [clone];
				}

				parentIndex = parentParentChildren.indexOf(parent);
				if (parentIndex > -1) {
					// remove the block level token from the right side of
					// the split inline element
					right.children.splice(0, 1);

					// insert the block level token and the right side after
					// the left side of the inline token
					parentParentChildren.splice(
						parentIndex + 1,
						0,
						token,
						right
					);

					// If token is a block and is followed by a newline,
					// then move the newline along with it to the new parent
					const next = right.children[0];
					if (next && next.type === TOKEN_NEWLINE) {
						if (!isInline(token)) {
							right.children.splice(0, 1);
							parentParentChildren.splice(
								parentIndex + 2,
								0,
								next
							);
						}
					}

					// return to parents loop as the
					// children have now increased
					return;
				}

			}

			parents.push(token);

			fixNesting(
				token.children,
				parents,
				insideInline || isInline(token),
				rootArr
			);

			parents.pop();
		}
	}

	/**
	 * Removes any empty BBCodes which are not allowed to be empty.
	 *
	 * @private
	 */
	function removeEmpty(tokens: BBCodeToken[]): void {
		let token, bbcode;

		/**
		 * Checks if all children are whitespace or not
		 * @private
		 */
		const isTokenWhiteSpace = function (children: BBCodeToken[]) {
			let j = children.length;

			while (j--) {
				const type = children[j].type;

				if (type === TOKEN_OPEN || type === TOKEN_CLOSE) {
					return false;
				}

				if (type === TOKEN_CONTENT &&
					/\S| /.test(children[j].val)) {
					return false;
				}
			}

			return true;
		};

		let i = tokens.length;
		while (i--) {
			// So skip anything that isn't a tag since only tags can be
			// empty, content can't
			if (!(token = tokens[i]) || token.type !== TOKEN_OPEN) {
				continue;
			}

			bbcode = bbcodeHandlers[token.name];

			// Remove any empty children of this tag first so that if they
			// are all removed this one doesn't think it's not empty.
			removeEmpty(token.children);

			if (isTokenWhiteSpace(token.children) &&
				bbcode &&
				!bbcode.isSelfClosing &&
				!bbcode.allowsEmpty) {
				tokens.splice(i, 1, ...token.children);
			}
		}
	}

	/**
	 * Converts a BBCode string to HTML
	 *
	 * @param preserveNewLines If to preserve all new lines, not
	 *                         strip any based on the passed
	 *                         formatting options
	 * @memberOf BBCodeParser.prototype
	 */
	base.toHTML = function (str: string, preserveNewLines?: boolean) {
		return convertToHTML(base.parse(str, preserveNewLines), true);
	};

	base.toHTMLFragment = function (str: string, preserveNewLines?: boolean) {
		return convertToHTML(base.parse(str, preserveNewLines), false);
	};

	/**
	 * @private
	 */
	function convertToHTML(tokens: BBCodeToken[], isRoot: boolean): string {
		const undef = undefined;
		let token: BBCodeToken | undefined;
		let bbcode: BBCodeHandler | undefined;
		let content;
		let html: string;
		let needsBlockWrap;
		let blockWrapOpen;
		let lastChild;
		let ret = '';

		const isInline = function (bbcode?: BBCodeHandler) {
			return (!bbcode || (bbcode.isHtmlInline !== undef ? bbcode.isHtmlInline : bbcode.isInline)) !== false;
		};

		while (tokens.length > 0) {
			if (!(token = tokens.shift())) {
				continue;
			}

			if (token.type === TOKEN_OPEN) {
				lastChild = token.children[token.children.length - 1] || {} as BBCodeToken;
				bbcode = bbcodeHandlers[token.name];
				needsBlockWrap = isRoot && isInline(bbcode);
				content = convertToHTML(token.children, false);

				if (bbcode && bbcode.html) {
					// Only add a line break to the end if this is
					// blocklevel and the last child wasn't block-level
					if (!isInline(bbcode) &&
						isInline(bbcodeHandlers[lastChild.name]) &&
						!bbcode.isPreFormatted &&
						!bbcode.skipLastLineBreak) {
						// Add placeholder br to end of block level
						// elements
						//content += '<br />';
					}

					if (!isFunction(bbcode.html)) {
						token.attrs['0'] = content;
						html = formatBBCodeString(
							bbcode.html as string,
							token.attrs
						);
					} else {
						html = (bbcode.html as Any).call(
							base,
							token,
							token.attrs,
							content
						);
					}
				} else {
					html = token.val +
						content +
						(token.closing ? token.closing.val : '');
				}
			} else if (token.type === TOKEN_NEWLINE) {
				if (!isRoot) {
					ret += '<br />';
					continue;
				}

				// If not already in a block wrap then start a new block
				if (!blockWrapOpen) {
					ret += '<div>';
				}

				ret += '<br />';

				// Normally the div acts as a line-break with by moving
				// whatever comes after onto a new line.
				// If this is the last token, add an extra line-break so it
				// shows as there will be nothing after it.
				if (!tokens.length) {
					ret += '<br />';
				}

				ret += '</div>\n';
				blockWrapOpen = false;
				continue;
				// content
			} else {
				needsBlockWrap = isRoot;
				html = escapeEntities(token.val, true) as string;
			}

			if (needsBlockWrap && !blockWrapOpen) {
				ret += '<div>';
				blockWrapOpen = true;
			} else if (!needsBlockWrap && blockWrapOpen) {
				ret += '</div>\n';
				blockWrapOpen = false;
			}

			ret += html;
		}

		if (blockWrapOpen) {
			ret += '</div>\n';
		}

		return ret;
	}

	/**
	 * Takes a BBCode string, parses it then converts it back to BBCode.
	 *
	 * This will auto fix the BBCode and format it with the specified
	 * options.
	 *
	 * @param preserveNewLines If to preserve all new lines, not
	 *                         strip any based on the passed
	 *                         formatting options
	 * @memberOf BBCodeParser.prototype
	 */
	base.toBBCode = function (str: string, preserveNewLines?: boolean) {
		return convertToBBCode(base.parse(str, preserveNewLines));
	};

	/**
	 * Converts parsed tokens back into BBCode with the
	 * formatting specified in the options and with any
	 * fixes specified.
	 *
	 * @param toks Array of parsed tokens from base.parse()
	 * @private
	 */
	function convertToBBCode(toks: BBCodeToken[]): string {
		let token: BBCodeToken | undefined;
		let attrName;
		let bbcode: BBCodeHandler | undefined;
		let isBlock;
		let isSelfClosing;
		let quoteType;
		let breakBefore;
		let breakStart;
		let breakEnd;
		let breakAfter;
		let ret = '';

		while (toks.length > 0) {
			if (!(token = toks.shift())) {
				continue;
			}
			// TODO: tidy this
			bbcode = bbcodeHandlers[token.name];
			isBlock = !(!bbcode || bbcode.isInline !== false);
			isSelfClosing = bbcode && bbcode.isSelfClosing;

			breakBefore = (isBlock &&
					base.opts.breakBeforeBlock &&
					(bbcode as BBCodeHandler).breakBefore !== false) ||
				(bbcode && bbcode.breakBefore);

			breakStart = (isBlock &&
					!isSelfClosing &&
					base.opts.breakStartBlock &&
					(bbcode as BBCodeHandler).breakStart !== false) ||
				(bbcode && bbcode.breakStart);

			breakEnd = (isBlock &&
					base.opts.breakEndBlock &&
					(bbcode as BBCodeHandler).breakEnd !== false) ||
				(bbcode && bbcode.breakEnd);

			breakAfter = (isBlock &&
					base.opts.breakAfterBlock &&
					(bbcode as BBCodeHandler).breakAfter !== false) ||
				(bbcode && bbcode.breakAfter);

			quoteType = (bbcode ? bbcode.quoteType : null) ||
				base.opts.quoteType ||
				QuoteType.auto;

			if (!bbcode && token.type === TOKEN_OPEN) {
				ret += token.val;

				if (token.children) {
					ret += convertToBBCode(token.children);
				}

				if (token.closing) {
					ret += token.closing.val;
				}
			} else if (token.type === TOKEN_OPEN) {
				if (breakBefore) {
					ret += '\n';
				}

				// Convert the tag and it's attributes to BBCode
				ret += `[${token.name}`;
				if (token.attrs) {
					if (token.attrs.defaultattr) {
						ret += `=${quote(
							token.attrs.defaultattr,
							quoteType,
							'defaultattr'
						)}`;

						delete token.attrs.defaultattr;
					}

					for (attrName in token.attrs) {
						if (Object.prototype.hasOwnProperty.call(token.attrs, attrName)) {
							ret += ` ${attrName}=${quote(token.attrs[attrName] as string, quoteType, attrName)}`;
						}
					}
				}
				ret += ']';

				if (breakStart) {
					ret += '\n';
				}

				// Convert the tags children to BBCode
				if (token.children) {
					ret += convertToBBCode(token.children);
				}

				// add closing tag if not self closing
				if (!isSelfClosing && !(bbcode as BBCodeHandler).excludeClosing) {
					if (breakEnd) {
						ret += '\n';
					}

					ret += `[/${token.name}]`;
				}

				if (breakAfter) {
					ret += '\n';
				}

				// preserve whatever was recognized as the
				// closing tag if it is a self closing tag
				if (token.closing && isSelfClosing) {
					ret += token.closing.val;
				}
			} else {
				ret += token.val;
			}
		}

		return ret;
	}

	/**
	 * Quotes an attribute
	 *
	 * @private
	 */
	function quote(str: string, quoteType: Any, name: string): string {
		const needsQuotes = /\s|=/.test(str);

		if (isFunction(quoteType)) {
			return quoteType(str, name);
		}

		if (quoteType === QuoteType.never ||
			(quoteType === QuoteType.auto && !needsQuotes)) {
			return str;
		}

		return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
	}

	/**
	 * Returns the last element of an array or null
	 *
	 * @return Last element
	 * @private
	 */
	function last(arr: BBCodeToken[]): BBCodeToken | null {
		if (arr.length) {
			return arr[arr.length - 1];
		}

		return null;
	}

	/**
	 * Converts a string to lowercase.
	 *
	 * @return Lowercase version of str
	 * @private
	 */
	function lower(str: string): string {
		return str.toLowerCase();
	}
}

/**
 * Quote type
 * @class QuoteType
 * @name BBCodeParser.QuoteType
 * @since 1.4.0
 */
BBCodeParser.QuoteType = QuoteType;

/**
 * Default BBCode parser options
 */
BBCodeParser.defaults = {
	/**
	 * If to add a new line before block level elements
	 */
	breakBeforeBlock: false,

	/**
	 * If to add a new line after the start of block level elements
	 */
	breakStartBlock: false,

	/**
	 * If to add a new line before the end of block level elements
	 */
	breakEndBlock: false,

	/**
	 * If to add a new line after block level elements
	 */
	breakAfterBlock: true,

	/**
	 * If to remove empty tags
	 */
	removeEmptyTags: true,

	/**
	 * If to fix invalid nesting,
	 * i.e. block level elements inside inline elements.
	 */
	fixInvalidNesting: true,

	/**
	 * If to fix invalid children.
	 * i.e. A tag which is inside a parent that doesn't
	 * allow that type of tag.
	 */
	fixInvalidChildren: true,

	/**
	 * Attribute quote type
	 *
	 * @since 1.4.1
	 */
	quoteType: QuoteType.auto,

	/**
	 * Whether to use strict matching on attributes and styles.
	 *
	 * When true this will perform AND matching requiring all tag
	 * attributes and styles to match.
	 *
	 * When false will perform OR matching and will match if any of
	 * a tags attributes or styles match.
	 *
	 * @since 3.1.0
	 */
	strictMatch: false
};

/**
 * Converts a number 0-255 to hex.
 *
 * Will return 00 if number is not a valid number.
 *
 * @private
 */
function toHex(numberArg: Any): string {
	let n = parseInt(numberArg, 10);

	if (isNaN(n)) {
		return '00';
	}

	const hex = Math.max(0, Math.min(n, 255)).toString(16);

	return hex.length < 2 ? `0${hex}` : hex;
}

/**
 * Normalises a CSS colour to hex #xxxxxx format
 *
 * @private
 */
function _normaliseColour(colorStrArg: string | undefined): string {
	let match;

	const colorStr = colorStrArg || '#000';

	// rgb(n,n,n);
	if ((match =
		colorStr.match(/rgb\((\d{1,3}),\s*?(\d{1,3}),\s*?(\d{1,3})\)/i))) {
		return '#' +
			toHex(match[1]) +
			toHex(match[2]) +
			toHex(match[3]);
	}

	// expand shorthand
	if ((match = colorStr.match(/#([0-9a-f])([0-9a-f])([0-9a-f])\s*?$/i))) {
		return '#' +
			match[1] +
			match[1] +
			match[2] +
			match[2] +
			match[3] +
			match[3];
	}

	return colorStr;
}

/**
 * SCEditor BBCode format
 * @since 2.0.0
 */
function bbcodeFormat(this: Any) {
	const base = this;

	base.stripQuotes = _stripQuotes;

	/**
	 * cache of all the tags pointing to their bbcodes to enable
	 * faster lookup of which bbcode a tag should have
	 * @private
	 */
	const tagsToBBCodes: Record<string, Any> = {};

	/**
	 * Allowed children of specific HTML tags. Empty array if no
	 * children other than text nodes are allowed
	 * @private
	 */
	const validChildren: Record<string, string[]> = {
		ul: ['li', 'ol', 'ul'],
		ol: ['li', 'ol', 'ul'],
		table: ['tr'],
		tr: ['td', 'th'],
		code: ['br', 'p', 'div']
	};

	/**
	 * Populates tagsToBBCodes and stylesToBBCodes for easier lookups
	 *
	 * @private
	 */
	function buildBbcodeCache(): void {
		each(bbcodeHandlers,
			function (bbcode: string, handler: BBCodeHandler) {
				const isBlock = handler.isInline === false;
				const tags = bbcodeHandlers[bbcode].tags;
				const styles = bbcodeHandlers[bbcode].styles;

				if (styles) {
					tagsToBBCodes['*'] = tagsToBBCodes['*'] || {};
					tagsToBBCodes['*'][String(isBlock)] =
						tagsToBBCodes['*'][String(isBlock)] || {};
					tagsToBBCodes['*'][String(isBlock)][bbcode] = [
						['style', Object.entries(styles)]
					];
				}

				if (tags) {
					each(tags,
						function (tag: string, values: Any) {
							if (values && values.style) {
								values.style = Object.entries(values.style);
							}

							tagsToBBCodes[tag] = tagsToBBCodes[tag] || {};
							tagsToBBCodes[tag][String(isBlock)] =
								tagsToBBCodes[tag][String(isBlock)] || {};
							tagsToBBCodes[tag][String(isBlock)][bbcode] =
								values && Object.entries(values);
						});
				}
			});
	}

	/**
	 * Handles adding newlines after block level elements
	 *
	 * @param element The element to convert
	 * @param content  The tags text content
	 * @private
	 */
	function handleBlockNewlines(elementArg: Any, contentArg: string): string {
		let element = elementArg;
		let content = contentArg;
		const tag = element.nodeName.toLowerCase();
		const isInline = dom.isInline as (node: Any, includeCodeAsBlock?: boolean) => boolean;
		if (!isInline(element, true) || tag === 'br') {
			let isLastBlockChild;
			let parent;
			let parentLastChild;
			let previousSibling = element.previousSibling;

			// Skips selection makers and ignored elements
			// Skip empty inline elements
			while (previousSibling &&
				previousSibling.nodeType === 1 &&
				!is(previousSibling, 'br') &&
				isInline(previousSibling, true) &&
				!previousSibling.firstChild) {
				previousSibling = previousSibling.previousSibling;
			}

			// If it's the last block of an inline that is the last
			// child of a block then it shouldn't cause a line break
			// <block><inline><br></inline></block>
			do {
				parent = element.parentNode;
				parentLastChild = parent && parent.lastChild;

				isLastBlockChild = parentLastChild === element;
				element = parent;
			} while (parent && isLastBlockChild && isInline(parent, true));

			// If this block is:
			//	* Not the last child of a block level element
			//	* Is a <li> tag (lists are blocks)
			if (!isLastBlockChild || tag === 'li') {
				content += '\n';
			}

			// Check for:
			// <block>text<block>text</block></block>
			//
			// The second opening <block> opening tag should cause a
			// line break because the previous sibing is inline.
			if (tag !== 'br' &&
				previousSibling &&
				!is(previousSibling, 'br') &&
				isInline(previousSibling, true)) {
				content = `\n${content}`;
			}
		}

		return content;
	}

	/**
	 * Handles a HTML tag and finds any matching BBCodes
	 *
	 * @param element The element to convert
	 * @param content  The Tags text content
	 * @return Content with any matching BBCode tags
	 *         wrapped around it.
	 * @private
	 */
	function handleTags(element: Any, contentArg: string, blockLevel: boolean): string {
		let content = contentArg;

		function isStyleMatch(style: [string, Any]) {
			const property = style[0];
			const values = style[1];
			const val = dom.getStyle(element, property);
			const parent = element.parentNode;

			// if the parent has the same style use that instead of this one
			// so you don't end up with [i]parent[i]child[/i][/i]
			if (!val || (parent && dom.hasStyle(parent, property, val))) {
				return false;
			}

			return !values || values.includes(val);
		}

		function createAttributeMatch(isStrict: boolean) {
			return function (attribute: [string, Any]) {
				const name = attribute[0];
				const value = attribute[1];

				// code tags should skip most styles
				if (name === 'style' && element.nodeName === 'CODE') {
					return false;
				}

				if (name === 'style' && value) {
					return value[isStrict ? 'every' : 'some'](isStyleMatch);
				} else {
					const val = attr(element, name);

					return val && (!value || value.includes(val));
				}
			};
		}

		function handleTag(tag: string) {
			if (!tagsToBBCodes[tag] || !tagsToBBCodes[tag][String(blockLevel)]) {
				return;
			}

			// loop all bbcodes for this tag
			each(tagsToBBCodes[tag][String(blockLevel)],
				function (bbcode: string, attrs: Any) {
					let isStrict = bbcodeHandlers[bbcode].strictMatch;

					if (typeof isStrict === 'undefined') {
						isStrict = base.opts.strictMatch;
					}

					// Skip if the element doesn't have the attribute or the
					// attribute doesn't match one of the required values
					const fn = isStrict ? 'every' : 'some';
					if (attrs && !attrs[fn](createAttributeMatch(!!isStrict))) {
						return;
					}

					const format = bbcodeHandlers[bbcode].format;
					if (isFunction(format)) {
						content = (format as Any).call(base, element, content);
					} else {
						content = _formatString(format as string, content);
					}
					return false;
				});
		}

		handleTag('*');
		handleTag(element.nodeName.toLowerCase());
		return content;
	}

	/**
	 * Converts a HTML dom element to BBCode starting from
	 * the innermost element and working backwards
	 *
	 * @private
	 * @memberOf SCEditor.plugins.bbcode.prototype
	 */
	function elementToBbcode(element: Any, hasCodeParent?: boolean): string {
		const toBBCode = function (node: Any, hasCodeParentArg: Any, vChildren?: string[]): string {
			let ret = '';

			dom.traverse(node,
				function (node: Any) {
					let content = '';
					const nodeType = node.nodeType;
					const tag = node.nodeName.toLowerCase();
					const isCodeTag = tag === 'code';
					let vChild = validChildren[tag];
					const firstChild = node.firstChild;
					let isValidChild = true;

					if (vChildren) {
						isValidChild = vChildren.indexOf(tag) > -1;

						// if this tag is one of the parents allowed children
						// then set this tags allowed children to whatever it
						// allows, otherwise set to what the parent allows
						if (!isValidChild) {
							vChild = vChildren;
						}
					}

					// 1 = element
					if (nodeType === 1) {
						// skip empty nlf elements (new lines automatically
						// added after block level elements like quotes)
						if (is(node, '.sceditor-nlf') && !firstChild) {
							return;
						}

						// don't convert iframe contents
						if (tag !== 'iframe') {
							content = toBBCode(node,
								hasCodeParentArg || isCodeTag,
								vChild);
						}

						// TODO: isValidChild is no longer needed. Should use
						// valid children bbcodes instead by creating BBCode
						// tokens like the parser.
						if (isValidChild) {
							// Emoticons should be converted if they have found
							// their way into a code tag
							if (!hasCodeParentArg) {
								if (!isCodeTag) {
									// Parse inline codes first so they don't
									// contain block level codes
									content = handleTags(node, content, false);
								}

								content = handleTags(node, content, true);
							}
							ret += handleBlockNewlines(node, content);
						} else {
							ret += content;
						}
						// 3 = text
					} else if (nodeType === 3) {
						ret += node.nodeValue;
					}

					return undefined;
				},
				false,
				true);

			return ret;
		};

		return toBBCode(element, hasCodeParent);
	}

	/**
	 * Initializer
	 * @private
	 */
	base.init = function (this: Any) {
		base.opts = this.opts;
		base.elementToBbcode = elementToBbcode;

		// build the BBCode cache
		buildBbcodeCache();

		this.commands = extend(
			true,
			{},
			defaultCommandsOverrides,
			this.commands
		);

		// Add BBCode helper methods
		this.toBBCode = base.toSource;
		this.fromBBCode = base.toHtml;
	};

	/**
	 * Converts BBCode into HTML
	 */
	function toHtml(asFragment: boolean, source: string, legacyAsFragment?: boolean): string {
		const parser = new BBCodeParserCtor(base.opts.parserOptions);
		const toHTML = (asFragment || legacyAsFragment) ? parser.toHTMLFragment : parser.toHTML;

		editorOptions = base.opts;

		return toHTML(base.opts.bbcodeTrim ? source.trim() : source);
	}

	/**
	 * Converts HTML into BBCode
	 *
	 * @private
	 */
	function toSource(asFragment: boolean, html: string, contextArg?: Document, parent?: Any): string {
		const context = contextArg || document;

		let bbcode, elements;
		const hasCodeParent = !!dom.closest(parent, 'code');
		const containerParent = context.createElement('div');
		const container = context.createElement('div');
		const parser = new BBCodeParserCtor(base.opts.parserOptions);

		container.innerHTML = html;
		css(containerParent, 'visibility', 'hidden');
		containerParent.appendChild(container);
		context.body.appendChild(containerParent);

		if (asFragment) {
			// Add text before and after so removeWhiteSpace doesn't remove
			// leading and trailing whitespace
			containerParent.insertBefore(
				context.createTextNode('#'),
				containerParent.firstChild
			);
			containerParent.appendChild(context.createTextNode('#'));
		}

		// Match parents white-space handling
		if (parent) {
			css(container, 'whiteSpace', css(parent, 'whiteSpace'));
		}

		// Remove all nodes with sceditor-ignore class
		elements = container.getElementsByClassName('sceditor-ignore');
		while (elements.length) {
			(elements[0].parentNode as Any).removeChild(elements[0]);
		}

		dom.removeWhiteSpace(containerParent);

		bbcode = elementToBbcode(container, hasCodeParent);

		context.body.removeChild(containerParent);

		bbcode = parser.toBBCode(bbcode, true);

		if (base.opts.bbcodeTrim) {
			bbcode = bbcode.trim();
		}

		return bbcode;
	}

	base.toHtml = toHtml.bind(null, false);
	base.fragmentToHtml = toHtml.bind(null, true);
	base.toSource = toSource.bind(null, false);
	base.fragmentToSource = toSource.bind(null, true);
}

const BBCodeParserCtor = BBCodeParser as unknown as new (options?: Any) => Any;

/**
 * Gets a BBCode
 *
 * @since 2.0.0
 */
(bbcodeFormat as Any).get = function (name: string) {
	return bbcodeHandlers[name] || null;
};

/**
 * Adds a BBCode to the parser or updates an existing
 * BBCode if a BBCode with the specified name already exists.
 *
 * @since 2.0.0
 */
(bbcodeFormat as Any).set = function (name: string, bbcodeArg: BBCodeHandler) {
	if (name && bbcodeArg) {
		// merge any existing command properties
		const bbcode = extend(bbcodeHandlers[name] || {}, bbcodeArg);

		bbcode.remove = function () {
			delete bbcodeHandlers[name];
		};

		bbcodeHandlers[name] = bbcode;
	}

	return this;
};

/**
 * Renames a BBCode
 *
 * This does not change the format or HTML handling, those must be
 * changed manually.
 *
 * @since 2.0.0
 */
(bbcodeFormat as Any).rename = function (name: string, newName: string) {
	if (name in bbcodeHandlers) {
		bbcodeHandlers[newName] = bbcodeHandlers[name];

		delete bbcodeHandlers[name];
	}

	return this;
};

/**
 * Removes a BBCode
 *
 * @since 2.0.0
 */
(bbcodeFormat as Any).remove = function (name: string) {
	if (name in bbcodeHandlers) {
		delete bbcodeHandlers[name];
	}

	return this;
};

(bbcodeFormat as Any).formatBBCodeString = formatBBCodeString;

SCEditor.formats.bbcode = bbcodeFormat as Any;
(SCEditor as Any).BBCodeParser = BBCodeParserCtor;
