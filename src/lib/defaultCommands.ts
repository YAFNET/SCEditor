import * as dom from './dom.js';
import * as escape from './escape.js';
import _tmpl from './templates.js';
import type { Command, SCEditorLike } from './types.js';

interface BootstrapModal {
	show(): void;
	_element: HTMLElement;
}

declare const window: Window & typeof globalThis & {
	bootstrap: { Modal: new (selector: string) => BootstrapModal };
};

declare function getAlbumImagesData(pageSize: number, pageNumber: number, append: boolean): void;
declare function getPaginationData(pageSize: number, pageNumber: number, append: boolean): void;

type DropDownCallback = (...args: never[]) => void;
type DropDownFn = (editor: SCEditorLike, caller: HTMLElement, callback: DropDownCallback) => void;

/**
 * Fixes a bug in FF where it sometimes wraps
 * new lines in their own list item.
 * See issue #359
 */
function fixFirefoxListBug(editor: SCEditorLike): void {
	// Only apply to Firefox as will break other browsers.
	if ('mozHidden' in document) {
		let node: Node | null = editor.getBody();
		let next: Node | null;

		while (node) {
			next = node;

			if (next.firstChild) {
				next = next.firstChild;
			} else {

				while (next && !next.nextSibling) {
					next = next.parentNode;
				}

				if (next) {
					next = next.nextSibling;
				}
			}

			if (node.nodeType === 3 && /[\n\r\t]+/.test(node.nodeValue as string)) {
				// Only remove if newlines are collapsed
				if (!/^pre/.test(dom.css(node.parentNode as HTMLElement, 'whiteSpace') as string)) {
					dom.remove(node);
				}
			}

			node = next;
		}
	}
}


/**
 * Map of all the commands for SCEditor
 * @name commands
 * @memberOf sceditor
 */
