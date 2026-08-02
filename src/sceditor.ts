/**
 * SCEditor
 * http://www.sceditor.com/
 *
 * Copyright (C) 2011-2026, Sam Clarke (samclarke.com)
 *
 * SCEditor is licensed under the MIT license:
 *	http://www.opensource.org/licenses/mit-license.php
 *
 * @fileoverview SCEditor - A lightweight WYSIWYG BBCode and HTML editor
 * @author Sam Clarke
 */

import SCEditor from './lib/SCEditor.js';
import PluginManager from './lib/PluginManager.js';
import * as escape from './lib/escape.js';
import * as browser from './lib/browser.js';
import * as dom from './lib/dom.js';
import * as utils from './lib/utils.js';
import defaultCommands from './lib/defaultCommands.js';
import defaultOptions from './lib/defaultOptions.js';
import type { SCEditorInstance, SCEditorOptions, SCEditorGlobal } from './lib/types.js';

// Built-in formats, icon packs and plugins. Importing them here (for their
// registration side effects on SCEditor.formats/icons and
// PluginManager.plugins) is what pulls them into the sceditor.min.js bundle
// - see scripts/build.mjs. Order matches the old build.mjs legacyFiles list.
import './formats/bbcode.js';
import './icons/fontawesome.js';
import './plugins/alternative-lists.js';
import './plugins/dragdrop.js';
import './plugins/undo.js';
import './plugins/plaintext.js';
import './plugins/mentions.js';

// SCEditor is a constructor function using a `this: SCEditorInstance`
// parameter (not a real TS class), so `new SCEditor(...)` has no construct
// signature to infer from - this typed wrapper provides one.
const SCEditorCtor = SCEditor as unknown as new (
	original: HTMLTextAreaElement,
	userOptions: Partial<SCEditorOptions>
) => SCEditorInstance;

// Assigned to `window.sceditor` below for drop-in `<script>` usage (the
// iife/umd dist builds - see scripts/build.mjs) and also exported as the
// default export for ESM/bundler consumers of the es build.
const sceditorApi: SCEditorGlobal = {
	command: SCEditor.command,
	commands: defaultCommands,
	defaultOptions: defaultOptions,

	ios: browser.ios,
	isWysiwygSupported: browser.isWysiwygSupported,

	regexEscape: escape.regex,
	escapeEntities: escape.entities,
	escapeUriScheme: escape.uriScheme,

	dom: {
		css: dom.css,
		attr: dom.attr,
		removeAttr: dom.removeAttr,
		is: dom.is,
		closest: dom.closest,
		width: dom.width,
		height: dom.height,
		traverse: dom.traverse,
		rTraverse: dom.rTraverse,
		parseHTML: dom.parseHTML,
		hasStyling: dom.hasStyling,
		convertElement: dom.convertElement,
		blockLevelList: dom.blockLevelList,
		canHaveChildren: dom.canHaveChildren,
		isInline: dom.isInline,
		copyCSS: dom.copyCSS,
		fixNesting: dom.fixNesting,
		findCommonAncestor: dom.findCommonAncestor,
		getSibling: dom.getSibling,
		removeWhiteSpace: dom.removeWhiteSpace,
		extractContents: dom.extractContents,
		getOffset: dom.getOffset,
		getStyle: dom.getStyle,
		hasStyle: dom.hasStyle
	},
	locale: SCEditor.locale,
	icons: SCEditor.icons,
	// Registered by src/formats/bbcode.js as a static helper, not part of
	// the generic Format contract - see SCEditorGlobal in lib/types.js.
	BBCodeParser: (SCEditor as unknown as { BBCodeParser: unknown }).BBCodeParser,
	utils: {
		each: utils.each,
		isEmptyObject: utils.isEmptyObject,
		extend: utils.extend
	},
	plugins: PluginManager.plugins,
	formats: SCEditor.formats,
	create: function (textarea: HTMLTextAreaElement, options?: Partial<SCEditorOptions>) {
		options = options || {};

		// Don't allow the editor to be initialised
		// on it's own source editor
		if (dom.parent(textarea, '.sceditor-container')) {
			return;
		}

		if (options.runWithoutWysiwygSupport || browser.isWysiwygSupported) {
			/*eslint no-new: off*/
			(new SCEditorCtor(textarea, options));
		}
	},
	instance: function (textarea: HTMLTextAreaElement) {
		return textarea._sceditor;
	}
};

window.sceditor = sceditorApi;

export default sceditorApi;
