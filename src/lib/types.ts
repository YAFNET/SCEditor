import type { RangeHelperInstance } from './RangeHelper.js';
import type * as dom from './dom.js';

/**
 * Shared type declarations used across the SCEditor library.
 *
 * Plugins, formats and icon sets are dynamically registered onto a global
 * `sceditor` object at runtime (see src/types/global.d.ts) rather than
 * imported, so the interfaces below describe duck-typed contracts enforced
 * by the runtime (`'x' in obj` checks), not real inheritance.
 */

export interface CodeLanguageOption {
	Value: string;
	Text: string;
}

/**
 * Shape of a `languages/*.js` locale pack, registered onto `SCEditor.locale`.
 * Locale files don't all share identical key coverage today (a pre-existing
 * inconsistency - see the languages/ conversion phase), so individual packs
 * are typed as `Partial<LocaleStrings>` rather than requiring every key.
 */
export type LocaleStrings = Record<string, string> & { dateFormat: string };

/**
 * Duck-typed contract for plugins (src/plugins/**): a constructor function
 * whose instances may implement `init`/`destroy` lifecycle hooks plus any
 * number of `signal<Name>` handlers, invoked dynamically by PluginManager
 * based on the signal name passed to `call()`/`callOnlyFirst()`.
 */
export interface Plugin {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: ((...args: any[]) => any) | undefined;
}

/**
 * Duck-typed contract for formats (src/formats/**): a constructor function
 * whose instances may implement any of the hooks below, probed at runtime
 * with `in`/`hasOwnProperty` checks by SCEditor.js.
 */
export interface Format {
	init?(this: SCEditorInstance): void;
	onReady?(this: SCEditorInstance): void;
	toHtml?(source: string): string;
	fragmentToHtml?(html: string, currentNode?: Node | null): string;
	toSource?(html: string, context?: Document): string;
	fragmentToSource?(html: string, context?: Document, currentNode?: Node | null): string;
	[key: string]: unknown;
}

/**
 * Duck-typed contract for icon packs (src/icons/**), returned by a factory
 * function registered on `SCEditor.icons`.
 */
export interface IconPack {
	create?(command: string): Node | null | undefined;
	update?(isSourceMode: boolean, currentNode?: Node, firstBlock?: Node): void;
	rtl?(isRtl: boolean): void;
	[key: string]: unknown;
}

/**
 * The SCEditor instance API (src/lib/SCEditor.js). SCEditor is a constructor
 * function using the `var base = this;` closure pattern (no ES6 class, no
 * `.prototype`), so this interface - not a class - is what's referenced by
 * consumers (defaultCommands.js, plugins/formats) as the `this` context.
 */
export interface SCEditorInstance {
	commands: Record<string, Command>;
	opts: SCEditorOptions;

	readOnly(): boolean;
	readOnly(readOnly: boolean): SCEditorInstance;

	rtl(): boolean;
	rtl(rtl: boolean): SCEditorInstance;

	width(): number;
	width(width: number | string, saveWidth?: boolean): SCEditorInstance;

	height(): number;
	height(height: number | string, saveHeight?: boolean): SCEditorInstance;

	dimensions(): { width: number; height: number };
	dimensions(
		width: number | string | false | null,
		height: number | string | false | null,
		save?: boolean
	): SCEditorInstance;

	maximize(): boolean;
	maximize(maximize: boolean): SCEditorInstance;

	expandToContent(ignoreMaxHeight?: boolean): void;
	destroy(): void;

	createDropDown(menuItem: HTMLElement, name: string, content: HTMLElement): void;
	closeDropDown(focus?: boolean): void;

	wysiwygEditorInsertHtml(html: string, endHtml?: string | null, overrideCodeBlocking?: boolean): void;
	wysiwygEditorInsertText(text: string, endText?: string): void;
	insertText(text: string, endText?: string): SCEditorInstance;
	sourceEditorInsertText(text: string, endText?: string): void;

	getRangeHelper(): RangeHelperInstance;

	sourceEditorCaret(): { start: number; end: number };
	sourceEditorCaret(position: { start: number; end: number }): SCEditorInstance;

