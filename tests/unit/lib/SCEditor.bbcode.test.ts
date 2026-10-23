import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import SCEditor from 'src/lib/SCEditor.js';
import defaultCommands from 'src/lib/defaultCommands.js';
import defaultOptions from 'src/lib/defaultOptions.js';
import 'src/formats/bbcode.js';

const $fixture = document.getElementById('qunit-module-fixture');
let sceditor;

describe('lib/SCEditor - bbcode format', () => {
	beforeAll(() => {
		SCEditor.commands       = defaultCommands;
		SCEditor.defaultOptions = defaultOptions;

		const textarea = document.createElement('textarea');

		$fixture.replaceChildren();
		$fixture.append(textarea);

		sceditor = new SCEditor(textarea, { format: 'bbcode' });
	});

	afterAll(() => {
		sceditor.destroy();
	});


	it('toBBCode() strips XSS', () => {
		// toBBCode() appends the HTML to the document while converting, so
		// capture what's added to check the sanitized markup is used
		const observer = new MutationObserver(() => {});

		observer.observe(document.body, { childList: true, subtree: true });
		sceditor.toBBCode('<img src="/x.png" onerror="document.body.xss()">');

		const images = observer.takeRecords().flatMap((mutation) =>
			Array.from(mutation.addedNodes).flatMap((node) =>
				node.nodeType === 1 ? Array.from(node.querySelectorAll('img')) : []
			)
		);

		observer.disconnect();

		expect(images.length).toBeGreaterThan(0);
		images.forEach((img) => {
			expect(img.hasAttribute('onerror')).toBe(false);
		});
	});

});
