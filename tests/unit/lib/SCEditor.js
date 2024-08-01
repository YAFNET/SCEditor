import SCEditor from 'src/lib/SCEditor.js';
import defaultCommands from 'src/lib/defaultCommands.js';
import defaultOptions from 'src/lib/defaultOptions.js';
import * as utils from 'tests/unit/utils.js';
import rangy from 'rangy';


var $textarea;
var sceditor;
var $fixture = $('#qunit-module-fixture');

var testFormat = function () {
	this.toHtml = function () {
		return '<p><b>test wysiwyg</b></p>';
	};

	this.toSource = function () {
		return '<p><b>test source</b></p>';
	};
};

var reloadEditor = function (config) {
	reloadEditor.isCustomConfig = !!config;

	if (sceditor) {
		sceditor.destroy();
	}

	const textarea = $('<textarea></textarea>')
		.width(400)
		.height(300)
		.val('<p>The quick brown fox jumps over the lazy dog.<br /></p>')
		.get(0);

	$fixture
		.empty()
		.append(textarea);

	sceditor  = new SCEditor(textarea, config || {});
	sceditor.focus();
	$textarea = $(textarea);
};


QUnit.module('lib/SCEditor', {
	before: function () {
		SCEditor.commands       = defaultCommands;
		SCEditor.defaultOptions = defaultOptions;

		SCEditor.formats.test = testFormat;

		defaultOptions.style = '../../src/themes/content/default.css';
		defaultOptions.emoticonsRoot    = '../../';
		defaultOptions.emoticonsEnabled = false;

		reloadEditor();
	},
	after: function () {
		defaultOptions.style = 'jquery.sceditor.default.css';
		defaultOptions.emoticonsRoot    = '';
		defaultOptions.emoticonsEnabled = true;

		delete SCEditor.formats.test;

		if (sceditor) {
			sceditor.destroy();
		}
	},
	beforeEach: function () {
		if (reloadEditor.isCustomConfig) {
			reloadEditor();
		}

		sceditor.sourceMode(false);

		sceditor.val('<p>The quick brown fox jumps over ' +
			'the lazy dog.<br /></p>', false);
	}
});

/*
QUnit.test('autofocus', function (assert) {
	reloadEditor({
		autofocus: true,
		autofocusEnd: false
	});

	const iframe = sceditor.getContentAreaContainer();
	const body = sceditor.getBody();
	const sel = rangy.getIframeSelection(iframe);

	assert.ok(sel.rangeCount, 'At elast 1 range exists');

	const range = sel.getRangeAt(0);
	const cursor = body.ownerDocument.createTextNode('|');

	range.insertNode(cursor);

	assert.nodesEqual(body.firstChild, utils.htmlToNode(
		'<p>|The quick brown fox jumps over the lazy dog.<br /></p>'
	));
});


QUnit.test('autofocusEnd', function (assert) {
	reloadEditor({
		autofocus: true,
		autofocusEnd: true
	});

	const iframe = sceditor.getContentAreaContainer();
	const body = sceditor.getBody();
	const sel = rangy.getIframeSelection(iframe);

	assert.ok(sel.rangeCount, 'At elast 1 range exists');

	const range = sel.getRangeAt(0);
	const cursor = body.ownerDocument.createTextNode('|');

	range.insertNode(cursor);

	const expected = '<p>The quick brown fox jumps ' +
		'over the lazy dog.|<br /></p>';

	assert.nodesEqual(body.firstChild, utils.htmlToNode(expected));
});*/


QUnit.test('readOnly()', function (assert) {
	const body = sceditor.getBody();

	assert.strictEqual(sceditor.readOnly(), false);
	assert.strictEqual(body.contentEditable, 'true');

	assert.strictEqual(sceditor.readOnly(true), sceditor);
	assert.strictEqual(sceditor.readOnly(), true);
	assert.strictEqual(body.contentEditable, 'false');

	assert.strictEqual(sceditor.readOnly(false), sceditor);
	assert.strictEqual(sceditor.readOnly(), false);
	assert.strictEqual(body.contentEditable, 'true');
});