	val(): string;
	val(val: string, filter?: boolean): SCEditorInstance;

	insert(
		start: string,
		end?: string,
		filter?: boolean,
		convertEmoticons?: boolean,
		allowMixed?: boolean
	): SCEditorInstance;

	getWysiwygEditorValue(filter?: boolean): string;
	getBody(): HTMLElement;
	getContentAreaContainer(): HTMLIFrameElement;
	getSourceEditorValue(filter?: boolean): string;
	getSourceEditor(): HTMLTextAreaElement;
	setWysiwygEditorValue(value: string): void;
	setSourceEditorValue(value: string): void;
	updateOriginal(): void;

	inSourceMode(): boolean;
	sourceMode(): boolean;
	sourceMode(enable: boolean): SCEditorInstance;
	toggleSourceMode(): void;

	execCommand(command: string, param?: string | boolean | null): void;

	currentNode(): Node | null;
	currentBlockNode(): Node | null;

	_(...args: unknown[]): string;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	bind(events: string, handler: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean): SCEditorInstance;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	unbind(events: string, handler: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean): SCEditorInstance;

	blur(): SCEditorInstance;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	blur(handler: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean): SCEditorInstance;

	focus(): SCEditorInstance | undefined;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	focus(handler: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean): SCEditorInstance;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	keyDown(handler?: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean): SCEditorInstance;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	keyPress(handler?: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean): SCEditorInstance;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	keyUp(handler?: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean): SCEditorInstance;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	nodeChanged(handler: (this: SCEditorInstance, ...args: any[]) => void): SCEditorInstance;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	selectionChanged(handler: (this: SCEditorInstance, ...args: any[]) => void): SCEditorInstance;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	valueChanged(handler: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean): SCEditorInstance;

	css(): string;
	css(css: string): SCEditorInstance;

	addShortcut(shortcut: string, cmd: string | ((this: SCEditorInstance) => boolean | void)): SCEditorInstance;
	removeShortcut(shortcut: string): SCEditorInstance;

	clearBlockFormatting(block?: HTMLElement | false): SCEditorInstance;

	[key: string]: unknown;
}

/**
 * @deprecated use {@link SCEditorInstance} - kept as an alias since it was
 * the name used while converting files (defaultCommands.js) ahead of
 * SCEditor.js itself.
 */
export type SCEditorLike = SCEditorInstance;

/**
 * Duck-typed contract for toolbar/keyboard commands
 * (src/lib/defaultCommands.js). Enforced at runtime by SCEditor.js, not by
 * a formal interface - `_dropDown`/`_date`/`_time`/`_htmlCache` etc. are
 * ad-hoc per-command helper properties, covered by the index signature.
 */
export interface Command {
	exec?: string | ((this: SCEditorInstance, caller?: HTMLElement, html?: string, author?: string) => void);
	txtExec?: ((this: SCEditorInstance, caller?: HTMLElement, selectedText?: string) => void) | unknown[];
	state?: string | ((this: SCEditorInstance, node?: Node | null, firstBlock?: Node) => boolean | number | void);
	tooltip?: string;
	shortcut?: string;
	errorMessage?: string;
	execParam?: string | boolean;
	[key: string]: unknown;
}

/**
 * Options accepted by the SCEditor constructor.
 *
 * Formats and plugins (src/formats/**, src/plugins/**) contribute their own
 * ad-hoc option keys onto this same flat object at runtime (e.g. dragdrop's
 * `handleFile`, mentions' `item_template`), so this is intentionally left
 * open with an index signature rather than an exhaustive closed interface.
 */
