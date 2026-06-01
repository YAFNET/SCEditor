import { describe, it, expect, beforeEach } from 'vitest';
import * as utils from 'tests/unit/utils.js';
import 'src/sceditor.js';
import 'src/formats/bbcode.js';

describe('formats/bbcode#Parser', () => {
	let parser;

	beforeEach(() => {
		parser = new sceditor.BBCodeParser({});
	});


	it('Fix invalid nesting', () => {
		expect(
			utils.stripWhiteSpace(parser.toBBCode('[b]test[code]test[/code]test[/b]')),
			'Block level tag in an inline tag with content before and after'
		).toBe('[b]test[/b][code]test[/code][b]test[/b]');

		expect(
			utils.stripWhiteSpace(parser.toBBCode('[b]test[code]test[/code][/b]')),
			'Block level tag in an inline tag with content before'
		).toBe('[b]test[/b][code]test[/code]');

		expect(
			utils.stripWhiteSpace(parser.toBBCode('[b][i][s]test[code]test[/code]test[/s][/i][/b]')),
			'Deeply nested block in inline tags'
		).toBe('[b][i][s]test[/s][/i][/b][code]test[/code][b][i][s]test[/s][/i][/b]');

		expect(
			utils.stripWhiteSpace(parser.toBBCode('[size=3]test[code]test[/code]test[/size]')),
			'Preserve attributes'
		).toBe('[size=3]test[/size][code]test[/code][size=3]test[/size]');

		expect(
			parser.toBBCode(
				'[ul]' +
					'[color=#444444]' +
						'[li]test[/li]\n' +
						'[li]test[/li]\n' +
						'[li]test[/li]\n' +
					'[/color]' +
				'[/ul]'
			),
			'Move newlines'
		).toBe(
			'[ul]\n' +
				'[li][color=#444444]test[/color][/li]\n' +
				'[li][color=#444444]test[/color][/li]\n' +
				'[li][color=#444444]test[/color][/li]\n' +
			'[/ul]\n'
		);
	});


	it('Rename BBCode', () => {
		sceditor.formats.bbcode.rename('b', 'testbold');
		parser = new sceditor.BBCodeParser({});

		expect(!!sceditor.formats.bbcode.get('testbold'), 'Can get renamed BBCode').toBeTruthy();
		expect(!sceditor.formats.bbcode.get('b'), 'Cannot get BBCode by old name').toBeTruthy();

		expect(parser.toHTML('[testbold]test[/testbold]'), 'Will convert renamed BBCode').toBe(
			'<div><strong>test</strong></div>\n'
		);

		sceditor.formats.bbcode.rename('testbold', 'b');

		expect(!sceditor.formats.bbcode.get('testbold'), 'Should not be able to get old BBCode name').toBeTruthy();
	});


	it('Self closing tag', () => {
		expect(parser.toBBCode('[hr]test'), 'Self closing').toBe('[hr]\ntest');
	});


	it('Tag closed by another tag', () => {
		expect(
			parser.toBBCode('[list][*] test[*] test 2[/list]'),
			'List [*]'
		).toBe('[list]\n[*] test[/*]\n[*] test 2[/*]\n[/list]\n');
	});


	it('BBCode closed outside block', () => {
		expect(
			parser.toBBCode('[b]test[code]test[/b][/code]test[/b]'),
			'Code with closing tag inside'
		).toBe('[b]test[/b][code]test[/b][/code]\n[b]test[/b]');

		expect(
			parser.toBBCode('[b]test[quote]test[/b][/quote]\ntest[/b]'),
			'Quote with closing tag inside'
		).toBe('[b]test[/b][quote][b]test[/b][/quote]\ntest[/b]');

		expect(
			parser.toBBCode('[code][b]something[/code]\n[b]something[/b]'),
			'Code with tag closed outside'
		).toBe('[code][b]something[/code]\n[b]something[/b]');

		expect(
			parser.toBBCode('[quote][b]something[/quote]\n[b]something[/b]'),
			'Quote with tag closed outside'
		).toBe('[quote][b]something[/b][/quote]\n[b][b]something[/b][/b]');
	});

	it('BBCode closed outside block - No children fix', () => {
		parser = new sceditor.BBCodeParser({ fixInvalidChildren: false });

		expect(
			parser.toBBCode('[b]test[code]test[/b][/code]test[/b]'),
			'Code with closing tag inside'
		).toBe('[b]test[/b][code][b]test[/b][/code]\ntest[/b]');

		expect(
			parser.toBBCode('[b]test[quote]test[/b][/quote]\ntest[/b]'),
			'Quote with closing tag inside'
		).toBe('[b]test[/b][quote][b]test[/b][/quote]\ntest[/b]');

		expect(
			parser.toBBCode('[code][b]something[/code]\n[b]something[/b]'),
			'Code with tag closed outside'
		).toBe('[code][b]something[/b][/code]\n[b][b]something[/b][/b]');

		expect(
			parser.toBBCode('[quote][b]something[/quote]\n[b]something[/b]'),
			'Quote with tag closed outside'
		).toBe('[quote][b]something[/b][/quote]\n[b][b]something[/b][/b]');
	});


	it('Closing parent tag from child', () => {
		expect(
			parser.toBBCode('[b][color]test[/b][/color]'),
			'Closing parent tag from child tag'
		).toBe('[b][color]test[/color][/b]');

		expect(
			parser.toBBCode('[b]test[color]test[/b]test[/color]'),
			'Closing parent tag from child tag with content before and after'
		).toBe('[b]test[color]test[/color][/b][color]test[/color]');

		expect(
			parser.toBBCode('[b][s][i][color]test[/i][/s][/b][/color]'),
			'Closing parent tag from deeply nested child tag'
		).toBe('[b][s][i][color]test[/color][/i][/s][/b]');

		expect(
			parser.toBBCode('[color][b][s][i]test[/color][/i][/s][/b]'),
			'Closing parent tag from deeply nested child tag'
		).toBe('[color][b][s][i]test[/i][/s][/b][/color]');

		expect(
			parser.toBBCode('[left][list][*]xyz[/left][list][*]abc[/list]'),
			'Closing parent tag from list item'
		).toBe(
			'[left][list]\n[*]xyz[/*]\n[/list]\n[/left]\n[list]\n[*][list]\n' +
			'[*]abc[/*]\n[/list]\n[/*]\n[/list]\n'
		);
	});


	it('Missing tags', () => {
		expect(parser.toBBCode('[b][color][/b]'), 'Missing closing tag').toBe('[b][color][/b]');
		expect(parser.toBBCode('[b][/color][/b]'), 'Missing opening tag').toBe('[b][/color][/b]');
	});


	it('Unknown tags', () => {
		expect(parser.toBBCode('[b][unknown][/b]'), 'Unknown tag missing end').toBe('[b][unknown][/b]');
		expect(parser.toBBCode('[b][unknown]test[/unknown][/b]'), 'Unknown tag with end').toBe('[b][unknown]test[/unknown][/b]');
		expect(parser.toBBCode('[b][unknown][/unknown][/b]'), 'Empty unknown tag with end').toBe('[b][unknown][/unknown][/b]');
		expect(
			parser.toHTML('[b][unknown]test[/unknown][/b]'),
			'Empty unknown tag with end to HTML'
		).toBe('<div><strong>[unknown]test[/unknown]</strong></div>\n');

		expect(parser.toHTML('[nonexistant aaa]'), 'Unknown tag with attribute').toBeHtmlEqual(
			'<div>[nonexistant aaa]</div>\n'
		);
	});

	it('Do not strip start and end spaces', () => {
		expect(parser.toHTML('\n\n[quote]test[/quote]\n\n\n\n')).toBe(
			'<div><br /></div>\n' +
			'<div><br /></div>\n' +
			'<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm"><span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>test</div>' +
			'<div><br /></div>\n' +
			'<div><br /></div>\n' +
			'<div><br /><br /></div>\n'
		);
	});


	it('New Line Handling', () => {
		expect(
			parser.toHTML('[list][*]test\n[*]test2\nline\n[/list]'),
			'List with non-closed [*]'
		).toBeHtmlEqual(
			'<ul><li>test</li><li>test2<br />line</li></ul>'
		);

		expect(
			parser.toHTML('[code=markup]test\nline\n[/code]'),
			'Code test'
		).toBeHtmlEqual(
			'<pre class="border border-danger rounded m-2 p-2"><code class="lang-markup">test<br />line<br /></code></pre>'
		);

		expect(
			parser.toHTML('[quote]test\nline\n[/quote]'),
			'Quote test'
		).toBeHtmlEqual(
			'<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm"><span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>test<br />line<br /></div>'
		);

		expect(
			parser.toHTML('[quote][center]test[/center][/quote]'),
			'Two block-level elements together'
		).toBeHtmlEqual(
			'<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm"><span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>' +
				'<div align="center">test</div>' +
			'</div>'
		);
	});


	it('Attributes QuoteType.auto', () => {
		sceditor.formats.bbcode.set('quote', { quoteType: null });
		parser = new sceditor.BBCodeParser({ quoteType: sceditor.BBCodeParser.QuoteType.auto });

		expect(
			parser.toBBCode('[quote author=poster date=1353794172 link=topic=2.msg4#msg4]hi[/quote]'),
			'Attribute with value that contains an equals'
		).toBe('[quote author=poster date=1353794172 link="topic=2.msg4#msg4"]hi[/quote]\n');

		expect(
			parser.toBBCode('[quote author=\'poster\\\'s\']hi[/quote]'),
			'Quoted attribute with a single quote'
		).toBe('[quote author=poster\'s]hi[/quote]\n');

		expect(
			parser.toBBCode('[quote author=\'poster"s\']hi[/quote]'),
			'Quoted attribute with a double quote'
		).toBe('[quote author=poster"s]hi[/quote]\n');

		expect(
			parser.toBBCode('[quote author=This is all the author date=12345679]hi[/quote]'),
			'Attribute with spaces'
		).toBe('[quote author="This is all the author" date=12345679]hi[/quote]\n');

		expect(
			parser.toBBCode('[quote=te=st test=ex=tra]hi[/quote]'),
			'Default attribute with equal'
		).toBe('[quote="te=st" test="ex=tra"]hi[/quote]\n');

		expect(
			parser.toBBCode(
				'[quote quoted=\'words word=word\\\' link=lala=lalala\' author=anything that does not have an equals after it date=1353794172 link=anythingEvenEquals=no space up to the equals test=la]asd[/quote]'
			),
			'Multi-Attribute test'
		).toBe(
			'[quote quoted="words word=word\' link=lala=lalala" author="anything that does not have an equals after it" date=1353794172 link="anythingEvenEquals=no space up to the equals" test=la]asd[/quote]\n'
		);

		sceditor.formats.bbcode.set('quote', { quoteType: sceditor.BBCodeParser.QuoteType.never });
	});


	it('Attributes QuoteType.never', () => {
		sceditor.formats.bbcode.set('quote', { quoteType: null });
		parser = new sceditor.BBCodeParser({ quoteType: sceditor.BBCodeParser.QuoteType.never });

		expect(
			parser.toBBCode('[quote author=poster date=1353794172 link=topic=2.msg4#msg4]hi[/quote]'),
			'Attribute with value that contains an equals'
		).toBe('[quote author=poster date=1353794172 link=topic=2.msg4#msg4]hi[/quote]\n');

		expect(
			parser.toBBCode('[quote author=\'poster\\\'s\']hi[/quote]'),
			'Quoted attribute with a single quote'
		).toBe('[quote author=poster\'s]hi[/quote]\n');

		expect(
			parser.toBBCode('[quote author=\'poster"s\']hi[/quote]'),
			'Quoted attribute with a double quote'
		).toBe('[quote author=poster"s]hi[/quote]\n');

		expect(
			parser.toBBCode('[quote author=This is all the author date=12345679]hi[/quote]'),
			'Attribute with spaces'
		).toBe('[quote author=This is all the author date=12345679]hi[/quote]\n');

		expect(
			parser.toBBCode('[quote=te=st test=ex=tra]hi[/quote]'),
			'Default attribute with equal'
		).toBe('[quote=te=st test=ex=tra]hi[/quote]\n');

		expect(
			parser.toBBCode(
				'[quote quoted=\'words word=word\\\' link=lala=lalala\' author=anything that does not have an equals after it date=1353794172 link=anythingEvenEquals=no space up to the equals test=la]asd[/quote]'
			),
			'Multi-Attribute test'
		).toBe(
			'[quote quoted=words word=word\' link=lala=lalala author=anything that does not have an equals after it date=1353794172 link=anythingEvenEquals=no space up to the equals test=la]asd[/quote]\n'
		);

		sceditor.formats.bbcode.set('quote', { quoteType: sceditor.BBCodeParser.QuoteType.never });
	});


	it('Attributes QuoteType.always', () => {
		sceditor.formats.bbcode.set('quote', { quoteType: null });
		parser = new sceditor.BBCodeParser({ quoteType: sceditor.BBCodeParser.QuoteType.always });

		expect(
			parser.toBBCode('[quote author=poster date=1353794172 link=topic=2.msg4#msg4]hi[/quote]'),
			'Attribute with value that contains an equals'
		).toBe('[quote author="poster" date="1353794172" link="topic=2.msg4#msg4"]hi[/quote]\n');

		expect(
			parser.toBBCode('[quote author=\'poster\\\'s\']hi[/quote]'),
			'Quoted attribute with a single quote'
		).toBe('[quote author="poster\'s"]hi[/quote]\n');

		expect(
			parser.toBBCode('[quote author=\'poster"s\']hi[/quote]'),
			'Quoted attribute with a double quote'
		).toBe('[quote author="poster\\"s"]hi[/quote]\n');

		expect(
			parser.toBBCode('[quote author=This is all the author date=12345679]hi[/quote]'),
			'Attribute with spaces'
		).toBe('[quote author="This is all the author" date="12345679"]hi[/quote]\n');

		expect(
			parser.toBBCode('[quote=te=st test=ex=tra]hi[/quote]'),
			'Default attribute with equal'
		).toBe('[quote="te=st" test="ex=tra"]hi[/quote]\n');

		expect(
			parser.toBBCode('[quote="test\\"s\\"s" test="test\\"s\\"s"]hi[/quote]'),
			'Attribute with multiple quotes inside'
		).toBe('[quote="test\\"s\\"s" test="test\\"s\\"s"]hi[/quote]\n');

		expect(
			parser.toBBCode(
				'[quote quoted=\'words word=word\\\' link=lala=lalala\' author=anything that does not have an equals after it date=1353794172 link=anythingEvenEquals=no space up to the equals test=la]asd[/quote]'
			),
			'Multi-Attribute test'
		).toBe(
			'[quote quoted="words word=word\' link=lala=lalala" author="anything that does not have an equals after it" date="1353794172" link="anythingEvenEquals=no space up to the equals" test="la"]asd[/quote]\n'
		);

		sceditor.formats.bbcode.set('quote', { quoteType: sceditor.BBCodeParser.QuoteType.never });
	});


	it('Attributes QuoteType custom', () => {
		sceditor.formats.bbcode.set('quote', { quoteType: null });
		parser = new sceditor.BBCodeParser({
			quoteType: (str) => '\'' + str.replace(/\\/g, '\\\\').replace(/'/g, '\\\'') + '\''
		});

		expect(
			parser.toBBCode('[quote author=poster date=1353794172 link=topic=2.msg4#msg4]hi[/quote]'),
			'Attribute with value that contains an equals'
		).toBe('[quote author=\'poster\' date=\'1353794172\' link=\'topic=2.msg4#msg4\']hi[/quote]\n');

		expect(
			parser.toBBCode('[quote author=\'poster\\\'s\\\'s\']hi[/quote]'),
			'Quoted attribute with a single quote'
		).toBe('[quote author=\'poster\\\'s\\\'s\']hi[/quote]\n');

		expect(
			parser.toBBCode('[quote author=\'poster"s\']hi[/quote]'),
			'Quoted attribute with a double quote'
		).toBe('[quote author=\'poster"s\']hi[/quote]\n');

		expect(
			parser.toBBCode('[quote author=This is all the author date=12345679]hi[/quote]'),
			'Attribute with spaces'
		).toBe('[quote author=\'This is all the author\' date=\'12345679\']hi[/quote]\n');

		expect(
			parser.toBBCode('[quote=te=st test=ex=tra]hi[/quote]'),
			'Default attribute with equal'
		).toBe('[quote=\'te=st\' test=\'ex=tra\']hi[/quote]\n');

		expect(
			parser.toBBCode(
				'[quote quoted=\'words word=word\\\' link=lala=lalala\' author=anything that does not have an equals after it date=1353794172 link=anythingEvenEquals=no space up to the equals test=la]asd[/quote]'
			),
			'Multi-Attribute test'
		).toBe(
			'[quote quoted=\'words word=word\\\' link=lala=lalala\' author=\'anything that does not have an equals after it\' date=\'1353794172\' link=\'anythingEvenEquals=no space up to the equals\' test=\'la\']asd[/quote]\n'
		);

		sceditor.formats.bbcode.set('quote', { quoteType: sceditor.BBCodeParser.QuoteType.never });
	});

});