QUnit.test('rtl()', function (assert) {
	const body = sceditor.getBody();

	assert.strictEqual(sceditor.rtl(), false);

	assert.strictEqual(sceditor.rtl(true), sceditor);
	assert.strictEqual(sceditor.rtl(), true);
	assert.strictEqual(body.dir, 'rtl');

	assert.strictEqual(sceditor.rtl(false), sceditor);
	assert.strictEqual(sceditor.rtl(), false);
	assert.strictEqual(body.dir, 'ltr');
});


QUnit.test('width()', function (assert) {
	const $container = $fixture.children('.sceditor-container');

	assert.close(sceditor.width(), $container.width(), 1);
	assert.equal(sceditor.width('200'), sceditor);

	assert.close(sceditor.width(), $container.width(), 1);
	assert.close($container.width(), 200, 1);
});


QUnit.test('height()', function (assert) {
	const $container = $fixture.children('.sceditor-container');

	assert.close(sceditor.height(), $container.height(), 1);
	assert.equal(sceditor.height('200'), sceditor);

	assert.close(sceditor.height(), $container.height(), 1);
	assert.close($container.height(), 200, 1);
});


QUnit.test('maximize()', function (assert) {
	const $container = $fixture.children('.sceditor-container');

	assert.strictEqual(sceditor.maximize(), false);
	assert.equal(sceditor.maximize(true), sceditor);
	assert.strictEqual(sceditor.maximize(), true);

	assert.close($container.width(), $(window).width(), 1);
	assert.close($container.height(), $(window).height(), 1);

	assert.equal(sceditor.maximize(false), sceditor);
	assert.strictEqual(sceditor.maximize(), false);
});


QUnit.test('destroy()', function (assert) {
	sceditor.destroy();

	assert.equal($fixture.children('.sceditor-container').length, 0);
	assert.ok($textarea.is(':visible'));

	// Call again to make sure no exception is thrown
	sceditor.destroy();
	sceditor.destroy();

	reloadEditor();
});

QUnit.test('destroy() - Unbind updateOriginal', function (assert) {
	const textarea = document.createElement('textarea');
	const submit = document.createElement('input');
	submit.type = 'submit';

	const form = document.createElement('form');
	form.addEventListener('submit', function (e) {
		e.preventDefault();
	});
	form.appendChild(submit);
	form.appendChild(textarea);

	$fixture.append(form);

	const sceditor = new SCEditor(textarea, { format: 'bbcode' });
	sceditor.val('testing');
	submit.click();

	assert.equal(textarea.value, 'testing');

	sceditor.val('testing 123');
	sceditor.destroy();
	submit.click();

	assert.equal(textarea.value, 'testing');
	form.parentNode.removeChild(form);
});


QUnit.test('wysiwygEditorInsertHtml()', function (assert) {
	sceditor.focus();
	const iframe = sceditor.getContentAreaContainer();
	const body = sceditor.getBody();
	const range = rangy.createRange(body.ownerDocument);
	const sel = rangy.getIframeSelection(iframe);

	range.setStart(body.firstChild.firstChild, 10);
	range.setEnd(body.firstChild.firstChild, 10);
	sel.setSingleRange(range);

	sceditor.wysiwygEditorInsertHtml('<b>test</b>');

	// This is the easiest way to make sure the cursor is still in the
	// correct position.
	sceditor.wysiwygEditorInsertHtml('|');

	assert.nodesEqual(body.firstChild, utils.htmlToNode(
		'<p>The quick <b>test|</b>brown fox ' +
			'jumps over the lazy dog.<br /></p>'
	));
});

