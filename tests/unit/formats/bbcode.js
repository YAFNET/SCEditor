import defaultOptions from 'src/lib/defaultOptions.js';
import * as utils from 'tests/unit/utils.js';
import 'src/formats/bbcode.js';


QUnit.module('formats/bbcode', {
	beforeEach: function () {
		this.mockEditor = {
			opts: $.extend({}, defaultOptions)
		};

		this.format = new sceditor.formats.bbcode();
		this.format.init.call(this.mockEditor);

		this.htmlToBBCode = function (html) {
			return this.format.toSource(html, document);
		};
	}
});


QUnit.test('To BBCode method', function (assert) {
	assert.equal(
		this.mockEditor.toBBCode('<b>test</b>'),
		'[b]test[/b]',
		'HTML String test'
	);
});


QUnit.test('From BBCode method', function (assert) {
	assert.htmlEqual(
		this.mockEditor.fromBBCode('[b]test[/b]'),
		'<div><strong>test</strong></div>\n'
	);
});

QUnit.test('From BBCode method as fragment', function (assert) {
	assert.htmlEqual(
		this.mockEditor.fromBBCode('[b]test[/b]', true),
		'<strong>test</strong>',
		'Should not wrap fragments in blocks'
	);

	assert.htmlEqual(
		this.mockEditor.fromBBCode(
			'line1[b]test[/b][center]line2[/center]line3[b]test[/b]',
			true
		),
		'line1<strong>test</strong>' +
		'<div align="center">line2</div>' +
		'line3<strong>test</strong>',
		'Should not wrap inlines with a block in between'
	);

	assert.htmlEqual(
		this.mockEditor.fromBBCode(
			'\n\n',
			true
		),
		'<br /><br />',
		'Should preserve newlines'
	);

	assert.htmlEqual(
		this.mockEditor.fromBBCode(
			'[none]test[/none]',
			true
		),
		'[none]test[/none]',
		'Should not alter nonexistent BBCodes'
	);

	assert.htmlEqual(
		this.mockEditor.fromBBCode(
			'[center]line1[/center][center]line2[/center][center]line3[/center]',
			true
		),
		'<div align="center">line1</div>' +
		'<div align="center">line2</div>' +
		'<div align="center">line3</div>',
		'Should keep all styled blocks created by a BBCode'
	);

	assert.htmlEqual(
		this.mockEditor.fromBBCode(
			'\nline2\n',
			true
		),
		'<br />line2<br />',
		'Should not wrap newlines'
	);
});


QUnit.test('BBcode to HTML trim', function (assert) {
	this.mockEditor = {
		opts: $.extend({}, defaultOptions, { bbcodeTrim: true })
	};

	this.format = new sceditor.formats.bbcode();
	this.format.init.call(this.mockEditor);


	assert.htmlEqual(
		this.format.toHtml(
			'\n\n[quote]test[/quote]\n\n'
		),
		'<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm">' +
		'<span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>' + 'test' +
		'</div>',
		'Block level'
	);

	assert.htmlEqual(
		this.format.toHtml(
			'\n\n[b]test[/b]\n\n'
		),
		'<div><strong>test</strong></div>\n',
		'Inline'
	);
});


QUnit.test('HTML to BBCode trim', function (assert) {
	this.mockEditor = {
		opts: $.extend({}, defaultOptions, { bbcodeTrim: true })
	};

	this.format = new sceditor.formats.bbcode();
	this.format.init.call(this.mockEditor);

	this.htmlToBBCode = function (html) {
		return this.format.toSource(html, document);
	};


	assert.equal(
		this.htmlToBBCode('<div><br /><br /></div>' +
			'<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm">' +
			'<span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>' + 'test</div><div><br /><br /></div>'),
		'[quote]test[/quote]',
		'Block level'
	);

	assert.equal(
		this.htmlToBBCode('<div><br /><br /><strong>test</strong>' +
			'<br /><br /><br /></div>'),
		'[b]test[/b]',
		'Inline'
	);
});


QUnit.module('formats/bbcode - HTML to BBCode', {
	beforeEach: function () {
		this.mockEditor = {
			opts: $.extend({}, defaultOptions)
		};

		this.format = new sceditor.formats.bbcode();
		this.format.init.call(this.mockEditor);

		this.htmlToBBCode = function (html) {
			return this.format.toSource(html, document);
		};
	}
});


