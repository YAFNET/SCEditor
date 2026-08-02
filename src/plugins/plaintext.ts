/**
 * SCEditor Plain Text Plugin
 * http://www.sceditor.com/
 *
 * Copyright (C) 2011-2026, Sam Clarke (samclarke.com)
 *
 * SCEditor is licensed under the MIT license:
 *	http://www.opensource.org/licenses/mit-license.php
 *
 * @author Sam Clarke
 */
import * as utils from '../lib/utils.js';
import * as dom from '../lib/dom.js';
import PluginManager from '../lib/PluginManager.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/**
 * Options:
 *
 * pastetext.addButton - If to replace the plaintext button with a toggle
 *                       button that enables and disables plain text mode.
 *
 * pastetext.enabled - If the plain text button should be enabled at start
 *                     up. Only applies if addButton is enabled.
 */
PluginManager.plugins.plaintext = function (this: Any) {
	let plainTextEnabled = true;

	this.init = function (this: Any) {
		const commands = this.commands;
		const opts = this.opts;

		if (opts && opts.plaintext && opts.plaintext.addButton) {
			plainTextEnabled = opts.plaintext.enabled;

			commands.pastetext = utils.extend(commands.pastetext || {}, {
				state: function () {
					return plainTextEnabled ? 1 : 0;
				},
				exec: function () {
					plainTextEnabled = !plainTextEnabled;
				}
			});
		}
	};

	this.signalPasteRaw = function (data: Any) {
		if (plainTextEnabled) {
			if (data.html && !data.text) {
				const div = document.createElement('div');
				div.innerHTML = data.html;

				// TODO: Refactor into private shared module with editor
				// innerText adds two newlines after <p> tags so convert
				// them to <div> tags
				utils.each(div.querySelectorAll('p'), function (_: Any, elm: Any) {
					dom.convertElement(elm, 'div');
				});
				// Remove collapsed <br> tags as innerText converts them to
				// newlines
				utils.each(div.querySelectorAll('br'), function (_: Any, elm: Any) {
					if (!elm.nextSibling ||
					!dom.isInline(elm.nextSibling, true)) {
						elm.parentNode.removeChild(elm);
					}
				});

				document.body.appendChild(div);
				data.text = div.innerText;
				document.body.removeChild(div);
			}

			data.html = null;
		}
	};
} as Any;