QUnit.test('wysiwygEditorInsertHtml() - Start and end', function (assert) {
	sceditor.focus();
	const iframe = sceditor.getContentAreaContainer();
	const body = sceditor.getBody();
	const range = rangy.createRange(body.ownerDocument);
	const sel = rangy.getIframeSelection(iframe);

	range.setStart(body.firstChild.firstChild, 10);
	range.setEnd(body.firstChild.firstChild, 15);
	sel.setSingleRange(range);

	sceditor.wysiwygEditorInsertHtml('<b>', '</b>');

	// This is the easiest way to make sure the cursor is still in the
	// correct position.
	sceditor.wysiwygEditorInsertHtml('|');

	assert.nodesEqual(body.firstChild, utils.htmlToNode(
		'<p>The quick <b>brown|</b> fox ' +
			'jumps over the lazy dog.<br /></p>'
	));
});


QUnit.test('wysiwygEditorInsertText() - Start and end', function (assert) {
	sceditor.focus();
	const iframe = sceditor.getContentAreaContainer();
	const body = sceditor.getBody();
	const range = rangy.createRange(body.ownerDocument);
	const sel = rangy.getIframeSelection(iframe);

	range.setStart(body.firstChild.firstChild, 10);
	range.setEnd(body.firstChild.firstChild, 10);
	sel.setSingleRange(range);

	sceditor.wysiwygEditorInsertText('<&>test');

	// This is the easiest way to make sure the cursor is still in the
	// correct position.
	sceditor.wysiwygEditorInsertText('|');

	assert.nodesEqual(body.firstChild, utils.htmlToNode(
		'<p>The quick &lt;&amp;&gt;test|brown fox ' +
			'jumps over the lazy dog.<br /></p>'
	));
});

QUnit.test('wysiwygEditorInsertText() - Start and end', function (assert) {
	const iframe = sceditor.getContentAreaContainer();
	const body = sceditor.getBody();
	const range = rangy.createRange(body.ownerDocument);
	const sel = rangy.getIframeSelection(iframe);

	range.setStart(body.firstChild.firstChild, 10);
	range.setEnd(body.firstChild.firstChild, 15);
	sel.setSingleRange(range);

	sceditor.wysiwygEditorInsertText('<b>', '</b>');

	// This is the easiest way to make sure the cursor is still in the
	// correct position.
	sceditor.wysiwygEditorInsertText('|');

	assert.nodesEqual(body.firstChild, utils.htmlToNode(
		'<p>The quick &lt;b&gt;brown&lt;/b&gt;| fox ' +
			'jumps over the lazy dog.<br /></p>'
	));
});


QUnit.test('wysiwygEditorInsertHtml()', function (assert) {
	const sourceEditor = $('.sceditor-container textarea').get(0);

	sceditor.sourceMode(true);
	sceditor.val('<p>The quick brown fox jumps ' +
		'over the lazy dog.<br /></p>');
	sceditor.sourceEditorCaret({
		start: 13,
		end: 13
	});
	sceditor.sourceEditorInsertText('light-');
	sceditor.sourceEditorInsertText('|');

	assert.htmlEqual(
		sourceEditor.value,
		'<p>The quick light-|brown fox jumps over the lazy dog.<br /></p>'
	);
});

QUnit.test('sourceEditorInsertText() - Start and end', function (assert) {
	sceditor.sourceMode(true);
	sceditor.val('<p>The quick brown fox jumps ' +
		'over the lazy dog.<br /></p>');
	sceditor.sourceEditorCaret({
		start: 13,
		end: 18
	});
	sceditor.sourceEditorInsertText('"', '"');
	sceditor.sourceEditorInsertText('|');

	assert.htmlEqual(
		sceditor.val(),
		'<p>The quick "brown|" fox jumps over the lazy dog.<br /></p>'
	);
});

