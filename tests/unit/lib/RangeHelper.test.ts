import { describe, it, expect, beforeEach } from 'vitest';
import RangeHelper from 'src/lib/RangeHelper.js';
import * as utils from 'tests/unit/utils.js';
import rangy from 'rangy';
import DOMPurify from 'dompurify';

let editableDiv, rangeHelper;

const KEYWORDS = [
	['keyword', 'replacement'],
	[':)', 'imgSmile'],
	['bold', '<b>bold</b>']
];


describe('lib/RangeHelper', () => {
	beforeEach(() => {
		const fixture = document.getElementById('qunit-fixture');

		editableDiv = document.createElement('div');
		editableDiv.contentEditable = true;

		fixture.appendChild(editableDiv);

		rangeHelper = new RangeHelper(window, document, DOMPurify.sanitize);
	});


	it('insertHTML() - Text with node', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.firstChild, 39);

		sel.setSingleRange(range);

		rangeHelper.insertHTML('orange <b>and</b> pink');

		expect(para).toBeNodesEqual(utils.htmlToNode(
			'<p>The orange <b>and</b> pink dog.</p>'
		));
	});

	it('insertHTML() - Single node', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.firstChild, 39);

		sel.setSingleRange(range);

		rangeHelper.insertHTML(
			'<span>orange</span> <b>and</b> <em><b>pink</b></em>'
		);

		expect(para).toBeNodesEqual(utils.htmlToNode(
			'<p>The <span>orange</span> <b>and</b> ' +
				'<em><b>pink</b></em> dog.</p>'
		));
	});

	it('insertHTML() - Before and after', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.firstChild, 39);

		sel.setSingleRange(range);

		rangeHelper.insertHTML('<em>', '</em>');

		expect(para).toBeNodesEqual(utils.htmlToNode(
			'<p>The <em>quick brown fox jumps over the lazy</em> dog.</p>'
		));
	});


	it('insertNode() - Text node', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.firstChild, 39);

		sel.setSingleRange(range);

		rangeHelper.insertNode(utils.htmlToNode('orange and pink'));

		expect(para).toBeNodesEqual(utils.htmlToNode(
			'<p>The orange and pink dog.</p>'
		));
	});

	it('insertNode() - Text node with another node', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.firstChild, 39);

		sel.setSingleRange(range);

		rangeHelper.insertNode(utils.htmlToFragment('orange <b>and</b> pink'));

		expect(para).toBeNodesEqual(utils.htmlToNode(
			'<p>The orange <b>and</b> pink dog.</p>'
		));
	});

	it('insertNode() - Before and after', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.firstChild, 39);

		sel.setSingleRange(range);

		rangeHelper.insertNode(
			utils.htmlToFragment('<b>before</b>'),
			utils.htmlToFragment('<em>after</em>')
		);

		expect(para).toBeNodesEqual(utils.htmlToNode(
			'<p>The <b>before</b>quick brown fox jumps over the ' +
				'lazy<em>after</em> dog.</p>'
		));
	});

	it('insertNode() - Remove created empty tags', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML = '<p>text</p><p>text</p>';

		const p1 = editableDiv.firstChild;
		const p2 = editableDiv.lastChild;
		range.setStart(p1.firstChild, 0);
		range.setEnd(p2.firstChild, 4);

		sel.setSingleRange(range);

		rangeHelper.insertNode(utils.htmlToFragment('<b>foo</b>'));

		expect(editableDiv.firstChild).toBeNodesEqual(utils.htmlToNode(
			'<b>foo</b>'
		));
	});

	it('insertNode() - Do not remove existing empty tags', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML = '<p></p>test<p></p>';

		range.setStart(editableDiv, 1);
		range.setEnd(editableDiv, 2);
		sel.setSingleRange(range);

		rangeHelper.insertNode(utils.htmlToFragment('<b>foo</b>'));

		expect(editableDiv.innerHTML).toBeHtmlEqual('<p></p><b>foo</b><p></p>');
	});

	it('insertNode() - Do not remove existing empty tags (multiple)', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML = '<p></p>test<p></p><p></p>';

		range.setStart(editableDiv, 1);
		range.setEnd(editableDiv.lastChild, 0);

		sel.setSingleRange(range);

		rangeHelper.insertNode(utils.htmlToFragment('<b>foo</b>'));

		expect(editableDiv.innerHTML).toBeHtmlEqual('<p></p><b>foo</b><p></p>');
	});


	it('hasSelection() - With selection', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		range.selectNode(editableDiv.firstChild);

		sel.setSingleRange(range);

		expect(rangeHelper.hasSelection()).toStrictEqual(true);
	});

	it('hasSelection() - No selection', () => {
		rangy.getSelection().removeAllRanges();

		expect(rangeHelper.hasSelection()).toStrictEqual(false);
	});


	it('selectedHtml() - Text only', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.firstChild, 39);

		sel.setSingleRange(range);

		expect(rangeHelper.selectedHtml()).toBeHtmlEqual(
			'quick brown fox jumps over the lazy'
		);
	});

	it('selectedHtml() - Text plus part of node', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown <span>fox jumps</span> over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.childNodes[1].firstChild, 3);

		sel.setSingleRange(range);

		expect(rangeHelper.selectedHtml()).toBeHtmlEqual(
			'quick brown <span>fox</span>'
		);
	});

	it('selectedHtml() - No selection', () => {
		rangy.getSelection().removeAllRanges();

		expect(rangeHelper.selectedHtml()).toStrictEqual('');
	});


	it('parentNode() - Text only', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.firstChild, 30);

		sel.setSingleRange(range);

		expect(rangeHelper.parentNode()).toStrictEqual(para.firstChild);
	});

	it('parentNode() - Text plus part of node', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown <span>fox jumps</span> over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.childNodes[1].firstChild, 3);

		sel.setSingleRange(range);

		expect(rangeHelper.parentNode()).toStrictEqual(para);
	});


	it('getFirstBlockParent() - Text only', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.firstChild, 30);

		sel.setSingleRange(range);

		expect(rangeHelper.getFirstBlockParent()).toStrictEqual(para);
	});

	it('getFirstBlockParent() - Text plus part of node', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown <span>fox jumps</span> over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.childNodes[1].firstChild, 3);

		sel.setSingleRange(range);

		expect(rangeHelper.getFirstBlockParent()).toStrictEqual(para);
	});


	it('insertNodeAt() - End', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.firstChild, 39);

		sel.setSingleRange(range);

		rangeHelper.insertNodeAt(false, utils.htmlToFragment('<b>test</b>'));

		expect(para).toBeNodesEqual(utils.htmlToNode(
			'<p>The quick brown fox jumps over the lazy<b>test</b> dog.</p>'
		));
	});

	it('insertNodeAt() - Start', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 4);
		range.setEnd(para.firstChild, 39);

		sel.setSingleRange(range);

		rangeHelper.insertNodeAt(true, utils.htmlToFragment('<b>test</b> '));

		expect(para).toBeNodesEqual(utils.htmlToNode(
			'<p>The <b>test</b> quick brown fox jumps over the lazy dog.</p>'
		));
	});


	it('restoreRange()', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;

		range.setStart(para.firstChild, 20);
		sel.setSingleRange(range);

		rangeHelper.saveRange();
		sel.removeAllRanges();
		rangeHelper.restoreRange();

		rangeHelper.insertNode(document.createTextNode('|'));

		expect(para).toBeNodesEqual(utils.htmlToNode(
			'<p>The quick brown fox |jumps over the lazy dog.</p>'
		));
	});


	it('saveRange() - Start is before end marker', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox <br />jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;

		range.setStart(para.firstChild, 20);
		sel.setSingleRange(range);

		rangeHelper.saveRange();

		const $markers = editableDiv.querySelectorAll('.sceditor-selection');

		expect($markers[0].id).toBe('sceditor-start-marker');
		expect($markers[1].id).toBe('sceditor-end-marker');
	});

	it('saveRange() - Start is before end in selection', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;

		range.setStart(para.firstChild, 4);
		range.setEnd(para.firstChild, 39);
		sel.setSingleRange(range);

		rangeHelper.saveRange();

		const $markers = editableDiv.querySelectorAll('.sceditor-selection');

		expect($markers[0].id).toBe('sceditor-start-marker');
		expect($markers[1].id).toBe('sceditor-end-marker');
	});


	it('selectOuterText() - Left only', () => {
		const range = rangy.createRangyRange();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 20);
		range.setEnd(para.firstChild, 20);

		rangy.getSelection().setSingleRange(range);
		rangeHelper.selectOuterText(10);

		const selectedRange = rangy.getSelection().getRangeAt(0);

		range.setStart(para.firstChild, 10);
		range.setEnd(para.firstChild, 20);

		expect(range.compareBoundaryPoints(range.START_TO_START, selectedRange)).toStrictEqual(0);
		expect(range.compareBoundaryPoints(range.END_TO_END, selectedRange)).toStrictEqual(0);
	});

	it('selectOuterText() - Left & Right', () => {
		const range = rangy.createRangyRange();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 20);
		range.setEnd(para.firstChild, 20);

		rangy.getSelection().setSingleRange(range);

		rangeHelper.selectOuterText(10, 10);
		const selectedRange = rangy.getSelection().getRangeAt(0);

		range.setStart(para.firstChild, 10);
		range.setEnd(para.firstChild, 30);

		expect(range.compareBoundaryPoints(range.START_TO_START, selectedRange)).toStrictEqual(0);
		expect(range.compareBoundaryPoints(range.END_TO_END, selectedRange)).toStrictEqual(0);
	});

	it('selectOuterText() - Left & Right over adjacent nodes', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML = '<p></p>';

		const para = editableDiv.firstChild;
		const doc = para.ownerDocument;

		para.appendChild(doc.createTextNode('The quick brown '));
		para.appendChild(doc.createTextNode('fox '));
		para.appendChild(doc.createTextNode('jumps over the lazy dog.'));

		range.setStart(para.childNodes[1], 2);
		range.setEnd(para.childNodes[1], 2);

		sel.setSingleRange(range);

		rangeHelper.selectOuterText(10, 10);

		range.setStart(para.firstChild, 8);
		range.setEnd(para.lastChild, 8);

		expect(range.compareBoundaryPoints(range.START_TO_START, sel.getRangeAt(0))).toStrictEqual(0);
		expect(range.compareBoundaryPoints(range.END_TO_END, sel.getRangeAt(0))).toStrictEqual(0);
	});


	it('getOuterText() - Before', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 20);

		sel.setSingleRange(range);

		expect(rangeHelper.getOuterText(true, 4)).toStrictEqual('fox ');
	});

	it('getOuterText() - Before split nodes', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML = '<p></p>';

		const para = editableDiv.firstChild;
		const doc = para.ownerDocument;

		para.appendChild(doc.createTextNode('The quick brown '));
		para.appendChild(doc.createTextNode('fox '));
		para.appendChild(doc.createTextNode('jumps over the lazy dog.'));

		range.setStart(para.childNodes[2], 0);

		sel.setSingleRange(range);

		expect(rangeHelper.getOuterText(true, 10)).toStrictEqual('brown fox ');
	});

	it('getOuterText() - Before with paragraph as start', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML = '<p></p>';

		const para = editableDiv.firstChild;
		const doc = para.ownerDocument;

		para.appendChild(doc.createTextNode('The quick brown '));
		para.appendChild(doc.createTextNode('fox '));
		para.appendChild(doc.createTextNode('jumps over the lazy dog.'));

		range.setStart(para, 2);

		sel.setSingleRange(range);

		expect(rangeHelper.getOuterText(true, 10)).toStrictEqual('brown fox ');
	});

	it('getOuterText() - After', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 20);

		sel.setSingleRange(range);

		expect(rangeHelper.getOuterText(false, 5)).toStrictEqual('jumps');
	});

	it('getOuterText() - After split nodes', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML = '<p></p>';

		const para = editableDiv.firstChild;
		const doc = para.ownerDocument;

		para.appendChild(doc.createTextNode('The quick brown '));
		para.appendChild(doc.createTextNode('fox '));
		para.appendChild(doc.createTextNode('jumps over the lazy dog.'));

		range.setStart(para.firstChild, 16);

		sel.setSingleRange(range);

		expect(rangeHelper.getOuterText(false, 9)).toStrictEqual('fox jumps');
	});

	it('getOuterText() - After with paragraph as start', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML = '<p></p>';

		const para = editableDiv.firstChild;
		const doc = para.ownerDocument;

		para.appendChild(doc.createTextNode('The quick brown '));
		para.appendChild(doc.createTextNode('fox '));
		para.appendChild(doc.createTextNode('jumps over the lazy dog.'));

		range.setStart(para, 0);

		sel.setSingleRange(range);

		expect(rangeHelper.getOuterText(false, 25)).toStrictEqual(
			'The quick brown fox jumps'
		);
	});


	it('replaceKeyword() - No matches', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 20);

		sel.setSingleRange(range);

		expect(rangeHelper.replaceKeyword(KEYWORDS, true, false, false, false)).toStrictEqual(false);
	});

	it('replaceKeyword() - Match after', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox boldjumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 20);

		sel.setSingleRange(range);

		expect(rangeHelper.replaceKeyword(KEYWORDS, true, false, false, false)).toStrictEqual(true);

		expect(editableDiv.innerHTML).toBeHtmlEqual(
			'<p>The quick brown fox <b>bold</b>jumps over the lazy dog.</p>'
		);
	});

	it('replaceKeyword() - Match before', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown foxbold jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 23);

		sel.setSingleRange(range);

		expect(rangeHelper.replaceKeyword(KEYWORDS, true, false, false, false)).toStrictEqual(true);

		expect(editableDiv.innerHTML).toBeHtmlEqual(
			'<p>The quick brown fox<b>bold</b> jumps over the lazy dog.</p>'
		);
	});

	it('replaceKeyword() - Match after with current char', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox oldjumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 20);

		sel.setSingleRange(range);

		expect(
			rangeHelper.replaceKeyword(KEYWORDS, true, false, false, false, 'b')
		).toStrictEqual(true);

		expect(editableDiv.innerHTML).toBeHtmlEqual(
			'<p>The quick brown fox <b>bold</b>jumps over the lazy dog.</p>'
		);
	});

	it('replaceKeyword() - Match before with current char', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown foxbol jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 22);

		sel.setSingleRange(range);

		expect(
			rangeHelper.replaceKeyword(KEYWORDS, true, false, false, false, 'd')
		).toStrictEqual(true);

		expect(editableDiv.innerHTML).toBeHtmlEqual(
			'<p>The quick brown fox<b>bold</b> jumps over the lazy dog.</p>'
		);
	});

	it('replaceKeyword() - Match that is too far behind', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown foxbold jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 24);

		sel.setSingleRange(range);

		expect(
			rangeHelper.replaceKeyword(KEYWORDS, true, false, false, false, 'd')
		).toStrictEqual(false);
	});

	it('replaceKeyword() - Match that is too far forward', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox boldjumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 20);

		sel.setSingleRange(range);

		expect(
			rangeHelper.replaceKeyword(KEYWORDS, true, false, false, false, 'b')
		).toStrictEqual(false);
	});

	it('replaceKeyword() - Match in middle', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown foxkeyord jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 22);

		sel.setSingleRange(range);

		expect(
			rangeHelper.replaceKeyword(KEYWORDS, true, false, false, false, 'w')
		).toStrictEqual(true);

		expect(editableDiv.innerHTML).toBeHtmlEqual(
			'<p>The quick brown foxreplacement jumps over the lazy dog.</p>'
		);
	});

	it('replaceKeyword() - Middle with spaces required', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox keyord jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 23);

		sel.setSingleRange(range);

		expect(
			rangeHelper.replaceKeyword(KEYWORDS, true, false, false, true, 'w')
		).toStrictEqual(true);

		expect(editableDiv.innerHTML).toBeHtmlEqual(
			'<p>The quick brown fox replacement jumps over the lazy dog.</p>'
		);
	});

	it('replaceKeyword() - No match space required', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown foxkeyord jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 22);

		sel.setSingleRange(range);

		expect(
			rangeHelper.replaceKeyword(KEYWORDS, true, false, false, true, 'w')
		).toStrictEqual(false);
	});

	it('replaceKeyword() - Current char space when spaces required', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox keywordjumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;
		range.setStart(para.firstChild, 27);

		sel.setSingleRange(range);

		expect(
			rangeHelper.replaceKeyword(KEYWORDS, true, false, false, true, ' ')
		).toStrictEqual(true);

		expect(editableDiv.innerHTML).toBeHtmlEqual(
			'<p>The quick brown fox replacementjumps over the lazy dog.</p>'
		);
	});


	it('compare() - To current selection', () => {
		const rangeA = rangy.createNativeRange();
		const rangeB = rangy.createNativeRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;

		if (rangeA.moveToElementText) {
			rangeA.moveToElementText(para);
			rangeA.moveStart('character', 20);

			rangeB.moveToElementText(para);
			rangeB.moveStart('character', 20);

			rangeA.select();
		} else {
			rangeA.setStart(para.firstChild, 20);
			rangeB.setStart(para.firstChild, 20);

			sel.setSingleRange(rangeA);
		}

		expect(rangeHelper.compare(rangeB)).toStrictEqual(true);
	});

	it('compare() - Equal', () => {
		const rangeA = rangy.createNativeRange();
		const rangeB = rangy.createNativeRange();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;

		if (rangeA.moveToElementText) {
			rangeA.moveToElementText(para);
			rangeA.moveStart('character', 20);
			rangeA.moveEnd('character', 20);

			rangeB.moveToElementText(para);
			rangeB.moveStart('character', 20);
			rangeB.moveEnd('character', 20);
		} else {
			rangeA.setStart(para.firstChild, 20);
			rangeA.setEnd(para.firstChild, 20);

			rangeB.setStart(para.firstChild, 20);
			rangeB.setEnd(para.firstChild, 20);
		}

		expect(rangeHelper.compare(rangeA, rangeB)).toStrictEqual(true);
	});

	it('compare() - Not equal', () => {
		const rangeA = rangy.createNativeRange();
		const rangeB = rangy.createNativeRange();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		const para = editableDiv.firstChild;

		if (rangeA.moveToElementText) {
			rangeA.moveToElementText(para);
			rangeA.moveStart('character', 25);
			rangeA.moveEnd('character', 25);

			rangeB.moveToElementText(para);
			rangeB.moveStart('character', 20);
			rangeB.moveEnd('character', 20);
		} else {
			rangeA.setStart(para.firstChild, 25);
			rangeA.setEnd(para.firstChild, 25);

			rangeB.setStart(para.firstChild, 20);
			rangeB.setEnd(para.firstChild, 20);
		}

		expect(rangeHelper.compare(rangeA, rangeB)).toStrictEqual(false);
	});


	it('clear()', () => {
		const range = rangy.createRangyRange();
		const sel = rangy.getSelection();

		editableDiv.innerHTML =
			'<p>The quick brown fox jumps over the lazy dog.</p>';

		range.selectNode(editableDiv.firstChild);

		sel.setSingleRange(range);

		rangeHelper.clear();

		expect(rangeHelper.hasSelection()).toStrictEqual(false);
	});

});