const defaultCmds: Record<string, Command> = {

	// START_COMMAND: albums
	albums: {
		exec: function (this: SCEditorLike, caller?: HTMLElement) {
			const content = dom.createElement('div');
			const editor = this;

			dom.appendChild(content,
				_tmpl('albums',
					{
						root: editor.opts.root
					},
					true));

			editor.createDropDown(caller as HTMLElement, 'albums', content);

			const pageSize = 6;
			const pageNumber = 0;

			getAlbumImagesData(pageSize, pageNumber, false);
		},
		tooltip: 'User Albums'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Attachments
	attachments: {
		exec: function () {
			const modal = new window.bootstrap.Modal('#UploadDialog');

			modal.show();
			modal._element.addEventListener('shown.bs.modal',
				() => {
					const pageSize = 6;
					const pageNumber = 0;

					getPaginationData(pageSize, pageNumber, false);

				});
		},
		tooltip: 'User Attachments'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Bold
	bold: {
		exec: 'bold',
		tooltip: 'Bold',
		shortcut: 'Ctrl+B'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Italic
	italic: {
		exec: 'italic',
		tooltip: 'Italic',
		shortcut: 'Ctrl+I'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Underline
	underline: {
		exec: 'underline',
		tooltip: 'Underline',
		shortcut: 'Ctrl+U'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Strikethrough
	strike: {
		exec: 'strikethrough',
		tooltip: 'Strikethrough'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Mark
	mark: {
		exec: function (this: SCEditorLike) {
			this.wysiwygEditorInsertHtml(
				'<mark>',
				'</mark>'
			);
		},
		tooltip: 'Highlight',
		shortcut: 'Ctrl+H'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Left
	left: {
		state: function (node?: Node | null) {
			if (node && node.nodeType === 3) {
				node = node.parentNode;
			}

			if (node) {
				const isLtr = dom.css(node as HTMLElement, 'direction') === 'ltr';
				const align = dom.css(node as HTMLElement, 'textAlign') as string;

				// Can be -moz-left
				return /left/.test(align) ||
					align === (isLtr ? 'start' : 'end');
			}

			return undefined;
		},
		exec: 'justifyleft',
		tooltip: 'Align left'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Centre
	center: {
		exec: 'justifycenter',
		tooltip: 'Center'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Right
	right: {
		state: function (node?: Node | null) {
			if (node && node.nodeType === 3) {
				node = node.parentNode;
			}

			if (node) {
				const isLtr = dom.css(node as HTMLElement, 'direction') === 'ltr';
				const align = dom.css(node as HTMLElement, 'textAlign') as string;

				// Can be -moz-right
				return /right/.test(align) ||
					align === (isLtr ? 'end' : 'start');
			}

			return undefined;
		},
		exec: 'justifyright',
		tooltip: 'Align right'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Justify
	justify: {
		exec: 'justifyfull',
		tooltip: 'Justify'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Font
	font: {
		_dropDown: function (editor: SCEditorLike, caller: HTMLElement, callback: (font: string | null) => void) {
			const content = dom.createElement('div');

			dom.on(content,
				'click',
				'a',
				function (this: HTMLElement, e: Event) {
					callback(dom.data(this, 'font') as string | null);
					editor.closeDropDown(true);
					e.preventDefault();
				});

			editor.opts.fonts.split(',').forEach(function (font) {
				dom.appendChild(content,
					_tmpl('fontOpt',
						{
							font: font
						},
						true));
			});

			editor.createDropDown(caller, 'font-picker', content);
		},
		exec: function (this: SCEditorLike, caller?: HTMLElement) {
			const editor = this;

			(defaultCmds.font._dropDown as DropDownFn)(editor,
				caller as HTMLElement,
				function (fontName: string) {
					editor.execCommand('fontname', fontName);
				} as DropDownCallback);
		},
		tooltip: 'Font Name'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Size
	size: {
		_dropDown: function (editor: SCEditorLike, caller: HTMLElement, callback: (size: string | null) => void) {
			const content = dom.createElement('div');

			dom.on(content,
				'click',
				'a',
				function (this: HTMLElement, e: Event) {
					callback(dom.data(this, 'size') as string | null);
					editor.closeDropDown(true);
					e.preventDefault();
				});

			for (let i = 1; i <= 7; i++) {
				dom.appendChild(content,
					_tmpl('sizeOpt',
						{
							size: i
						},
						true));
			}

			editor.createDropDown(caller, 'fontsize-picker', content);
		},
		exec: function (this: SCEditorLike, caller?: HTMLElement) {
			const editor = this;

			(defaultCmds.size._dropDown as DropDownFn)(editor,
				caller as HTMLElement,
				function (fontSize: string) {
					editor.execCommand('fontsize', fontSize);
				} as DropDownCallback);
		},
		tooltip: 'Font Size'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Colour
	color: {
		_dropDown: function (editor: SCEditorLike, caller: HTMLElement, callback: (color: string | null) => void) {
			const content = dom.createElement('div');
			let html = '';
			const cmd = defaultCmds.color as Command;

			if (!cmd._htmlCache) {
				editor.opts.colors.split('|').forEach(function (column) {
					html += '<div class="sceditor-color-column">';

					column.split(',').forEach(function (color) {
						// Only allow named, #aaa, hsl(1.1 50% / 1), etc.
						if (!/^[\#a-z0-9\-\(\) \/%\.]+$/i.test(color)) {
							color = '';
						}

						html +=
							`<a href="#" class="sceditor-color-option" style="background-color: ${color}" data-color="${
								color}"></a>`;
					});

					html += '</div>';
				});

				cmd._htmlCache = html;
			}

			dom.appendChild(content, dom.parseHTML(cmd._htmlCache as string));

			dom.on(content,
				'click',
				'a',
				function (this: HTMLElement, e: Event) {
					callback(dom.data(this, 'color') as string | null);
					editor.closeDropDown(true);
					e.preventDefault();
				});

			editor.createDropDown(caller, 'color-picker', content);
		},
		exec: function (this: SCEditorLike, caller?: HTMLElement) {
			const editor = this;

			(defaultCmds.color._dropDown as DropDownFn)(editor,
				caller as HTMLElement,
				function (color: string) {
					editor.execCommand('forecolor', color);
				} as DropDownCallback);
		},
		tooltip: 'Font Color'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Remove Format
	removeformat: {
		exec: 'removeformat',
		tooltip: 'Remove Formatting'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Cut
	cut: {
		exec: 'cut',
		tooltip: 'Cut',
		errorMessage: 'Your browser does not allow the cut command. ' +
			'Please use the keyboard shortcut Ctrl/Cmd-X'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Copy
	copy: {
		exec: 'copy',
		tooltip: 'Copy',
		errorMessage: 'Your browser does not allow the copy command. ' +
			'Please use the keyboard shortcut Ctrl/Cmd-C'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Paste
	paste: {
		exec: 'paste',
		tooltip: 'Paste',
		errorMessage: 'Your browser does not allow the paste command. ' +
			'Please use the keyboard shortcut Ctrl/Cmd-V'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Paste Text
	pastetext: {
		exec: function (this: SCEditorLike, caller?: HTMLElement) {
			const content = dom.createElement('div');
			const editor = this;

			dom.appendChild(content,
				_tmpl('pastetext',
					{
						label: editor._(
							'Paste your text inside the following box:'
						),
						insert: editor._('Insert')
					},
					true));

			dom.on(content,
				'click',
				'.button',
				function (e: Event) {
					const val = (dom.find(content, '#txt')[0] as HTMLInputElement).value;

					if (val) {
						editor.wysiwygEditorInsertText(val);
					}

					editor.closeDropDown(true);
					e.preventDefault();
				});

			editor.createDropDown(caller as HTMLElement, 'pastetext', content);
		},
		tooltip: 'Paste Text'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Bullet List
	bulletlist: {
		exec: function (this: SCEditorLike) {
			fixFirefoxListBug(this);
			this.execCommand('insertunorderedlist');
		},
		tooltip: 'Bullet list'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Ordered List
	orderedlist: {
		exec: function (this: SCEditorLike) {
			fixFirefoxListBug(this);
			this.execCommand('insertorderedlist');
		},
		tooltip: 'Numbered list'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Table
	table: {
		exec: function (this: SCEditorLike, caller?: HTMLElement) {
			const editor = this;
			const content = dom.createElement('div');

			dom.appendChild(content,
				_tmpl('table',
					{
						rows: editor._('Rows:'),
						cols: editor._('Cols:'),
						insert: editor._('Insert')
					},
					true));

			dom.on(content,
				'click',
				'.button',
				function (e: Event) {
					const rows = Number((dom.find(content, '#rows')[0] as HTMLInputElement).value);
					const cols = Number((dom.find(content, '#cols')[0] as HTMLInputElement).value);
					let html = '<table class="table">';

					if (rows > 0 && cols > 0) {
						html += Array(rows + 1).join(
							'<tr>' +
							Array(cols + 1).join(
								'<td class="border"><br /></td>'
							) +
							'</tr>'
						);

						html += '</table>';

						editor.wysiwygEditorInsertHtml(html);
						editor.closeDropDown(true);
						e.preventDefault();
					}
				});

			editor.createDropDown(caller as HTMLElement, 'inserttable', content);
		},
		tooltip: 'Insert a table'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Code
	code: {
		_dropDown: function (editor: SCEditorLike, caller: HTMLElement, callback: (language: string | null) => void) {
			const content = dom.createElement('div');

			dom.on(content,
				'click',
				'a',
				function (this: HTMLElement, e: Event) {
					callback(dom.data(this, 'language') as string | null);
					editor.closeDropDown(true);
					e.preventDefault();
				});

			editor.opts.codeLanguages.forEach(function (language) {
				dom.appendChild(content,
					_tmpl('codeOpt',
						{
							language: language.Value,
							languageName: language.Text
						},
						true));
			});

			editor.createDropDown(caller, 'codeLanguage-picker', content);
		},
		exec: function (this: SCEditorLike, caller?: HTMLElement) {
			const editor = this;

			(defaultCmds.code._dropDown as DropDownFn)(editor,
				caller as HTMLElement,
				function (codeLanguageName: string) {

					editor.wysiwygEditorInsertHtml(
						`<pre class="border border-danger rounded m-2 p-2"><code class="lang-${codeLanguageName}">`,
						'</code></pre>'
					);
				} as DropDownCallback);
		},
		tooltip: 'Code'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Note
	note: {
		exec: function (this: SCEditorLike, caller?: HTMLElement) {
			const content = dom.createElement('div');
			const editor = this;
			let options = '';

			editor.opts.noteTypes.split(',').forEach(function (noteType) {
				options +=
					_tmpl('noteOpt',
						{
							type: noteType
						},
						false);
			});

			dom.appendChild(content,
				_tmpl('note',
					{
						labelType: editor._(
							'Select the note type:'
						),
						labelText: editor._(
							'Enter the note inside the following box:'
						),
						insert: editor._('Insert'),
						values: options
					},
					true));

			dom.on(content,
				'click',
				'.button',
				function (e: Event) {
					const val = (dom.find(content, '#txt')[0] as HTMLInputElement).value;
					const type = (dom.find(content, '#type')[0] as HTMLInputElement).value;

					if (val) {
						editor.wysiwygEditorInsertHtml(
							`<div class="alert alert-${type}" role="alert">${val}</div>`);
					}

					editor.closeDropDown(true);
					e.preventDefault();
				});

			editor.createDropDown(caller as HTMLElement, 'pastetext', content);
		},
		tooltip: 'Note'
	} as Command,
	// END_COMMAND


	// START_COMMAND: Code
	extensions: {
		_dropDown: function (editor: SCEditorLike, caller: HTMLElement, callback: (extension: string) => void) {
			const content = dom.createElement('div');

			dom.on(content,
				'click',
				'a',
				function (this: HTMLElement, e: Event) {
					callback(dom.data(this, 'language') as string);
					editor.closeDropDown(true);
					e.preventDefault();
				});

			fetch(editor.opts.extensionsUrl,
				{
					method: 'GET'
				}).then(res => res.json()).then((data: Array<{ useToolbar?: boolean; name: string }>) => {
				data.forEach(function (extension) {
					if (!extension.useToolbar) {
						dom.appendChild(content,
							_tmpl('extensionOpt',
								{
									extension: extension.name
								},
								true));
					}
				});
			});

			editor.createDropDown(caller, 'extensions-picker', content);
		},
		exec: function (this: SCEditorLike, caller?: HTMLElement) {
			const editor = this;

			(defaultCmds.extensions._dropDown as DropDownFn)(editor,
				caller as HTMLElement,
				function (extension: string) {

					editor.wysiwygEditorInsertText(
						`[${extension}]`,
						`[/${extension}]`
					);
				} as DropDownCallback);


		},
		tooltip: 'More BBCode'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Image
	image: {
		_dropDown: function (editor: SCEditorLike, caller: HTMLElement, cb: (url: string, text: string) => void) {
			const content = dom.createElement('div');

			dom.appendChild(content,
				_tmpl('image',
					{
						url: editor._('URL:'),
						desc: editor._('Description (optional):'),
						insert: editor._('Insert')
					},
					true));


			const linkInput = dom.find(content, '#link')[0] as HTMLInputElement;

			function insertUrl(e: Event) {
				const desc = (dom.find(content, '#des')[0] as HTMLInputElement).value;
				if (linkInput.value) {
					cb(linkInput.value, desc);
				}

				editor.closeDropDown(true);
				e.preventDefault();
			}

			dom.on(content, 'click', '.button', insertUrl);
			dom.on(content,
				'keypress',
				function (e: Event) {
					// 13 = enter key
					if ((e as KeyboardEvent).which === 13 && linkInput.value) {
						insertUrl(e);
					}
				},
				dom.EVENT_CAPTURE);

			editor.createDropDown(caller, 'insertimage', content);
		},
		exec: function (this: SCEditorLike, caller?: HTMLElement) {
			const editor = this;

			(defaultCmds.image._dropDown as DropDownFn)(
				editor,
				caller as HTMLElement,
				function (url: string, text: string) {
					let attrs = '';

					if (text) {
						attrs += ` alt="${escape.entities(text)}"`;
					}

					attrs += ` src="${escape.entities(url)}"`;

					editor.wysiwygEditorInsertHtml(
						`<img${attrs} class="img-user-posted img-thumbnail" />`
					);
				} as DropDownCallback
			);
		},
		tooltip: 'Insert an image'
	} as Command,
	// END_COMMAND

	// START_COMMAND: E-mail
	email: {
		_dropDown: function (editor: SCEditorLike, caller: HTMLElement, cb: (email: string, text: string) => void) {
			const content = dom.createElement('div');

			dom.appendChild(content,
				_tmpl('email',
					{
						label: editor._('E-mail:'),
						desc: editor._('Description (optional):'),
						insert: editor._('Insert')
					},
					true));

			dom.on(content,
				'click',
				'.button',
				function (e: Event) {
					const email = (dom.find(content, '#email')[0] as HTMLInputElement).value;

					if (email) {
						cb(email, (dom.find(content, '#des')[0] as HTMLInputElement).value);
					}

					editor.closeDropDown(true);
					e.preventDefault();
				});

			editor.createDropDown(caller, 'insertemail', content);
		},
		exec: function (this: SCEditorLike, caller?: HTMLElement) {
			const editor = this;

			(defaultCmds.email._dropDown as DropDownFn)(
				editor,
				caller as HTMLElement,
				function (email: string, text: string) {
					if (!editor.getRangeHelper().selectedHtml() || text) {
						editor.wysiwygEditorInsertHtml(
							`<a href="mailto:${escape.entities(email)}">${escape.entities((text || email))}</a>`
						);
					} else {
						editor.execCommand('createlink', `mailto:${email}`);
					}
				} as DropDownCallback
			);
		},
		tooltip: 'Insert an email'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Link
	link: {
		_dropDown: function (editor: SCEditorLike, caller: HTMLElement, cb: (url: string, text: string) => void) {
			const content = dom.createElement('div');

			dom.appendChild(content,
				_tmpl('link',
					{
						url: editor._('URL:'),
						desc: editor._('Description (optional):'),
						ins: editor._('Insert')
					},
					true));

			const linkInput = dom.find(content, '#link')[0] as HTMLInputElement;

			function insertUrl(e: Event) {
				if (linkInput.value) {
					cb(linkInput.value, (dom.find(content, '#des')[0] as HTMLInputElement).value);
				}

				editor.closeDropDown(true);
				e.preventDefault();
			}

			dom.on(content, 'click', '.button', insertUrl);
			dom.on(content,
				'keypress',
				function (e: Event) {
					// 13 = enter key
					if ((e as KeyboardEvent).which === 13 && linkInput.value) {
						insertUrl(e);
					}
				},
				dom.EVENT_CAPTURE);

			editor.createDropDown(caller, 'insertlink', content);
		},
		exec: function (this: SCEditorLike, caller?: HTMLElement) {
			const editor = this;

			(defaultCmds.link._dropDown as DropDownFn)(editor,
				caller as HTMLElement,
				function (url: string, text: string) {
					if (text || !editor.getRangeHelper().selectedHtml()) {
						editor.wysiwygEditorInsertHtml(
							`<a href="${escape.entities(url)}">${escape.entities(text || url)}</a>`
						);
					} else {
						editor.execCommand('createlink', url);
					}
				} as DropDownCallback);
		},
		tooltip: 'Insert a link'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Unlink
	unlink: {
		state: function (this: SCEditorLike) {
			return dom.closest(this.currentNode(), 'a') ? 0 : -1;
		},
		exec: function (this: SCEditorLike) {
			const anchor = dom.closest(this.currentNode(), 'a');

			if (anchor) {
				while (anchor.firstChild) {
					dom.insertBefore(anchor.firstChild, anchor);
				}

				dom.remove(anchor);
			}
		},
		tooltip: 'Unlink'
	} as Command,
	// END_COMMAND


	// START_COMMAND: Quote
	quote: {
		exec: function (this: SCEditorLike, _caller?: HTMLElement, html?: string, author?: string) {
			let before =
				'<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm"><span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>';
			let end: string | null = '</div>';

			// if there is HTML passed set end to null so any selected
			// text is replaced
			if (html) {
				const authorHtml = (author
					? `<cite class="card-text text-end d-block text-body-secondary small">${
						escape.entities(author)}</cite>`
					: '');
				before = before + html + authorHtml + end;
				end = null;
				// if not add a newline to the end of the inserted quote
			} else if (this.getRangeHelper().selectedHtml() === '') {
				// end = `<br />${end}`;
			}

			this.wysiwygEditorInsertHtml(before, end);
		},
		tooltip: 'Insert a Quote'
	} as Command,
	// END_COMMAND

	// START_COMMAND: media
	media: {
		_dropDown: function (editor: SCEditorLike, caller: HTMLElement, callback: (url: string) => void) {
			const content = dom.createElement('div');

			dom.appendChild(content,
				_tmpl('mediaMenu',
					{
						label: editor._('Media URL:'),
						insert: editor._('Insert')
					},
					true));

			dom.on(content,
				'click',
				'.button',
				function (e: Event) {
					const url = (dom.find(content, '#link')[0] as HTMLInputElement).value;

					if (!url.startsWith('http')) {
						alert('Not a valid URL!');
						return;
					}

					callback(url);

					editor.closeDropDown(true);
					e.preventDefault();
				});

			editor.createDropDown(caller, 'insertmedia', content);
		},
		exec: function (this: SCEditorLike, btn?: HTMLElement) {
			const editor = this;

			(defaultCmds.media._dropDown as DropDownFn)(editor,
				btn as HTMLElement,
				function (url: string) {
					editor.wysiwygEditorInsertHtml(`[media]${url}[/media]`);
				} as DropDownCallback);
		},
		tooltip: 'Insert an embed media like a YouTube video, facebook post or twitter status.'
	} as Command,
	// END_COMMAND

	// START_COMMAND: vimeo
	vimeo: {
		_dropDown: function (editor: SCEditorLike, caller: HTMLElement, callback: (url: string, id: string) => void) {
			const content = dom.createElement('div');

			dom.appendChild(content,
				_tmpl('youtubeMenu',
					{
						label: editor._('Video URL:'),
						insert: editor._('Insert')
					},
					true));

			dom.on(content,
				'click',
				'.button',
				function (e: Event) {
					const url = (dom.find(content, '#link')[0] as HTMLInputElement).value;

					if (url !== '') {
						const matches = url.match(/vimeo\..*\/(\d+)(?:$|\/)/) as RegExpMatchArray;

						callback(url, matches[1]);
					}

					editor.closeDropDown(true);
					e.preventDefault();
				});

			editor.createDropDown(caller, 'insertlink', content);
		},
		exec: function (this: SCEditorLike, btn?: HTMLElement) {
			const editor = this;

			(defaultCmds.vimeo._dropDown as DropDownFn)(editor,
				btn as HTMLElement,
				function (url: string, id: string) {
					editor.wysiwygEditorInsertHtml(_tmpl('vimeo',
						{
							url: url,
							vimeoId: id
						}));
				} as DropDownCallback);
		},
		tooltip: 'Insert a Vimeo video'
	} as Command,
	// END_COMMAND

	// START_COMMAND: instagram
	instagram: {
		_dropDown: function (editor: SCEditorLike, caller: HTMLElement, callback: (url: string, id: string) => void) {
			const content = dom.createElement('div');

			dom.appendChild(content,
				_tmpl('instagramMenu',
					{
						label: editor._('Instagram Post URL:'),
						insert: editor._('Insert')
					},
					true));

			dom.on(content,
				'click',
				'.button',
				function (e: Event) {
					const url = (dom.find(content, '#link')[0] as HTMLInputElement).value;
					let id = '';

					if (url !== '') {
						const matches = url.match(/\/(p|tv|reel)\/(.*?)\//);

						if (matches) {
							id = matches[2];
							callback(url, id);
						}
					}

					editor.closeDropDown(true);
					e.preventDefault();
				});

			editor.createDropDown(caller, 'insertlink', content);
		},
		exec: function (this: SCEditorLike, btn?: HTMLElement) {
			const editor = this;

			(defaultCmds.instagram._dropDown as DropDownFn)(editor,
				btn as HTMLElement,
				function (url: string, id: string) {
					editor.wysiwygEditorInsertHtml(_tmpl('instagram',
						{
							url: url,
							id: id
						}));
				} as DropDownCallback);
		},
		tooltip: 'Insert an Instagram Post'
	} as Command,
	// END_COMMAND

	// START_COMMAND: facebook
	facebook: {
		_dropDown: function (editor: SCEditorLike, caller: HTMLElement, callback: (url: string) => void) {
			const content = dom.createElement('div');

			dom.appendChild(content,
				_tmpl('facebookMenu',
					{
						label: editor._('Facebook post URL:'),
						insert: editor._('Insert')
					},
					true));

			dom.on(content,
				'click',
				'.button',
				function (e: Event) {
					const url = (dom.find(content, '#link')[0] as HTMLInputElement).value;

					callback(url);

					editor.closeDropDown(true);
					e.preventDefault();
				});

			editor.createDropDown(caller, 'insertlink', content);
		},
		exec: function (this: SCEditorLike, btn?: HTMLElement) {
			const editor = this;

			(defaultCmds.facebook._dropDown as DropDownFn)(editor,
				btn as HTMLElement,
				function (url: string) {
					editor.wysiwygEditorInsertHtml(_tmpl('facebook',
						{
							url: url
						}));
				} as DropDownCallback);
		},
		tooltip: 'Insert an Facebook Post'
	} as Command,
	// END_COMMAND

	// START_COMMAND: youtube
	youtube: {
		_dropDown: function (editor: SCEditorLike, caller: HTMLElement, callback: (url: string, id: string) => void) {
			const content = dom.createElement('div');

			dom.appendChild(content,
				_tmpl('youtubeMenu',
					{
						label: editor._('Video URL:'),
						insert: editor._('Insert')
					},
					true));

			dom.on(content,
				'click',
				'.button',
				function (e: Event) {
					const url = (dom.find(content, '#link')[0] as HTMLInputElement).value;
					const idMatch = url.match(/(?:v=|v\/|embed\/|youtu.be\/)?([a-zA-Z0-9_-]{11})/);


					if (idMatch && /^[a-zA-Z0-9_\-]{11}$/.test(idMatch[1])) {
						callback(url, idMatch[1]);
					}

					editor.closeDropDown(true);
					e.preventDefault();
				});

			editor.createDropDown(caller, 'insertlink', content);
		},
		exec: function (this: SCEditorLike, btn?: HTMLElement) {
			const editor = this;

			(defaultCmds.youtube._dropDown as DropDownFn)(editor,
				btn as HTMLElement,
				function (url: string, id: string) {
					editor.wysiwygEditorInsertHtml(_tmpl('youtube',
						{
							url: url,
							id: id
						}));
				} as DropDownCallback);
		},
		tooltip: 'Insert a YouTube video'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Date
	date: {
		_date: function (editor: SCEditorLike): string {
			const now = new Date();
			// getYear() is deprecated but kept to match legacy runtime behaviour
			let year = (now as unknown as { getYear(): number }).getYear();
			const month = now.getMonth() + 1;
			const day = now.getDate();
			let monthStr: number | string = month;
			let dayStr: number | string = day;

			if (year < 2000) {
				year = 1900 + year;
			}

			if (month < 10) {
				monthStr = `0${month}`;
			}

			if (day < 10) {
				dayStr = `0${day}`;
			}

			return editor.opts.dateFormat
				.replace(/year/i, String(year))
				.replace(/month/i, String(monthStr))
				.replace(/day/i, String(dayStr));
		},
		exec: function (this: SCEditorLike) {
			this.insertText((defaultCmds.date._date as (editor: SCEditorLike) => string)(this));
		},
		txtExec: function (this: SCEditorLike) {
			this.insertText((defaultCmds.date._date as (editor: SCEditorLike) => string)(this));
		},
		tooltip: 'Insert current date'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Time
	time: {
		_time: function (): string {
			const now = new Date();
			const hours = now.getHours();
			const mins = now.getMinutes();
			const secs = now.getSeconds();
			const hoursStr = hours < 10 ? `0${hours}` : String(hours);
			const minsStr = mins < 10 ? `0${mins}` : String(mins);
			const secsStr = secs < 10 ? `0${secs}` : String(secs);

			return hoursStr + ':' + minsStr + ':' + secsStr;
		},
		exec: function (this: SCEditorLike) {
			this.insertText((defaultCmds.time._time as () => string)());
		},
		txtExec: function (this: SCEditorLike) {
			this.insertText((defaultCmds.time._time as () => string)());
		},
		tooltip: 'Insert current time'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Undo
	undo: {
		exec: 'undo',
		tooltip: 'Undo',
		shortcut: 'Ctrl+Z'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Redo
	redo: {
		exec: 'redo',
		tooltip: 'Redo',
		shortcut: 'Ctrl+Y'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Maximize
	maximize: {
		state: function (this: SCEditorLike) {
			return this.maximize();
		},
		exec: function (this: SCEditorLike) {
			this.maximize(!this.maximize());
			this.focus();
		},
		txtExec: function (this: SCEditorLike) {
			this.maximize(!this.maximize());
			this.focus();
		},
		tooltip: 'Maximize',
		shortcut: 'Ctrl+Shift+M'
	} as Command,
	// END_COMMAND

	// START_COMMAND: Source
	source: {
		state: function (this: SCEditorLike) {
			return this.sourceMode();
		},
		exec: function (this: SCEditorLike) {
			this.toggleSourceMode();
			this.focus();
		},
		txtExec: function (this: SCEditorLike) {
			this.toggleSourceMode();
			this.focus();
		},
		tooltip: 'View source',
		shortcut: 'Ctrl+Shift+S'
	} as Command,
	// END_COMMAND
	// START_COMMAND: Reply
	reply: {
		exec: function () {
			if (document.getElementById('QuickReplyDialog') !== null) {
				(document.querySelector('[data-bs-save*="modal"]') as HTMLElement).click();
			} else if (document.querySelector('[formaction*="PostReply"]') !== null) {
				(document.querySelector('[formaction*="PostReply"]') as HTMLElement).click();
			} else if (document.querySelector('[id*="QuickReply"]') !== null) {
				(document.querySelector('[id*="QuickReply"]') as HTMLElement).click();
			} else if (document.querySelector('[id*="PostReply"]') !== null) {
				window.location.href = (document.querySelector('[id*="PostReply"]') as HTMLAnchorElement).href;
			}
		},
		tooltip: 'Post Reply',
		shortcut: 'Ctrl+Enter'
	} as Command,
	// END_COMMAND


	// this is here so that commands above can be removed
	// without having to remove the , after the last one.
	// Needed for IE.
	ignore: {} as Command
};

export default defaultCmds;
