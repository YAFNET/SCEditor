/**
 * SCEditor Attachment Preview Plugin
 *
 * Shows the [attach]id[/attach] BBCodes in the editor as the attachment:
 * an image or the name of the file, instead of the BBCode text. The
 * attachments are loaded from the attachmentsPreviewUrl option (the ids are
 * appended, separated by commas), which returns a JSON list of
 * { id, fileName, isImage, url } for the attachments the user may see. The
 * other ids show a placeholder with the id; the BBCode stays the same.
 *
 * Usage:
 *   plugins: 'attachpreview',
 *   attachmentsPreviewUrl: '/api/Attachment/GetEditorPreviews?ids='
 *
 * Without the option the BBCode stays text.
 */
import SCEditor from '../lib/SCEditor.js';
import PluginManager from '../lib/PluginManager.js';
import '../formats/bbcode.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface AttachmentPreview {
	id: number;
	fileName: string;
	isImage: boolean;
	url: string;
}

const bbcode = SCEditor.formats.bbcode as Any;

/** An attachment id: a whole number */
const ID = /^\d{1,10}$/;

/** Only a link of the site or an http(s) link is shown */
const SAFE_URL = /^(\/(?!\/)|https?:\/\/)/i;

/**
 * The element of an [attach] BBCode before its preview is loaded
 */
function placeholder(id: string): string {
	return `<span class="bbcode-attach" contenteditable="false" data-attach-id="${id}">` +
		`<i class="fa fa-paperclip" aria-hidden="true"></i><span class="bbcode-attach-name">${id}</span></span>`;
}

PluginManager.plugins.attachpreview = function (this: Any) {
	const base = this;
	let editor: Any;
	let enabled = false;
	let observer: MutationObserver | null = null;
	let refreshTimer: ReturnType<typeof setTimeout> | null = null;

	// the loaded attachments (null: no preview for this id)
	const cache = new Map<string, AttachmentPreview | null>();
	const loading = new Set<string>();

	base.init = function (this: Any) {
		editor = this;

		// BBCode only, and only with the url of the previews
		if ((editor.opts.format && editor.opts.format !== 'bbcode') || !editor.opts.attachmentsPreviewUrl) {
			return;
		}

		enabled = true;

		bbcode.set('attach', {
			tags: {
				span: {
					'data-attach-id': null
				}
			},
			isInline: true,
			allowsEmpty: true,
			allowedChildren: ['#'],
			format: function (element: HTMLElement) {
				return `[attach]${element.getAttribute('data-attach-id')}[/attach]`;
			},
			html: function (_token: Any, _attrs: Any, content: string) {
				const id = (content || '').trim();

				// not an attachment id: the text as it is
				return ID.test(id) ? placeholder(id) : `[attach]${content}[/attach]`;
			}
		});
	};

	base.signalReady = function () {
		if (!enabled) {
			return;
		}

		const body = editor.getBody() as HTMLElement;

		// every way an [attach] gets into the editor (value, insert, the
		// attachments dialog, an upload, the source mode) adds an element
		observer = new MutationObserver(scheduleRefresh);
		observer.observe(body, { childList: true, subtree: true });

		refresh();
	};

	function scheduleRefresh() {
		if (refreshTimer === null) {
			refreshTimer = setTimeout(function () {
				refreshTimer = null;
				refresh();
			}, 0);
		}
	}

	/**
	 * Shows the loaded attachments, loads the new ones
	 */
	function refresh() {
		const body = editor.getBody() as HTMLElement | null;

		if (!body) {
			return;
		}

		const missing = new Set<string>();

		body.querySelectorAll<HTMLElement>('.bbcode-attach[data-attach-id]:not([data-attach-state])')
			.forEach(function (element) {
				const id = element.getAttribute('data-attach-id') || '';

				if (cache.has(id)) {
					show(element, cache.get(id) || null);
				} else if (!loading.has(id)) {
					missing.add(id);
				}
			});

		if (missing.size) {
			load(Array.from(missing));
		}
	}

	function load(ids: string[]) {
		ids.forEach(id => loading.add(id));

		fetch(editor.opts.attachmentsPreviewUrl + ids.join(','), { credentials: 'same-origin' })
			.then(response => response.ok ? response.json() : [])
			.catch(() => [])
			.then(function (previews: AttachmentPreview[]) {
				ids.forEach(function (id) {
					loading.delete(id);
					cache.set(id, null);
				});

				(Array.isArray(previews) ? previews : []).forEach(function (preview) {
					if (preview && ids.includes(String(preview.id))) {
						cache.set(String(preview.id), preview);
					}
				});

				refresh();
			});
	}

	/**
	 * Shows the preview of an attachment in its element
	 */
	function show(element: HTMLElement, preview: AttachmentPreview | null) {
		const doc = element.ownerDocument;

		element.setAttribute('data-attach-state', preview ? 'loaded' : 'missing');

		if (!preview) {
			return;
		}

		element.title = preview.fileName;
		element.replaceChildren();

		if (preview.isImage && SAFE_URL.test(preview.url || '')) {
			const image = doc.createElement('img');
			image.className = 'bbcode-attach-image';
			image.src = preview.url;
			image.alt = preview.fileName;
			element.appendChild(image);
			return;
		}

		const icon = doc.createElement('i');
		icon.className = 'fa fa-file';
		icon.setAttribute('aria-hidden', 'true');

		const name = doc.createElement('span');
		name.className = 'bbcode-attach-name';
		name.textContent = preview.fileName;

		element.append(icon, name);
	}

	base.destroy = function () {
		if (observer) {
			observer.disconnect();
			observer = null;
		}

		if (refreshTimer !== null) {
			clearTimeout(refreshTimer);
			refreshTimer = null;
		}
	};
} as Any;