QUnit.test('Remove empty', function (assert) {
	assert.equal(
		this.htmlToBBCode('<b><br /></b>'),
		'',
		'Empty tag with newline'
	);

	assert.equal(
		this.htmlToBBCode('<b></b>'),
		'',
		'Empty tag'
	);

	assert.equal(
		this.htmlToBBCode('<b><span><br /></span></b>'),
		'',
		'Empty tag with only whitespace content'
	);

	assert.equal(
		this.htmlToBBCode(
			'<b><span><span><span></span><span></span></span>   </span></b>a'
		),
		' a',
		'Empty tag with only whitespace content'
	);

	assert.equal(
		this.htmlToBBCode('test<b><span><br /></span></b>test'),
		'test\ntest',
		'Empty tag with only whitespace between words'
	);

	assert.equal(
		this.htmlToBBCode('test<b><i> </i></b>test'),
		'test test',
		'Nested empty tags with only whitespace between words'
	);
});


QUnit.test('Should not remove whitespace in code tags', function (assert) {
	const result = this.htmlToBBCode(
		'<pre class="border border-danger rounded m-2 p-2"><code class="lang-markup">Some    White \n   \n   space</code></pre>'
	);

	assert.equal(result, '[code=markup]Some    White \n   \n   space[/code]\n', 'Should not remove whitespace in code tags');
});

QUnit.test('Should remove whitespace in non-code tags', function (assert) {
	const result = this.htmlToBBCode(
		'     <div>   lots   </div>   \n of   junk   \n\n\n        \n  j'
	);

	assert.equal(result, 'lots \nof junk j');
});


QUnit.test('New line handling', function (assert) {
	assert.equal(
		this.htmlToBBCode(
			'textnode' +
			'<div>new line before and after </div>' +
			'textnode'
		),
		'textnode\nnew line before and after \ntextnode',
		'Textnode before and after block level element'
	);

	assert.equal(
		this.htmlToBBCode(
			'textnode <span>no new line before and after </span>textnode'
		),
		'textnode no new line before and after textnode',
		'Textnode before and after inline element'
	);

	assert.equal(
		this.htmlToBBCode(
			'test<div>' +
				'<strong><em>test<br /></em></strong>' +
			'</div>test'
		),
		'test\n[b][i]test[/i][/b]\ntest',
		'Block inside inline that is the last child of a block'
	);

	assert.equal(
		this.htmlToBBCode(
			'<div>text<div>text</div>text</div>'
		),
		'text\ntext\ntext',
		'Nested divs'
	);

	assert.equal(
		this.htmlToBBCode(
			'<div><span>text</span><div>text</div><span>text</span></div>'
		),
		'text\ntext\ntext',
		'Nested div with span siblings'
	);

	assert.equal(
		this.htmlToBBCode(
			'<div>' +
				'<div>text</div>' +
				'<div>text</div>' +
				'<div>text</div>' +
			'</div>'
		),
		'text\ntext\ntext',
		'Nested div with div siblings'
	);

	assert.equal(
		this.htmlToBBCode(
			'<div>' +
				'<div>text</div>' +
				'<div><br /></div>' +
				'<div>text</div>' +
			'</div>'
		),
		'text\n\ntext',
		'Nested div with br and div siblings'
	);

	assert.equal(
		this.htmlToBBCode(
			'<div>text</div>' +
			'<div><br /></div>' +
			'<ul><li>text</li></ul>'
		),
		'text\n\n[list]\n[li]text[/li]\n[/list]\n',
		'Div siblings with a list'
	);

	assert.equal(
		this.htmlToBBCode(
			'<div>text</div>' +
			'<div><br /></div>' +
			'<div><br /></div>' +
			'<ul><li>text</li></ul>'
		),
		'text\n\n\n[list]\n[li]text[/li]\n[/list]\n',
		'Multiple div siblings with a list'
	);

	assert.equal(
		this.htmlToBBCode('<div>text<br />text</div>'),
		'text\ntext',
		'BR tag'
	);

	assert.equal(
		this.htmlToBBCode('<div>text<br />text<br /></div>'),
		'text\ntext',
		'Collapsed end BR tag'
	);

	assert.equal(
		this.htmlToBBCode(
			'<ul><li>newline<br /><br /></li></ul>'
		),
		'[list]\n[li]newline\n[/li]\n[/list]\n',
		'List item last child block level'
	);

	assert.equal(
		this.htmlToBBCode(
			'<pre class="border border-danger rounded m-2 p-2"><code class="lang-markup">newline<br /></code></pre>' +
			'<div>newline</div>'
		),
		'[code=markup]newline[/code]\nnewline',
		'Block level last child'
	);
});


