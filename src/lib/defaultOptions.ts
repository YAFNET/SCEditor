import { attr } from './dom.js';
import type { SCEditorOptions } from './types.js';

/**
 * Default options for SCEditor
 */
const defaultOptions: SCEditorOptions = {
	/** @lends sceditor.defaultOptions */
	/**
	 * Toolbar buttons order and groups. Should be comma separated and
	 * have a bar | to separate groups
	 */
	toolbar: 'bold,italic,underline,strike|' +
		'font,size,color|mark|' +
		'email,link,unlink,quote,code|image|note|' +
		'bulletlist,orderedlist|left,center,right|' +
		'cut,copy,pastetext,removeformat|' +
		'undo,redo|' +
		'youtube,vimeo,instagram,facebook,media,extensions|source|reply',

	/**
	 * Comma separated list of commands to excludes from the toolbar
	 */
	toolbarExclude: null,

	/**
	 * Maximum Number of allowed Characters
	 */
	maxLength: null,

	/**
	 * Stylesheet to include in the WYSIWYG editor. This is what will style
	 * the WYSIWYG elements
	 */
	styles: [],

	/**
	 * The bootstrap theme mode. This will be applied to the editor WYSIWYG mode (iframe)
	 */
	themeMode: attr(document.documentElement, 'data-bs-theme') || 'light',

	/**
	 * Comma separated list of fonts for the font selector
	 */
	fonts: 'Arial,Arial Black,Comic Sans MS,Courier New,Georgia,Impact,' +
		'Sans-serif,Serif,Times New Roman,Trebuchet MS,Verdana',

	/**
	 * Default format
	 */
	format: 'bbcode',

	/**
	 * Default icon set
	 */
	icons: 'fontawesome',

	/**
	 * Comma separated list of code languages for the code block selector
	 */
	codeLanguages: [
		{ Value: 'markup', Text: 'Plain Text' },
		{ Value: 'bash', Text: 'Bash(shell)' },
		{ Value: 'c', Text: 'C' },
		{ Value: 'cpp', Text: 'C++' },
		{ Value: 'csharp', Text: 'C#' },
		{ Value: 'css', Text: 'CSS' },
		{ Value: 'scss', Text: 'SCSS' },
		{ Value: 'git', Text: 'Git' },
		{ Value: 'markup', Text: 'HTML' },
		{ Value: 'java', Text: 'Java' },
		{ Value: 'javascript', Text: 'JavaScript' },
		{ Value: 'json', Text: 'JSON' },
		{ Value: 'python', Text: 'Python' },
		{ Value: 'sql', Text: 'SQL' },
		{ Value: 'markup', Text: 'XML' },
		{ Value: 'vb', Text: 'Visual Basic' },
		{ Value: 'stacktrace', Text: 'StackTrace' }
	],

	/**
	 * Comma separated list of note types for the alerts
	 */
	noteTypes: 'primary,secondary,success,danger,warning,info,light,dark',

	/**
	 * Colors should be comma separated and have a bar | to signal a new
	 * column.
	 *
	 * If null the colors will be auto generated.
	 */
	colors: '#000000,#44B8FF,#1E92F7,#0074D9,#005DC2,#00369B,#b3d5f4|' +
		'#444444,#C3FFFF,#9DF9FF,#7FDBFF,#68C4E8,#419DC1,#d9f4ff|' +
		'#666666,#72FF84,#4CEA5E,#2ECC40,#17B529,#008E02,#c0f0c6|' +
		'#888888,#FFFF44,#FFFA1E,#FFDC00,#E8C500,#C19E00,#fff5b3|' +
		'#aaaaaa,#FFC95F,#FFA339,#FF851B,#E86E04,#C14700,#ffdbbb|' +
		'#cccccc,#FF857A,#FF5F54,#FF4136,#E82A1F,#C10300,#ffc6c3|' +
		'#eeeeee,#FF56FF,#FF30DC,#F012BE,#D900A7,#B20080,#fbb8ec|' +
		'#ffffff,#F551FF,#CF2BE7,#B10DC9,#9A00B2,#9A00B2,#e8b6ef',

	/**
	 * The locale to use.
	 */
	locale: attr(document.documentElement, 'lang') || 'en',

	/**
	 * The Charset to use
	 */
	charset: 'utf-8',

	/**
	 * Width of the editor. Set to null for automatic with
	 */
	width: '100%',

	/**
	 * Height of the editor including toolbar. Set to null for automatic
	 * height
	 */
	height: null,

	/**
	 * If to allow the editor to be resized
	 */
	resizeEnabled: true,

	/**
	 * Min resize to width, set to null for half textarea width or -1 for
	 * unlimited
	 */
	resizeMinWidth: null,
	/**
	 * Min resize to height, set to null for half textarea height or -1 for
	 * unlimited
	 */
	resizeMinHeight: null,
	/**
	 * Max resize to height, set to null for double textarea height or -1
	 * for unlimited
	 */
	resizeMaxHeight: null,
	/**
	 * Max resize to width, set to null for double textarea width or -1 for
	 * unlimited
	 */
	resizeMaxWidth: null,
	/**
	 * If resizing by height is enabled
	 */
	resizeHeight: true,
	/**
	 * If resizing by width is enabled
	 */
	resizeWidth: true,

	/**
	 * Date format, will be overridden if locale specifies one.
	 *
	 * The words year, month and day will be replaced with the users current
	 * year, month and day.
	 */
	dateFormat: 'year-month-day',

	/**
	 * Element to inset the toolbar into.
	 */
	toolbarContainer: null,

	/**
	 * If to enable paste filtering. This is currently experimental, please
	 * report any issues.
	 */
	enablePasteFiltering: true,

	/**
	 * If to completely disable pasting into the editor
	 */
	disablePasting: false,

	/**
	 * If the editor is read only.
	 */
	readOnly: false,

	/**
	 * If to set the editor to right-to-left mode.
	 *
	 * If set to null the direction will be automatically detected.
	 */
	rtl: false,

	/**
	 * If to auto focus the editor on page load
	 */
	autofocus: false,

	/**
	 * If to auto focus the editor to the end of the content
	 */
	autofocusEnd: true,

	/**
	 * If to auto expand the editor to fix the content
	 */
	autoExpand: false,

	/**
	 * If to auto update original textbox on blur
	 */
	autoUpdate: false,

	/**
	 * If to enable the browsers built in spell checker
	 */
	spellcheck: true,

	/**
	 * If to run the source editor when there is no WYSIWYG support. Only
	 * really applies to mobile OS's.
	 */
	runWithoutWysiwygSupport: false,

	/**
	 * If to load the editor in source mode and still allow switching
	 * between WYSIWYG and source mode
	 */
	startInSourceMode: false,

	/**
	 * Optional ID to give the editor.
	 */
	id: null,

	/**
	 * Comma separated list of plugins
	 */
	plugins: 'undo,dragdrop',

	/**
	 * z-index to set the editor container to. Needed for jQuery UI dialog.
	 */
	zIndex: null,

	/**
	 * If to trim the BBCode. Removes any spaces at the start and end of the
	 * BBCode string.
	 */
	bbcodeTrim: false,

	/**
	 * If to disable removing block level elements by pressing backspace at
	 * the start of them
	 */
	disableBlockRemove: true,

	/**
	 * Array of allowed URL (should be either strings or regex) for iframes.
	 *
	 * If it's a string then iframes where the start of the src matches the
	 * specified string will be allowed.
	 *
	 * If it's a regex then iframes where the src matches the regex will be
	 * allowed.
	 */
	allowedIframeUrls: [],

	/**
	 * BBCode parser options, only applies if using the editor in BBCode
	 * mode.
	 *
	 * See SCEditor.BBCodeParser.defaults for list of valid options
	 */
	parserOptions: {},

	/**
	 * CSS that will be added to the to dropdown menu (eg. z-index)
	 */
	dropDownCss: {},

	/**
	 * An array of tags that are allowed in the editor content.
	 * If a tag is not listed here, it will be removed when the content is
	 * sanitized.
	 *
	 * 1 Tag is already added by default: ['iframe']. No need to add this
	 * further.
	 */
	allowedTags: [],

	/**
	 * An array of attributes that are allowed on tags in the editor content.
	 * If an attribute is not listed here, it will be removed when the content
	 * is sanitized.
	 *
	 * 3 Attributes are already added by default:
	 * 	['allowfullscreen', 'frameborder', 'target'].
	 * No need to add these further.
	 */
	allowedAttributes: ['contenteditable'],

	/**
	 * Url for the BBCode Extensions json
	 */
	extensionsUrl: '',

	/**
	 * Application root url
	 */
	root: '',

	/**
	 * Attachments preview url
	 */
	attachmentsPreviewUrl: '',

	/**
	 * Albums preview url
	 */
	albumsPreviewUrl: '',

	/**
	 * mentions url
	 */
	mentionsUrl: '',

	onToggleMode: undefined,

	/**
	* Default path for the script files
	*/
	basePath: ''
};

export default defaultOptions;
