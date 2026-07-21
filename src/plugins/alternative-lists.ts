/**
 * SCEditor Inline-Code Plugin for BBCode format
 * http://www.sceditor.com/
 *
 * Copyright (C) 2011-2026, Sam Clarke (samclarke.com)
 *
 * SCEditor is licensed under the MIT license:
 *	http://www.opensource.org/licenses/mit-license.php
 *
 * @fileoverview SCEditor alternative lists plugin
 * This plugin implements phpBB style of the lists:
 * [list]
 * [*]item
 * [*]item
 * [/list]
 * @author Alex Betis
 */

(function (sceditor) {
	'use strict';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type Any = any;

	const utils = sceditor.utils;
	const bbcode = sceditor.formats.bbcode as Any;

	function isFunction(fn: Any): boolean {
		return typeof fn === 'function';
	}

	sceditor.plugins['alternative-lists'] = function (this: Any) {
		const base = this;

		/**
		 * Private functions
		 * @private
		 */
		let bulletHandler: Any;
		let orderedHandler: Any;
		let insertListTag: Any;

		base.init = function (this: Any) {
			const opts = this.opts;

			// Enable for BBCode only
			if (opts.format && opts.format !== 'bbcode') {
				return;
			}

			// Override only txtExec implementation
			sceditor.command.get('orderedlist')!.txtExec = orderedHandler;
			sceditor.command.get('bulletlist')!.txtExec = bulletHandler;

			// Override current implementation
			bbcode.set('list', {
				breakStart: true,
				isInline: false,
				skipLastLineBreak: true,
				html: function (this: Any, token: Any, attrs: Any, content: Any) {
					let listType = 'disc';
					let toHtml = null;

					if (attrs.defaultattr) {
						listType = attrs.defaultattr;
					}

					if (listType === '1') {
						// This listType belongs to orderedList (OL)
						toHtml = bbcode.get('ol').html;
					} else {
						// unknown listType, use default bullet list behavior
						toHtml = bbcode.get('ul').html;
					}

					if (isFunction(toHtml)) {
						return toHtml.call(this, token, attrs, content);
					} else {
						token.attrs['0'] = content;
						return bbcode.formatBBCodeString(
							toHtml, token.attrs);
					}
				}
			});

			bbcode.set('ul', {
				tags: {
					ul: null
				},
				breakStart: true,
				isInline: false,
				skipLastLineBreak: true,
				format: '[list]{0}[/list]',
				html: '<ul>{0}</ul>'
			});

			bbcode.set('ol', {
				tags: {
					ol: null
				},
				breakStart: true,
				isInline: false,
				skipLastLineBreak: true,
				format: '[list=1]{0}[/list]',
				html: '<ol>{0}</ol>'
			});

			bbcode.set('li', {
				tags: {
					li: null
				},
				isInline: false,
				closedBy: ['/ul', '/ol', '/list', '*', 'li'],
				format: '[*]{0}',
				html: '<li>{0}</li>'
			});

			bbcode.set('*', {
				isInline: false,
				excludeClosing: true,
				closedBy: ['/ul', '/ol', '/list', '*', 'li'],
				html: '<li>{0}</li>'
			});
		};

		insertListTag = function (editor: Any, listType: string, selected: string) {
			let content = '';

			utils.each(selected.split(/\r?\n/), function (_index: Any, item: Any) {
				content += (content ? '\n' : '') +
					'[*]' + item;
			});

			if (listType === '') {
				editor.insertText('[list]\n' + content + '\n[/list]');
			} else {
				editor.insertText('[list=' + listType + ']\n' + content +
				'\n[/list]');
			}
		};

		/**
		 * Function for the txtExec and exec properties
		 *
		 * @param  caller
		 * @private
		 */
		orderedHandler = function (this: Any, caller: Any, selected: string) {
			const editor = this;

			insertListTag(editor, '1', selected);
		};

		bulletHandler = function (this: Any, caller: Any, selected: string) {
			const editor = this;

			insertListTag(editor, '', selected);
		};

	} as Any;
})(sceditor);
