/**
 * SCEditor Drag and Drop Plugin
 * http://www.sceditor.com/
 *
 * Copyright (C) 2011-2026, Sam Clarke (samclarke.com)
 *
 * SCEditor is licensed under the MIT license:
 *	http://www.opensource.org/licenses/mit-license.php
 *
 * @author Sam Clarke
 */
import * as dom from '../lib/dom.js';
import PluginManager from '../lib/PluginManager.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/**
 * Place holder GIF shown while image is loading.
 * @private
 */
const loadingGif = 'data:image/gif;base64,R0lGODlhlgBkAPABAH19ffb29iH5BAAK' +
	'AAAAIf4aQ3JlYXRlZCB3aXRoIGFqYXhsb2FkLmluZm8AIf8LTkVUU0NBUEUyLjADAQA' +
	'AACwAAAAAlgBkAAAC1YyPqcvtD6OctNqLs968+w+G4kiW5omm6sq27gvH8kzX9o3n+s' +
	'73/g8MCofEovGITCqXzKbzCY1Kp9Sq9YrNarfcrvcLDovH5LL5jE6r1+y2+w2Py+f0u' +
	'v2OvwD2fP6iD/gH6Pc2GIhg2JeQSNjGuLf4GMlYKIloefAIUEl52ZmJyaY5mUhqyFnq' +
	'mQr6KRoaMKp66hbLumpQ69oK+5qrOyg4a6qYV2x8jJysvMzc7PwMHS09TV1tfY2drb3' +
	'N3e39DR4uPk5ebn6Onq6+zt7u/g4fL99UAAAh+QQACgAAACwAAAAAlgBkAIEAAAB9fX' +
	'329vYAAAAC3JSPqcvtD6OctNqLs968+w+G4kiW5omm6sq27gvH8kzX9o3n+s73/g8MC' +
	'ofEovGITCqXzKbzCY1Kp9Sq9YrNarfcrvcLDovH5LL5jE6r1+y2+w2Py+f0uv2OvwD2' +
	'fP4iABgY+CcoCNeHuJdQyLjIaOiWiOj4CEhZ+SbZd/nI2RipqYhQOThKGpAZCuBZyAr' +
	'ZprpqSupaCqtaazmLCRqai7rb2av5W5wqSShcm8fc7PwMHS09TV1tfY2drb3N3e39DR' +
	'4uPk5ebn6Onq6+zt7u/g4fLz9PX29/j5/vVAAAIfkEAAoAAAAsAAAAAJYAZACBAAAAf' +
	'X199vb2AAAAAuCUj6nL7Q+jnLTai7PevPsPhuJIluaJpurKtu4Lx/JM1/aN5/rO9/4P' +
	'DAqHxKLxiEwql8ym8wmNSqfUqvWKzWq33K73Cw6Lx+Sy+YxOq9fstvsNj8vn9Lr9jr8' +
	'E9nz+AgAYGLjQVwhXiJgguAiYgGjo9tinyCjoKLn3hpmJUGmJsBmguUnpCXCJOZraaX' +
	'oKShoJe9DqehCqKlnqiZobuzrbyvuIO8xqKpxIPKlwrPCbBx0tPU1dbX2Nna29zd3t/' +
	'Q0eLj5OXm5+jp6uvs7e7v4OHy8/T19vf4+fr7/P379UAAAh+QQACgAAACwAAAAAlgBk' +
	'AIEAAAB9fX329vYAAAAC4JSPqcvtD6OctNqLs968+w+G4kiW5omm6sq27gvH8kzX9o3' +
	'n+s73/g8MCofEovGITCqXzKbzCY1Kp9Sq9YrNarfcrvcLDovH5LL5jE6r1+y2+w2Py+' +
	'f0uv2OvwT2fP6iD7gAMEhICAeImIAYiFDoOPi22KcouZfw6BhZGUBZeYlp6LbJiTD6C' +
	'Qqg6Vm6eQqqKtkZ24iaKtrKunpQa9tmmju7Wwu7KFtMi3oYDMzompkHHS09TV1tfY2d' +
	'rb3N3e39DR4uPk5ebn6Onq6+zt7u/g4fLz9PX29/j5+vv8/f31QAADs=';

/**
 * Basic check for browser support
 * @private
 */
