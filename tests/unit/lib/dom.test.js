import { describe, it, expect } from 'vitest';
import * as dom from 'src/lib/dom.js';
import * as utils from 'tests/unit/utils.js';

describe('lib/dom', () => {

	it('createElement() - Simple', () => {
		const node = dom.createElement('div');
		expect(node).toBeTruthy();
		expect(node.tagName.toLowerCase()).toBe('div');
	});

	it('createElement() - Attributes', () => {
		const node = dom.createElement('div', {
			contentEditable: true,
			'data-test': 'value'
		});

		expect(node).toBeTruthy();
		expect(node.contentEditable).toBeTruthy();
		expect(node.hasAttribute('data-test')).toBeTruthy();
		expect(node.getAttribute('data-test')).toBe('value');
	});

	it('createElement() - Style', () => {
		const node = dom.createElement('div', {
			style: 'font-size: 100px; font-weight: bold'
		});

		expect(node).toBeTruthy();
		expect(node.style.fontSize).toBe('100px');
		expect(node.style.fontWeight).toBe('bold');
	});

	it('parents()', () => {
		const div = document.createElement('div');
		const p = document.createElement('p');
		const a = document.createElement('a');

		div.appendChild(p);
		p.appendChild(a);

		expect(dom.parents(a)).toEqual([p, div]);
		expect(dom.parents(a, 'p')).toEqual([p]);
		expect(dom.parents(a, 'p,div,em')).toEqual([p, div]);
	});

	it('parent()', () => {
		const div = document.createElement('div');
		const p = document.createElement('p');

		div.appendChild(p);

		expect(dom.parent(p, 'p')).toBeFalsy();
		expect(dom.parent(p, 'div')).toBe(div);
	});

	it('closest()', () => {
		const div = document.createElement('div');
		const p = document.createElement('p');

		div.appendChild(p);

		expect(dom.closest(p, 'p')).toBe(p);
		expect(dom.closest(p, 'div')).toBe(div);
		expect(dom.closest(p, 'input')).toBeFalsy();
	});

	it('remove()', () => {
		const div = document.createElement('div');
		const p = document.createElement('p');

		div.appendChild(p);

		dom.remove(p);

		expect(p.parentNode).toBeFalsy();
		expect(div.firstChild).toBeFalsy();
	});

	it('appendChild()', () => {
		const div = document.createElement('div');
		const p = document.createElement('p');

		dom.appendChild(div, p);

		expect(div.firstChild).toBe(p);
	});

	it('find()', () => {
		const div = document.createElement('div');
		const p = document.createElement('p');
		const a = document.createElement('a');
		const text = document.createTextNode('');

		div.appendChild(p);
		div.appendChild(a);
		div.appendChild(text);

		const paragraphs = dom.find(div, 'p');
		expect(paragraphs.length, 'Select paragraphs').toBe(1);

		const nodes = dom.find(div, '*');
		expect(nodes.length, 'Select all').toBe(2);
	});

	it('on()', () => {
		const div = document.createElement('div');
		let called = false;

		dom.on(div, 'test', () => { called = true; });

		dom.trigger(div, 'test');
		expect(called).toBeTruthy();
	});

	it('on() - Selector', () => {
		const div = document.createElement('div');
		const p = document.createElement('p');
		let called = false;

		div.appendChild(p);

		dom.on(div, 'test', 'p', () => { called = true; });

		dom.trigger(div, 'test');
		expect(called, 'Not matching selector').toBeFalsy();

		dom.trigger(p, 'test');
		expect(called, 'Matching selector').toBeTruthy();
	});

	it('off()', () => {
		const div = document.createElement('div');
		let called = false;
		const fn = () => { called = true; };

		dom.on(div, 'test', fn);
		dom.off(div, 'test', fn);

		dom.trigger(div, 'test');
		expect(called).toBeFalsy();
	});

	it('off() - Selector', () => {
		const div = document.createElement('div');
		const p = document.createElement('p');
		let called = false;
		const fn = () => { called = true; };

		div.appendChild(p);

		dom.on(div, 'test', 'p', fn);
		dom.off(div, 'test', 'p', fn);

		dom.trigger(div, 'test');
		expect(called, 'Not matching selector').toBeFalsy();

		dom.trigger(p, 'test');
		expect(called, 'Matching selector').toBeFalsy();
	});

	it('attr()', () => {
		const div = document.createElement('div');

		dom.attr(div, 'test', 'value');
		expect(div.hasAttribute('test'), 'Add attribute').toBeTruthy();

		expect(dom.attr(div, 'test'), 'Get attribute').toBe('value');

		dom.attr(div, 'test', 'new-value');
		expect(div.getAttribute('test'), 'Add attribute').toBe('new-value');

		dom.attr(div, 'test', null);
		expect(div.hasAttribute('test'), 'Remove attribute').toBeFalsy();
	});

	it('removeAttr()', () => {
		const div = document.createElement('div');

		div.setAttribute('test', 'test');

		expect(div.hasAttribute('test')).toBeTruthy();
		dom.removeAttr(div, 'test');
		expect(div.hasAttribute('test')).toBeFalsy();
	});

	it('hide()', () => {
		const div = document.createElement('div');

		dom.hide(div);
		expect(div.style.display, 'Should hide node').toBe('none');
	});

	it('show()', () => {
		const div = document.createElement('div');

		div.style.display = 'none';

		dom.show(div);
		expect(div.style.display, 'Should show node').toBe('');
	});

	it('toggle()', () => {
		const div = document.createElement('div');
		const fixture = document.getElementById('qunit-fixture');

		fixture.appendChild(div);

		dom.toggle(div);
		expect(div.style.display, 'Should hide node').toBe('none');

		dom.toggle(div);
		expect(div.style.display, 'Should show node').toBe('');
	});

	it('css()', () => {
		const div = document.createElement('div');
		const fixture = document.getElementById('qunit-fixture');

		fixture.appendChild(div);

		dom.css(div, 'width', 100);
		expect(div.style.width, 'Convert numbers into pixels').toBe('100px');

		dom.css(div, { width: 32 });
		expect(div.style.width, 'Set object').toBe('32px');

		dom.css(div, 'width', '110px');
		expect(div.style.width, 'Set pixels').toBe('110px');

		dom.css(div, 'width', '10em');
		expect(div.style.width, 'Set em').toBe('10em');

		dom.css(div, 'width', '50%');
		expect(div.style.width, 'Set percent').toBe('50%');

		expect(parseInt(dom.css(div, 'width')), 'Get computed value')
			.toBeClose(fixture.clientWidth / 2, 1);

		expect(dom.css(window, 'width'), 'Get computed value of window').toBe(null);
	});

	it('data()', () => {
		const text = document.createTextNode('');
		const div = document.createElement('div');
		div.setAttribute('data-test', 'test');
		div.setAttribute('data-another-test', 'test');
		div.setAttribute('ignored', 'test');

		expect(dom.data(div)).toEqual({
			'another-test': 'test',
			'test': 'test'
		});
		expect(dom.data(div, 'test')).toBe('test');
		expect(dom.data(div, 'another-test')).toBe('test');

		dom.data(div, 'test', 'new-value');
		expect(dom.data(div, 'test')).toBe('new-value');

		dom.data(div, 'test', 1);
		expect(dom.data(div, 'test')).toStrictEqual('1');

		dom.data(text, 'test', 'test');
		expect(dom.data(text, 'test')).toStrictEqual(undefined);
	});

	it('is()', () => {
		const div = document.createElement('div');
		div.className = 'test';

		expect(dom.is(div, 'div')).toBeTruthy();
		expect(dom.is(div, '.test')).toBeTruthy();
		expect(dom.is()).toBeFalsy();
		expect(dom.is(null)).toBeFalsy();
		expect(dom.is(div, 'p')).toBeFalsy();
		expect(dom.is(div, '.testing')).toBeFalsy();
	});

	it('remove()', () => {
		const parent = document.createElement('div');
		const child = document.createElement('div');

		parent.appendChild(child);
		dom.remove(child);

		expect(!child.parentNode).toBeTruthy();

		// Make sure doesn't throw if has no parent
		dom.remove(child);
	});

	it('contains()', () => {
		const parent = document.createElement('div');
		const child = document.createElement('div');

		parent.appendChild(child);

		expect(dom.contains(parent, child)).toBeTruthy();
		expect(dom.contains(parent, parent)).toBeFalsy();
		expect(dom.contains(child, parent)).toBeFalsy();
	});

	it('previousElementSibling()', () => {
		const parent = document.createElement('div');
		const first = document.createElement('div');
		const last = document.createElement('div');

		parent.appendChild(first);
		parent.appendChild(last);

		expect(dom.previousElementSibling(last)).toBe(first);
		expect(dom.previousElementSibling(last, 'div')).toBe(first);
		expect(dom.previousElementSibling(last, 'p')).toBe(null);
		expect(dom.previousElementSibling(first)).toBe(null);
	});

	it('insertBefore()', () => {
		const parent = document.createElement('div');
		const ref = document.createElement('div');
		const first = document.createElement('div');

		parent.appendChild(ref);

		dom.insertBefore(first, ref);

		expect(parent.firstChild).toBe(first);
	});

	it('hasClass()', () => {
		const div = document.createElement('div');

		div.className = 'test';

		expect(dom.hasClass(div, 'another-test')).toBe(false);
		expect(dom.hasClass(div, 'test')).toBe(true);
	});

	it('removeClass()', () => {
		const div = document.createElement('div');

		div.className = 'test another-test';

		dom.removeClass(div, 'another-test');
		expect(div.className.trim()).toBe('test');

		dom.removeClass(div, 'test');
		expect(div.className.trim()).toBe('');
	});

	it('addClass()', () => {
		const div = document.createElement('div');

		dom.addClass(div, 'test');
		expect(div.className.trim()).toBe('test');

		dom.addClass(div, 'another-test');
		expect(div.className.trim()).toBe('test another-test');
	});

	it('toggleClass()', () => {
		const div = document.createElement('div');

		dom.toggleClass(div, 'test');
		expect(div.className.trim(), 'Add class').toBe('test');

		dom.toggleClass(div, 'test');
		expect(div.className, 'Remove class').toBe('');

		dom.toggleClass(div, 'test', true);
		dom.toggleClass(div, 'test', true);
		expect(div.className.trim(), 'Add class via state').toBe('test');

		dom.toggleClass(div, 'test', false);
		dom.toggleClass(div, 'test', false);
		expect(div.className, 'Remove class via state').toBe('');
	});

	it('width()', () => {
		const div = document.createElement('div');
		const fixture = document.getElementById('qunit-fixture');

		fixture.appendChild(div);

		dom.width(div, 100);
		expect(div.style.width, 'Number width').toBe('100px');

		dom.width(div, '10em');
		expect(div.style.width, 'Em width').toBe('10em');

		dom.width(div, '100px');
		expect(dom.width(div), 'Get width').toBe(100);
	});

	it('height()', () => {
		const div = document.createElement('div');
		const fixture = document.getElementById('qunit-fixture');

		fixture.appendChild(div);

		dom.height(div, 100);
		expect(div.style.height, 'Number height').toBe('100px');

		dom.height(div, '10em');
		expect(div.style.height, 'Em height').toBe('10em');

		dom.height(div, '100px');
		expect(dom.height(div), 'Get height').toBe(100);
	});

	it('trigger()', () => {
		const div = document.createElement('div');
		const detail = {};

		div.addEventListener('custom-event', (e) => {
			expect(e.detail).toBe(detail);
		});

		dom.trigger(div, 'custom-event', detail);
	});

	it('isVisible()', () => {
		const div = document.createElement('div');
		const fixture = document.getElementById('qunit-fixture');

		fixture.appendChild(div);
		dom.hide(div);
		expect(dom.isVisible(div), 'Should be false when hidden').toBe(false);

		dom.show(div);
		expect(dom.isVisible(div), 'Should be true when visible').toBe(true);

		fixture.removeChild(div);
		expect(dom.isVisible(div), 'Deattached should be false').toBe(false);
	});

	it('traverse()', () => {
		let result = '';
		const node = utils.htmlToDiv(
			'<code><b>1</b><b>2</b><b>3</b><span><b>4</b><b>5</b></span></code>'
		);

		dom.traverse(node, (node) => {
			if (node.nodeType === 3) {
				result += node.nodeValue;
			}
		});

		expect(result).toBe('12345');
	});

	it('traverse() - Innermost first', () => {
		let result = '';
		const node = utils.htmlToDiv(
			'<code><span><b></b></span><span><b></b><b></b></span></code>'
		);

		dom.traverse(node, (node) => {
			result += node.nodeName.toLowerCase() + ':';
		}, true);

		expect(result).toBe('b:span:b:b:span:code:');
	});

	it('traverse() - Siblings only', () => {
		let result = '';
		const node = utils.htmlToDiv(
			'1<span>ignore</span>2<span>ignore</span>3'
		);

		dom.traverse(node, (node) => {
			if (node.nodeType === 3) {
				result += node.nodeValue;
			}
		}, false, true);

		expect(result).toBe('123');
	});

	it('rTraverse()', () => {
		let result = '';
		const node = utils.htmlToDiv(
			'<code><b>1</b><b>2</b><b>3</b><span><b>4</b><b>5</b></span></code>'
		);

		dom.rTraverse(node, (node) => {
			if (node.nodeType === 3) {
				result += node.nodeValue;
			}
		});

		expect(result).toBe('54321');
	});


	it('parseHTML()', () => {
		const result = dom.parseHTML(
			'<span>span<div style="font-weight: bold;">div</div>span</span>'
		);

		expect(result.nodeType).toBe(dom.DOCUMENT_FRAGMENT_NODE);
		expect(result.childNodes.length).toBe(1);
		expect(result.firstChild).toBeNodesEqual(
			utils.htmlToNode(
				'<span>span<div style="font-weight: bold;">div</div>span</span>'
			)
		);
	});

	it('parseHTML() - Parse multiple', () => {
		const result = dom.parseHTML(
			'<span>one</span><span>two</span><span>three</span>'
		);

		expect(result.nodeType).toBe(dom.DOCUMENT_FRAGMENT_NODE);
		expect(result.childNodes.length).toBe(3);
	});


	it('hasStyling()', () => {
		const node = utils.htmlToNode('<pre></pre>');

		expect(dom.hasStyling(node)).toBeTruthy();
	});

	it('hasStyling() - Non-styled div', () => {
		const node = utils.htmlToNode('<div></div>');

		expect(!dom.hasStyling(node)).toBeTruthy();
	});

	it('hasStyling() - Div with class', () => {
		const node = utils.htmlToNode('<div class="test"></div>');

		expect(dom.hasStyling(node)).toBeTruthy();
	});

	it('hasStyling() - Div with style attribute', () => {
		const node = utils.htmlToNode('<div style="color: red;"></div>');

		expect(dom.hasStyling(node)).toBeTruthy();
	});


	it('convertElement()', () => {
		const node = utils.htmlToDiv(
			'<i style="font-weight: bold;">' +
			'span' +
			'<div>' +
			'div' +
			'</div>' +
			'span' +
			'</i>'
		);

		const newNode = dom.convertElement(node.firstChild, 'em');

		expect(newNode).toBe(node.firstChild);

		expect(newNode).toBeNodesEqual(
			utils.htmlToNode(
				'<em style="font-weight: bold;">' +
					'span' +
					'<div>' +
						'div' +
					'</div>' +
					'span' +
				'</em>'
			)
		);
	});

	it('convertElement() - Invalid attribute name', () => {
		const node = utils.htmlToDiv(
			'<i size"2"="" good="attr">test</i>'
		);

		const newNode = dom.convertElement(node.firstChild, 'em');

		expect(newNode).toBe(node.firstChild);

		expect(newNode).toBeNodesEqual(
			utils.htmlToNode(
				'<em good="attr">test</em>'
			)
		);
	});


	it('fixNesting() - With styling', () => {
		const node = utils.htmlToDiv(
			'<span style="font-weight: bold;">' +
			'span' +
			'<div>' +
			'div' +
			'</div>' +
			'span' +
			'</span>'
		);

		dom.fixNesting(node);

		expect(node).toBeNodesEqual(
			utils.htmlToDiv(
				'<span style="font-weight: bold;">' +
					'span' +
				'</span>' +
				'<div>' +
					'<span style="font-weight: bold;">' +
						'div' +
					'</span>' +
				'</div>' +
				'<span style="font-weight: bold;">' +
					'span' +
				'</span>'
			)
		);
	});

	it('fixNesting() - Deeply nested', () => {
		const node = utils.htmlToDiv(
			'<span>' +
			'span' +
			'<span>' +
			'span' +
			'<div style="font-weight: bold;">' +
			'div' +
			'</div>' +
			'span' +
			'</span>' +
			'span' +
			'</span>'
		);

		dom.fixNesting(node);

		expect(node).toBeNodesEqual(
			utils.htmlToDiv(
				'<span>' +
					'span' +
					'<span>' +
						'span' +
					'</span>' +
				'</span>' +
				'<div style="font-weight: bold;">' +
					'<span>' +
						'<span>' +
							'div' +
						'</span>' +
					'</span>' +
				'</div>' +
				'<span>' +
					'<span>' +
						'span' +
					'</span>' +
					'span' +
				'</span>'
			)
		);
	});

	it('fixNesting() - Nested list', () => {
		const node = utils.htmlToDiv(
			'<ul>' +
			'<li>first</li>' +
			'<ol><li>middle</li></ol>' +
			'<li>second</li>' +
			'</ul>'
		);

		dom.fixNesting(node);

		expect(node).toBeNodesEqual(
			utils.htmlToDiv(
				'<ul>' +
					'<li>first' +
						'<ol><li>middle</li></ol>' +
					'</li>' +
					'<li>second</li>' +
				'</ul>'
			)
		);
	});

	it('fixNesting() - Nested list, no previous item', () => {
		const node = utils.htmlToDiv(
			'<ul>' +
			'<ol><li>middle</li></ol>' +
			'<li>first</li>' +
			'</ul>'
		);

		dom.fixNesting(node);

		expect(node).toBeNodesEqual(
			utils.htmlToDiv(
				'<ul>' +
					'<li>' +
						'<ol><li>middle</li></ol>' +
					'</li>' +
					'<li>first</li>' +
				'</ul>'
			)
		);
	});

	it('fixNesting() - Deeply nested list', () => {
		const node = utils.htmlToDiv(
			'<ul>' +
			'<li>one</li>' +
			'<ul>' +
			'<li>two</li>' +
			'<ul>' +
			'<li>three</li>' +
			'</ul>' +
			'</ul>' +
			'</ul>'
		);

		dom.fixNesting(node);

		expect(node).toBeNodesEqual(
			utils.htmlToDiv(
				'<ul>' +
					'<li>one' +
						'<ul>' +
							'<li>two' +
								'<ul>' +
									'<li>three</li>' +
								'</ul>' +
							'</li>' +
						'</ul>' +
					'</li>' +
				'</ul>'
			)
		);
	});

	it('fixNesting() - With comments', () => {
		const node = utils.htmlToDiv(
			'<p>' +
			'<strong>' +
			'a<!-- test -->b' +
			'</strong>' +
			'</p>'
		);

		dom.fixNesting(node);

		expect(node).toBeNodesEqual(
			utils.htmlToDiv(
				'<p>' +
					'<strong>' +
						'a<!-- test -->b' +
					'</strong>' +
				'</p>'
			)
		);
	});

	it('fixNesting() - <details> block', () => {
		const node = utils.htmlToDiv(
			'<details>' +
			'<summary>test</summary>' +
			'<div>test</div>' +
			'</details>'
		);

		dom.fixNesting(node);

		expect(node).toBeNodesEqual(
			utils.htmlToDiv(
				'<details>' +
					'<summary>test</summary>' +
					'<div>test</div>' +
				'</details>'
			)
		);
	});

	it('fixNesting() - <section/article/aside> block', () => {
		const node = utils.htmlToDiv(
			'<section><article><aside>' +
			'<div>test</div>' +
			'</aside></section></section>'
		);

		dom.fixNesting(node);

		expect(node).toBeNodesEqual(
			utils.htmlToDiv(
				'<section><article><aside>' +
					'<div>test</div>' +
				'</aside></section></section>'
			)
		);
	});


	it('removeWhiteSpace() - Preserve line breaks', () => {
		const node = utils.htmlToDiv(
			'<div style="white-space: pre-line">    ' +
			'<span>  \n\ncontent\n\n  </span>\n\n  ' +
			'</div><div></div>'
		);

		dom.removeWhiteSpace(node);

		expect(node).toBeNodesEqual(
			utils.htmlToDiv(
				'<div style="white-space: pre-line">' +
					'<span>\n\ncontent\n\n </span>\n\n' +
				'</div><div></div>'
			)
		);
	});

	it('removeWhiteSpace() - Ignore marker spaces', () => {
		const node = utils.htmlToDiv(
			'aa ' +
			'<b>bb' +
			'<span id="sceditor-start-marker" ' +
			'class="sceditor-selection sceditor-ignore" ' +
			'style="display: none; line-height: 0;"> </span>' +
			'<span id="sceditor-end-marker" ' +
			'class="sceditor-selection sceditor-ignore" ' +
			'style="display: none; line-height: 0;"> </span>' +
			'</b>' +
			' aa'
		);

		dom.removeWhiteSpace(node);

		expect(node).toBeNodesEqual(
			utils.htmlToDiv(
				'aa ' +
					'<b>bb' +
						'<span id="sceditor-start-marker" ' +
							'class="sceditor-selection sceditor-ignore" ' +
							'style="display: none; line-height: 0;"> </span>' +
						'<span id="sceditor-end-marker" ' +
							'class="sceditor-selection sceditor-ignore" ' +
							'style="display: none; line-height: 0;"> </span>' +
					'</b>' +
				' aa'
			)
		);
	});

	it('removeWhiteSpace() - Siblings with start and end spaces', () => {
		const html = '<span>  test</span><span>  test  </span>';
		const node = utils.htmlToDiv(html);

		const frag = document.createDocumentFragment();
		frag.appendChild(node);

		dom.removeWhiteSpace(node);

		expect(node.innerHTML.toLowerCase()).toBeHtmlEqual(
			'<span>test</span><span> test</span>'
		);
	});

	it('removeWhiteSpace() - Block then span with start spaces', () => {
		const html = '<div>test</div><span>  test  </span>';
		const node = utils.htmlToDiv(html);

		const frag = document.createDocumentFragment();
		frag.appendChild(node);

		dom.removeWhiteSpace(node);

		expect(node.innerHTML.toLowerCase()).toBeHtmlEqual(
			'<div>test</div><span>test</span>'
		);
	});

	it('removeWhiteSpace() - Divs with start and end spaces', () => {
		const html = '<div>  test  </div><div>  test  </div>';
		const node = utils.htmlToDiv(html);

		const frag = document.createDocumentFragment();
		frag.appendChild(node);

		dom.removeWhiteSpace(node);

		expect(node.innerHTML.toLowerCase()).toBeHtmlEqual(
			'<div>test</div><div>test</div>'
		);
	});

	it('removeWhiteSpace() - New line chars', () => {
		const html = '<span>\ntest\n\n</span><span>\n\ntest\n</span>';
		const node = utils.htmlToDiv(html);

		const frag = document.createDocumentFragment();
		frag.appendChild(node);

		dom.removeWhiteSpace(node);

		expect(node.innerHTML.toLowerCase()).toBeHtmlEqual(
			'<span>test </span>' +
			'<span>test</span>'
		);
	});

	it('removeWhiteSpace() - With .sceditor-ignore siblings', () => {
		const node = utils.htmlToDiv(
			'<span>test</span>' +
			'<span class="sceditor-ignore">  test  </span>' +
			'<span>  test</span>'
		);

		dom.removeWhiteSpace(node);

		expect(node.innerHTML.toLowerCase()).toBeHtmlEqual(
			'<span>test</span>' +
			'<span class="sceditor-ignore"> test </span>' +
			'<span> test</span>'
		);
	});

	it('removeWhiteSpace() - Nested span space', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'<div>    <span>  \t\t\t\t </span>\t\t\t</div> ' +
			'<div>  </div>' +
			'</div>'
		);

		dom.removeWhiteSpace(node);

		expect(node.innerHTML.toLowerCase()).toBeHtmlEqual(
			'<div><span></span> </div><div></div>'
		);
	});

	it('removeWhiteSpace() - Pre tag', () => {
		const node = utils.htmlToDiv(
			'<pre>    <span>  \t\tcontent\t\t </span>\t\t\t</pre>'
		);

		dom.removeWhiteSpace(node);

		expect(node.innerHTML.toLowerCase()).toBeHtmlEqual(
			'<pre>    <span>  \t\tcontent\t\t </span>\t\t\t</pre>'
		);
	});

	it('removeWhiteSpace() - Deeply nested siblings', () => {
		const node = utils.htmlToDiv(
			'<span>' +
			'<span>' +
			'<span>' +
			'<span>test  </span>' +
			'</span>' +
			'</span>' +
			'</span>' +
			'<span>' +
			'<span>' +
			'<span>' +
			'<span>' +
			'<span>  test  </span>' +
			'</span>' +
			'</span>' +
			'</span>' +
			'</span>' +
			'<span>  test</span>'
		);

		dom.removeWhiteSpace(node);

		expect(node.innerHTML.toLowerCase()).toBeHtmlEqual(
			'<span>' +
				'<span>' +
					'<span>' +
						'<span>test </span>' +
					'</span>' +
				'</span>' +
			'</span>' +
			'<span>' +
				'<span>' +
					'<span>' +
						'<span>' +
							'<span>test </span>' +
						'</span>' +
					'</span>' +
				'</span>' +
			'</span>' +
			'<span>test</span>'
		);
	});

	it('removeWhiteSpace() - Text next to image', () => {
		const node = utils.htmlToNode(
			'<div>test  <img src="../../emoticons/smile.png">  test.</div>'
		);

		dom.removeWhiteSpace(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>test <img src="../../emoticons/smile.png"> test.</div>'
			)
		);
	});


	it('extractContents()', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'<span>ignored</span>' +
			'<div id="start">' +
			'<span>test</span>' +
			'</div>' +
			'<span>test</span>' +
			'<span id="end">end</span>' +
			'<span>ignored</span>' +
			'</div>'
		);
		const start = node.querySelector('#start');
		const end = node.querySelector('#end');

		expect(dom.extractContents(start, end)).toBeNodesEqual(
			utils.htmlToFragment(
				'<div id="start">' +
					'<span>test</span>' +
				'</div>' +
				'<span>test</span>'
			)
		);
	});

	it('extractContents() - End inside start', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'<span>ignored</span>' +
			'<div id="start">' +
			'<span>test</span>' +
			'<span>test</span>' +
			'<span id="end">end</span>' +
			'<span>ignored</span>' +
			'</div>' +
			'<span>ignored</span>' +
			'</div>'
		);
		const start = node.querySelector('#start');
		const end = node.querySelector('#end');

		expect(dom.extractContents(start, end)).toBeNodesEqual(
			utils.htmlToFragment(
				'<div id="start">' +
					'<span>test</span>' +
					'<span>test</span>' +
				'</div>'
			)
		);
	});

	it('extractContents() - Start inside end', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'<span>ignored</span>' +
			'<div id="end">' +
			'<span>ignored</span>' +
			'<span>ignored</span>' +
			'<span id="start">start</span>' +
			'<span>test</span>' +
			'</div>' +
			'<span>ignored</span>' +
			'</div>'
		);

		const start = node.querySelector('#start');
		const end = node.querySelector('#end');

		expect(utils.nodeToHtml(dom.extractContents(start, end))).toBeHtmlEqual(
			'<div id="end"><span id="start">start</span><span>test</span></div>'
		);

		expect(utils.nodeToHtml(node)).toBeHtmlEqual(
			'<div>' +
				'<span>ignored</span>' +
				'<div id="end">' +
					'<span>ignored</span>' +
					'<span>ignored</span>' +
				'</div>' +
				'<span>ignored</span>' +
			'</div>'
		);
	});


	it('getStyle()', () => {
		const node = utils.htmlToNode(
			'<div style="font-weight: bold; font-size: 10px;' +
			'text-align: right;">test</div>'
		);

		expect(dom.getStyle(node, 'font-weight'), 'Normal CSS property').toStrictEqual('bold');
		expect(dom.getStyle(node, 'fontSize'), 'Camel case CSS property').toStrictEqual('10px');
		expect(dom.getStyle(node, 'text-align'), 'Text-align').toStrictEqual('right');
		expect(dom.getStyle(node, 'color'), 'Undefined CSS property').toStrictEqual('');
	});

	it('getStyle() - Normalise text-align', () => {
		const node = utils.htmlToNode(
			'<div style="direction: rtl;">test</div>'
		);

		expect(dom.getStyle(node, 'direction')).toStrictEqual('rtl');
		expect(dom.getStyle(node, 'textAlign')).toStrictEqual('');
	});

	it('getStyle() - No style attribute', () => {
		const node = utils.htmlToNode('<div>test</div>');

		expect(dom.getStyle(node, 'color')).toStrictEqual('');
	});


	it('hasStyle()', () => {
		const node = utils.htmlToNode(
			'<div style="font-weight: bold;">test</div>'
		);

		expect(dom.hasStyle(node, 'font-weight'), 'Normal CSS property').toBeTruthy();
		expect(dom.hasStyle(node, 'fontWeight'), 'Camel case CSS property').toBeTruthy();
		expect(dom.hasStyle(node, 'font-weight', 'bold'), 'String value').toBeTruthy();
		expect(dom.hasStyle(node, 'fontWeight', ['@', 'bold', '123']), 'Array of values').toBeTruthy();
	});

	it('hasStyle() - Invalid', () => {
		const node = utils.htmlToNode(
			'<div style="font-weight: bold;">test</div>'
		);

		expect(!dom.hasStyle(node, 'font-weight', 'Bold'), 'Invalid string').toBeTruthy();
		expect(!dom.hasStyle(node, 'fontWeight', ['@', 'normal', '123']), 'Invalid array').toBeTruthy();
		expect(!dom.hasStyle(node, 'color'), 'Undefined property').toBeTruthy();
	});

	it('hasStyle() - No style attribute', () => {
		const node = utils.htmlToNode('<div>test</div>');

		expect(!dom.hasStyle(node, 'color')).toBeTruthy();
	});


	it('merge() - parent matching style', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'1' +
			'<span style="font-weight: bold; font-size: 12px">' +
			'2' +
			'<span style="font-weight: bold;">' +
			'3' +
			'</span>' +
			'4' +
			'</span>' +
			'5' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>' +
					'1' +
					'<span style="font-weight: bold; font-size: 12px">' +
						'234' +
					'</span>' +
					'5' +
				'</div>'
			)
		);
	});

	it('merge() - nested parent matching style', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'1' +
			'<span style="font-weight: bold; font-size: 12px">' +
			'2' +
			'<b>' +
			'<span style="font-size: 12px; font-style: italic">' +
			'3' +
			'</span>' +
			'</b>' +
			'4' +
			'</span>' +
			'5' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>' +
					'1' +
					'<span style="font-weight: bold; font-size: 12px">' +
						'2' +
						'<b>' +
							'<span style="font-style: italic">' +
								'3' +
							'</span>' +
						'</b>' +
						'4' +
					'</span>' +
					'5' +
				'</div>'
			)
		);
	});

	it('merge() - nested span merge attribute', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'1' +
			'<span data-sce-test="2">' +
			'2' +
			'<span data-sce-test="2">3</span>' +
			'4' +
			'</span>' +
			'5' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>' +
					'1' +
					'<span data-sce-test="2">' +
						'234' +
					'</span>' +
					'5' +
				'</div>'
			)
		);
	});

	it('merge() - nested span merge multiple attributes', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'1' +
			'<span data-sce-a="1" data-sce-b="2">' +
			'2' +
			'<span data-sce-a="1" data-sce-b="2">3</span>' +
			'4' +
			'</span>' +
			'5' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>' +
					'1' +
					'<span data-sce-a="1" data-sce-b="2">' +
						'234' +
					'</span>' +
					'5' +
				'</div>'
			)
		);
	});

	it('merge() - nested span attribute different', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'1' +
			'<span data-sce-test>' +
			'2' +
			'<span data-sce-test="2">3</span>' +
			'4' +
			'</span>' +
			'5' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>' +
					'1' +
					'<span data-sce-test>' +
						'2' +
						'<span data-sce-test="2">3</span>' +
						'4' +
					'</span>' +
					'5' +
				'</div>'
			)
		);
	});

	it('merge() - nested span multiple attributes no match', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'1' +
			'<span data-sce-a="1" data-sce-b="1">' +
			'2' +
			'<span data-sce-a="1" data-sce-b="2">3</span>' +
			'4' +
			'</span>' +
			'5' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>' +
					'1' +
					'<span data-sce-a="1" data-sce-b="1">' +
						'2' +
						'<span data-sce-a="1" data-sce-b="2">3</span>' +
						'4' +
					'</span>' +
					'5' +
				'</div>'
			)
		);
	});

	it('merge() - nested strong can merge', () => {
		const node = utils.htmlToNode(
			'<div>1<strong>2<strong>3</strong>4</strong>5</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>1<strong>234</strong>5</div>'
			)
		);
	});

	it('merge() - nested strong cannot merge', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'1' +
			'<strong>' +
			'<span style="font-weight: normal;">' +
			'2<strong>3</strong>4' +
			'</span>' +
			'</strong>' +
			'5' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>' +
					'1' +
					'<strong>' +
						'<span style="font-weight: normal;">' +
							'2<strong>3</strong>4' +
						'</span>' +
					'</strong>' +
					'5' +
				'</div>'
			)
		);
	});

	it('merge() - siblings can merge', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'<span style="font-weight: bold;">' +
			'1' +
			'</span>' +
			'<span style="font-weight: bold;">' +
			'2' +
			'</span>' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>' +
					'<span style="font-weight: bold;">' +
						'12' +
					'</span>' +
				'</div>'
			)
		);
	});

	it('merge() - siblings can merge mixed style', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'<span style="font-size: 12px; font-weight: bold;">' +
			'1' +
			'</span>' +
			'<span style="font-weight: bold;font-size: 12px;">' +
			'2' +
			'</span>' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>' +
					'<span style="font-size: 12px; font-weight: bold;">' +
						'12' +
					'</span>' +
				'</div>'
			)
		);
	});

	it('merge() - siblings cannot merge', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'<span style="font-weight: bold;">' +
			'1' +
			'</span>' +
			'<span style="font-weight: 900;">' +
			'2' +
			'</span>' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>' +
					'<span style="font-weight: bold;">' +
						'1' +
					'</span>' +
					'<span style="font-weight: 900;">' +
						'2' +
					'</span>' +
				'</div>'
			)
		);
	});

	it('merge() - font tags', () => {
		const node = utils.htmlToNode(
			'<div style="font-family: arial; color: #ffff00;">' +
			'1' +
			'<font face="Arial" color="#ffff00">' +
			'2' +
			'</font>' +
			'3' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div style="font-family: arial; color: #ffff00;">' +
					'123' +
				'</div>'
			)
		);
	});

	it('merge() - font tags nested', () => {
		const node = utils.htmlToNode(
			'<div style="font-family: arial; color: #ffff00;">' +
			'1' +
			'<font face="arial">' +
			'2' +
			'<font color="#ffff00">' +
			'3' +
			'</font>' +
			'4' +
			'</font>' +
			'5' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div style="font-family: arial; color: #ffff00;">' +
					'12345' +
				'</div>'
			)
		);
	});

	it('merge() - deep with siblings', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'<em><em><em>1</em></em></em>' +
			'<strong>' +
			'<em><em><em>2</em></em></em>' +
			'<em><em><em>3</em></em></em>' +
			'<em><em><strong>4</strong></em></em>' +
			'<em><em><em>5</em></em></em>' +
			'</strong>' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>' +
					'<em>1</em>' +
					'<strong>' +
						'<em>2345</em>' +
					'</strong>' +
				'</div>'
			)
		);
	});

	it('merge() - <br> tags should not merge', () => {
		const node = utils.htmlToNode(
			'<div>' +
			'<br><br><br>' +
			'</div>'
		);

		dom.merge(node);

		expect(node).toBeNodesEqual(
			utils.htmlToNode(
				'<div>' +
					'<br><br><br>' +
				'</div>'
			)
		);
	});

});