export interface SCEditorOptions {
	toolbar: string;
	toolbarExclude: string | null;
	maxLength: number | null;
	styles: string[];
	themeMode: string;
	fonts: string;
	format: string;
	icons: string;
	codeLanguages: CodeLanguageOption[];
	noteTypes: string;
	colors: string;
	locale: string;
	charset: string;
	width: number | string | null;
	height: number | string | null;
	resizeEnabled: boolean;
	resizeMinWidth: number | null;
	resizeMinHeight: number | null;
	resizeMaxHeight: number | null;
	resizeMaxWidth: number | null;
	resizeHeight: boolean;
	resizeWidth: boolean;
	dateFormat: string;
	toolbarContainer: HTMLElement | null;
	enablePasteFiltering: boolean;
	disablePasting: boolean;
	readOnly: boolean;
	rtl: boolean | null;
	autofocus: boolean;
	autofocusEnd: boolean;
	autoExpand: boolean;
	autoUpdate: boolean;
	spellcheck: boolean;
	runWithoutWysiwygSupport: boolean;
	startInSourceMode: boolean;
	id: string | null;
	plugins: string;
	zIndex: number | null;
	bbcodeTrim: boolean;
	disableBlockRemove: boolean;
	allowedIframeUrls: Array<string | RegExp>;
	parserOptions: Record<string, unknown>;
	dropDownCss: Record<string, string | number>;
	allowedTags: string[];
	allowedAttributes: string[];
	extensionsUrl: string;
	root: string;
	attachmentsPreviewUrl: string;
	albumsPreviewUrl: string;
	mentionsUrl: string;
	onToggleMode: ((editor: SCEditorInstance) => void) | undefined;
	basePath: string;

	// Additional ad-hoc options contributed by formats/plugins at runtime,
	// see the class doc comment above.
	[key: string]: unknown;
}

export interface SCEditorCommandStatic {
	get(name: string): Command | null;
	set(name: string, cmd: Command): SCEditorCommandStatic | false;
	remove(name: string): SCEditorCommandStatic;
}

/**
 * Shape of the `window.sceditor`/global `sceditor` object created by
 * src/sceditor.js. Referenced by the legacy global-style scripts
 * (src/formats/**, src/icons/**, src/plugins/**, languages/**) via the
 * ambient `sceditor` declared in src/types/global.d.ts, since those files
 * are plain ES scripts (no imports) that mutate this object at load time.
 */
export interface SCEditorGlobal {
	command: SCEditorCommandStatic;
	commands: Record<string, Command>;
	defaultOptions: SCEditorOptions;

	ios: boolean;
	isWysiwygSupported: boolean;

	regexEscape: (str: string) => string;
	escapeEntities: (str: string | null, noQuotes?: boolean) => string | null;
	escapeUriScheme: (url: string) => string;

	dom: {
		css: typeof dom.css;
		attr: typeof dom.attr;
		removeAttr: typeof dom.removeAttr;
		is: typeof dom.is;
		closest: typeof dom.closest;
		width: typeof dom.width;
		height: typeof dom.height;
		traverse: typeof dom.traverse;
		rTraverse: typeof dom.rTraverse;
		parseHTML: typeof dom.parseHTML;
		hasStyling: typeof dom.hasStyling;
		convertElement: typeof dom.convertElement;
		blockLevelList: string;
		canHaveChildren: typeof dom.canHaveChildren;
		isInline: typeof dom.isInline;
		copyCSS: typeof dom.copyCSS;
		fixNesting: typeof dom.fixNesting;
		findCommonAncestor: typeof dom.findCommonAncestor;
		getSibling: typeof dom.getSibling;
		removeWhiteSpace: typeof dom.removeWhiteSpace;
		extractContents: typeof dom.extractContents;
		getOffset: typeof dom.getOffset;
		getStyle: typeof dom.getStyle;
		hasStyle: typeof dom.hasStyle;
	};

	locale: Record<string, Partial<LocaleStrings>>;
	icons: Record<string, new () => IconPack>;

	utils: {
		each: typeof import('./utils.js').each;
		isEmptyObject: typeof import('./utils.js').isEmptyObject;
		extend: typeof import('./utils.js').extend;
	};

	plugins: Record<string, new () => Plugin>;
	formats: Record<string, new () => Format>;

	create(textarea: HTMLTextAreaElement, options?: Partial<SCEditorOptions>): void;
	instance(textarea: HTMLTextAreaElement): SCEditorInstance | undefined;

	// BBCode format also hangs static registration helpers directly onto
	// `sceditor.formats.bbcode` (get/set/rename/remove) once src/formats/
	// is converted - not part of the generic Format contract.
	[key: string]: unknown;
}