const isSupported = typeof window.FileReader !== 'undefined';

PluginManager.plugins.dragdrop = function (this: Any) {
	if (!isSupported) {
		return;
	}

	const base = this;
	let opts: Any;
	let editor: Any;
	let handleFile: Any;
	let container: Any;
	let cover: Any;
	let placeholderId = 0;


	function hideCover() {
		cover.style.display = 'none';
		container.className = container.className.replace(/(^| )dnd( |$)/g, '');
	}

	function showCover() {
		if (cover.style.display === 'none') {
			cover.style.display = 'block';
			container.className += ' dnd';
		}
	}

	function isAllowed(_file?: Any) {
		// FF sets type to application/x-moz-file until it has been dropped
		/*if (file.type !== 'application/x-moz-file' && opts.allowedTypes &&
			opts.allowedTypes.indexOf(file.type) < 0) {
			return false;
		}

		return opts.isAllowed ? opts.isAllowed(file) : true;*/

		return true;
	}

	function createHolder(toReplace?: Any) {
		const placeholder = document.createElement('img');
		placeholder.src = loadingGif;
		placeholder.className = 'sceditor-ignore';
		placeholder.id = `sce-dragdrop-${placeholderId++}`;

		function replace(html?: Any) {
			const node = editor
				.getBody()
				.ownerDocument
				.getElementById(placeholder.id);

			if (node) {
				if (typeof html === 'string') {
					node.insertAdjacentHTML('afterend', html);
				}

				node.parentNode.removeChild(node);
			}
		}

		return function () {
			if (toReplace) {
				toReplace.parentNode.replaceChild(placeholder, toReplace);
			} else {
				editor.wysiwygEditorInsertHtml(placeholder.outerHTML);
			}

			return {
				insert: function (html: Any) {
					replace(html);
				},
				cancel: replace
			};
		};
	}

	function handleDragOver(e: Any) {
		const dt = e.dataTransfer;
		const files = dt.files.length || !dt.items ? dt.files : dt.items;

		for (let i = 0; i < files.length; i++) {
			// Dragging a string should be left to default
			if (files[i].kind === 'string') {
				return;
			}
		}

		showCover();
		e.preventDefault();
	}

	function handleDrop(e: Any) {
		const dt = e.dataTransfer;
		const files = dt.files.length || !dt.items ? dt.files : dt.items;

		hideCover();

		for (let i = 0; i < files.length; i++) {
			// Dragging a string should be left to default
			if (files[i].kind === 'string') {
				return;
			}

			if (isAllowed(files[i])) {
				handleFile(files[i], createHolder());
			}
		}

		e.preventDefault();
	}

	base.signalReady = function (this: Any) {
		editor = this;
		opts = editor.opts.dragdrop || {};
		handleFile = opts.handleFile;

		if (!handleFile)
		{
			return;
		}

		container = editor.getContentAreaContainer().parentNode;

		cover = container.appendChild(dom.parseHTML(
			`<div class="sceditor-dnd-cover" style="display: none"></div>`
		).firstChild);

		container.addEventListener('dragover', handleDragOver);
		container.addEventListener('dragleave', hideCover);
		container.addEventListener('dragend', hideCover);
		container.addEventListener('drop', handleDrop);

		editor.getBody().addEventListener('dragover', handleDragOver);
		editor.getBody().addEventListener('drop', hideCover);
	};

	base.destroy = function () {
		if (!container) {
			return;
		}

		container.removeEventListener('dragover', handleDragOver);
		container.removeEventListener('dragleave', hideCover);
		container.removeEventListener('dragend', hideCover);
		container.removeEventListener('drop', handleDrop);

		editor.getBody().removeEventListener('dragover', handleDragOver);
		editor.getBody().removeEventListener('drop', hideCover);

		if (cover && cover.parentNode) {
			cover.parentNode.removeChild(cover);
		}
	};

	base.signalPasteHtml = function (file: Any) {

		if (!file)
		{
			return;
		}

		if (!opts.handleFile)
		{
			return;
		}

		if (file.val) {
			return;
		}

		hideCover();

		if (!('handlePaste' in opts) || opts.handlePaste) {
			if (isAllowed(file)) {
				handleFile(file, createHolder());
			}
		}
	};
} as Any;
