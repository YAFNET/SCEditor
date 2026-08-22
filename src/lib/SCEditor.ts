import * as dom from './dom.js';
import * as utils from './utils.js';
import defaultOptions from './defaultOptions.js';
import defaultCommands from './defaultCommands.js';
import PluginManager from './PluginManager.js';
import type { PluginManagerInstance } from './PluginManager.js';
import RangeHelper from './RangeHelper.js';
import type { RangeHelperInstance } from './RangeHelper.js';
import _tmpl from './templates.js';
import * as escape from './escape.js';
import * as browser from './browser.js';
import DOMPurify from 'dompurify';
import type {
	SCEditorInstance,
	SCEditorOptions,
	Command,
	Format,
	IconPack,
	LocaleStrings
} from './types.js';

const globalWin: Window & typeof globalThis = window;
const globalDoc: Document = document;

// RangeHelper/PluginManager are constructor functions using a `this: X`
// parameter (not a real TS class), so `new RangeHelper(...)` has no
// construct signature to infer from - these typed wrappers provide one.
const RangeHelperCtor = RangeHelper as unknown as new (
	win: Window,
	d: Document | null | undefined,
	sanitize: (html: string) => string
) => RangeHelperInstance;

const PluginManagerCtor = PluginManager as unknown as new (thisObj: unknown) => PluginManagerInstance;

const IMAGE_MIME_REGEX = /^image\/(p?jpe?g|gif|png|bmp)$/i;

interface PasteData {
	html?: string;
	text?: string;
	val?: string;
	[key: string]: unknown;
}

interface BtnStateHandler {
	name: string;
	state: Command['state'];
}

interface TriggerValueChangedFn {
	(saveRange?: boolean): void;
	hasHandler?: boolean;
	lastVal?: string;
}

interface ValueChangedKeyUpFn {
	(e: KeyboardEvent): void;
	lastChar?: number;
	triggerNext?: boolean;
}

/**
 * Wrap inlines that are in the root in paragraphs.
 *
 * @private
 */
function wrapInlines(body: HTMLElement, doc: Document): void {
	let wrapper: HTMLElement | null = null;

	dom.traverse(body, function (node) {
		if (dom.isInline(node, true)) {
			// Ignore text nodes unless they contain non-whitespace chars as
			// whitespace will be collapsed.
			// Ignore sceditor-ignore elements unless wrapping siblings
			// Should still wrap both if wrapping siblings.
			if (wrapper || node.nodeType === dom.TEXT_NODE ?
				/\S/.test(node.nodeValue as string) : !dom.is(node, '.sceditor-ignore')) {
				if (!wrapper) {
					wrapper = dom.createElement('p', {}, doc);
					dom.insertBefore(wrapper, node);
				}

				dom.appendChild(wrapper, node);
			}
		} else {
			wrapper = null;
		}
	}, false, true);
}

/**
 * SCEditor - A lightweight WYSIWYG editor
 *
 * @param original The textarea to be converted
 * @class SCEditor
 * @name SCEditor
 */
