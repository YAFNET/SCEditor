import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import SCEditor from 'src/lib/SCEditor.js';
import defaultCommands from 'src/lib/defaultCommands.js';
import defaultOptions from 'src/lib/defaultOptions.js';

describe('lib/SCEditor - dropdowns', () => {
	const $fixture = document.getElementById('qunit-module-fixture');
	let editor;
	let submitted;

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
	});

	afterEach(() => {
		window.removeEventListener('submit', recordSubmit);

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
