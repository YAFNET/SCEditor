import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SCEditor from 'src/lib/SCEditor.js';
import defaultCommands from 'src/lib/defaultCommands.js';
import defaultOptions from 'src/lib/defaultOptions.js';
import 'src/formats/bbcode.js';
import 'src/plugins/attachpreview.js';

describe('plugins/attachpreview', () => {
	const $fixture = document.getElementById('qunit-module-fixture');
	let editor;
	let requests;

	const previews = {
		5: { id: 5, fileName: 'photo.png', isImage: true, url: '/api/Attachments/GetAttachment?attachmentId=5&sig=x' },
		6: { id: 6, fileName: 'notes <b>.txt', isImage: false, url: '/api/Attachments/GetAttachment?attachmentId=6&sig=y' },
		7: { id: 7, fileName: 'evil.png', isImage: true, url: 'javascript:alert(1)' }
	};

	const createEditor = (options = {}) => {
		const textarea = document.createElement('textarea');
		$fixture.replaceChildren();
		$fixture.append(textarea);

		editor = new SCEditor(textarea, {
			format: 'bbcode',
			plugins: 'attachpreview',
			attachmentsPreviewUrl: '/api/Attachment/GetEditorPreviews?ids=',
			...options
		});

		// the plugins get the ready signal when the page has loaded
		editor.pluginManager?.call?.('ready');

		return editor;
	};

	const attachments = () => Array.from(editor.getBody().querySelectorAll('.bbcode-attach'));

	const settle = () => vi.waitFor(() => {
		expect(attachments().every(a => a.hasAttribute('data-attach-state'))).toBe(true);
	});

	beforeEach(() => {
		SCEditor.commands       = defaultCommands;
		SCEditor.defaultOptions = defaultOptions;
		requests = [];

		vi.stubGlobal('fetch', vi.fn((url) => {
			requests.push(url);
			const ids = url.substring(url.indexOf('=') + 1).split(',');

			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve(ids.map(id => previews[id]).filter(Boolean))
			});
		}));
	});

	afterEach(() => {
		vi.unstubAllGlobals();

		if (editor) {
			editor.destroy();
			editor = null;
		}

		// the plugin adds the attach BBCode to the format of the page
		SCEditor.formats.bbcode.remove('attach');
	});

	it('shows an image attachment as the image and keeps the BBCode', async () => {
		createEditor();
		editor.val('before [attach]5[/attach] after');

		await settle();

		const image = editor.getBody().querySelector('.bbcode-attach img');
		expect(image.getAttribute('src')).toBe(previews[5].url);
		expect(image.getAttribute('alt')).toBe('photo.png');
		expect(editor.val().trim()).toBe('before [attach]5[/attach] after');
	});

	it('shows a file attachment with its name (as text, not html)', async () => {
		createEditor();
		editor.val('[attach]6[/attach]');

		await settle();

		const element = attachments()[0];
		expect(element.querySelector('.bbcode-attach-name').textContent).toBe('notes <b>.txt');
		expect(element.querySelector('b')).toBeNull();
		expect(editor.val().trim()).toBe('[attach]6[/attach]');
	});

	it('an attachment without a preview keeps the placeholder with its id', async () => {
		createEditor();
		editor.val('[attach]99[/attach]');

		await settle();

		const element = attachments()[0];
		expect(element.getAttribute('data-attach-state')).toBe('missing');
		expect(element.textContent).toContain('99');
		expect(editor.val().trim()).toBe('[attach]99[/attach]');
	});

	it('an image with a link that is no web link is not shown as an image', async () => {
		createEditor();
		editor.val('[attach]7[/attach]');

		await settle();

		expect(editor.getBody().querySelector('img')).toBeNull();
		expect(attachments()[0].textContent).toContain('evil.png');
	});

	it('loads all attachments with one request and each id only once', async () => {
		createEditor();
		editor.val('[attach]5[/attach] [attach]6[/attach] [attach]5[/attach]');

		await settle();

		expect(requests).toHaveLength(1);
		expect(requests[0].split('=')[1].split(',').sort()).toEqual(['5', '6']);

		// switching to the source and back uses the loaded attachments
		editor.sourceMode(true);
		editor.sourceMode(false);

		await settle();

		expect(requests).toHaveLength(1);
		expect(editor.getBody().querySelectorAll('.bbcode-attach img')).toHaveLength(2);
	});

	it('an attachment inserted later is shown too', async () => {
		createEditor();
		editor.val('text');

		editor.insert('[attach]6[/attach]');

		await settle();

		expect(attachments()[0].querySelector('.bbcode-attach-name').textContent).toBe('notes <b>.txt');
	});

	it('an [attach] without an attachment id stays text', () => {
		createEditor();
		editor.val('[attach]abc[/attach]');

		expect(attachments()).toHaveLength(0);
		expect(editor.getBody().textContent).toContain('[attach]abc[/attach]');
	});

	it('without the url of the previews the BBCode stays text', () => {
		createEditor({ attachmentsPreviewUrl: '' });
		editor.val('[attach]5[/attach]');

		expect(attachments()).toHaveLength(0);
		expect(requests).toHaveLength(0);
	});
});
