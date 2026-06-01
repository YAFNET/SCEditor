import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import SCEditor from 'src/lib/SCEditor.js';
import defaultCommands from 'src/lib/defaultCommands.js';
import defaultOptions from 'src/lib/defaultOptions.js';
import * as utils from 'tests/unit/utils.js';
import rangy from 'rangy';
import { testFormat } from './testFormat';

let $textarea;
let sceditor;
const $fixture = document.getElementById('qunit-module-fixture');

const reloadEditor = (config) => {
	reloadEditor.isCustomConfig = !!config;

	if (sceditor) {
		sceditor.destroy();
	}

	const textarea = document.createElement('textarea');

	textarea.style.width = '400px';
	textarea.style.height = '300px';
	textarea.value = '<p>The quick brown fox jumps over the lazy dog.<br /></p>';

	$fixture.replaceChildren();
	$fixture.append(textarea);

	sceditor = new SCEditor(textarea, config || {});
	sceditor.focus();
	$textarea = textarea;
};


describe('lib/SCEditor', () => {
	beforeAll(() => {
		SCEditor.commands       = defaultCommands;
		SCEditor.defaultOptions = defaultOptions;

		SCEditor.formats.test = testFormat;

		reloadEditor();
	});

	afterAll(() => {
		delete SCEditor.formats.test;

		if (sceditor) {
			sceditor.destroy();
		}
	});

	beforeEach(() => {
		if (reloadEditor.isCustomConfig) {
			reloadEditor();
		}

		sceditor.sourceMode(false);

		sceditor.val('<p>The quick brown fox jumps over ' +
			'the lazy dog.<br /></p>', false);
	});


	it('autofocus', () => { // jsdom: rangy.getIframeSelection not supported
		reloadEditor({
			autofocus: true,
			autofocusEnd: false
		});

		const iframe = sceditor.getContentAreaContainer();
		const body = sceditor.getBody();
		const sel = rangy.getSelection(iframe);

		expect(sel.rangeCount, 'At least 1 range exists').toBeTruthy();

		const range = sel.getRangeAt(0);
		const cursor = body.ownerDocument.createTextNode('|');

		range.insertNode(cursor);

		expect(body.firstChild).toBeNodesEqual(utils.htmlToNode(
			'<p>|The quick brown fox jumps over the lazy dog.<br></p>'
		));
	});


	it('autofocusEnd', () => { // jsdom: rangy.getIframeSelection not supported
		reloadEditor({
			autofocus: true,
			autofocusEnd: true
		});

		const iframe = sceditor.getContentAreaContainer();
		const body = sceditor.getBody();
		const sel = rangy.getSelection(iframe);

		expect(sel.rangeCount, 'At least 1 range exists').toBeTruthy();

		const range = sel.getRangeAt(0);
		const cursor = body.ownerDocument.createTextNode('|');

		range.insertNode(cursor);

		const expected = '<p>The quick brown fox jumps over the lazy dog.|<br></p>';

		expect(body.firstChild).toBeNodesEqual(utils.htmlToNode(expected));
	});


	it('readOnly()', () => { // jsdom: iframe contentEditable not updated
		const body = sceditor.getBody();

		expect(sceditor.readOnly()).toStrictEqual(false);
		expect(body.contentEditable).toStrictEqual('true');

		expect(sceditor.readOnly(true)).toBe(sceditor);
		expect(sceditor.readOnly()).toStrictEqual(true);
		expect(body.contentEditable).toStrictEqual('false');

		expect(sceditor.readOnly(false)).toBe(sceditor);
		expect(sceditor.readOnly()).toStrictEqual(false);
		expect(body.contentEditable).toStrictEqual('true');
	});


	it('rtl()', () => {
		const body = sceditor.getBody();

		expect(sceditor.rtl()).toStrictEqual(false);

		expect(sceditor.rtl(true)).toBe(sceditor);
		expect(sceditor.rtl()).toStrictEqual(true);
		expect(body.dir).toStrictEqual('rtl');

		expect(sceditor.rtl(false)).toBe(sceditor);
		expect(sceditor.rtl()).toStrictEqual(false);
		expect(body.dir).toStrictEqual('ltr');
	});


	it('width()', () => { // jsdom: getBoundingClientRect always returns 0
		const $container = $fixture.querySelector('.sceditor-container');

		expect(sceditor.width(), 'Initial width').toBeClose($container.getBoundingClientRect().width, 1);
		expect(sceditor.width('200')).toBe(sceditor);

		expect(sceditor.width()).toBeClose($container.getBoundingClientRect().width, 1);
		expect($container.getBoundingClientRect().width).toBeClose(200, 1);
	});


	it('height()', () => { // jsdom: getBoundingClientRect always returns 0
		const $container = $fixture.querySelector('.sceditor-container');

		expect(sceditor.height()).toBeClose($container.getBoundingClientRect().height, 1);
		expect(sceditor.height('200')).toBe(sceditor);

		expect(sceditor.height()).toBeClose($container.getBoundingClientRect().height, 1);
		expect($container.getBoundingClientRect().height).toBeClose(200, 1);
	});


	it('maximize()', () => { // jsdom: getBoundingClientRect always returns 0
		const $container = $fixture.querySelector('.sceditor-container');

		expect(sceditor.maximize()).toStrictEqual(false);
		expect(sceditor.maximize(true)).toBe(sceditor);
		expect(sceditor.maximize()).toStrictEqual(true);

		expect($container.getBoundingClientRect().width).toBeClose(window.innerWidth, 1);
		expect($container.getBoundingClientRect().height).toBeClose(window.innerHeight, 1);

		expect(sceditor.maximize(false)).toBe(sceditor);
		expect(sceditor.maximize()).toStrictEqual(false);
	});


	it('destroy()', () => { // jsdom: offsetWidth/Height always 0
		sceditor.destroy();

		const isVisible = !!($textarea.offsetWidth || $textarea.offsetHeight || $textarea.getClientRects().length);

		expect($fixture.querySelector('.sceditor-container')).toBe(null);
		expect(isVisible).toBeTruthy();

		// Call again to make sure no exception is thrown
		sceditor.destroy();
		sceditor.destroy();

		reloadEditor();
	});

	it('destroy() - Unbind updateOriginal', () => {
		const textarea = document.createElement('textarea');
		const submit = document.createElement('input');
		submit.type = 'submit';

		const form = document.createElement('form');
		form.addEventListener('submit', (e) => {
			e.preventDefault();
		});
		form.appendChild(submit);
		form.appendChild(textarea);

		$fixture.append(form);

		const editor = new SCEditor(textarea, { format: 'bbcode' });
		editor.val('testing');
		submit.click();

		expect(textarea.value).toBe('testing');

		editor.val('testing 123');
		editor.destroy();
		submit.click();

		expect(textarea.value).toBe('testing');
		form.parentNode.removeChild(form);
	});


	it('wysiwygEditorInsertHtml()', () => { // jsdom: rangy.getIframeSelection not supported
		sceditor.focus();
		const iframe = sceditor.getContentAreaContainer();
		const body = sceditor.getBody();
		const range = rangy.createRange(body.ownerDocument);
		const sel = rangy.getSelection(iframe);

		range.setStart(body.firstChild.firstChild, 10);
		range.setEnd(body.firstChild.firstChild, 10);
		sel.setSingleRange(range);

		sceditor.wysiwygEditorInsertHtml('<b>test</b>');

		sceditor.wysiwygEditorInsertHtml('|');

		expect(body.firstChild).toBeNodesEqual(utils.htmlToNode(
			'<p>The quick <b>test|</b>brown fox ' +
				'jumps over the lazy dog.<br /></p>'
		));
	});

	it('wysiwygEditorInsertHtml() - Start and end', () => { // jsdom: rangy.getIframeSelection not supported
		sceditor.focus();
		const iframe = sceditor.getContentAreaContainer();
		const body = sceditor.getBody();
		const range = rangy.createRange(body.ownerDocument);
		const sel = rangy.getSelection(iframe);

		range.setStart(body.firstChild.firstChild, 10);
		range.setEnd(body.firstChild.firstChild, 15);
		sel.setSingleRange(range);

		sceditor.wysiwygEditorInsertHtml('<b>', '</b>');

		sceditor.wysiwygEditorInsertHtml('|');

		expect(body.firstChild).toBeNodesEqual(utils.htmlToNode(
			'<p>The quick <b>brown|</b> fox ' +
				'jumps over the lazy dog.<br /></p>'
		));
	});


	it('wysiwygEditorInsertText()', () => { // jsdom: rangy.getIframeSelection not supported
		sceditor.focus();
		const iframe = sceditor.getContentAreaContainer();
		const body = sceditor.getBody();
		const range = rangy.createRange(body.ownerDocument);
		const sel = rangy.getSelection(iframe);

		range.setStart(body.firstChild.firstChild, 10);
		range.setEnd(body.firstChild.firstChild, 10);
		sel.setSingleRange(range);

		sceditor.wysiwygEditorInsertText('<&>test');

		sceditor.wysiwygEditorInsertText('|');

		expect(body.firstChild).toBeNodesEqual(utils.htmlToNode(
			'<p>The quick &lt;&amp;&gt;test|brown fox ' +
				'jumps over the lazy dog.<br /></p>'
		));
	});

	it('wysiwygEditorInsertText() - Start and end', () => { // jsdom: rangy.getIframeSelection not supported
		const iframe = sceditor.getContentAreaContainer();
		const body = sceditor.getBody();
		const range = rangy.createRange(body.ownerDocument);
		const sel = rangy.getSelection(iframe);

		range.setStart(body.firstChild.firstChild, 10);
		range.setEnd(body.firstChild.firstChild, 15);
		sel.setSingleRange(range);

		sceditor.wysiwygEditorInsertText('<b>', '</b>');

		sceditor.wysiwygEditorInsertText('|');

		expect(body.firstChild).toBeNodesEqual(utils.htmlToNode(
			'<p>The quick &lt;b&gt;brown&lt;/b&gt;| fox ' +
				'jumps over the lazy dog.<br /></p>'
		));
	});


	it('sourceEditorInsertText()', () => { // jsdom: .sceditor-container not rendered
		const sourceEditor = document.querySelector('.sceditor-container textarea');

		sceditor.sourceMode(true);
		sceditor.val('<p>The quick brown fox jumps ' +
			'over the lazy dog.<br /></p>');
		sceditor.sourceEditorCaret({
			start: 13,
			end: 13
		});
		sceditor.sourceEditorInsertText('light-');
		sceditor.sourceEditorInsertText('|');

		expect(sourceEditor.value).toBeHtmlEqual(
			'<p>The quick light-|brown fox jumps over the lazy dog.<br /></p>'
		);
	});

	it('sourceEditorInsertText() - Start and end', () => { // jsdom: .sceditor-container not rendered
		sceditor.sourceMode(true);
		sceditor.val('<p>The quick brown fox jumps ' +
			'over the lazy dog.<br /></p>');
		sceditor.sourceEditorCaret({
			start: 13,
			end: 18
		});
		sceditor.sourceEditorInsertText('"', '"');
		sceditor.sourceEditorInsertText('|');

		expect(sceditor.val()).toBeHtmlEqual(
			'<p>The quick "brown|" fox jumps over the lazy dog.<br /></p>'
		);
	});


	it('getWysiwygEditorValue() - Filter', () => { // jsdom: getRangeHelper() returns null
		sceditor.getRangeHelper().clear();

		expect(sceditor.getWysiwygEditorValue()).toBeHtmlEqual(
			'<p>The quick brown fox jumps over the lazy dog.<br /></p>'
		);

		expect(sceditor.getWysiwygEditorValue(true)).toBeHtmlEqual(
			'<p>The quick brown fox jumps over the lazy dog.<br /></p>'
		);


		reloadEditor({
			format: 'test'
		});

		sceditor.getRangeHelper().clear();

		expect(sceditor.getWysiwygEditorValue(false)).toBeHtmlEqual(
			'<p><b>test wysiwyg</b></p>'
		);

		expect(sceditor.getWysiwygEditorValue(true)).toBeHtmlEqual(
			'<p><b>test source</b></p>'
		);
	});

	it('getSourceEditorValue()', () => { // jsdom: getRangeHelper() returns null
		sceditor.getRangeHelper().clear();
		sceditor.sourceMode(true);
		sceditor.val('<p>The quick brown fox jumps ' +
			'over the lazy dog.<br /></p>');

		expect(sceditor.getSourceEditorValue(true)).toBeHtmlEqual(
			'<p>The quick brown fox jumps over the lazy dog.<br /></p>'
		);

		expect(sceditor.getSourceEditorValue(false)).toBeHtmlEqual(
			'<p>The quick brown fox jumps over the lazy dog.<br /></p>'
		);
	});

	it('getSourceEditorValue() - Uses format', () => { // jsdom: getRangeHelper() returns null
		reloadEditor({
			format: 'test'
		});

		sceditor.getRangeHelper().clear();
		sceditor.sourceMode(true);
		expect(sceditor.getSourceEditorValue(false)).toBeHtmlEqual(
			'<p><b>test source</b></p>'
		);

		expect(sceditor.getSourceEditorValue(true)).toBeHtmlEqual(
			'<p><b>test wysiwyg</b></p>'
		);
	});


	it('updateOriginal()', () => { // jsdom: body.innerHTML changes not propagated
		const textarea = document.querySelectorAll('textarea')[1];
		const body = sceditor.getBody();

		body.innerHTML = '<div>text 1234...</div>';

		sceditor.getRangeHelper().clear();
		sceditor.updateOriginal();

		expect(textarea.value).toBeHtmlEqual('<div>text 1234...</div>');
	});

	it('Insert HTML filter JS', async () => { // jsdom: image error event not fired
		reloadEditor({
			format: 'bbcode'
		});

		let called = false;
		sceditor.getBody().xss = () => { called = true; };
		sceditor.wysiwygEditorInsertHtml('<img src="http://url.to.file.which/not.exist" onerror=body.xss();>');

		await new Promise((resolve) => {
			sceditor.getBody().addEventListener('error', () => {
				setTimeout(() => {
					expect(called).toBeFalsy();
					resolve();
				}, 1);
			}, true);
		});
	});


	it('Do not wrap whitespace text nodes', () => { // jsdom: body.innerHTML changes not propagated
		const body = sceditor.getBody();
		const rangeHelper = sceditor.getRangeHelper();
		const testHtml = '<p>test</p>     ';

		sceditor.focus();

		body.innerHTML = testHtml;

		let range = rangeHelper.cloneSelected();
		range.setStartAfter(body.firstChild.firstChild);
		range.collapse(true);
		rangeHelper.selectRange(range);
		body.dispatchEvent(new Event('selectionchange'));

		range = rangeHelper.cloneSelected();
		range.setStart(body.lastChild, 1);
		range.collapse(true);
		rangeHelper.selectRange(range);
		body.dispatchEvent(new Event('selectionchange'));

		expect(body.innerHTML).toBeHtmlEqual(testHtml);
	});

});