describe('formats/bbcode#Parser - To HTML', () => {
	let parser;

	beforeEach(() => {
		parser = new sceditor.BBCodeParser({});
	});


	it('Bold', () => {
		expect(parser.toHTML('[b]test[/b]')).toBeHtmlEqual('<div><strong>test</strong></div>\n');
	});

	it('Italic', () => {
		expect(parser.toHTML('[i]test[/i]')).toBeHtmlEqual('<div><em>test</em></div>\n');
	});

	it('Underline', () => {
		expect(parser.toHTML('[u]test[/u]')).toBeHtmlEqual('<div><u>test</u></div>\n');
	});

	it('Strikethrough', () => {
		expect(parser.toHTML('[s]test[/s]')).toBeHtmlEqual('<div><s>test</s></div>\n');
	});

	it('Subscript', () => {
		expect(parser.toHTML('[sub]test[/sub]')).toBeHtmlEqual('<div><sub>test</sub></div>\n');
	});

	it('Superscript', () => {
		expect(parser.toHTML('[sup]test[/sup]')).toBeHtmlEqual('<div><sup>test</sup></div>\n');
	});

	it('Font face', () => {
		expect(parser.toHTML('[font=arial]test[/font]'), 'Normal').toBeHtmlEqual('<div><font face="arial">test</font></div>\n');
		expect(parser.toHTML('[font=arial black]test[/font]'), 'Space').toBeHtmlEqual('<div><font face="arial black">test</font></div>\n');
		expect(parser.toHTML('[font="arial black"]test[/font]'), 'Quotes').toBeHtmlEqual('<div><font face="arial black">test</font></div>\n');
	});

	it('Size', () => {
		expect(parser.toHTML('[size=4]test[/size]'), 'Normal').toBeHtmlEqual('<div><font size="4">test</font></div>\n');
	});

	it('Font colour', () => {
		expect(parser.toHTML('[color=#000]test[/color]'), 'Normal').toBeHtmlEqual('<div><font color="#000000">test</font></div>\n');
		expect(parser.toHTML('[color=black]test[/color]'), 'Named').toBeHtmlEqual('<div><font color="black">test</font></div>\n');
	});

	it('List', () => {
		expect(parser.toHTML('[ul][li]test[/li][/ul]'), 'UL').toBeHtmlEqual('<ul><li>test</li></ul>');
		expect(parser.toHTML('[ol][li]test[/li][/ol]'), 'OL').toBeHtmlEqual('<ol><li>test</li></ol>');
		expect(parser.toHTML('[ul][li]test[ul][li]sub[/li][/ul][/li][/ul]'), 'Nested UL').toBeHtmlEqual('<ul><li>test<ul><li>sub</li></ul></li></ul>');
	});

	it('Table', () => {
		expect(
			parser.toHTML('[table][tr][th]test[/th][/tr][tr][td]data1[/td][/tr][/table]'),
			'Normal'
		).toBeHtmlEqual(
			'<div><table class="table"><tr><th>test</th></tr><tr><td class="border">data1</td></tr></table></div>\n'
		);
	});

	it('Horizontal rule', () => {
		expect(parser.toHTML('[hr]'), 'Normal').toBeHtmlEqual('<hr />');
	});

	it('Image', () => {
		expect(
			parser.toHTML('[img]http://test.com/test.png[/img]'),
			'Normal'
		).toBeHtmlEqual(
			'<div><img src="http://test.com/test.png" alt="http://test.com/test.png" class="img-user-posted img-thumbnail" /></div>\n'
		);

		expect(
			parser.toHTML('[img width=10]http://test.com/test.png[/img]'),
			'Width only'
		).toBeHtmlEqual(
			'<div><img src="http://test.com/test.png" alt="http://test.com/test.png" class="img-user-posted img-thumbnail" /></div>\n'
		);

		expect(
			parser.toHTML('[img height=10]http://test.com/test.png[/img]'),
			'Height only'
		).toBeHtmlEqual(
			'<div><img src="http://test.com/test.png" alt="http://test.com/test.png" class="img-user-posted img-thumbnail" /></div>\n'
		);

		expect(
			parser.toHTML('[img]http://test.com/test.png[/img]'),
			'No size'
		).toBeHtmlEqual(
			'<div><img src="http://test.com/test.png" alt="http://test.com/test.png" class="img-user-posted img-thumbnail" /></div>\n'
		);

		expect(
			parser.toHTML('[img]http://test.com/test.png?test&&test[/img]'),
			'Ampersands in URL'
		).toBeHtmlEqual(
			'<div><img src="http://test.com/test.png?test&amp;&amp;test" alt="http://test.com/test.png?test&amp;&amp;test" class="img-user-posted img-thumbnail" /></div>\n'
		);
	});

	it('URL', () => {
		expect(parser.toHTML('[url=http://test.com/]test[/url]'), 'Normal').toBeHtmlEqual(
			'<div><a href="http://test.com/" class="link">test</a></div>\n'
		);
		expect(parser.toHTML('[url]http://test.com/[/url]'), 'Only URL').toBeHtmlEqual(
			'<div><a href="http://test.com/" class="link">http://test.com/</a></div>\n'
		);
		expect(parser.toHTML('[url=http://test.com/?test&&test]test[/url]'), 'Ampersands in URL').toBeHtmlEqual(
			'<div><a href="http://test.com/?test&amp;&amp;test" class="link">test</a></div>\n'
		);
		expect(parser.toHTML('[url]http://test.com/?test&&test[/url]'), 'Ampersands in URL').toBeHtmlEqual(
			'<div><a href="http://test.com/?test&amp;&amp;test" class="link">http://test.com/?test&amp;&amp;test</a></div>\n'
		);
	});

	it('Email', () => {
		expect(parser.toHTML('[email=test@test.com]test[/email]'), 'Normal').toBeHtmlEqual(
			'<div><a href="mailto:test@test.com">test</a></div>\n'
		);
		expect(parser.toHTML('[email]test@test.com[/email]'), 'Only e-mail').toBeHtmlEqual(
			'<div><a href="mailto:test@test.com">test@test.com</a></div>\n'
		);
	});

	it('Quote', () => {
		expect(parser.toHTML('[quote]Testing 1.2.3....[/quote]'), 'Normal').toBeHtmlEqual(
			'<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm"><span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>Testing 1.2.3....</div>'
		);
		expect(parser.toHTML('[quote=admin]Testing 1.2.3....[/quote]'), 'With author').toBeHtmlEqual(
			'<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm"><span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>Testing 1.2.3....<cite class="card-text text-end d-block text-body-secondary small">admin</cite></div>'
		);
	});

	it('Code', () => {
		expect(parser.toHTML('[code=markup]Testing 1.2.3....[/code]'), 'Normal').toBeHtmlEqual(
			'<pre class="border border-danger rounded m-2 p-2"><code class="lang-markup">Testing 1.2.3....</code></pre>'
		);
		expect(parser.toHTML('[code=markup]Testing [b]test[/b][/code]'), 'Normal').toBeHtmlEqual(
			'<pre class="border border-danger rounded m-2 p-2"><code class="lang-markup">Testing [b]test[/b]</code></pre>'
		);
	});

	it('Left', () => {
		expect(parser.toHTML('[left]Testing 1.2.3....[/left]'), 'Normal').toBeHtmlEqual('<div align="left">Testing 1.2.3....</div>');
	});

	it('Right', () => {
		expect(parser.toHTML('[right]Testing 1.2.3....[/right]'), 'Normal').toBeHtmlEqual('<div align="right">Testing 1.2.3....</div>');
	});

	it('Centre', () => {
		expect(parser.toHTML('[center]Testing 1.2.3....[/center]'), 'Normal').toBeHtmlEqual('<div align="center">Testing 1.2.3....</div>');
	});

	it('Justify', () => {
		expect(parser.toHTML('[justify]Testing 1.2.3....[/justify]'), 'Normal').toBeHtmlEqual('<div align="justify">Testing 1.2.3....</div>');
	});

});


