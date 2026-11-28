import { describe, it, expect, afterEach } from 'vitest';
import SCEditor from 'src/lib/SCEditor.js';
import defaultCommands from 'src/lib/defaultCommands.js';
import defaultOptions from 'src/lib/defaultOptions.js';
import { getLocaleUrl, loadLocale } from 'src/lib/locale.js';

const scriptSrc = 'https://forum.example/js/sceditor/sceditor.min.js';

describe('lib/locale', () => {
	it('getLocaleUrl() - next to the script, not relative to the page', () => {
		expect(getLocaleUrl('de', '', scriptSrc))
			.toBe('https://forum.example/js/sceditor/languages/de.js');
	});

	it('getLocaleUrl() - basePath is the folder of the languages folder', () => {
		expect(getLocaleUrl('de', '/js/sceditor', scriptSrc))
			.toBe('/js/sceditor/languages/de.js');
		expect(getLocaleUrl('de', '/js/sceditor/', scriptSrc))
			.toBe('/js/sceditor/languages/de.js');
		expect(getLocaleUrl('pt-BR', 'https://cdn.example/sceditor/', scriptSrc))
			.toBe('https://cdn.example/sceditor/languages/pt-BR.js');
	});

	it('getLocaleUrl() - without script url and basePath relative to the page', () => {
		expect(getLocaleUrl('de', '', '')).toBe('../languages/de.js');
	});

	it('loadLocale() - a missing file rejects', async () => {
		await expect(loadLocale('/does-not-exist/languages/xx.js'))
			.rejects.toThrow('/does-not-exist/languages/xx.js');
	});

	it('loadLocale() - a file is loaded only once', () => {
		const url = '/does-not-exist/languages/once.js';
		const first = loadLocale(url);
		const second = loadLocale(url);

		expect(second).toBe(first);
		expect(document.querySelectorAll(`script[src="${url}"]`).length).toBe(1);

		return first.catch(() => undefined);
	});
});

describe('lib/SCEditor - locale', () => {
	let editor;

	const createEditor = (options) => {
		SCEditor.commands = defaultCommands;
		SCEditor.defaultOptions = defaultOptions;

		const textarea = document.createElement('textarea');
		document.body.append(textarea);

		editor = new SCEditor(textarea, options);

		return textarea;
	};

	const waitForEditor = async (textarea) => {
		for (let i = 0; i < 100 && !textarea.previousElementSibling?.classList.contains('sceditor-container'); i++) {
			await new Promise(resolve => setTimeout(resolve, 20));
		}

		return textarea.previousElementSibling;
	};

	afterEach(() => {
		delete SCEditor.locale.zz;
		editor?.destroy();
		editor = null;
	});

	it('starts without the language file', async () => {
		const textarea = createEditor({
			locale: 'xx',
			basePath: '/does-not-exist/'
		});

		const container = await waitForEditor(textarea);

		expect(container?.classList.contains('sceditor-container')).toBe(true);
	});

	it('does not load a registered locale', () => {
		SCEditor.locale.zz = { Bold: 'Fett' };

		const textarea = createEditor({
			locale: 'zz',
			basePath: '/does-not-exist/'
		});

		// created right away, no language file requested
		expect(textarea.previousElementSibling?.classList.contains('sceditor-container')).toBe(true);
		expect(document.querySelector('script[src*="languages/zz.js"]')).toBeNull();
	});
});
