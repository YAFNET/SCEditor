import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import SCEditor from 'src/lib/SCEditor.js';
import defaultCommands from 'src/lib/defaultCommands.js';
import defaultOptions from 'src/lib/defaultOptions.js';

describe('lib/SCEditor - dropdowns', () => {
	const $fixture = document.getElementById('qunit-module-fixture');
	let editor;
	let submitted;
	let style;

	// records a form submit nobody stopped and stops it, so a failing
	// test does not reload the test page
	const recordSubmit = (e) => {
		submitted = submitted || !e.defaultPrevented;
		e.preventDefault();
	};

	const container = () => $fixture.querySelector('.sceditor-container');
	const dropdown = () => container().querySelector('.sceditor-dropdown');

	const createEditor = (options = {}) => {
		const textarea = document.createElement('textarea');
		$fixture.replaceChildren();
		$fixture.append(textarea);

		editor = new SCEditor(textarea, {
			toolbar: 'youtube,vimeo,media,email,link',
			...options
		});

		return editor;
	};

	const open = (command) => {
		container().querySelector(`.sceditor-button-${command}`).click();

		return dropdown();
	};

	beforeEach(() => {
		SCEditor.commands       = defaultCommands;
		SCEditor.defaultOptions = defaultOptions;
		submitted = false;
		window.addEventListener('submit', recordSubmit);

		// The layout of a Bootstrap page: positioned card and button groups
		style = document.createElement('style');
		style.textContent = '.sceditor-container{position:relative}' +
			'.btn-group{position:relative;display:inline-flex}' +
			'.sceditor-button{display:inline-block;width:40px;height:30px}' +
			'.dropdown-menu{position:absolute}';
		document.head.append(style);
	});

	afterEach(() => {
		window.removeEventListener('submit', recordSubmit);
		style.remove();

		if (editor) {
			editor.destroy();
			editor = null;
		}
	});

	it('Enter in the YouTube dialog inserts the video instead of sending the form', async () => {
		createEditor();

		const input = open('youtube').querySelector('#link');
		input.value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
		input.focus();

		await userEvent.keyboard('{Enter}');

		expect(submitted).toBe(false);
		expect(dropdown()).toBeNull();
		expect(editor.getBody().querySelector('iframe').src)
			.toContain('youtube.com/embed/dQw4w9WgXcQ');
	});

	it('Enter in the media dialog does not send the form', async () => {
		createEditor();

		const input = open('media').querySelector('#link');
		input.value = 'https://example.com/video';
		input.focus();

		await userEvent.keyboard('{Enter}');

		expect(submitted).toBe(false);
		expect(editor.getBody().innerHTML).toContain('[media]https://example.com/video[/media]');
	});

	it('a dialog opens below its button when the toolbar wraps and stays inside the editor', () => {
		style.textContent += '.sceditor-container{width:240px!important}';

		{
			createEditor({ toolbar: 'bold,italic,underline|strike,mark|youtube,email,link' });

			const button = container().querySelector('.sceditor-button-link');
			const firstButton = container().querySelector('.sceditor-button-bold');

			// the link button is on a lower toolbar row
			expect(button.getBoundingClientRect().top)
				.toBeGreaterThan(firstButton.getBoundingClientRect().bottom - 1);

			button.click();

			const buttonRect = button.getBoundingClientRect();
			const dropdownRect = dropdown().getBoundingClientRect();
			const containerRect = container().getBoundingClientRect();

			expect(Math.round(dropdownRect.top)).toBe(Math.round(buttonRect.bottom));
			expect(dropdownRect.right).toBeLessThanOrEqual(containerRect.right);
			expect(dropdownRect.left).toBeGreaterThanOrEqual(containerRect.left);
		}
	});

	it('a second click on the button closes its dialog', async () => {
		createEditor();

		const button = container().querySelector('.sceditor-button-link');

		await userEvent.click(button);
		expect(dropdown()).not.toBeNull();

		await userEvent.click(button);
		expect(dropdown()).toBeNull();

		// a click on another button opens the other dialog
		await userEvent.click(button);
		await userEvent.click(container().querySelector('.sceditor-button-email'));
		expect(dropdown().querySelector('#email')).not.toBeNull();
	});

	it('Escape closes the dialog', async () => {
		createEditor();

		open('link').querySelector('#link').focus();

		await userEvent.keyboard('{Escape}');

		expect(dropdown()).toBeNull();
	});

	it('Escape and the arrow keys in a dialog do not reach the key handler of Bootstrap dropdowns', async () => {
		createEditor({ toolbar: 'link,note' });

		// Bootstrap listens for these keys in .dropdown-menu elements on
		// the document in the capture phase
		const reached = [];
		const bootstrapHandler = (e) => {
			if (e.target.closest && e.target.closest('.dropdown-menu')) {
				reached.push(e.key);
			}
		};

		document.addEventListener('keydown', bootstrapHandler, true);

		try {
			const select = open('note').querySelector('#type');
			select.focus();

			await userEvent.keyboard('{ArrowDown}');

			open('link').querySelector('#link').focus();

			await userEvent.keyboard('{Escape}');

			expect(reached).toEqual([]);
			expect(dropdown()).toBeNull();
		} finally {
			document.removeEventListener('keydown', bootstrapHandler, true);
		}
	});

	it('Enter in the e-mail dialog inserts the address', async () => {
		createEditor();

		const input = open('email').querySelector('#email');
		input.value = 'someone@example.com';
		input.focus();

		await userEvent.keyboard('{Enter}');

		expect(submitted).toBe(false);
		expect(editor.getBody().querySelector('a').href).toBe('mailto:someone@example.com');
	});
});