QUnit.test('Bold', function (assert) {
	assert.equal(
		this.htmlToBBCode('<span style="font-weight: bold">test</span>'),
		'[b]test[/b]',
		'CSS bold'
	);

	assert.equal(
		this.htmlToBBCode('<span style="font-weight: 800">test</span>'),
		'[b]test[/b]',
		'CSS bold number'
	);

	assert.equal(
		this.htmlToBBCode('<span style="font-weight: normal">test</span>'),
		'test',
		'CSS not bold'
	);

	assert.equal(
		this.htmlToBBCode('<b>test</b>'),
		'[b]test[/b]',
		'B tag'
	);

	assert.equal(
		this.htmlToBBCode('<strong>test</strong>'),
		'[b]test[/b]',
		'Strong tag'
	);
});


QUnit.test('Italic', function (assert) {
	assert.equal(
		this.htmlToBBCode('<span style="font-style: italic">test</span>'),
		'[i]test[/i]',
		'CSS italic'
	);

	assert.equal(
		this.htmlToBBCode('<span style="font-style: oblique">test</span>'),
		'[i]test[/i]',
		'CSS oblique'
	);

	assert.equal(
		this.htmlToBBCode('<span style="font-style: normal">test</span>'),
		'test',
		'CSS normal'
	);

	assert.equal(
		this.htmlToBBCode('<em>test</em>'),
		'[i]test[/i]',
		'Em tag'
	);

	assert.equal(
		this.htmlToBBCode('<i>test</i>'),
		'[i]test[/i]',
		'I tag'
	);
});


QUnit.test('Underline', function (assert) {
	assert.equal(
		this.htmlToBBCode(
			'<span style="text-decoration: underline">test</span>'
		),
		'[u]test[/u]',
		'CSS underline'
	);

	assert.equal(
		this.htmlToBBCode(
			'<span style="text-decoration: normal">test</span>'
		),
		'test',
		'CSS normal'
	);

	assert.equal(
		this.htmlToBBCode('<u>test</u>'),
		'[u]test[/u]',
		'U tag'
	);
});


QUnit.test('Strikethrough', function (assert) {
	assert.equal(
		this.htmlToBBCode(
			'<span style="text-decoration: line-through">test</span>'
		),
		'[s]test[/s]',
		'CSS line-through'
	);

	assert.equal(
		this.htmlToBBCode(
			'<span style="text-decoration: normal">test</span>'
		),
		'test',
		'CSS normal'
	);

	assert.equal(
		this.htmlToBBCode('<s>test</s>'),
		'[s]test[/s]',
		'S tag'
	);

	assert.equal(
		this.htmlToBBCode('<strike>test</strike>'),
		'[s]test[/s]',
		'strike tag'
	);
});


QUnit.test('Subscript', function (assert) {
	assert.equal(
		this.htmlToBBCode('<sub>test</sub>'),
		'[sub]test[/sub]',
		'Sub tag'
	);
});


QUnit.test('Superscript', function (assert) {
	assert.equal(
		this.htmlToBBCode('<sup>test</sup>'),
		'[sup]test[/sup]',
		'Sup tag'
	);
});