export default function SCEditor(
	this: SCEditorInstance,
	original: HTMLTextAreaElement,
	userOptions: Partial<SCEditorOptions>
) {
	/**
	 * Alias of this
	 *
	 * @private
	 */
	const base = this;

	/**
	 * Editor format like BBCode or HTML
	 */
	let format: Format = {};

	/**
	 * The div which contains the editor and toolbar
	 *
	 * @private
	 */
	let editorContainer: HTMLDivElement;

	/**
	 * Map of events handlers bound to this instance.
	 *
	 * @private
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const eventHandlers: Record<string, Array<(this: SCEditorInstance, ...args: any[]) => void>> = {};

	/**
	 * The editors toolbar
	 *
	 * @private
	 */
	let toolbar: HTMLDivElement;

	/**
	 * The editors iframe which should be in design mode
	 *
	 * @private
	 */
	let wysiwygEditor: HTMLIFrameElement;

	/**
	 * The editors window
	 *
	 * @private
	 */
	let wysiwygWindow: Window;

	/**
	 * The WYSIWYG editors body element
	 *
	 * @private
	 */
	let wysiwygBody: HTMLElement;

	/**
	 * The WYSIWYG editors document
	 *
	 * @private
	 */
	let wysiwygDocument: Document;

	/**
	 * The editors textarea for viewing source
	 *
	 * @private
	 */
	let sourceEditor: HTMLTextAreaElement;

	let footer: HTMLDivElement;

	/**
	 * The current dropdown
	 *
	 * @private
	 */
	let dropdown: HTMLDivElement | null;

	/**
	 * If the user is currently composing text via IME
	 */
	let isComposing: boolean;

	/**
	 * Timer for valueChanged key handler
	 */
	let valueChangedKeyUpTimer: ReturnType<typeof setTimeout> | false;

	/**
	 * The editors locale
	 *
	 * @private
	 */
	let locale: Partial<LocaleStrings> | undefined;

	/**
	 * The editors rangeHelper instance
	 *
	 * @private
	 */
	let rangeHelper: RangeHelperInstance | null;

	/**
	 * An array of button state handlers
	 *
	 * @private
	 */
	const btnStateHandlers: BtnStateHandler[] = [];

	/**
	 * Plugin manager instance
	 *
	 * @private
	 */
	let pluginManager: PluginManagerInstance | null;

	/**
	 * The current node containing the selection/caret
	 *
	 * @private
	 */
	let currentNode: Node | null = null;

	/**
	 * The first block level parent of the current node
	 *
	 * @private
	 */
	let currentBlockNode: HTMLElement | null = null;

	let backSpaceHandled: boolean;

	/**
	 * The current node selection/caret
	 *
	 * @private
	 */
	let currentSelection: Range | null;

	/**
	 * Used to make sure only 1 selection changed
	 * check is called every 100ms.
	 *
	 * Helps improve performance as it is checked a lot.
	 *
	 * @private
	 */
	let isSelectionCheckPending: boolean;

	/**
	 * If content is required (equivalent to the HTML5 required attribute)
	 *
	 * @private
	 */
	let isRequired: boolean;

	/**
	 * The inline CSS style element. Will be undefined
	 * until css() is called for the first time.
	 *
	 * @private
	 */
	let inlineCss: HTMLStyleElement;

	/**
	 * Object containing a list of shortcut handlers
	 *
	 * @private
	 */
	const shortcutHandlers: Record<string, (this: SCEditorInstance) => boolean | void> = {};

	/**
	 * The min and max heights that autoExpand should stay within
	 *
	 * @private
	 */
	let autoExpandBounds: { min: number; max: number } | undefined;

	/**
	 * Timeout for the autoExpand function to throttle calls
	 *
	 * @private
	 */
	let autoExpandThrottle: ReturnType<typeof setTimeout> | false;

	/**
	 * Cache of the current toolbar buttons
	 *
	 * @private
	 */
	const toolbarButtons: Record<string, HTMLElement> = {};

	/**
	 * Last scroll position before maximizing so
	 * it can be restored when finished.
	 *
	 * @private
	 */
	let maximizeScrollPosition: number;

	/**
	 * Stores the contents while a paste is taking place.
	 *
	 * Needed to support browsers that lack clipboard API support.
	 *
	 * @private
	 */
	let pasteContentFragment: DocumentFragment | false | undefined;

	/**
	 * Current icon set if any
	 *
	 * @private
	 */
	let icons: IconPack | undefined;

	/**
	 * Private functions
	 * @private
	 */
	let init: () => void;
	let handleCommand: (caller: HTMLElement | undefined, cmd: Command) => void;
	let initEditor: () => void;
	let initLocale: () => void;
	let initToolBar: () => void;
	let initOptions: () => void;
	let initEvents: () => void;
	let initResize: () => void;
	let handlePasteEvt: (e: ClipboardEvent) => void;
	let handleCutCopyEvt: (e: ClipboardEvent) => void;
	let handlePasteData: (data: PasteData) => void;
	let handleKeyDown: (e: KeyboardEvent) => void;
	let handleBackSpace: (e: KeyboardEvent) => void;
	let handleKeyPress: (e: KeyboardEvent) => void;
	let handleFormReset: () => void;
	let handleMouseDown: () => void;
	let handleComposition: (e: Event) => void;
	let handleEvent: (e: Event) => void;
	let handleDocumentClick: (e: MouseEvent) => void;
	let loadScripts: () => void;
	let updateToolBar: (disable?: boolean) => void;
	let updateActiveButtons: () => void;
	let sourceEditorSelectedText: () => string;
	let appendNewLine: () => void;
	let checkSelectionChanged: () => void;
	let checkNodeChanged: () => void;
	let autofocus: (focusEnd?: boolean) => void;
	let currentStyledBlockNode: () => HTMLElement | undefined;
	let triggerValueChanged: TriggerValueChangedFn;
	let valueChangedBlur: () => void;
	let valueChangedKeyUp: ValueChangedKeyUpFn;
	let autoUpdate: () => void;
	let autoExpand: () => void;

	/**
	 * All the commands supported by the editor
	 * @name commands
	 * @memberOf SCEditor.prototype
	 */
	base.commands = utils.extend(
		true, {}, (userOptions.commands || defaultCommands)
	) as Record<string, Command>;

	/**
	 * Options for this editor instance
	 * @name opts
	 * @memberOf SCEditor.prototype
	 */
	const options = base.opts = utils.extend(
		true, {}, defaultOptions, userOptions
	) as SCEditorOptions;

	if (!Array.isArray(options.allowedIframeUrls)) {
		options.allowedIframeUrls = [];
	}

	options.allowedIframeUrls.push('https://youtube.com/embed/');
	options.allowedIframeUrls.push('https://player.vimeo.com/video/');
	options.allowedIframeUrls.push('https://www.instagram.com/p/');
	options.allowedIframeUrls.push('https://www.facebook.com/plugins/');

	// Create new instance of DOMPurify for each editor instance so can
	// have different allowed iframe URLs
	// eslint-disable-next-line new-cap
	const domPurify = DOMPurify();

	// Allow iframes for things like YouTube, see:
	// https://github.com/cure53/DOMPurify/issues/340#issuecomment-670758980
	domPurify.addHook('uponSanitizeElement', function (node, data) {
		const allowedUrls = options.allowedIframeUrls;

		if (data.tagName === 'iframe') {
			const src = dom.attr(node as Element, 'src') || '';

			for (let i = 0; i < allowedUrls.length; i++) {
				const url = allowedUrls[i];

				if (utils.isString(url) && src.substr(0, url.length) === url) {
					return;
				}

				// Handle regex
				if (url instanceof RegExp && url.test(src)) {
					return;
				}
			}

			// No match so remove
			dom.remove(node);
		}
	});

	// Convert target attribute into data-sce-target attributes so XHTML format
	// can allow them
	domPurify.addHook('afterSanitizeAttributes', function (node) {
		if ('target' in node) {
			dom.attr(node as Element, 'data-sce-target', dom.attr(node as Element, 'target'));
		}

		dom.removeAttr(node as Element, 'target');
	});

	/**
	 * Sanitize HTML to avoid XSS
	 *
	 * @private
	 */
	function sanitize(html: string): string {
		const allowedTags = ['iframe'].concat(options.allowedTags);
		const allowedAttrs = ['allowfullscreen', 'frameborder', 'target']
			.concat(options.allowedAttributes);

		return domPurify.sanitize(html, {
			ADD_TAGS: allowedTags,
			ADD_ATTR: allowedAttrs
		});
	}

	/**
	* Loads a JavaScript file and returns a Promise for when it is loaded
	*/
	const loadScript = (src: string): Promise<void> => {
		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.type = 'text/javascript';
			script.onload = () => resolve();
			script.onerror = reject;
			script.src = src;
			document.head.append(script);
		});
	};

	/**
	 * Loads all scripts
	 * @private
	 */
	loadScripts = function () {
		if (options.locale && options.locale !== 'en') {
			const promises = [];
			promises.push(
				loadScript(`../${options.basePath}languages/${options.locale}.js`));

			Promise.all(promises).then(() => {
				init();
			}).catch(() => console.error('Something went wrong.'));
		} else {
			init();
		}
	};

	/**
	 * Creates the editor iframe and textarea
	 * @private
	 */
	init = function () {
		original._sceditor = base;

		// Load locale
		if (options.locale && options.locale !== 'en') {
			initLocale();
		}

		editorContainer = dom.createElement('div', {
			className: 'sceditor-container card'
		}) as HTMLDivElement;

		dom.insertBefore(editorContainer, original);
		dom.css(editorContainer, 'z-index', options.zIndex as number);

		isRequired = original.required;
		original.required = false;

		const FormatCtor = SCEditor.formats[options.format];
		format = FormatCtor ? new FormatCtor() : {};
		/*
		 * Plugins should be initialized before the formatters since
		 * they may wish to add or change formatting handlers and
		 * since the bbcode format caches its handlers,
		 * such changes must be done first.
		 */
		pluginManager = new PluginManagerCtor(base);
		(options.plugins || '').split(',').forEach(function (plugin) {
			(pluginManager as PluginManagerInstance).register(plugin.trim());
		});
		if ('init' in format && format.init) {
			format.init.call(base);
		}

		// create the editor
		initToolBar();
		initEditor();
		initOptions();
		initEvents();

		// force into source mode if is a browser that can't handle
		// full editing
		if (!browser.isWysiwygSupported) {
			base.toggleSourceMode();
		}

		updateActiveButtons();

		const loaded = function () {
			dom.off(globalWin, 'load', loaded);

			if (options.autofocus) {
				autofocus(!!options.autofocusEnd);
			}

			autoExpand();
			appendNewLine();
			// TODO: use editor doc and window?
			(pluginManager as PluginManagerInstance).call('ready');
			if ('onReady' in format && format.onReady) {
				format.onReady.call(base);
			}
		};
		dom.on(globalWin, 'load', loaded);
		if (globalDoc.readyState === 'complete') {
			loaded();
		}
	};

	/**
	 * Init the locale variable with the specified locale if possible
	 * @private
	 * @return void
	 */
	initLocale = function () {
		locale = SCEditor.locale[options.locale];

		if (!locale) {
			const lang = options.locale.split('-');
			locale = SCEditor.locale[lang[0]];
		}

		// Locale DateTime format overrides any specified in the options
		if (locale && locale.dateFormat) {
			options.dateFormat = locale.dateFormat;
		}
	};

	/**
	 * Creates the editor iframe and textarea
	 * @private
	 */
	initEditor = function () {
		sourceEditor = dom.createElement('textarea') as HTMLTextAreaElement;
		wysiwygEditor = dom.createElement('iframe', {
			frameborder: 0,
			allowfullscreen: true
		}) as HTMLIFrameElement;

		dom.attr(wysiwygEditor, 'role', 'none');

		footer = dom.createElement('div') as HTMLDivElement;
		dom.addClass(footer, 'card-footer');
		dom.addClass(footer, 'text-body-secondary');
		dom.addClass(footer, 'text-end');
		dom.addClass(footer, 'small');
		dom.addClass(footer, 'p-2');

		footer.appendChild(dom.parseHTML(base._('Characters remaining:') + '<span id="editor-Counter" class="badge bg-secondary ms-1">' + '</span>'));

		/*
		 * This needs to be done right after they are created because,
		 * for any reason, the user may not want the value to be tinkered
		 * by any filters.
		 */
		if (options.startInSourceMode) {
			dom.addClass(editorContainer, 'sourceMode');
			dom.hide(wysiwygEditor);
		} else {
			dom.addClass(editorContainer, 'wysiwygMode');
			dom.hide(sourceEditor);
		}

		if (!options.spellcheck) {
			dom.attr(editorContainer, 'spellcheck', 'false');
		}

		if (globalWin.location.protocol === 'https:') {
			dom.attr(wysiwygEditor, 'src', 'about:blank');
		}

		dom.attr(sourceEditor, 'title', 'source');
		dom.attr(sourceEditor, 'name', 'source');
		dom.addClass(sourceEditor, 'font-monospace');

		// Add the editor to the container
		dom.appendChild(editorContainer, wysiwygEditor);
		dom.appendChild(editorContainer, sourceEditor);
		dom.appendChild(editorContainer, footer);

		// TODO: make this optional somehow
		base.dimensions(
			options.width || dom.width(original),
			options.height || dom.height(original)
		);

		wysiwygDocument = wysiwygEditor.contentDocument as Document;
		wysiwygDocument.open();

		let styles = '';

		(options.styles as string[]).forEach((style) => {
			styles += _tmpl('style', { style: style });
		});

		wysiwygDocument.write(_tmpl('html', {
			spellcheck: options.spellcheck ? '' : 'spellcheck="false"',
			charset: options.charset,
			themeMode: options.themeMode,
			styles: styles
		}, false, false));

		wysiwygDocument.close();

		wysiwygBody = wysiwygDocument.body;
		wysiwygWindow = wysiwygEditor.contentWindow as Window;

		base.readOnly(!!options.readOnly);

		// iframe overflow fix for iOS
		if (browser.ios) {
			dom.height(wysiwygBody, '100%');
			dom.on(wysiwygBody, 'touchend', base.focus as unknown as EventListener);
		}

		const tabIndex = dom.attr(original, 'tabindex');
		dom.attr(sourceEditor, 'tabindex', tabIndex);
		dom.attr(wysiwygEditor, 'tabindex', tabIndex);

		rangeHelper = new RangeHelperCtor(wysiwygWindow, null, sanitize);

		// load any textarea value into the editor
		dom.hide(original);
		base.val(original.value);

		const placeholder = (options.placeholder as string) ||
			dom.attr(original, 'placeholder');

		if (placeholder) {
			sourceEditor.placeholder = placeholder;
			dom.attr(wysiwygBody, 'placeholder', placeholder);
		}
	};

	/**
	 * Initialises options
	 * @private
	 */
	initOptions = function () {
		// auto-update original textbox on blur if option set to true
		if (options.autoUpdate) {
			dom.on(wysiwygBody, 'blur', autoUpdate);
			dom.on(sourceEditor, 'blur', autoUpdate);
		}

		if (options.rtl === null) {
			options.rtl = dom.css(sourceEditor, 'direction') === 'rtl';
		}

		base.rtl(!!options.rtl);

		if (options.autoExpand) {
			// Need to update when images (or anything else) loads
			dom.on(wysiwygBody, 'load', autoExpand, dom.EVENT_CAPTURE);
			dom.on(wysiwygBody, 'input keyup', autoExpand);
		}

		if (options.resizeEnabled) {
			initResize();
		}

		dom.attr(editorContainer, 'id', options.id as string);
	};

	/**
	 * Initialises events
	 * @private
	 */
	initEvents = function () {
		const form = original.form;
		const compositionEvents = 'compositionstart compositionend';
		const eventsToForward = 'keydown keyup keypress focus blur contextmenu input';
		const checkSelectionEvents = 'onselectionchange' in wysiwygDocument ?
			'selectionchange' :
			'keyup focus blur contextmenu mouseup touchend click';

		dom.on(globalDoc, 'click', handleDocumentClick as EventListener);

		if (form) {
			dom.on(form, 'reset', handleFormReset);
			dom.on(form, 'submit', base.updateOriginal, dom.EVENT_CAPTURE);
		}

		dom.on(window, 'pagehide', base.updateOriginal);
		dom.on(window, 'pageshow', handleFormReset);
		dom.on(wysiwygBody, 'keypress', handleKeyPress as EventListener);
		dom.on(wysiwygBody, 'keydown', handleKeyDown as EventListener);
		dom.on(wysiwygBody, 'keydown', handleBackSpace as EventListener);
		dom.on(wysiwygBody, 'keyup', appendNewLine);
		dom.on(wysiwygBody, 'blur', valueChangedBlur);
		dom.on(wysiwygBody, 'keyup', valueChangedKeyUp as EventListener);
		dom.on(wysiwygBody, 'paste', handlePasteEvt as EventListener);
		dom.on(wysiwygBody, 'cut copy', handleCutCopyEvt as EventListener);
		dom.on(wysiwygBody, compositionEvents, handleComposition);
		dom.on(wysiwygBody, checkSelectionEvents, checkSelectionChanged);
		dom.on(wysiwygBody, eventsToForward, handleEvent);

		dom.on(wysiwygBody, 'blur', function () {
			if (!base.val()) {
				dom.addClass(wysiwygBody, 'sceditor-placeholder');
			}
		});

		dom.on(wysiwygBody, 'focus', function () {
			dom.removeClass(wysiwygBody, 'sceditor-placeholder');
		});

		dom.on(sourceEditor, 'blur', valueChangedBlur);
		dom.on(sourceEditor, 'keyup', valueChangedKeyUp as EventListener);
		dom.on(sourceEditor, 'keydown', handleKeyDown as EventListener);
		dom.on(sourceEditor, compositionEvents, handleComposition);
		dom.on(sourceEditor, eventsToForward, handleEvent);

		dom.on(wysiwygDocument, 'mousedown', handleMouseDown);
		dom.on(wysiwygDocument, checkSelectionEvents, checkSelectionChanged);
		dom.on(wysiwygDocument, 'keyup', appendNewLine);

		dom.on(editorContainer, 'selectionchanged', checkNodeChanged);
		dom.on(editorContainer, 'selectionchanged', updateActiveButtons);
		// Custom events to forward
		dom.on(
			editorContainer,
			'selectionchanged valuechanged nodechanged pasteraw paste',
			handleEvent
		);
	};

	/**
	 * Creates the toolbar and appends it to the container
	 * @private
	 */
	initToolBar = function () {
		let group: HTMLDivElement;
		const commands = base.commands;
		const exclude = (options.toolbarExclude || '').split(',');
		const groups = options.toolbar.split('|');

		toolbar = dom.createElement('div', {
			className: 'card-header btn-toolbar',
			unselectable: 'on'
		}) as HTMLDivElement;

		if (options.icons in SCEditor.icons) {
			icons = new SCEditor.icons[options.icons]();
		}

		utils.each(groups, function (_, menuItems: string) {
			group = dom.createElement('div', {
				className: 'btn-group btn-group-sm m-1'
			}) as HTMLDivElement;

			utils.each(menuItems.split(','), function (_, commandName: string) {
				const command = commands[commandName];

				// The commandName must be a valid command and not excluded
				if (!command || exclude.indexOf(commandName) > -1) {
					return;
				}

				const shortcut = command.shortcut;
				const button = _tmpl('toolbarButton', {
					name: commandName
				}, true).firstChild as HTMLElement;

				if (commandName === 'source') {
					button.classList.add('btn-secondary');
				} else {
					button.classList.add('btn-primary');
				}

				if (icons && icons.create) {
					const icon = icons.create(commandName);
					if (icon) {
						dom.insertBefore(icons.create(commandName) as Node,
							button.firstChild as Node);
					}
				}

				button._sceTxtMode = !!command.txtExec;
				button._sceWysiwygMode = !!command.exec;

				dom.toggleClass(button, 'disabled', !command.exec);
				dom.on(button, 'click', function (e) {
					if (!dom.hasClass(button, 'disabled')) {
						handleCommand(button, command);
					}

					updateActiveButtons();
					e.preventDefault();
				});
				// Prevent editor losing focus when button clicked
				dom.on(button, 'mousedown', function (e) {
					base.closeDropDown();
					e.preventDefault();
				});

				if (command.tooltip) {
					dom.attr(button, 'title',
						base._(command.tooltip) +
							(shortcut ? ' (' + shortcut + ')' : '')
					);
				}

				if (shortcut) {
					base.addShortcut(shortcut, commandName);
				}

				if (command.state) {
					btnStateHandlers.push({
						name: commandName,
						state: command.state
					});
				// exec string commands can be passed to queryCommandState
				} else if (utils.isString(command.exec)) {
					btnStateHandlers.push({
						name: commandName,
						state: command.exec
					});
				}

				dom.appendChild(group, button);
				toolbarButtons[commandName] = button;
			});

			// Exclude empty groups
			if (group.firstChild) {
				dom.appendChild(toolbar, group);
			}
		});

		// Append the toolbar to the toolbarContainer option if given
		dom.appendChild((options.toolbarContainer || editorContainer) as Node, toolbar);
	};

	/**
	 * Creates the resizer.
	 * @private
	 */
	initResize = function () {
		let minHeight: number;
		let maxHeight: number;
		let minWidth: number;
		let maxWidth: number;
		let mouseMoveFunc: (e: MouseEvent | TouchEvent) => void;
		let mouseUpFunc: (e: MouseEvent | TouchEvent) => void;
		const grip = dom.createElement('div', {
			className: 'sceditor-grip'
		});
		const moveEvents = 'touchmove mousemove';
		const endEvents = 'touchcancel touchend mouseup';
		let startX = 0;
		let startY = 0;
		let newX = 0;
		let newY = 0;
		let startWidth = 0;
		let startHeight = 0;
		const origWidth = dom.width(editorContainer);
		const origHeight = dom.height(editorContainer);
		let isDragging = false;
		const rtl = base.rtl();

		minHeight = (options.resizeMinHeight as number) || origHeight / 1.5;
		maxHeight = (options.resizeMaxHeight as number) || origHeight * 2.5;
		minWidth = (options.resizeMinWidth as number) || origWidth / 1.25;
		maxWidth = (options.resizeMaxWidth as number) || origWidth * 1.25;

		mouseMoveFunc = function (evt) {
			let e = evt;

			// iOS uses window.event
			if (e.type === 'touchmove') {
				e = (globalWin as unknown as { event: TouchEvent }).event;
				newX = (e as TouchEvent).changedTouches[0].pageX;
				newY = (e as TouchEvent).changedTouches[0].pageY;
			} else {
				newX = (e as MouseEvent).pageX;
				newY = (e as MouseEvent).pageY;
			}

			let newHeight: number | false = startHeight + (newY - startY);
			let newWidth: number | false = rtl ?
				startWidth - (newX - startX) :
				startWidth + (newX - startX);

			if (maxWidth > 0 && newWidth > maxWidth) {
				newWidth = maxWidth;
			}
			if (minWidth > 0 && newWidth < minWidth) {
				newWidth = minWidth;
			}
			if (!options.resizeWidth) {
				newWidth = false;
			}

			if (maxHeight > 0 && newHeight > maxHeight) {
				newHeight = maxHeight;
			}
			if (minHeight > 0 && newHeight < minHeight) {
				newHeight = minHeight;
			}
			if (!options.resizeHeight) {
				newHeight = false;
			}

			if (newWidth || newHeight) {
				base.dimensions(newWidth, newHeight);
			}

			e.preventDefault();
		};

		mouseUpFunc = function (e) {
			if (!isDragging) {
				return;
			}

			isDragging = false;

			dom.removeClass(editorContainer, 'resizing');
			dom.off(globalDoc, moveEvents, mouseMoveFunc as EventListener);
			dom.off(globalDoc, endEvents, mouseUpFunc as EventListener);

			e.preventDefault();
		};

		if (icons && icons.create) {
			const icon = icons.create('grip');
			if (icon) {
				dom.appendChild(grip, icon);
			}
		}

		dom.appendChild(editorContainer, footer);
		dom.appendChild(editorContainer, grip);

		dom.on(grip, 'touchstart mousedown', function (evt) {
			let e = evt;

			// iOS uses window.event
			if (e.type === 'touchstart') {
				e = (globalWin as unknown as { event: TouchEvent }).event;
				startX = (e as TouchEvent).touches[0].pageX;
				startY = (e as TouchEvent).touches[0].pageY;
			} else {
				startX = (e as MouseEvent).pageX;
				startY = (e as MouseEvent).pageY;
			}

			startWidth = dom.width(editorContainer);
			startHeight = dom.height(editorContainer);
			isDragging = true;

			dom.addClass(editorContainer, 'resizing');
			dom.on(globalDoc, moveEvents, mouseMoveFunc as EventListener);
			dom.on(globalDoc, endEvents, mouseUpFunc as EventListener);

			e.preventDefault();
		});
	};

	/**
	 * Autofocus the editor
	 * @private
	 */
	autofocus = function (focusEnd) {
		let range: Range;
		let txtPos: number;
		let node: Node | null = wysiwygBody.firstChild;

		// Can't focus invisible elements
		if (!dom.isVisible(editorContainer)) {
			return;
		}

		if (base.sourceMode()) {
			txtPos = focusEnd ? sourceEditor.value.length : 0;

			sourceEditor.setSelectionRange(txtPos, txtPos);

			return;
		}

		dom.removeWhiteSpace(wysiwygBody);

		if (focusEnd) {
			if (!(node = wysiwygBody.lastChild)) {
				node = dom.createElement('p', {}, wysiwygDocument);
				dom.appendChild(wysiwygBody, node);
			}

			while (node.lastChild) {
				node = node.lastChild;

				// Should place the cursor before the last <br>
				if (dom.is(node, 'br') && node.previousSibling) {
					node = node.previousSibling;
				}
			}
		} else if (!node) {
			// wysiwygBody has no children (e.g. initial content sanitized
			// to nothing) - create a node to focus instead of dereferencing null
			node = dom.createElement('p', {}, wysiwygDocument);
			dom.appendChild(wysiwygBody, node);
		}

		range = wysiwygDocument.createRange();

		if (!dom.canHaveChildren(node as Node)) {
			range.setStartBefore(node as Node);

			if (focusEnd) {
				range.setStartAfter(node as Node);
			}
		} else {
			range.selectNodeContents(node as Node);
		}

		range.collapse(!focusEnd);
		(rangeHelper as RangeHelperInstance).selectRange(range);
		currentSelection = range;

		if (focusEnd) {
			wysiwygBody.scrollTop = wysiwygBody.scrollHeight;
		}

		base.focus();
	};

	/**
	 * Gets if the editor is read only
	 *
	 * @since 1.3.5
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name readOnly
	 */
	/**
	 * Sets if the editor is read only
	 *
	 * @since 1.3.5
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name readOnly^2
	 */
	base.readOnly = function (readOnly?: boolean) {
		if (typeof readOnly !== 'boolean') {
			return !sourceEditor.readOnly;
		}

		wysiwygBody.contentEditable = String(!readOnly);
		sourceEditor.readOnly = readOnly;

		updateToolBar(readOnly);

		return base;
	} as SCEditorInstance['readOnly'];

	/**
	 * Gets if the editor is in RTL mode
	 *
	 * @since 1.4.1
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name rtl
	 */
	/**
	 * Sets if the editor is in RTL mode
	 *
	 * @since 1.4.1
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name rtl^2
	 */
	base.rtl = function (rtl?: boolean) {
		const dir = rtl ? 'rtl' : 'ltr';

		if (typeof rtl !== 'boolean') {
			return dom.attr(sourceEditor, 'dir') === 'rtl';
		}

		dom.attr(wysiwygBody, 'dir', dir);
		dom.attr(sourceEditor, 'dir', dir);

		dom.removeClass(editorContainer, 'rtl');
		dom.removeClass(editorContainer, 'ltr');
		dom.addClass(editorContainer, dir);

		if (icons && icons.rtl) {
			icons.rtl(rtl);
		}

		return base;
	} as SCEditorInstance['rtl'];

	/**
	 * Updates the toolbar to disable/enable the appropriate buttons
	 * @private
	 */
	updateToolBar = function (disable) {
		const mode = base.inSourceMode() ? '_sceTxtMode' : '_sceWysiwygMode';

		utils.each(toolbarButtons, function (_, button) {
			dom.toggleClass(button, 'disabled', !!disable || !button[mode]);
		});
	};

	/**
	 * Gets the width of the editor in pixels
	 *
	 * @since 1.3.5
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name width
	 */
	/**
	 * Sets the width of the editor
	 *
	 * @since 1.3.5
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name width^2
	 */
	/**
	 * Sets the width of the editor
	 *
	 * The saveWidth specifies if to save the width. The stored width can be
	 * used for things like restoring from maximized state.
	 *
	 * @since 1.4.1
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name width^3
	 */
	base.width = function (width?: number | string, saveWidth?: boolean) {
		if (!width && width !== 0) {
			return dom.width(editorContainer);
		}

		base.dimensions(width, null, saveWidth);

		return base;
	} as SCEditorInstance['width'];

	/**
	 * Returns an object with the properties width and height
	 * which are the width and height of the editor in px.
	 *
	 * @since 1.4.1
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name dimensions
	 */
	/**
	 * <p>Sets the width and/or height of the editor.</p>
	 *
	 * <p>If width or height is not numeric it is ignored.</p>
	 *
	 * @since 1.4.1
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name dimensions^2
	 */
	/**
	 * <p>Sets the width and/or height of the editor.</p>
	 *
	 * <p>If width or height is not numeric it is ignored.</p>
	 *
	 * <p>The save argument specifies if to save the new sizes.
	 * The saved sizes can be used for things like restoring from
	 * maximized state. This should normally be left as true.</p>
	 *
	 * @since 1.4.1
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name dimensions^3
	 */
	base.dimensions = function (
		widthArg?: number | string | false | null,
		heightArg?: number | string | false | null,
		save?: boolean
	) {
		// set undefined width/height to boolean false
		const width = (!widthArg && widthArg !== 0) ? false : widthArg;
		const height = (!heightArg && heightArg !== 0) ? false : heightArg;

		if (width === false && height === false) {
			return { width: base.width(), height: base.height() };
		}

		if (width !== false) {
			if (save !== false) {
				options.width = width;
			}

			dom.width(editorContainer, width);
		}

		if (height !== false) {
			if (save !== false) {
				options.height = height;
			}

			dom.height(editorContainer, height);
		}

		return base;
	} as SCEditorInstance['dimensions'];

	/**
	 * Gets the height of the editor in px
	 *
	 * @since 1.3.5
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name height
	 */
	/**
	 * Sets the height of the editor
	 *
	 * @since 1.3.5
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name height^2
	 */
	/**
	 * Sets the height of the editor
	 *
	 * The saveHeight specifies if to save the height.
	 *
	 * The stored height can be used for things like
	 * restoring from maximized state.
	 *
	 * @since 1.4.1
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name height^3
	 */
	base.height = function (height?: number | string, saveHeight?: boolean) {
		if (!height && height !== 0) {
			return dom.height(editorContainer);
		}

		base.dimensions(null, height, saveHeight);

		return base;
	} as SCEditorInstance['height'];

	/**
	 * Gets if the editor is maximised or not
	 *
	 * @since 1.4.1
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name maximize
	 */
	/**
	 * Sets if the editor is maximised or not
	 *
	 * @since 1.4.1
	 * @function
	 * @memberOf SCEditor.prototype
	 * @name maximize^2
	 */
	base.maximize = function (maximizeArg?: boolean) {
		const maximizeClass = 'sceditor-maximize';

		if (utils.isUndefined(maximizeArg)) {
			return dom.hasClass(editorContainer, maximizeClass);
		}

		const maximize = !!maximizeArg;

		if (maximize) {
			maximizeScrollPosition = globalWin.scrollY;
		}

		dom.toggleClass(globalDoc.documentElement, maximizeClass, maximize);
		dom.toggleClass(globalDoc.body, maximizeClass, maximize);
		dom.toggleClass(editorContainer, maximizeClass, maximize);
		base.width(maximize ? '100%' : options.width as number | string, false);
		base.height(maximize ? '100%' : options.height as number | string, false);

		if (!maximize) {
			globalWin.scrollTo(0, maximizeScrollPosition);
		}

		autoExpand();

		return base;
	} as SCEditorInstance['maximize'];

	autoExpand = function () {
		if (options.autoExpand && !autoExpandThrottle) {
			autoExpandThrottle = setTimeout(base.expandToContent, 200);
		}
	};

	/**
	 * Expands or shrinks the editors height to the height of it's content
	 *
	 * Unless ignoreMaxHeight is set to true it will not expand
	 * higher than the maxHeight option.
	 *
	 * @since 1.3.5
	 * @function
	 * @name expandToContent
	 * @memberOf SCEditor.prototype
	 * @see #resizeToContent
	 */
	base.expandToContent = function (ignoreMaxHeight?: boolean) {
		if (base.maximize()) {
			return;
		}

		clearTimeout(autoExpandThrottle as ReturnType<typeof setTimeout>);
		autoExpandThrottle = false;

		if (!autoExpandBounds) {
			const height = (options.resizeMinHeight as number) || (options.height as number) ||
                dom.height(original);

			autoExpandBounds = {
				min: height,
				max: (options.resizeMaxHeight as number) || (height * 2)
			};
		}

		const range = globalDoc.createRange();
		range.selectNodeContents(wysiwygBody);

		const rect = range.getBoundingClientRect();
		const current = wysiwygDocument.documentElement.clientHeight - 1;
		const spaceNeeded = rect.bottom - rect.top;
		let newHeight = base.height() + 1 + (spaceNeeded - current);

		if (!ignoreMaxHeight && autoExpandBounds.max !== -1) {
			newHeight = Math.min(newHeight, autoExpandBounds.max);
		}

		base.height(Math.ceil(Math.max(newHeight, autoExpandBounds.min)));
	};

	/**
	 * Destroys the editor, removing all elements and
	 * event handlers.
	 *
	 * Leaves only the original textarea.
	 *
	 * @function
	 * @name destroy
	 * @memberOf SCEditor.prototype
	 */
	base.destroy = function () {
		// Don't destroy if the editor has already been destroyed
		if (!pluginManager) {
			return;
		}

		pluginManager.destroy();

		if (autoExpandThrottle) {
			clearTimeout(autoExpandThrottle);
			autoExpandThrottle = false;
		}

		if (valueChangedKeyUpTimer) {
			clearTimeout(valueChangedKeyUpTimer);
			valueChangedKeyUpTimer = false;
		}

		rangeHelper = null;
		pluginManager = null;

		if (dropdown) {
			dom.remove(dropdown);
		}

		dom.off(globalDoc, 'click', handleDocumentClick as EventListener);

		const form = original.form;
		if (form) {
			dom.off(form, 'reset', handleFormReset);
			dom.off(form, 'submit', base.updateOriginal, dom.EVENT_CAPTURE);
		}

		dom.off(window, 'pagehide', base.updateOriginal);
		dom.off(window, 'pageshow', handleFormReset);
		dom.remove(sourceEditor);
		dom.remove(toolbar);
		dom.remove(editorContainer);

		delete original._sceditor;
		dom.show(original);

		original.required = isRequired;
	};


	/**
	 * Creates a menu item drop down
	 *
	 * @param  menuItem The button to align the dropdown with
	 * @param  name     Used for styling the dropdown, will be
	 *                  a class sceditor-name
	 * @param  content  The HTML content of the dropdown
	 * @function
	 * @name createDropDown
	 * @memberOf SCEditor.prototype
	 */
	base.createDropDown = function (menuItem: HTMLElement, name: string, content: HTMLElement) {
		// first click for create second click for close
		const dropDownClass = 'sceditor-' + name;

		base.closeDropDown();

		// Only close the dropdown if it was already open
		if (dropdown && dom.hasClass(dropdown, dropDownClass)) {
			return;
		}

		const dropDownCss = utils.extend({
			top: menuItem.offsetTop,
			left: (menuItem.parentElement as HTMLElement).offsetLeft + menuItem.offsetLeft,
			marginTop: menuItem.clientHeight
		},
		options.dropDownCss) as Record<string, string | number>;

		dropdown = dom.createElement('div', {
			className: 'dropdown-menu show sceditor-dropdown ' + dropDownClass
		}) as HTMLDivElement;

		dom.css(dropdown, dropDownCss);
		dom.appendChild(dropdown, content);
		dom.appendChild(editorContainer, dropdown);
		dom.on(dropdown, 'click focusin', function (e) {
			// stop clicks within the dropdown from being handled
			e.stopPropagation();
		});

		if (dropdown) {
			const first = dom.find(dropdown, 'input,textarea')[0] as HTMLElement | undefined;
			if (first) {
				first.focus();
			}
		}
	};

	/**
	 * Handles any document click and closes the dropdown if open
	 * @private
	 */
	handleDocumentClick = function (e) {
		// ignore right clicks
		if (e.which !== 3 && dropdown && !e.defaultPrevented) {
			autoUpdate();

			base.closeDropDown();
		}
	};

	/**
	 * Handles the WYSIWYG editors cut & copy events
	 *
	 * By default browsers also copy inherited styling from the stylesheet and
	 * browser default styling which is unnecessary.
	 *
	 * This will ignore inherited styles and only copy inline styling.
	 * @private
	 */
	handleCutCopyEvt = function (e) {
		const range = (rangeHelper as RangeHelperInstance).selectedRange();
		if (range) {
			const container = dom.createElement('div', {}, wysiwygDocument);
			let firstParent: HTMLElement | undefined;

			// Copy all inline parent nodes up to the first block parent so can
			// copy inline styles
			let parent: Node | null = range.commonAncestorContainer;
			while (parent && dom.isInline(parent, true)) {
				if (parent.nodeType === dom.ELEMENT_NODE) {
					const clone = (parent as Element).cloneNode() as HTMLElement;
					if (container.firstChild) {
						dom.appendChild(clone, container.firstChild);
					}

					dom.appendChild(container, clone);
					firstParent = firstParent || clone;
				}
				parent = parent.parentNode;
			}

			dom.appendChild(firstParent || container, range.cloneContents());
			dom.removeWhiteSpace(container);

			(e.clipboardData as DataTransfer).setData('text/html', container.innerHTML);

			// TODO: Refactor into private shared module with plaintext plugin
			// innerText adds two newlines after <p> tags so convert them to
			// <div> tags
			utils.each(dom.find(container, 'p'), function (_, elm) {
				dom.convertElement(elm, 'div');
			});
			// Remove collapsed <br> tags as innerText converts them to newlines
			utils.each(dom.find(container, 'br'), function (_, elm) {
				if (!elm.nextSibling || !dom.isInline(elm.nextSibling, true)) {
					dom.remove(elm);
				}
			});

			// range.toString() doesn't include newlines so can't use that.
			// selection.toString() seems to use the same method as innerText
			// but needs to be normalised first so using container.innerText
			dom.appendChild(wysiwygBody, container);
			(e.clipboardData as DataTransfer).setData('text/plain', (container as HTMLElement).innerText);
			dom.remove(container);

			if (e.type === 'cut') {
				range.deleteContents();
			}

			e.preventDefault();
		}
	};

	/**
	 * Handles the WYSIWYG editors paste event
	 * @private
	 */
	handlePasteEvt = function (e) {
		const editable = wysiwygBody;
		const clipboard = e.clipboardData;

		// Modern browsers with clipboard API - everything other than _very_
		// old android web views and UC browser which doesn't support the
		// paste event at all.
		if (clipboard) {
			const data: PasteData = {};
			const types = clipboard.types;
			const items = clipboard.items;

			for (let i = 0; i < types.length; i++) {
				// Word sometimes adds copied text as an image so if HTML
				// exists prefer that over images
				if (types.indexOf('text/html') < 0) {
					// Normalise image pasting to paste as a data-uri
					if (globalWin.FileReader && items &&
						IMAGE_MIME_REGEX.test(items[i].type)) {
						(pluginManager as PluginManagerInstance)
							.call('pasteHtml', items[i].getAsFile());
						return;
					}
				}

				data[types[i]] = clipboard.getData(types[i]);
			}
			// Call plugins here with file?
			data.text = data['text/plain'] as string;
			if (!options.enablePasteFiltering) {
				data.html = sanitize(data['text/html'] as string);
			}

			handlePasteData(data);

			// The clipboard API path handles the paste itself, so cancel the
			// browser's native paste. The legacy fallback below relies on
			// the native paste actually happening, so must not do this.
			e.preventDefault();
		// If contentsFragment exists then we are already waiting for a
		// previous paste so let the handler for that handle this one too
		} else if (!pasteContentFragment) {
			// Save the scroll position so can be restored
			// when contents is restored
			const scrollTop = editable.scrollTop;

			(rangeHelper as RangeHelperInstance).saveRange();

			pasteContentFragment = globalDoc.createDocumentFragment();
			while (editable.firstChild) {
				dom.appendChild(pasteContentFragment, editable.firstChild);
			}

			setTimeout(function () {
				const html = editable.innerHTML;

				editable.innerHTML = '';
				dom.appendChild(editable, pasteContentFragment as DocumentFragment);
				editable.scrollTop = scrollTop;
				pasteContentFragment = false;

				(rangeHelper as RangeHelperInstance).restoreRange();

				handlePasteData({ html: sanitize(html) });
			}, 0);
		}
	};

	/**
	 * Gets the pasted data, filters it and then inserts it.
	 * @private
	 */
	handlePasteData = function (data) {
		const pasteArea = dom.createElement('div', {}, wysiwygDocument);

		(pluginManager as PluginManagerInstance).call('pasteRaw', data);
		dom.trigger(editorContainer, 'pasteraw', data);

		if (data.html) {
			// Sanitize again in case plugins modified the HTML
			pasteArea.innerHTML = sanitize(data.html);

			// fix any invalid nesting
			dom.fixNesting(pasteArea);
		} else {
			pasteArea.innerHTML = escape.entities(data.text || '') as string;
		}

		const paste: PasteData = {
			val: pasteArea.innerHTML
		};

		if ('fragmentToSource' in format && format.fragmentToSource) {
			paste.val = format
				.fragmentToSource(paste.val as string, wysiwygDocument, currentNode);
		}

		(pluginManager as PluginManagerInstance).call('paste', paste);
		dom.trigger(editorContainer, 'paste', paste);

		if ('fragmentToHtml' in format && format.fragmentToHtml) {
			paste.val = format
				.fragmentToHtml(paste.val as string, currentNode);
		}

		(pluginManager as PluginManagerInstance).call('pasteHtml', paste);

		const parent = (rangeHelper as RangeHelperInstance).getFirstBlockParent();
		base.wysiwygEditorInsertHtml(paste.val as string, null, true);

		dom.merge(parent as Node);
	};

	/**
	 * Closes any currently open drop down
	 *
	 * @param [focus=false] If to focus the editor
	 *                       after closing the drop down
	 * @function
	 * @name closeDropDown
	 * @memberOf SCEditor.prototype
	 */
	base.closeDropDown = function (focus?: boolean) {
		if (dropdown) {
			dom.remove(dropdown);
			dropdown = null;
		}

		if (focus === true) {
			base.focus();
		}
	};


	/**
	 * Inserts HTML into WYSIWYG editor.
	 *
	 * If endHtml is specified, any selected text will be placed
	 * between html and endHtml. If there is no selected text html
	 * and endHtml will just be concatenate together.
	 *
	 * @param [endHtml=null]
	 * @param [overrideCodeBlocking=false] If to insert the html
	 *                                     into code tags, by
	 *                                     default code tags only
	 *                                     support text.
	 * @function
	 * @name wysiwygEditorInsertHtml
	 * @memberOf SCEditor.prototype
	 */
	base.wysiwygEditorInsertHtml = function (
		html: string, endHtml?: string | null, overrideCodeBlocking?: boolean
	) {
		const editorHeight = dom.height(wysiwygEditor);

		base.focus();

		// TODO: This code tag should be configurable and
		// should maybe convert the HTML into text instead
		// Don't apply to code elements
		if (!overrideCodeBlocking && dom.closest(currentBlockNode, 'code')) {
			return;
		}

		// Insert the HTML and save the range so the editor can be scrolled
		// to the end of the selection. Also allows emoticons to be replaced
		// without affecting the cursor position
		(rangeHelper as RangeHelperInstance).insertHTML(html, endHtml as string);
		(rangeHelper as RangeHelperInstance).saveRange();

		// Fix any invalid nesting, e.g. if a quote or other block is inserted
		// into a paragraph
		dom.fixNesting(wysiwygBody);

		wrapInlines(wysiwygBody, wysiwygDocument);

		// Scroll the editor after the end of the selection
		const marker = dom.find(wysiwygBody, '#sceditor-end-marker')[0] as HTMLElement;
		dom.show(marker);
		const scrollTop = wysiwygBody.scrollTop;
		const scrollTo = (dom.getOffset(marker).top +
			(marker.offsetHeight * 1.5)) - editorHeight;
		dom.hide(marker);

		// Only scroll if marker isn't already visible
		if (scrollTo > scrollTop || scrollTo + editorHeight < scrollTop) {
			wysiwygBody.scrollTop = scrollTo;
		}

		triggerValueChanged(false);
		(rangeHelper as RangeHelperInstance).restoreRange();

		// Add a new line after the last block element
		// so can always add text after it
		appendNewLine();
	};

	/**
	 * Like wysiwygEditorInsertHtml except it will convert any HTML
	 * into text before inserting it.
	 *
	 * @param [endText=null]
	 * @function
	 * @name wysiwygEditorInsertText
	 * @memberOf SCEditor.prototype
	 */
	base.wysiwygEditorInsertText = function (text: string, endText?: string) {
		base.wysiwygEditorInsertHtml(
			escape.entities(text) as string, escape.entities(endText ?? null)
		);
	};

	/**
	 * Inserts text into the WYSIWYG or source editor depending on which
	 * mode the editor is in.
	 *
	 * If endText is specified any selected text will be placed between
	 * text and endText. If no text is selected text and endText will
	 * just be concatenate together.
	 *
	 * @param [endText=null]
	 * @since 1.3.5
	 * @function
	 * @name insertText
	 * @memberOf SCEditor.prototype
	 */
	base.insertText = function (text: string, endText?: string) {
		if (base.inSourceMode()) {
			base.sourceEditorInsertText(text, endText);
		} else {
			base.wysiwygEditorInsertText(text, endText);
		}

		return base;
	};

	/**
	 * Like wysiwygEditorInsertHtml but inserts text into the
	 * source mode editor instead.
	 *
	 * If endText is specified any selected text will be placed between
	 * text and endText. If no text is selected text and endText will
	 * just be concatenate together.
	 *
	 * The cursor will be placed after the text param. If endText is
	 * specified the cursor will be placed before endText, so passing:<br />
	 *
	 * '[b]', '[/b]'
	 *
	 * Would cause the cursor to be placed:<br />
	 *
	 * [b]Selected text|[/b]
	 *
	 * @param [endText=null]
	 * @since 1.4.0
	 * @function
	 * @name sourceEditorInsertText
	 * @memberOf SCEditor.prototype
	 */
	base.sourceEditorInsertText = function (text: string, endText?: string) {
		const startPos = sourceEditor.selectionStart;
		const endPos = sourceEditor.selectionEnd;

		const scrollTop = sourceEditor.scrollTop;
		sourceEditor.focus();
		const currentValue = sourceEditor.value;

		if (endText) {
			text += currentValue.substring(startPos, endPos) + endText;
		}

		sourceEditor.value = currentValue.substring(0, startPos) +
			text +
			currentValue.substring(endPos, currentValue.length);

		sourceEditor.selectionStart = (startPos + text.length) -
			(endText ? endText.length : 0);
		sourceEditor.selectionEnd = sourceEditor.selectionStart;

		sourceEditor.scrollTop = scrollTop;
		sourceEditor.focus();

		triggerValueChanged();
	};

	/**
	 * Gets the current instance of the rangeHelper class
	 * for the editor.
	 *
	 * @function
	 * @name getRangeHelper
	 * @memberOf SCEditor.prototype
	 */
	base.getRangeHelper = function () {
		return rangeHelper as RangeHelperInstance;
	};

	/**
	 * Gets or sets the source editor caret position.
	 *
	 * @function
	 * @since 1.4.5
	 * @name sourceEditorCaret
	 * @memberOf SCEditor.prototype
	 */
	base.sourceEditorCaret = function (position?: { start: number; end: number }) {
		sourceEditor.focus();

		if (position) {
			sourceEditor.selectionStart = position.start;
			sourceEditor.selectionEnd = position.end;

			return base;
		}

		return {
			start: sourceEditor.selectionStart,
			end: sourceEditor.selectionEnd
		};
	} as SCEditorInstance['sourceEditorCaret'];

	/**
	 * Gets the value of the editor.
	 *
	 * If the editor is in WYSIWYG mode it will return the filtered
	 * HTML from it (converted to BBCode if using the BBCode plugin).
	 * It it's in Source Mode it will return the unfiltered contents
	 * of the source editor (if using the BBCode plugin this will be
	 * BBCode again).
	 *
	 * @since 1.3.5
	 * @function
	 * @name val
	 * @memberOf SCEditor.prototype
	 */
	/**
	 * Sets the value of the editor.
	 *
	 * If filter set true the val will be passed through the filter
	 * function. If using the BBCode plugin it will pass the val to
	 * the BBCode filter to convert any BBCode into HTML.
	 *
	 * @since 1.3.5
	 * @function
	 * @name val^2
	 * @memberOf SCEditor.prototype
	 */
	base.val = function (val?: string, filter?: boolean) {
		if (!utils.isString(val)) {
			return base.inSourceMode() ?
				base.getSourceEditorValue(false) :
				base.getWysiwygEditorValue(filter);
		}

		if (!base.inSourceMode()) {
			if (filter !== false && 'toHtml' in format && format.toHtml) {
				val = format.toHtml(val);
			}

			base.setWysiwygEditorValue(val);
		} else {
			base.setSourceEditorValue(val);
		}

		return base;
	} as SCEditorInstance['val'];

	/**
	 * Inserts HTML/BBCode into the editor
	 *
	 * If end is supplied any selected text will be placed between
	 * start and end. If there is no selected text start and end
	 * will be concatenate together.
	 *
	 * If the filter param is set to true, the HTML/BBCode will be
	 * passed through any plugin filters. If using the BBCode plugin
	 * this will convert any BBCode into HTML.
	 *
	 * @param [end=null]
	 * @param [filter=true]
	 * @param [convertEmoticons=true] If to convert emoticons
	 * @since 1.3.5
	 * @function
	 * @name insert
	 * @memberOf SCEditor.prototype
	 */
	/**
	 * Inserts HTML/BBCode into the editor
	 *
	 * If end is supplied any selected text will be placed between
	 * start and end. If there is no selected text start and end
	 * will be concatenate together.
	 *
	 * If the filter param is set to true, the HTML/BBCode will be
	 * passed through any plugin filters. If using the BBCode plugin
	 * this will convert any BBCode into HTML.
	 *
	 * If the allowMixed param is set to true, HTML any will not be
	 * escaped
	 *
	 * @param [end=null]
	 * @param [filter=true]
	 * @param [convertEmoticons=true] If to convert emoticons
	 * @param [allowMixed=false]
	 * @since 1.4.3
	 * @function
	 * @name insert^2
	 * @memberOf SCEditor.prototype
	 */
	// eslint-disable-next-line max-params
	base.insert = function (
		start: string, end?: string, filter?: boolean, _convertEmoticons?: boolean, allowMixed?: boolean
	) {
		if (base.inSourceMode()) {
			base.sourceEditorInsertText(start, end);
			return base;
		}

		// Add the selection between start and end
		if (end) {
			let html = (rangeHelper as RangeHelperInstance).selectedHtml();

			if (filter !== false && 'fragmentToSource' in format && format.fragmentToSource) {
				html = format
					.fragmentToSource(html, wysiwygDocument, currentNode);
			}

			start += html + end;
		}
		// TODO: This filter should allow empty tags as it's inserting.
		if (filter !== false && 'fragmentToHtml' in format && format.fragmentToHtml) {
			start = format.fragmentToHtml(start, currentNode);
		}

		// Convert any escaped HTML back into HTML if mixed is allowed
		if (filter !== false && allowMixed === true) {
			start = start.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&amp;/g, '&');
		}

		base.wysiwygEditorInsertHtml(start);

		return base;
	};

	/**
	 * Gets the WYSIWYG editors HTML value.
	 *
	 * If using a plugin that filters the Ht Ml like the BBCode plugin
	 * it will return the result of the filtering (BBCode) unless the
	 * filter param is set to false.
	 *
	 * @param [filter=true]
	 * @function
	 * @name getWysiwygEditorValue
	 * @memberOf SCEditor.prototype
	 */
	base.getWysiwygEditorValue = function (filter?: boolean) {
		let html: string;
		// Create a tmp node to store contents so it can be modified
		// without affecting anything else.
		const tmp = dom.createElement('div', {}, wysiwygDocument);
		const childNodes = wysiwygBody.childNodes;

		for (let i = 0; i < childNodes.length; i++) {
			dom.appendChild(tmp, childNodes[i].cloneNode(true));
		}

		dom.appendChild(wysiwygBody, tmp);
		dom.fixNesting(tmp);
		dom.remove(tmp);

		html = tmp.innerHTML;

		// filter the HTML and DOM through any plugins
		if (filter !== false && format.hasOwnProperty('toSource') && format.toSource) {
			html = format.toSource(html, wysiwygDocument);
		}

		return html;
	};

	/**
	 * Gets the WYSIWYG editor's iFrame Body.
	 *
	 * @function
	 * @since 1.4.3
	 * @name getBody
	 * @memberOf SCEditor.prototype
	 */
	base.getBody = function () {
		return wysiwygBody;
	};

	/**
	 * Gets the WYSIWYG editors container area (whole iFrame).
	 *
	 * @function
	 * @since 1.4.3
	 * @name getContentAreaContainer
	 * @memberOf SCEditor.prototype
	 */
	base.getContentAreaContainer = function () {
		return wysiwygEditor;
	};

	/**
	 * Gets the text editor value
	 *
	 * If using a plugin that filters the text like the BBCode plugin
	 * it will return the result of the filtering which is BBCode to
	 * HTML so it will return HTML. If filter is set to false it will
	 * just return the contents of the source editor (BBCode).
	 *
	 * @param [filter=true]
	 * @function
	 * @since 1.4.0
	 * @name getSourceEditorValue
	 * @memberOf SCEditor.prototype
	 */
	base.getSourceEditorValue = function (filter?: boolean) {
		let val = sourceEditor.value;

		if (filter !== false && 'toHtml' in format && format.toHtml) {
			val = format.toHtml(val);
		}

		return val;
	};

	base.getSourceEditor = function () {
		return sourceEditor;
	};

	/**
	 * Sets the WYSIWYG HTML editor value. Should only be the HTML
	 * contained within the body tags
	 *
	 * @function
	 * @name setWysiwygEditorValue
	 * @memberOf SCEditor.prototype
	 */
	base.setWysiwygEditorValue = function (value: string) {
		if (!value) {
			value = '<p><br /></p>';
		}

		wysiwygBody.innerHTML = sanitize(value);

		appendNewLine();
		triggerValueChanged();
		autoExpand();
	};

	/**
	 * Sets the text editor value
	 *
	 * @function
	 * @name setSourceEditorValue
	 * @memberOf SCEditor.prototype
	 */
	base.setSourceEditorValue = function (value: string) {
		sourceEditor.value = value;

		triggerValueChanged();
	};

	/**
	 * Updates the textarea that the editor is replacing
	 * with the value currently inside the editor.
	 *
	 * @function
	 * @name updateOriginal
	 * @since 1.4.0
	 * @memberOf SCEditor.prototype
	 */
	base.updateOriginal = function () {
		original.value = base.val();
	};

	/**
	 * If the editor is in source code mode
	 *
	 * @function
	 * @name inSourceMode
	 * @memberOf SCEditor.prototype
	 */
	base.inSourceMode = function () {
		return dom.hasClass(editorContainer, 'sourceMode');
	};

	/**
	 * Gets if the editor is in sourceMode
	 *
	 * @function
	 * @name sourceMode
	 * @memberOf SCEditor.prototype
	 */
	/**
	 * Sets if the editor is in sourceMode
	 *
	 * @function
	 * @name sourceMode^2
	 * @memberOf SCEditor.prototype
	 */
	base.sourceMode = function (enable?: boolean) {
		const inSourceMode = base.inSourceMode();

		if (typeof enable !== 'boolean') {
			return inSourceMode;
		}

		if ((inSourceMode && !enable) || (!inSourceMode && enable)) {
			base.toggleSourceMode();
		}

		return base;
	} as SCEditorInstance['sourceMode'];

	/**
	 * Marker inserted into the content while it's converted between the
	 * WYSIWYG and source formats when switching modes, so the caret can
	 * be found again afterwards and placed in the equivalent position.
	 *
	 * Must not contain zero width spaces as those get stripped by
	 * dom.removeWhiteSpace() during the HTML to BBCode conversion.
	 * @private
	 */
	const caretMarker = 'sce-caret-marker-4f9c7a2e';

	/**
	 * Inserts the caret marker into the WYSIWYG editor at the current
	 * caret/selection position.
	 *
	 * @return The inserted marker text node, or null if there's
	 * currently no selection to mark.
	 * @private
	 */
	function insertWysiwygCaretMarker(): Text | null {
		const range = (rangeHelper as RangeHelperInstance).selectedRange();

		if (!range) {
			return null;
		}

		const marker = wysiwygDocument.createTextNode(caretMarker);
		const markerRange = range.cloneRange();

		markerRange.collapse(true);
		markerRange.insertNode(marker);

		return marker;
	}

	/**
	 * Finds the caret marker in the WYSIWYG editor, removes it and
	 * places the caret where it was found.
	 * @private
	 */
	function restoreWysiwygCaretFromMarker(): void {
		const walker = wysiwygDocument.createTreeWalker(
			wysiwygBody, NodeFilter.SHOW_TEXT
		);
		let node: Node | null;

		while ((node = walker.nextNode())) {
			const text = node.nodeValue || '';
			const index = text.indexOf(caretMarker);

			if (index > -1) {
				node.nodeValue = text.slice(0, index) +
					text.slice(index + caretMarker.length);

				const range = wysiwygDocument.createRange();
				range.setStart(node, index);
				range.collapse(true);

				(rangeHelper as RangeHelperInstance).selectRange(range);
				currentSelection = range;
				return;
			}
		}
	}

	/**
	 * Switches between the WYSIWYG and source modes
	 *
	 * @function
	 * @name toggleSourceMode
	 * @since 1.4.0
	 * @memberOf SCEditor.prototype
	 */
	base.toggleSourceMode = function () {
		const isInSourceMode = base.inSourceMode();

		// don't allow switching to WYSIWYG if doesn't support it
		if (!browser.isWysiwygSupported && isInSourceMode) {
			return;
		}

		// Mark the current caret position before anything is touched so
		// it can be found again after the content has been round-tripped
		// through the format converter.
		const wysiwygMarker = isInSourceMode ?
			null : insertWysiwygCaretMarker();
		const sourceCaretPos = isInSourceMode ?
			sourceEditor.selectionStart : -1;

		currentSelection = null;
		base.blur();

		if (isInSourceMode) {
			const value = sourceEditor.value;
			const markedSource = value.slice(0, sourceCaretPos) +
				caretMarker + value.slice(sourceCaretPos);
			const markedHtml = 'toHtml' in format && format.toHtml ?
				format.toHtml(markedSource) : markedSource;

			base.setWysiwygEditorValue(markedHtml);
			restoreWysiwygCaretFromMarker();
		} else {
			const markedSource = base.getWysiwygEditorValue();

			if (wysiwygMarker && wysiwygMarker.parentNode) {
				wysiwygMarker.parentNode.removeChild(wysiwygMarker);
			}

			const caretPos = markedSource.indexOf(caretMarker);
			const source = caretPos > -1 ?
				markedSource.slice(0, caretPos) +
					markedSource.slice(caretPos + caretMarker.length) :
				markedSource;

			base.setSourceEditorValue(source);

			if (caretPos > -1) {
				sourceEditor.setSelectionRange(caretPos, caretPos);
			}
		}

		dom.toggle(sourceEditor);
		dom.toggle(wysiwygEditor);

		dom.toggleClass(editorContainer, 'wysiwygMode', isInSourceMode);
		dom.toggleClass(editorContainer, 'sourceMode', !isInSourceMode);

		updateToolBar();
		updateActiveButtons();

		if (base.opts.onToggleMode !== undefined) {
			base.opts.onToggleMode(base);
		}
	};

	/**
	 * Gets the selected text of the source editor
	 * @private
	 */
	sourceEditorSelectedText = function () {
		sourceEditor.focus();

		return sourceEditor.value.substring(
			sourceEditor.selectionStart,
			sourceEditor.selectionEnd
		);
	};

	/**
	 * Handles the passed command
	 * @private
	 */
	handleCommand = function (caller, cmd) {
		// check if in text mode and handle text commands
		if (base.inSourceMode()) {
			if (cmd.txtExec) {
				if (Array.isArray(cmd.txtExec)) {
					(base.sourceEditorInsertText as (...args: unknown[]) => void)
						.apply(base, cmd.txtExec);
				} else {
					cmd.txtExec.call(base, caller, sourceEditorSelectedText());
				}
			}
		} else if (cmd.exec) {
			if (utils.isFunction(cmd.exec)) {
				cmd.exec.call(base, caller);
			} else {
				base.execCommand(
					cmd.exec,
					cmd.hasOwnProperty('execParam') ? cmd.execParam as string | boolean : null
				);
			}
		}

	};

	/**
	 * Executes a command on the WYSIWYG editor
	 *
	 * @function
	 * @name execCommand
	 * @memberOf SCEditor.prototype
	 */
	base.execCommand = function (command: string, param?: string | boolean | null) {
		let executed = false;
		const commandObj = base.commands[command];

		base.focus();

		// TODO: make configurable
		// don't apply any commands to code elements
		if (dom.closest((rangeHelper as RangeHelperInstance).parentNode() ?? null, 'code')) {
			return;
		}

		try {
			executed = wysiwygDocument.execCommand(command, false, param as string);
		} catch (_) { /* empty */ }

		// show error if execution failed and an error message exists
		if (!executed && commandObj && commandObj.errorMessage) {
			/*global alert:false*/
			alert(base._(commandObj.errorMessage));
		}

		updateActiveButtons();
	};

	/**
	 * Checks if the current selection has changed and triggers
	 * the selectionchanged event if it has.
	 *
	 * In browsers other that don't support selectionchange event it will check
	 * at most once every 100ms.
	 * @private
	 */
	checkSelectionChanged = function () {
		function check() {
			// rangeHelper is null if the editor was destroyed before this
			// (possibly deferred) check ran
			if (!rangeHelper) {
				isSelectionCheckPending = false;
				return;
			}

			// Don't create new selection if there isn't one (like after
			// blur event in iOS)
			const sel = wysiwygWindow.getSelection();
			if (sel && sel.rangeCount <= 0) {
				currentSelection = null;
			// rangeHelper could be null if editor was destroyed
			// before the timeout had finished
			} else if (rangeHelper && !rangeHelper.compare(currentSelection ?? undefined)) {
				currentSelection = rangeHelper.cloneSelected() ?? null;

				// If the selection is in an inline wrap it in a block.
				// Fixes #331
				if (currentSelection && currentSelection.collapsed) {
					let parent: Node | null = currentSelection.startContainer;
					const offset = currentSelection.startOffset;

					// Handle if selection is placed before/after an element
					if (offset && parent.nodeType !== dom.TEXT_NODE) {
						parent = parent.childNodes[offset];
					}

					while (parent && parent.parentNode !== wysiwygBody) {
						parent = parent.parentNode;
					}

					if (parent && dom.isInline(parent, true)) {
						rangeHelper.saveRange();
						wrapInlines(wysiwygBody, wysiwygDocument);
						rangeHelper.restoreRange();
					}
				}

				dom.trigger(editorContainer, 'selectionchanged');
			}

			isSelectionCheckPending = false;
		}

		if (isSelectionCheckPending) {
			return;
		}

		isSelectionCheckPending = true;

		// Don't need to limit checking if browser supports the Selection API
		if ('onselectionchange' in wysiwygDocument) {
			check();
		} else {
			setTimeout(check, 100);
		}
	};

	/**
	 * Checks if the current node has changed and triggers
	 * the nodechanged event if it has
	 * @private
	 */
	checkNodeChanged = function () {
		// check if node has changed
		const node = (rangeHelper as RangeHelperInstance).parentNode() ?? null;

		if (currentNode !== node) {
			const oldNode = currentNode;
			currentNode = node;
			currentBlockNode = ((rangeHelper as RangeHelperInstance)
				.getFirstBlockParent(node ?? undefined) ?? null) as HTMLElement | null;

			dom.trigger(editorContainer, 'nodechanged', {
				oldNode: oldNode,
				newNode: currentNode
			});
		}

		if (backSpaceHandled) {
			if (currentBlockNode) {
				currentBlockNode.querySelectorAll('span[style]').forEach(span => {
					if (span) {
						span.outerHTML = span.innerHTML;
					}
				});
			}

			backSpaceHandled = false;
		}
	};

	/**
	 * Gets the current node that contains the selection/caret in
	 * WYSIWYG mode.
	 *
	 * Will be null in sourceMode or if there is no selection.
	 *
	 * @function
	 * @name currentNode
	 * @memberOf SCEditor.prototype
	 */
	base.currentNode = function () {
		return currentNode;
	};

	/**
	 * Gets the first block level node that contains the
	 * selection/caret in WYSIWYG mode.
	 *
	 * Will be null in sourceMode or if there is no selection.
	 *
	 * @function
	 * @name currentBlockNode
	 * @memberOf SCEditor.prototype
	 * @since 1.4.4
	 */
	base.currentBlockNode = function () {
		return currentBlockNode;
	};

	/**
	 * Updates if buttons are active or not
	 * @private
	 */
	updateActiveButtons = function () {
		let parent: Node | undefined;
		let firstBlock: Node | null | undefined;
		const activeClass = 'active';
		const doc = wysiwygDocument;
		const isSource = base.sourceMode();

		if (base.readOnly()) {
			utils.each(dom.find(toolbar, activeClass), function (_, menuItem) {
				dom.removeClass(menuItem as HTMLElement, activeClass);
			});
			return;
		}

		if (!isSource) {
			parent = (rangeHelper as RangeHelperInstance).parentNode();
			firstBlock = (rangeHelper as RangeHelperInstance).getFirstBlockParent(parent);
		}

		for (let j = 0; j < btnStateHandlers.length; j++) {
			let state: boolean | number | void = 0;
			const btn = toolbarButtons[btnStateHandlers[j].name];
			const stateFn = btnStateHandlers[j].state;
			const isDisabled = (isSource && !btn._sceTxtMode) ||
                (!isSource && !btn._sceWysiwygMode);

			if (utils.isString(stateFn)) {
				if (!isSource) {
					try {
						state = doc.queryCommandEnabled(stateFn) ? 0 : -1;

						// eslint-disable-next-line max-depth
						if (state > -1) {
							state = doc.queryCommandState(stateFn) ? 1 : 0;
						}
					} catch (_) { /* empty */ }
				}
			} else if (!isDisabled && stateFn) {
				state = stateFn.call(base, parent, firstBlock as Node | undefined);
			}

			dom.toggleClass(btn, 'disabled', isDisabled || (Number(state) < 0));
			dom.toggleClass(btn, activeClass, Number(state) > 0);
		}

		if (icons && icons.update) {
			icons.update(isSource, parent as Node | undefined, firstBlock as Node | undefined);
		}
	};

	/**
	 * Handles any key press in the WYSIWYG editor
	 *
	 * @private
	 */
	handleKeyPress = function (e) {
		// FF bug: https://bugzilla.mozilla.org/show_bug.cgi?id=501496
		if (e.defaultPrevented) {
			return;
		}

		base.closeDropDown();

		// 13 = enter key
		if (e.which === 13) {
			const LIST_TAGS = 'li,ul,ol';

			// "Fix" (cludge) for blocklevel elements being duplicated in some
			// browsers when enter is pressed instead of inserting a newline
			if (!dom.is(currentBlockNode, LIST_TAGS) &&
				dom.hasStyling(currentBlockNode as HTMLElement)) {

				const br = dom.createElement('br', {}, wysiwygDocument);
				(rangeHelper as RangeHelperInstance).insertNode(br);

				// Last <br> of a block will be collapsed  so need to make sure
				// the <br> that was inserted isn't the last node of a block.
				const parent = br.parentNode as HTMLElement;
				let lastChild = parent.lastChild;

				// Sometimes an empty next node is created after the <br>
				if (lastChild && lastChild.nodeType === dom.TEXT_NODE &&
					lastChild.nodeValue === '') {
					dom.remove(lastChild);
					lastChild = parent.lastChild;
				}

				// If this is the last BR of a block and the previous
				// sibling is inline then will need an extra BR. This
				// is needed because the last BR of a block will be
				// collapsed. Fixes issue #248
				if (!dom.isInline(parent, true) && lastChild === br &&
					dom.isInline(br.previousSibling)) {
					(rangeHelper as RangeHelperInstance).insertHTML('<br>');
				}

				e.preventDefault();
			}
		}
	};

	/**
	 * Makes sure that if there is a code or quote tag at the
	 * end of the editor, that there is a new line after it.
	 *
	 * If there wasn't a new line at the end you wouldn't be able
	 * to enter any text after a code/quote tag
	 * @private
	 */
	appendNewLine = function () {
		// Check all nodes in reverse until either add a new line
		// or reach a non-empty textnode or BR at which point can
		// stop checking.
		dom.rTraverse(wysiwygBody, function (node) {
			// Last block, add new line after if has styling
			if (node.nodeType === dom.ELEMENT_NODE &&
				!/inline/.test(dom.css(node as HTMLElement, 'display') as string)) {

				// Add line break after if has styling
				if (!dom.is(node, '.sceditor-nlf') && dom.hasStyling(node as HTMLElement)) {
					const paragraph = dom.createElement('p', {}, wysiwygDocument);
					paragraph.className = 'sceditor-nlf';
					paragraph.innerHTML = '<br />';
					dom.appendChild(wysiwygBody, paragraph);
					return false;
				}
			}

			// Last non-empty text node or line break.
			// No need to add line-break after them
			if ((node.nodeType === 3 && !/^\s*$/.test(node.nodeValue as string)) ||
				dom.is(node, 'br')) {
				return false;
			}

			return undefined;
		});
	};

	/**
	 * Handles form reset event
	 * @private
	 */
	handleFormReset = function () {
		base.val(original.value);
	};

	/**
	 * Handles any mousedown press in the WYSIWYG editor
	 * @private
	 */
	handleMouseDown = function () {
		base.closeDropDown();
	};

	/**
	 * Translates the string into the locale language.
	 *
	 * Replaces any {0}, {1}, {2}, ect. with the params provided.
	 *
	 * @function
	 * @name _
	 * @memberOf SCEditor.prototype
	 */
	base._ = function (...args: unknown[]) {
		const undef = undefined;

		if (locale && locale[args[0] as string]) {
			args[0] = locale[args[0] as string];
		} else {
			if (options.locale !== 'en') {
				/*(async () => {
				//var translatedText = await translateText(args[0], 'zh-tw');
				//console.log(`'${args[0]}': '${translatedText}',`);
			    })();*/

				console.info(`translation for '${args[0]}' is missing for locale '${options.locale}'`);
			}
		}

		return (args[0] as string).replace(/\{(\d+)\}/g, function (str, p1) {
			return args[Number(p1) + 1] !== undef ?
				args[Number(p1) + 1] as string :
				`{${p1}}`;
		});
	};

	/*async function translateText(text, targetLang) {
		try {
			const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

			const res = await fetch(url);
			if (!res.ok) {
				throw new Error(`HTTP error! Status: ${res.status}`);
			}

			const data = await res.json();

			// Extract translated text
			if (Array.isArray(data) && data[0] && Array.isArray(data[0][0])) {
				return data[0].map(sentence => sentence[0]).join(' ');
			} else {
				throw new Error('Unexpected response format');
			}
		} catch (error) {
			console.error('Translation failed:', error.message);
			return 'Error during translation.';
		}
	}*/


	/**
	 * Passes events on to any handlers
	 * @private
	 * @return void
	 */
	handleEvent = function (e) {
		if (pluginManager) {
			// Send event to all plugins
			pluginManager.call(e.type + 'Event', e, base);
		}

		// convert the event into a custom event to send
		const name = (e.target === sourceEditor ? 'scesrc' : 'scewys') + e.type;

		if (eventHandlers[name]) {
			eventHandlers[name].forEach(function (fn) {
				fn.call(base, e);
			});
		}
	};

	/**
	 * Binds a handler to the specified events
	 *
	 * This function only binds to a limited list of
	 * supported events.
	 *
	 * The supported events are:
	 *
	 * * keyup
	 * * keydown
	 * * Keypress
	 * * blur
	 * * focus
	 * * input
	 * * nodechanged - When the current node containing
	 * 		the selection changes in WYSIWYG mode
	 * * contextmenu
	 * * selectionchanged
	 * * valuechanged
	 *
	 *
	 * The events param should be a string containing the event(s)
	 * to bind this handler to. If multiple, they should be separated
	 * by spaces.
	 *
	 * @param  excludeWysiwyg If to exclude adding this handler
	 *                        to the WYSIWYG editor
	 * @param  excludeSource  if to exclude adding this handler
	 *                        to the source editor
	 * @function
	 * @name bind
	 * @memberOf SCEditor.prototype
	 * @since 1.4.1
	 */
	base.bind = function (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		events: string, handler: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean
	) {
		const eventList = events.split(' ');

		let i = eventList.length;
		while (i--) {
			if (utils.isFunction(handler)) {
				const wysEvent = 'scewys' + eventList[i];
				const srcEvent = 'scesrc' + eventList[i];
				// Use custom events to allow passing the instance as the
				// 2nd argument.
				// Also allows unbinding without unbinding the editors own
				// event handlers.
				if (!excludeWysiwyg) {
					eventHandlers[wysEvent] = eventHandlers[wysEvent] || [];
					eventHandlers[wysEvent].push(handler);
				}

				if (!excludeSource) {
					eventHandlers[srcEvent] = eventHandlers[srcEvent] || [];
					eventHandlers[srcEvent].push(handler);
				}

				// Start sending value changed events
				if (eventList[i] === 'valuechanged') {
					triggerValueChanged.hasHandler = true;
				}
			}
		}

		return base;
	};

	/**
	 * Unbinds an event that was bound using bind().
	 *
	 * @param  excludeWysiwyg If to exclude unbinding this
	 *                        handler from the WYSIWYG editor
	 * @param  excludeSource  if to exclude unbinding this
	 *                        handler from the source editor
	 * @function
	 * @name unbind
	 * @memberOf SCEditor.prototype
	 * @since 1.4.1
	 * @see bind
	 */
	base.unbind = function (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		events: string, handler: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean
	) {
		const eventList = events.split(' ');

		let i = eventList.length;
		while (i--) {
			if (utils.isFunction(handler)) {
				if (!excludeWysiwyg) {
					utils.arrayRemove(
						eventHandlers['scewys' + eventList[i]] || [], handler);
				}

				if (!excludeSource) {
					utils.arrayRemove(
						eventHandlers['scesrc' + eventList[i]] || [], handler);
				}
			}
		}

		return base;
	};

	/**
	 * Blurs the editors input area
	 *
	 * @function
	 * @name blur
	 * @memberOf SCEditor.prototype
	 * @since 1.3.6
	 */
	/**
	 * Adds a handler to the editors blur event
	 *
	 * @param  excludeWysiwyg If to exclude adding this handler
	 *                        to the WYSIWYG editor
	 * @param  excludeSource  if to exclude adding this handler
	 *                        to the source editor
	 * @function
	 * @name blur^2
	 * @memberOf SCEditor.prototype
	 * @since 1.4.1
	 */
	base.blur = function (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		handler?: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean
	) {
		if (utils.isFunction(handler)) {
			base.bind('blur', handler, excludeWysiwyg, excludeSource);
		} else if (!base.sourceMode()) {
			wysiwygBody.blur();
		} else {
			sourceEditor.blur();
		}

		return base;
	} as SCEditorInstance['blur'];

	/**
	 * Focuses the editors input area
	 *
	 * @function
	 * @name focus
	 * @memberOf SCEditor.prototype
	 */
	/**
	 * Adds an event handler to the focus event
	 *
	 * @param  excludeWysiwyg If to exclude adding this handler
	 *                        to the WYSIWYG editor
	 * @param  excludeSource  if to exclude adding this handler
	 *                        to the source editor
	 * @function
	 * @name focus^2
	 * @memberOf SCEditor.prototype
	 * @since 1.4.1
	 */
	base.focus = function (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		handler?: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean
	) {
		if (utils.isFunction(handler)) {
			base.bind('focus', handler, excludeWysiwyg, excludeSource);
		} else if (!base.inSourceMode()) {
			// Already has focus so do nothing
			if (dom.find(wysiwygDocument, ':focus').length) {
				return undefined;
			}

			const rng = (rangeHelper as RangeHelperInstance).selectedRange();

			// Fix FF bug where it shows the cursor in the wrong place
			// if the editor hasn't had focus before. See issue #393
			if (!currentSelection) {
				autofocus(true);
			}

			// Check if cursor is set after a BR when the BR is the only
			// child of the parent. In Firefox this causes a line break
			// to occur when something is typed. See issue #321
			if (rng && rng.endOffset === 1 && rng.collapsed) {
				const container = rng.endContainer;

				if (container && container.childNodes.length === 1 &&
					dom.is(container.firstChild, 'br')) {
					rng.setStartBefore(container.firstChild as Node);
					rng.collapse(true);
					(rangeHelper as RangeHelperInstance).selectRange(rng);
				}
			}

			wysiwygWindow.focus();
			wysiwygBody.focus();
		} else {
			sourceEditor.focus();
		}

		updateActiveButtons();

		return base;
	} as SCEditorInstance['focus'];

	/**
	 * Adds a handler to the key down event
	 *
	 * @param  excludeWysiwyg If to exclude adding this handler
	 *                        to the WYSIWYG editor
	 * @param  excludeSource  If to exclude adding this handler
	 *                        to the source editor
	 * @function
	 * @name keyDown
	 * @memberOf SCEditor.prototype
	 * @since 1.4.1
	 */
	base.keyDown = function (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		handler?: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean
	) {
		return base.bind('keydown', handler as (this: SCEditorInstance) => void, excludeWysiwyg, excludeSource);
	};

	/**
	 * Adds a handler to the key press event
	 *
	 * @param  excludeWysiwyg If to exclude adding this handler
	 *                        to the WYSIWYG editor
	 * @param  excludeSource  If to exclude adding this handler
	 *                        to the source editor
	 * @function
	 * @name keyPress
	 * @memberOf SCEditor.prototype
	 * @since 1.4.1
	 */
	base.keyPress = function (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		handler?: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean
	) {
		return base
			.bind('keypress', handler as (this: SCEditorInstance) => void, excludeWysiwyg, excludeSource);
	};

	/**
	 * Adds a handler to the key up event
	 *
	 * @param  excludeWysiwyg If to exclude adding this handler
	 *                        to the WYSIWYG editor
	 * @param  excludeSource  If to exclude adding this handler
	 *                        to the source editor
	 * @function
	 * @name keyUp
	 * @memberOf SCEditor.prototype
	 * @since 1.4.1
	 */
	base.keyUp = function (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		handler?: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean
	) {
		return base.bind('keyup', handler as (this: SCEditorInstance) => void, excludeWysiwyg, excludeSource);
	};

	/**
	 * Adds a handler to the node changed event.
	 *
	 * Happens whenever the current node containing the selection/caret
	 * changes in WYSIWYG mode.
	 *
	 * @function
	 * @name nodeChanged
	 * @memberOf SCEditor.prototype
	 * @since 1.4.1
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	base.nodeChanged = function (handler: (this: SCEditorInstance, ...args: any[]) => void) {
		return base.bind('nodechanged', handler, false, true);
	};

	/**
	 * Adds a handler to the selection changed event
	 *
	 * Happens whenever the selection changes in WYSIWYG mode.
	 *
	 * @function
	 * @name selectionChanged
	 * @memberOf SCEditor.prototype
	 * @since 1.4.1
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	base.selectionChanged = function (handler: (this: SCEditorInstance, ...args: any[]) => void) {
		return base.bind('selectionchanged', handler, false, true);
	};

	/**
	 * Adds a handler to the value changed event
	 *
	 * Happens whenever the current editor value changes.
	 *
	 * Whenever anything is inserted, the value changed or
	 * 1.5 secs after text is typed. If a space is typed it will
	 * cause the event to be triggered immediately instead of
	 * after 1.5 seconds
	 *
	 * @param  excludeWysiwyg If to exclude adding this handler
	 *                        to the WYSIWYG editor
	 * @param  excludeSource  If to exclude adding this handler
	 *                        to the source editor
	 * @function
	 * @name valueChanged
	 * @memberOf SCEditor.prototype
	 * @since 1.4.5
	 */
	base.valueChanged = function (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		handler: (this: SCEditorInstance, ...args: any[]) => void, excludeWysiwyg?: boolean, excludeSource?: boolean
	) {
		return base
			.bind('valuechanged', handler, excludeWysiwyg, excludeSource);
	};

	/**
	 * Gets the current WYSIWYG editors inline CSS
	 *
	 * @function
	 * @name css
	 * @memberOf SCEditor.prototype
	 * @since 1.4.3
	 */
	/**
	 * Sets inline CSS for the WYSIWYG editor
	 *
	 * @function
	 * @name css^2
	 * @memberOf SCEditor.prototype
	 * @since 1.4.3
	 */
	base.css = function (css?: string) {
		if (!inlineCss) {
			inlineCss = dom.createElement('style', {
				id: 'inline'
			}, wysiwygDocument) as HTMLStyleElement;

			dom.appendChild(wysiwygDocument.head, inlineCss);
		}

		if (!utils.isString(css)) {
			return (inlineCss as HTMLStyleElement & { styleSheet?: { cssText: string } }).styleSheet ?
				(inlineCss as unknown as { styleSheet: { cssText: string } }).styleSheet.cssText : inlineCss.innerHTML;
		}

		if ((inlineCss as HTMLStyleElement & { styleSheet?: { cssText: string } }).styleSheet) {
			(inlineCss as unknown as { styleSheet: { cssText: string } }).styleSheet.cssText = css;
		} else {
			inlineCss.innerHTML = css;
		}

		return base;
	} as SCEditorInstance['css'];

	/**
	 * Handles the keydown event, used for shortcuts
	 * @private
	 */
	handleKeyDown = function (e) {
		const autoClosingTags = [
			'b', 'i', 'u', 'h', 'code', 'img', 'quote', 'left', 'center', 'right',
			'list', 'color',
			'size', 'albumimg', 'attach', 'youtube', 'vimeo',
			'instagram', 'twitter', 'facebook', 'googlewidget', 'spoiler', 'userlink', 'googlemaps',
			'hide', 'group-hide', 'hide-thanks', 'hide-reply-thanks', 'hide-reply', 'hide-posts', 'dailymotion',
			'audio', 'media','note'
		];

		const shortcut: string[] = [];
		const SHIFT_KEYS: Record<string, string> = {
			'`': '~',
			'1': '!',
			'2': '@',
			'3': '#',
			'4': '$',
			'5': '%',
			'6': '^',
			'7': '&',
			'8': '*',
			'9': '(',
			'0': ')',
			'-': '_',
			'=': '+',
			';': ': ',
			'\'': '"',
			',': '<',
			'.': '>',
			'/': '?',
			'\\': '|',
			'[': '{',
			']': '}'
		};
		const SPECIAL_KEYS: Record<number, string> = {
			8: 'backspace',
			9: 'tab',
			13: 'enter',
			19: 'pause',
			20: 'capslock',
			27: 'esc',
			32: 'space',
			33: 'pageup',
			34: 'pagedown',
			35: 'end',
			36: 'home',
			37: 'left',
			38: 'up',
			39: 'right',
			40: 'down',
			45: 'insert',
			46: 'del',
			91: 'win',
			92: 'win',
			93: 'select',
			96: '0',
			97: '1',
			98: '2',
			99: '3',
			100: '4',
			101: '5',
			102: '6',
			103: '7',
			104: '8',
			105: '9',
			106: '*',
			107: '+',
			109: '-',
			110: '.',
			111: '/',
			112: 'f1',
			113: 'f2',
			114: 'f3',
			115: 'f4',
			116: 'f5',
			117: 'f6',
			118: 'f7',
			119: 'f8',
			120: 'f9',
			121: 'f10',
			122: 'f11',
			123: 'f12',
			144: 'numlock',
			145: 'scrolllock',
			186: ';',
			187: '=',
			188: ',',
			189: '-',
			190: '.',
			191: '/',
			192: '`',
			219: '[',
			220: '\\',
			221: ']',
			222: '\''
		};
		const NUMPAD_SHIFT_KEYS: Record<number, string> = {
			109: '-',
			110: 'del',
			111: '/',
			96: '0',
			97: '1',
			98: '2',
			99: '3',
			100: '4',
			101: '5',
			102: '6',
			103: '7',
			104: '8',
			105: '9'
		};
		const which = e.which;
		let character = SPECIAL_KEYS[which] ||
			String.fromCharCode(which).toLowerCase();

		if (e.ctrlKey || e.metaKey) {
			shortcut.push('ctrl');
		}

		if (e.altKey) {
			shortcut.push('alt');
		}

		if (e.shiftKey) {
			shortcut.push('shift');

			if (NUMPAD_SHIFT_KEYS[which]) {
				character = NUMPAD_SHIFT_KEYS[which];
			} else if (SHIFT_KEYS[character]) {
				character = SHIFT_KEYS[character];
			}
		}

		// Shift is 16, ctrl is 17 and alt is 18
		if (character && (which < 16 || which > 18)) {
			shortcut.push(character);
		}

		const shortcutStr = shortcut.join('+');
		if (shortcutHandlers[shortcutStr] &&
			shortcutHandlers[shortcutStr].call(base) === false) {

			e.stopPropagation();
			e.preventDefault();
		}

		// Close tag ']'
		if (e.key === ']' && base.inSourceMode()) {
			const input = sourceEditor;

			const position = input.selectionStart as number;
			const before = input.value.slice(0, position);
			const after = input.value.slice(input.selectionEnd as number, input.value.length);
			let tagName: string | undefined;

			try {
				tagName = (before.match(/\[([^\]]+)$/) as RegExpMatchArray)[1]
					.match(/^([a-z1-6]+)/)?.[1];
			} catch (_) {
				// ignore
			}

			if (tagName && autoClosingTags.indexOf(tagName) > -1) {
				const closeTag = `[/${tagName}]`;

				input.value = before + closeTag + after;
				input.selectionStart =
					input.selectionEnd = position;
				input.focus();
			}
		}
	};

	/**
	 * Adds a shortcut handler to the editor
	 */
	base.addShortcut = function (shortcut: string, cmd: string | ((this: SCEditorInstance) => boolean | void)) {
		const shortcutKey = shortcut.toLowerCase();

		if (utils.isString(cmd)) {
			shortcutHandlers[shortcutKey] = function () {
				handleCommand(toolbarButtons[cmd], base.commands[cmd]);

				return false;
			};
		} else {
			shortcutHandlers[shortcutKey] = cmd;
		}

		return base;
	};

	/**
	 * Removes a shortcut handler
	 */
	base.removeShortcut = function (shortcut: string) {
		delete shortcutHandlers[shortcut.toLowerCase()];

		return base;
	};

	/**
	 * Handles the backspace key press
	 *
	 * Will remove block styling like quotes/code ect if at the start.
	 * @private
	 */
	handleBackSpace = function (e) {
		let node: Node;
		let offset: number;
		let range: Range | undefined;
		let parent: HTMLElement | undefined;

		// 8 is the backspace key
		if (e.which !== 8) {
			return;
		}

		backSpaceHandled = true;

		if (options.disableBlockRemove ||
			!(range = (rangeHelper as RangeHelperInstance).selectedRange())) {
			return;
		}

		node = range.startContainer;
		offset = range.startOffset;

		if (offset !== 0 || !(parent = currentStyledBlockNode()) ||
			dom.is(parent, 'body')) {
			return;
		}

		while (node !== parent) {
			while (node.previousSibling) {
				node = node.previousSibling;

				// Everything but empty text nodes before the cursor
				// should prevent the style from being removed
				if (node.nodeType !== dom.TEXT_NODE || node.nodeValue) {
					return;
				}
			}

			if (!(node = node.parentNode as Node)) {
				return;
			}
		}

		// The backspace was pressed at the start of
		// the container so clear the style
		base.clearBlockFormatting(parent);
		e.preventDefault();
	};

	/**
	 * Gets the first styled block node that contains the cursor
	 */
	currentStyledBlockNode = function () {
		let block: HTMLElement | null = currentBlockNode;

		while (!block || !dom.hasStyling(block) || dom.isInline(block, true)) {
			if (!block || !(block = block.parentNode as HTMLElement | null) || dom.is(block, 'body')) {
				return undefined;

			}
		}

		return block;
	};

	/**
	 * Clears the formatting of the passed block element.
	 *
	 * If block is false, if will clear the styling of the first
	 * block level element that contains the cursor.
	 * @since 1.4.4
	 */
	base.clearBlockFormatting = function (blockArg?: HTMLElement | false) {
		const block = blockArg || currentStyledBlockNode();

		if (!block || dom.is(block, 'body')) {
			return base;
		}

		(rangeHelper as RangeHelperInstance).saveRange();

		block.className = '';

		dom.attr(block, 'style', '');

		if (!dom.is(block, 'p,div,td')) {
			dom.convertElement(block, 'p');
		}

		(rangeHelper as RangeHelperInstance).restoreRange();
		return base;
	};

	/**
	 * Triggers the valueChanged signal if there is
	 * a plugin that handles it.
	 *
	 * If rangeHelper.saveRange() has already been
	 * called, then saveRange should be set to false
	 * to prevent the range being saved twice.
	 *
	 * @since 1.4.5
	 * @param saveRange If to call rangeHelper.saveRange().
	 * @private
	 */
	triggerValueChanged = function (saveRangeArg?: boolean) {
		if (!pluginManager ||
			(!pluginManager.hasHandler('valuechangedEvent') &&
				!triggerValueChanged.hasHandler)) {
			return;
		}

		let currentHtml: string;
		const sourceMode = base.sourceMode();
		const hasSelection = !sourceMode && (rangeHelper as RangeHelperInstance).hasSelection();

		// Composition end isn't guaranteed to fire but must have
		// ended when triggerValueChanged() is called so reset it
		isComposing = false;

		// Don't need to save the range if sceditor-start-marker
		// is present as the range is already saved
		const saveRange = saveRangeArg !== false &&
			!wysiwygDocument.getElementById('sceditor-start-marker');

		// Clear any current timeout as it's now been triggered
		if (valueChangedKeyUpTimer) {
			clearTimeout(valueChangedKeyUpTimer);
			valueChangedKeyUpTimer = false;
		}

		if (hasSelection && saveRange) {
			(rangeHelper as RangeHelperInstance).saveRange();
		}

		currentHtml = sourceMode ? sourceEditor.value : wysiwygBody.innerHTML;

		// Only trigger if something has actually changed.
		if (currentHtml !== triggerValueChanged.lastVal) {
			triggerValueChanged.lastVal = currentHtml;

			dom.trigger(editorContainer, 'valuechanged', {
				rawValue: sourceMode ? base.val() : currentHtml
			});
		}

		if (hasSelection && saveRange) {
			(rangeHelper as RangeHelperInstance).removeMarkers();
		}
	};

	/**
	 * Should be called whenever there is a blur event
	 * @private
	 */
	valueChangedBlur = function () {
		if (valueChangedKeyUpTimer) {
			triggerValueChanged();
		}
	};

	/**
	 * Should be called whenever there is a keypress event
	 * @param  e The keypress event
	 * @private
	 */
	valueChangedKeyUp = function (e) {
		const which = e.which;
		const lastChar = valueChangedKeyUp.lastChar;
		const lastWasSpace = (lastChar === 13 || lastChar === 32);
		const lastWasDelete = (lastChar === 8 || lastChar === 46);

		valueChangedKeyUp.lastChar = which;

		if (isComposing) {
			return;
		}

		// 13 = return & 32 = space
		if (which === 13 || which === 32) {
			if (!lastWasSpace) {
				triggerValueChanged();
			} else {
				valueChangedKeyUp.triggerNext = true;
			}
		// 8 = backspace & 46 = del
		} else if (which === 8 || which === 46) {
			if (!lastWasDelete) {
				triggerValueChanged();
			} else {
				valueChangedKeyUp.triggerNext = true;
			}
		} else if (valueChangedKeyUp.triggerNext) {
			triggerValueChanged();
			valueChangedKeyUp.triggerNext = false;
		}

		// Clear the previous timeout and set a new one.
		clearTimeout(valueChangedKeyUpTimer as ReturnType<typeof setTimeout>);

		// Trigger the event 1.5s after the last keypress if space
		// isn't pressed. This might need to be lowered, will need
		// to look into what the slowest average Chars Per Min is.
		valueChangedKeyUpTimer = setTimeout(function () {
			if (!isComposing) {
				triggerValueChanged();
			}
		}, 1500);
	};

	handleComposition = function (e) {
		isComposing = /start/i.test(e.type);

		if (!isComposing) {
			triggerValueChanged();
		}
	};

	autoUpdate = function () {
		base.updateOriginal();
	};

	// run the initializer
	loadScripts();
}


