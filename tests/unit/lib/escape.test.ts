import { describe, it, expect } from 'vitest';
import * as escape from 'src/lib/escape.js';

describe('lib/escape', () => {

	it('regex()', () => {
		expect(escape.regex('- \\ ^ / $ * + ? . ( ) | { } [ ] | ! :')).toBe(
			'\\- \\\\ \\^ \\/ \\$ \\* \\+ \\? \\. \\( \\) \\| ' +
			'\\{ \\} \\[ \\] \\| \\! \\:'
		);
	});

	it('regex() - Emoticons', () => {
		expect(escape.regex('^^ >.< =)')).toBe('\\^\\^ >\\.< \\=\\)');
	});


	it('entities()', () => {
		expect(escape.entities(null)).toStrictEqual(null);
		expect(escape.entities('')).toBe('');

		expect(escape.entities('& < > " \'    `')).toBe(
			'&amp; &lt; &gt; &#34; &#39;&nbsp; &nbsp; &#96;'
		);

		expect(escape.entities('& < > " \'    `', false)).toBe(
			'&amp; &lt; &gt; " \'&nbsp; &nbsp; `'
		);
	});

	it('entities() - XSS', () => {
		expect(escape.entities('<script>alert("XSS");</script>')).toBe(
			'&lt;script&gt;alert(&#34;XSS&#34;);&lt;/script&gt;'
		);
	});

	it('entities() - IE XSS', () => {
		expect(escape.entities('<img src="x" alt="``onerror=alert(1)" />')).toBe(
			'&lt;img src=&#34;x&#34; alt=&#34;&#96;&#96;onerror=alert(1)&#34; /&gt;'
		);
	});


	it('uriScheme() - No schemes', () => {
		const urls = [
			'',
			'/test.html',
			'//localhost/test.html',
			'www.example.com/test?id=123'
		];

		for (const url of urls) {
			expect(escape.uriScheme(url)).toBe(url);
		}
	});

	it('uriScheme() - Valid schemes', () => {
		const urls = [
			'http://localhost',
			'https://example.com/test.html',
			'ftp://localhost',
			'ftps://localhost',
			'mailto:user@localhost',
			'tel:12345',
			'tel:+12345',
			'//www.example.com/test?id=123',
			'sms:12345',
			'sms:+1234',
			'data:image/png;test',
			'data:image/gif;test',
			'data:image/jpg;test',
			'data:image/bmp;test'
		];

		for (const url of urls) {
			expect(escape.uriScheme(url)).toBe(url);
		}
	});

	it('uriScheme() - Invalid schemes', () => {
		const path = location.pathname.split('/');
		path.pop();

		const baseUrl = location.protocol + '//' +
			location.host +
			path.join('/') + '/';

		const urls = [
			'javascript:alert("XSS");',
			'sftp://example.com/test/',
			'skype:xyz',
			'spotify:xyz',
			'ssh:user@host.com:22',
			'teamspeak:12345',
			'javascript:alert("XSS");//test.com/hello.html',
			'javascript:alert("XSS http://example.com");',
			'jav\tascript:alert(\'XSS\');',
			'jav\0ascript:alert(1)',
			'jav\nascript:alert(1)',
			'new://https://example.com',
			'vbscript:msgbox("XSS")',
			'data:application/javascript;alert("xss")'
		];

		for (const url of urls) {
			expect(escape.uriScheme(url)).toBe(baseUrl + url);
		}
	});

});