/*
QUnit.test('getWysiwygEditorValue() - Filter', function (assert) {
	sceditor.getRangeHelper().clear();

	assert.htmlEqual(
		sceditor.getWysiwygEditorValue(),
		'<p>The quick brown fox jumps over the lazy dog.<br /></p>'
	);

	assert.htmlEqual(
		sceditor.getWysiwygEditorValue(true),
		'<p>The quick brown fox jumps over the lazy dog.<br /></p>'
	);


	reloadEditor({
		format: 'test'
	});

	sceditor.getRangeHelper().clear();

	assert.htmlEqual(
		sceditor.getWysiwygEditorValue(false),
		'<p><b>test wysiwyg</b></p>'
	);

	assert.htmlEqual(
		sceditor.getWysiwygEditorValue(true),
		'<p><b>test source</b></p>'
	);
});*/
/*
QUnit.test('getSourceEditorValue()', function (assert) {
	sceditor.getRangeHelper().clear();
	sceditor.sourceMode(true);
	sceditor.val('<p>The quick brown fox jumps ' +
		'over the lazy dog.<br /></p>');

	assert.htmlEqual(
		sceditor.getSourceEditorValue(true),
		'<p>The quick brown fox jumps over the lazy dog.<br /></p>'
	);

	assert.htmlEqual(
		sceditor.getSourceEditorValue(false),
		'<p>The quick brown fox jumps over the lazy dog.<br /></p>'
	);
});*/

QUnit.test('getSourceEditorValue() - Uses format', function (assert) {
	reloadEditor({
		format: 'test'
	});

	sceditor.getRangeHelper().clear();
	sceditor.sourceMode(true);
	assert.htmlEqual(
		sceditor.getSourceEditorValue(false),
		'<p><b>test source</b></p>'
	);

	assert.htmlEqual(
		sceditor.getSourceEditorValue(true),
		'<p><b>test wysiwyg</b></p>'
	);
});

/*
QUnit.test('updateOriginal()', function (assert) {
	const textarea = $('textarea').get(1);
	const body = sceditor.getBody();

	body.innerHTML = '<div>text 1234...</div>';

	sceditor.getRangeHelper().clear();
	sceditor.updateOriginal();

	assert.htmlEqual(textarea.value, '<div>text 1234...</div>');
});

QUnit.test('Insert image XSS', function (assert) {
	var done = assert.async();

	reloadEditor({});

	var called = false;
	sceditor.getBody().xss = function () {
		called = true;
	};

	const button = document.getElementsByClassName('sceditor-button-image')[0];
	defaultCommands.image.exec.call(sceditor, button);

	const dropdown = document.getElementsByClassName('sceditor-insertimage')[0];
	const input = document.getElementById('image');
	const insertButton = dropdown.getElementsByClassName('button')[0];

	input.value = '<img src="http://url.to.file.which/not.exist" onerror=body.xss();>';
	insertButton.click();

	sceditor.getBody().addEventListener('error', function () {
		setTimeout(function () {
			assert.notOk(called);
			done();
		}, 1);
	}, true);
});*/

QUnit.test('Insert HTML filter JS', function (assert) {
	var done = assert.async();

	reloadEditor({
		format: 'bbcode'
	});

	var called = false;
	sceditor.getBody().xss = function () {
		called = true;
	};
	sceditor.wysiwygEditorInsertHtml('<img src="http://url.to.file.which/not.exist" onerror=body.xss();>');
	sceditor.getBody().addEventListener('error', function () {
		setTimeout(function () {
			assert.notOk(called);
			done();
		}, 1);
	}, true);
});


QUnit.test('Do not wrap whitespace text nodes', function (assert) {
	const body = sceditor.getBody();
	const rangeHelper = sceditor.getRangeHelper();
	const testHtml = '<p>test</p>     ';

	sceditor.focus();

	body.innerHTML = testHtml;

	var range = rangeHelper.cloneSelected();
	range.setStartAfter(body.firstChild.firstChild);
	range.collapse(true);
	rangeHelper.selectRange(range);
	body.dispatchEvent(new Event('selectionchange'));

	var range = rangeHelper.cloneSelected();
	range.setStart(body.lastChild, 1);
	range.collapse(true);
	rangeHelper.selectRange(range);
	body.dispatchEvent(new Event('selectionchange'));

	assert.htmlEqual(body.innerHTML, testHtml);
});