QUnit.test('Font face', function (assert) {
	assert.equal(
		this.htmlToBBCode('<span style="font-family: Arial">test</span>'),
		'[font=Arial]test[/font]',
		'CSS'
	);

	assert.equal(
		this.htmlToBBCode(
			'<span  style="font-family: Arial Black">test</span>'
		),
		'[font=Arial Black]test[/font]',
		'CSS font with space in name'
	);

	assert.equal(
		this.htmlToBBCode(
			'<span  style="font-family: \'Arial Black\'">test</span>'
		),
		'[font=Arial Black]test[/font]',
		'CSS font with space in name wrapped in quotes'
	);

	assert.equal(
		this.htmlToBBCode('<font face="Arial">test</font>'),
		'[font=Arial]test[/font]',
		'Font tag face attribute'
	);

	assert.equal(
		this.htmlToBBCode('<font face="Arial Black">test</font>'),
		'[font=Arial Black]test[/font]',
		'Font tag face attribute with space in name'
	);

	assert.equal(
		this.htmlToBBCode('<font face="\'Arial Black\'">test</font>'),
		'[font=Arial Black]test[/font]',
		'Font tag face attribute with space in name wrapped in quotes'
	);

	assert.equal(
		utils.stripWhiteSpace(this.htmlToBBCode(
			'<span style="font-family: \'Arial Black\', Arial">test</span>'
		)).replace(/"/g, '\''),
		utils.stripWhiteSpace(
			'[font=\'Arial Black\',Arial]test[/font]'
		).replace(/"/g, '\''),
		'Font with space and another without quotes'
	);
});


QUnit.test('Size', function (assert) {
	assert.equal(
		this.htmlToBBCode('<span style="font-size: 11px">test</span>'),
		'[size=1]test[/size]',
		'CSS px'
	);

	assert.equal(
		this.htmlToBBCode('<span style="font-size: 1100px">test</span>'),
		'[size=7]test[/size]',
		'CSS px too large'
	);

	assert.equal(
		this.htmlToBBCode('<span style="font-size: 0.5em">test</span>'),
		'[size=1]test[/size]',
		'CSS em'
	);

	assert.equal(
		this.htmlToBBCode('<span style="font-size: 50%">test</span>'),
		'[size=1]test[/size]',
		'CSS percent'
	);

	assert.equal(
		this.htmlToBBCode('<font size="1">test</font>'),
		'[size=1]test[/size]',
		'Font tag size attribute'
	);
});


QUnit.test('colour', function (assert) {
	assert.equal(
		this.htmlToBBCode('<span style="color: #ffffff">test</span>'),
		'[color=#ffffff]test[/color]',
		'CSS normal'
	);

	assert.equal(
		this.htmlToBBCode('<span style="color: #fff">test</span>'),
		'[color=#ffffff]test[/color]',
		'CSS short hand'
	);

	assert.equal(
		this.htmlToBBCode('<span style="color: rgb(255,255,255)">test</span>'),
		'[color=#ffffff]test[/color]',
		'CSS RGB'
	);

	assert.equal(
		this.htmlToBBCode('<font color="#0af">test</font>'),
		'[color=#00aaff]test[/color]',
		'Font tag color attribute short'
	);


	assert.equal(
		this.htmlToBBCode('<font color="#0AF">test</font>'),
		'[color=#00AAFF]test[/color]',
		'Font tag color attribute short uppercase'
	);

	assert.equal(
		this.htmlToBBCode('<font color="#00aaff">test</font>'),
		'[color=#00aaff]test[/color]',
		'Font tag color attribute normal'
	);

	assert.equal(
		this.htmlToBBCode('<font color="#0<>">test</font>'),
		'[color=#0<>]test[/color]',
		'Font tag color attribute non-hex characters'
	);

	assert.equal(
		this.htmlToBBCode('<font color="rgb(0,170,255)">test</font>'),
		'[color=#00aaff]test[/color]',
		'Font tag color attribute rgb'
	);
});


QUnit.test('List', function (assert) {
	assert.equal(
		this.htmlToBBCode('<ul><li>test<br /></li></ul>'),
		'[list]\n[li]test[/li]\n[/list]\n',
		'UL tag'
	);

	assert.equal(
		this.htmlToBBCode('<ol><li>test<br /></li></ol>'),
		'[list=I]\n[li]test[/li]\n[/list]\n',
		'OL tag'
	);

	assert.equal(
		this.htmlToBBCode(
			'<ul>' +
				'<li>test' +
					'<ul>' +
						'<li>sub<br /></li>' +
					'</ul>' +
				'</li>' +
			'</ul>'
		),
		'[list]\n[li]test\n[list]\n[li]sub[/li]\n[/list]\n[/li]\n[/list]\n',
		'Nested UL tag'
	);
});


QUnit.test('Table', function (assert) {
	assert.equal(
		this.htmlToBBCode(
			'<table>' +
				'<tr><th>test</th></tr>' +
				'<tr><td>data1</td></tr>' +
			'</table>'
		),
		'[table]' +
			'[tr][th]test[/th]\n[/tr]\n' +
			'[tr][td]data1[/td]\n[/tr]\n' +
		'[/table]\n'
	);
});


QUnit.test('Horizontal rule', function (assert) {
	assert.equal(
		this.htmlToBBCode('<hr />'),
		'[hr]\n',
		'HR tag'
	);
});


QUnit.test('Image', function (assert) {
	assert.equal(
		this.htmlToBBCode(
			'<img src="http://www.sceditor.com/emoticons/smile.png" />'
		),
		'[img]http://www.sceditor.com/emoticons/smile.png[/img]',
		'Image no attributes'
	);

	assert.equal(
		this.htmlToBBCode(
			'<img src="http://www.sceditor.com/404.png" width="200" />'
		),
		'[img]http://www.sceditor.com/404.png[/img]',
		'Non-loaded image with width attribute'
	);
});

// QUnit.test('Image dimensions when loaded', function (assert) {
// 	var done = assert.async();
// 	var plugin = this.format;
// 	var div = utils.htmlToDiv(
// 		'<img src="http://www.sceditor.com/emoticons/smile.png" ' +
// 			'width="200" />'
// 	);

// 	var checkLoaded = function () {
// 		if (!div.firstChild.complete || div.firstChild.naturalWidth === 0) {
// 			setTimeout(checkLoaded, 100);
// 			return;
// 		}

// 		assert.equal(
// 			plugin.toSource(
// 				'<img src="http://www.sceditor.com/emoticons/smile.png" ' +
// 				'width="200" />', document),
// 			'[img=200x200]http://www.sceditor.com/emoticons/smile.png[/img]'
// 		);

// 		done();
// 	};

// 	checkLoaded();
// });


QUnit.test('URL', function (assert) {
	assert.equal(
		this.htmlToBBCode('<a href="http://test.com/">Test</a>'),
		'[url=http://test.com/]Test[/url]',
		'Anchor tag'
	);

	assert.equal(
		this.htmlToBBCode('<a href="http://test.com/"></a>'),
		'[url=http://test.com/][/url]',
		'Empty anchor tag'
	);
});


QUnit.test('Email', function (assert) {
	assert.equal(
		this.htmlToBBCode('<a href="mailto:test@test.com">Test</a>'),
		'[email=test@test.com]Test[/email]',
		'A tag name'
	);

	assert.equal(
		this.htmlToBBCode(
			'<a href="mailto:test@test.com">test@test.com</a>'
		),
		'[email=test@test.com]test@test.com[/email]',
		'A tag e-mail'
	);

	assert.equal(
		this.htmlToBBCode('<a href="mailto:test@test.com"></a>'),
		'',
		'Empty e-mail tag'
	);
});


QUnit.test('Quote', function (assert) {
	assert.equal(
		this.htmlToBBCode('<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm">' +
			'<span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>' + 'Testing 1.2.3....' +
			'</div>'),
		'[quote]Testing 1.2.3....[/quote]\n',
		'Simple quote'
	);

	assert.equal(
		this.htmlToBBCode(
			'<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm">' +
			'<span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>' +
			'<cite class="card-text text-end d-block text-body-secondary small">admin</cite>' +
			'Testing 1.2.3....</div>'
		),
		'[quote=admin]Testing 1.2.3....[/quote]\n',
		'Quote with cite (author)'
	);

	assert.equal(
		this.htmlToBBCode(
			'<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm">' +
			'<span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>' +
				'<cite class="card-text text-end d-block text-body-secondary small">admin</cite>Testing 1.2.3....' +
				'<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm">' +
				'<span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>' +
					'<cite class="card-text text-end d-block text-body-secondary small">admin</cite>Testing 1.2.3....' +
				'</div>' +
			'</div>'
		),
		'[quote=admin]Testing 1.2.3....\n[quote=admin]Testing 1.2.3....' +
			'[/quote]\n[/quote]\n',
		'Nested quote with cite (author)'
	);

	assert.equal(
		this.htmlToBBCode(
			'<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm">' +
			'<span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>' +
				'<cite class="card-text text-end d-block text-body-secondary small">admin</cite>' +
				'<cite>this should be ignored</cite> Testing 1.2.3....' +
			'</div>'
		),
		'[quote=admin]this should be ignored Testing 1.2.3....[/quote]\n',
		'Quote with 2 cites (author)'
	);
});


QUnit.test('Code', function (assert) {
	assert.equal(
		this.htmlToBBCode('<pre class="border border-danger rounded m-2 p-2"><code class="lang-markup">Testing 1.2.3....</code></pre>'),
		'[code=markup]Testing 1.2.3....[/code]\n',
		'Simple code'
	);

	assert.equal(
		this.htmlToBBCode(
			'<pre class="border border-danger rounded m-2 p-2"><code class="lang-markup"><b>ignore this</b> Testing 1.2.3....</code></pre>'
		),
		'[code=markup]ignore this Testing 1.2.3....[/code]\n',
		'Code with styling'
	);

	assert.equal(
		this.htmlToBBCode(
			'<pre class="border border-danger rounded m-2 p-2"><code class="lang-markup"><span style="color:#ff0000">test</span></code></pre>'
		),
		'[code=markup]test[/code]\n',
		'Code with inline styling'
	);

	assert.equal(
		this.htmlToBBCode(
			'<pre class="border border-danger rounded m-2 p-2"><code class="lang-markup"><div style="color:#ff0000">test</div></code></pre>'
		),
		'[code=markup]test[/code]\n',
		'Code with block styling'
	);


	assert.equal(
		this.htmlToBBCode(
			'<pre class="border border-danger rounded m-2 p-2"><code class="lang-markup"><div><div style="color:#ff0000">test</div></div></code></pre>'
		),
		'[code=markup]test[/code]\n',
		'Code with nested block styling'
	);

	assert.equal(
		this.htmlToBBCode(
			'<pre class="border border-danger rounded m-2 p-2"><code class="lang-markup"><div>line 1</div><div>line 2</div></code></pre>'
		),
		'[code=markup]line 1\nline 2[/code]\n',
		'Code with block lines'
	);
});


QUnit.test('Left', function (assert) {
	assert.equal(
		this.htmlToBBCode('<div style="text-align: left">test</div>'),
		'[left]test[/left]\n',
		'CSS text-align'
	);

	assert.equal(
		this.htmlToBBCode('<div align="left">test</div>'),
		'[left]test[/left]\n',
		'Align attribute'
	);
});


QUnit.test('Right', function (assert) {
	assert.equal(
		this.htmlToBBCode('<div style="text-align: right">test</div>'),
		'[right]test[/right]\n',
		'CSS text-align'
	);

	assert.equal(
		this.htmlToBBCode('<div align="right">test</div>'),
		'[right]test[/right]\n',
		'Align attribute'
	);
});


QUnit.test('Centre', function (assert) {
	assert.equal(
		this.htmlToBBCode('<div style="text-align: center">test</div>'),
		'[center]test[/center]\n',
		'CSS text-align'
	);

	assert.equal(
		this.htmlToBBCode('<div align="center">test</div>'),
		'[center]test[/center]\n',
		'Align attribute'
	);
});


QUnit.test('Justify', function (assert) {
	assert.equal(
		this.htmlToBBCode('<div style="text-align: justify">test</div>'),
		'[justify]test[/justify]\n',
		'CSS text-align'
	);

	assert.equal(
		this.htmlToBBCode('<div align="justify">test</div>'),
		'[justify]test[/justify]\n',
		'Align attribute'
	);
});
/*
QUnit.test('YouTube', function (assert) {
	assert.equal(
		this.htmlToBBCode('<iframe data-youtube-id="xyz"></iframe>'),
		'[youtube]https://www.youtube.com/watch?v=xyz[/youtube]'
	);
});*/
