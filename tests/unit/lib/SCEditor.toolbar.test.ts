import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import SCEditor from 'src/lib/SCEditor.js';
import defaultCommands from 'src/lib/defaultCommands.js';
import defaultOptions from 'src/lib/defaultOptions.js';

describe('lib/SCEditor - toolbar', () => {
	const $fixture = document.getElementById('qunit-module-fixture');
	let editor;
	let style;

	const toolbar = () => $fixture.querySelector('.sceditor-toolbar');

	const createEditor = (options = {}) => {
		const textarea = document.createElement('textarea');
		$fixture.replaceChildren();
		$fixture.append(textarea);

		editor = new SCEditor(textarea, {
			toolbar: 'bold,italic,underline|strike,mark|youtube,email,link|left,center,right',
			...options
		});

		return editor;
	};

	// the toolbar of a phone: one row that scrolls sideways
	const addPhoneLayout = (width) => {
		style = document.createElement('style');
		style.textContent = `.sceditor-container{width:${width}px!important}` +
			'.sceditor-toolbar{display:flex;flex-wrap:nowrap;overflow-x:auto}' +
			'.btn-group{display:inline-flex;flex-shrink:0}' +
			'.sceditor-button{display:inline-block;width:40px;height:30px}';
		document.head.append(style);
	};

	const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

	beforeEach(() => {
		SCEditor.commands       = defaultCommands;
		SCEditor.defaultOptions = defaultOptions;
	});

	afterEach(() => {
		if (style) {
			style.remove();
			style = null;
		}

		if (editor) {
			editor.destroy();
			editor = null;
		}
	});

	it('marks the sides of a toolbar that scrolls sideways where more buttons are', async () => {
		addPhoneLayout(200);
		createEditor();
		await nextFrame();

		const bar = toolbar();

		expect(bar.scrollWidth).toBeGreaterThan(bar.clientWidth);
		expect(bar.classList.contains('sceditor-toolbar-more-right')).toBe(true);
		expect(bar.classList.contains('sceditor-toolbar-more-left')).toBe(false);

		bar.scrollLeft = 40;
		bar.dispatchEvent(new Event('scroll'));

		expect(bar.classList.contains('sceditor-toolbar-more-left')).toBe(true);
		expect(bar.classList.contains('sceditor-toolbar-more-right')).toBe(true);

		bar.scrollLeft = bar.scrollWidth;
		bar.dispatchEvent(new Event('scroll'));

		expect(bar.classList.contains('sceditor-toolbar-more-left')).toBe(true);
		expect(bar.classList.contains('sceditor-toolbar-more-right')).toBe(false);
	});

	it('does not mark a toolbar where all buttons fit', async () => {
		addPhoneLayout(1000);
		createEditor();
		await nextFrame();

		expect(toolbar().classList.contains('sceditor-toolbar-more-right')).toBe(false);
		expect(toolbar().classList.contains('sceditor-toolbar-more-left')).toBe(false);
	});
});