/**
 * Map containing the loaded SCEditor locales
 * @name locale
 * @memberOf sceditor
 */
SCEditor.locale = {} as Record<string, Partial<LocaleStrings>>;

SCEditor.formats = {} as Record<string, new () => Format>;
SCEditor.icons = {} as Record<string, new () => IconPack>;


/**
 * Static command helper class
 * @class command
 * @name sceditor.command
 */
SCEditor.command =
/** @lends sceditor.command */
{
	/**
	 * Gets a command
	 *
	 * @since v1.3.5
	 */
	get: function (name: string): Command | null {
		return defaultCommands[name] || null;
	},

	/**
	 * <p>Adds a command to the editor or updates an existing
	 * command if a command with the specified name already exists.</p>
	 *
	 * <p>Once a command is add it can be included in the toolbar by
	 * adding it's name to the toolbar option in the constructor. It
	 * can also be executed manually by calling
	 * {@link sceditor.execCommand}</p>
	 *
	 * @example
	 * SCEditor.command.set("hello",
	 * {
	 *     exec: function () {
	 *         alert("Hello World!");
	 *     }
	 * });
	 *
	 * @return Returns false if name or cmd is false
	 * @since v1.3.5
	 */
	set: function (name: string, cmd: Command) {
		if (!name || !cmd) {
			return false;
		}

		// merge any existing command properties
		const merged = utils.extend(defaultCommands[name] || {}, cmd) as Command;

		merged.remove = function () {
			SCEditor.command.remove(name);
		};

		defaultCommands[name] = merged;
		return this;
	},

	/**
	 * Removes a command
	 *
	 * @since v1.3.5
	 */
	remove: function (name: string) {
		if (defaultCommands[name]) {
			delete defaultCommands[name];
		}

		return this;
	}
};