describe('formats/bbcode#Parser - XSS', () => {
	let parser;

	beforeEach(() => {
		parser = new sceditor.BBCodeParser({});
	});


	it('[img]', () => {
		expect(
			parser.toHTML('[img]fake.png" onerror="alert(String.fromCharCode(88,83,83))[/img]'),
			'Inject attribute'
		).toBe(
			'<div><img src="fake.png&#34; onerror=&#34;alert(' +
			'String.fromCharCode(88,83,83))" alt="fake.png&#34; onerror=&#34;alert(String.fromCharCode(88,83,83))" class="img-user-posted img-thumbnail" /></div>\n'
		);

		expect(
			!/src="javascript:/i.test(
				parser.toHTML('[img]javascript:alert(String.fromCharCode(88,83,83))[/img]')
			),
			'JavaScript URL'
		).toBeTruthy();

		expect(
			!/src="javascript:/i.test(
				parser.toHTML('[img]JaVaScRiPt:alert(String.fromCharCode(88,83,83))[/img]')
			),
			'JavaScript URL casing'
		).toBeTruthy();

		expect(
			/src="jav&amp;/i.test(
				parser.toHTML('[img]jav&#x0A;ascript:alert(String.fromCharCode(88,83,83))[/img]')
			),
			'JavaScript URL entities'
		).toBeTruthy();

		expect(
			!/[img]onerror=j/i.test(
				parser.toHTML('[img]http://foo.com/fake.png [img] onerror=javascript:alert(String.fromCharCode(88,83,83)) [/img] [/img]')
			),
			'Nested [img]'
		).toBeTruthy();
	});


	it('[url]', () => {
		expect(
			!/href="javascript:/i.test(
				parser.toHTML('[url]javascript:alert(String.fromCharCode(88,83,83))[/url]')
			),
			'JavaScript URL'
		).toBeTruthy();

		expect(
			!/href="javascript:/i.test(
				parser.toHTML('[url]JaVaScRiPt:alert(String.fromCharCode(88,83,83))[/url]')
			),
			'JavaScript URL casing'
		).toBeTruthy();

		expect(
			/href="jav&amp;/i.test(
				parser.toHTML('[url]jav&#x0A;ascript:alert(String.fromCharCode(88,83,83))[/url]')
			),
			'JavaScript URL entities'
		).toBeTruthy();

		expect(
			!/href="jav/i.test(
				parser.toHTML('[url]jav\tascript:alert("XSS");[/url]')
			),
			'JavaScript URL entities'
		).toBeTruthy();

		expect(
			parser.toHTML('[url]test@test.test<b>tet</b>[/url]'),
			'Inject HTML'
		).toBe(
			'<div><a href="test@test.test&lt;b&gt;tet&lt;/b&gt;" class="link">' +
			'test@test.test&lt;b&gt;tet&lt;/b&gt;</a></div>\n'
		);

		expect(
			parser.toHTML('[url=&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;]XSS[/url]'),
			'Inject HTML'
		).toBe(
			'<div><a href="&amp;#106;&amp;#97;&amp;#118;&amp;#97;&amp;#115;&amp;#99;&amp;#114;&amp;#105;&amp;#112;&amp;#116;&amp;#58;&amp;#97;&amp;#108;&amp;#101;&amp;#114;&amp;#116;&amp;#40;&amp;#39;&amp;#88;&amp;#83;&amp;#83;&amp;#39;&amp;#41;" class="link">XSS</a></div>\n'
		);
	});


	it('[email]', () => {
		expect(
			parser.toHTML('[email]fake@fake.com" onmouseover="alert(String.fromCharCode(88,83,83))[/email]'),
			'Inject attribute'
		).toBe(
			'<div><a href="mailto:fake@fake.com&#34; onmouseover=&#34;alert(String.fromCharCode(88,83,83))">' +
			'fake@fake.com&#34; onmouseover=&#34;alert(String.fromCharCode(88,83,83))</a></div>\n'
		);

		expect(
			parser.toHTML('[email]test@test.test<b>tet</b>[/email]'),
			'Inject HTML'
		).toBe(
			'<div><a href="mailto:test@test.test&lt;b&gt;tet&lt;/b&gt;">' +
			'test@test.test&lt;b&gt;tet&lt;/b&gt;</a></div>\n'
		);
	});


	it('CSS injection', () => {
		expect(
			parser.toHTML('[color=#ff0000;xss:expression(alert(String.fromCharCode(88,83,83)))]XSS[/color]'),
			'Inject CSS expression'
		).toBe(
			'<div><font color="#ff0000;xss:expression(alert(String.fromCharCode(88,83,83)))">XSS</font></div>\n'
		);

		expect(
			parser.toHTML('[font=Impact, sans-serif;xss:expression(alert(String.fromCharCode(88,83,83)))]XSS[/font]'),
			'Inject CSS expression'
		).toBe(
			'<div><font face="Impact, sans-serif;xss:expression(alert(String.fromCharCode(88,83,83)))">XSS</font></div>\n'
		);
	});

	it('Break out of attribute', () => {
		expect(
			parser.toHTML('[font=Impact"brokenout]XSS[/font]'),
			'Inject CSS expression'
		).toBe('<div><font face="Impact&#34;brokenout">XSS</font></div>\n');
	});


	it('HTML injection', () => {
		expect(
			parser.toHTML('<script>alert("Hello");</script>'),
			'Inject HTML script'
		).toBe('<div>&lt;script&gt;alert(&#34;Hello&#34;);&lt;/script&gt;</div>\n');

		expect(
			parser.toHTML('[quote=test<b>test</b>test]test[/quote]'),
			'Inject HTML script'
		).toBe(
			'<div class="border rounded mx-3 mb-3 p-3 border-secondary shadow-sm"><span contenteditable="false"><i class="fa fa-quote-left text-primary fs-4 me-2"></i></span>test<cite class="card-text text-end d-block text-body-secondary small">test&lt;b&gt;test&lt;/b&gt;test</cite>' +
			'</div>'
		);
	});

});
