import { describe, it, expect } from 'vitest';
import defaultOptions from 'src/lib/defaultOptions.js';
import 'src/sceditor.js';
import 'src/formats/bbcode.js';

describe('plugins/bbcode - Matching', () => {

	it('Should match only if all attributes match when strict matching', () => {
		sceditor.formats.bbcode.set('test', {
			tags: { div: { title: ['test'], test: null } },
			strictMatch: true,
			format: 'match'
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(mockEditor.toBBCode('<div title="not test" test="value"></div>'), 'Non-matching title').toBe('');
		expect(mockEditor.toBBCode('<div title="not test" test="value"></div>'), 'Missing title').toBe('');
		expect(mockEditor.toBBCode('<div title="test" test="value"></div>'), 'All attributes match').toBe('match');

		sceditor.formats.bbcode.remove('test');
	});

	it('Should match if any attributes match when not strict matching', () => {
		sceditor.formats.bbcode.set('test', {
			tags: { div: { title: ['test'], test: null } },
			strictMatch: false,
			format: 'match'
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(mockEditor.toBBCode('<div title="not test" test="value"></div>'), 'Non-matching title').toBe('match');
		expect(mockEditor.toBBCode('<div title="not test" test="value"></div>'), 'Missing title').toBe('match');
		expect(mockEditor.toBBCode('<div title="test" test="value"></div>'), 'All attributes match').toBe('match');

		sceditor.formats.bbcode.remove('test');
	});

	it('Should default to matching if any attributes match', () => {
		sceditor.formats.bbcode.set('test', {
			tags: { div: { title: ['test'], test: null } },
			strictMatch: false,
			format: 'match'
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(mockEditor.toBBCode('<div title="not test" test="value"></div>'), 'Non-matching title').toBe('match');
		expect(mockEditor.toBBCode('<div title="not test" test="value"></div>'), 'Missing title').toBe('match');
		expect(mockEditor.toBBCode('<div title="test" test="value"></div>'), 'All attributes match').toBe('match');

		sceditor.formats.bbcode.remove('test');
	});


	it('Should match twice if tag and styles match', () => {
		sceditor.formats.bbcode.set('test', {
			tags: { div: { title: null } },
			styles: { 'padding': null },
			format: 'match{0}'
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(mockEditor.toBBCode('<div title="test" style="padding:1em"></div>')).toBe('matchmatch');

		sceditor.formats.bbcode.remove('test');
	});

	it('Should only match if all styles match when strict matching', () => {
		sceditor.formats.bbcode.set('test', {
			styles: { 'padding': null, 'margin': null },
			format: 'passed',
			strictMatch: true
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(mockEditor.toBBCode('<div style="padding:1em;margin:1em;"></div>')).toBe('passed');
		expect(mockEditor.toBBCode('<div style="margin:1em;"></div>')).toBe('');

		sceditor.formats.bbcode.remove('test');
	});

	it('Should match if any styles match when not strict matching', () => {
		sceditor.formats.bbcode.set('test', {
			styles: { 'padding': null, 'margin': null },
			format: 'passed',
			strictMatch: false
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(mockEditor.toBBCode('<div style="padding:1em;margin:1em;"></div>')).toBe('passed');
		expect(mockEditor.toBBCode('<div style="margin:1em;"></div>')).toBe('passed');
		expect(mockEditor.toBBCode('<div style="padding:1em;"></div>')).toBe('passed');

		sceditor.formats.bbcode.remove('test');
	});

	it('Should default to matching if any styles match', () => {
		sceditor.formats.bbcode.set('test', {
			styles: { 'padding': null, 'margin': null },
			format: 'passed',
			strictMatch: false
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(mockEditor.toBBCode('<div style="padding:1em;margin:1em;"></div>')).toBe('passed');
		expect(mockEditor.toBBCode('<div style="margin:1em;"></div>')).toBe('passed');
		expect(mockEditor.toBBCode('<div style="padding:1em;"></div>')).toBe('passed');

		sceditor.formats.bbcode.remove('test');
	});

	it('Should support matching wildcard tags', () => {
		sceditor.formats.bbcode.set('test', {
			tags: { '*': null },
			format: 'x{0}',
			strictMatch: false
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(mockEditor.toBBCode('<div><span></span></div>')).toBe('xx');

		sceditor.formats.bbcode.remove('test');
	});

	it('Should wildcard matching styles or attributes', () => {
		sceditor.formats.bbcode.set('test', {
			tags: { '*': { title: null, style: { padding: null } } },
			format: 'x{0}',
			strictMatch: false
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(
			mockEditor.toBBCode('<div title="test"><span style="padding:1em;"</span></div>')
		).toBe('xx');

		sceditor.formats.bbcode.remove('test');
	});

	it('Should only match when styles and attributes match if strict matching', () => {
		sceditor.formats.bbcode.set('test', {
			tags: { '*': { title: null, style: { padding: null } } },
			format: 'match',
			strictMatch: true
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(
			mockEditor.toBBCode('<div title="test"><span style="padding:1em;"</span></div>'),
			'Missing attribute or style'
		).toBe('');

		expect(
			mockEditor.toBBCode('<div title="test" style="padding:1em;"></div>'),
			'Has attributes and styles'
		).toBe('match');

		sceditor.formats.bbcode.remove('test');
	});

	it('Should match when any style or attribute matches if not strict matching', () => {
		sceditor.formats.bbcode.set('test', {
			tags: { '*': { title: null, style: { padding: null } } },
			format: 'match{0}'
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(
			mockEditor.toBBCode('<div title="test"><span style="padding:1em;"</span></div>'),
			'Missing attribute or style'
		).toBe('matchmatch');

		expect(
			mockEditor.toBBCode('<div title="test" style="padding:1em;"></div>'),
			'Has attributes and styles'
		).toBe('match');

		sceditor.formats.bbcode.remove('test');
	});

	it('Should support style attribute', () => {
		sceditor.formats.bbcode.set('test', {
			tags: { div: { style: { fontWeight: 'bold' } } },
			format: 'matched',
			strictMatch: false
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(mockEditor.toBBCode('<div style="font-weight: bold"></div>')).toBe('matched');

		sceditor.formats.bbcode.remove('test');
	});

	it('Should match null style only if style attribute is specified', () => {
		sceditor.formats.bbcode.set('test', {
			tags: { div: { style: null } },
			format: 'matched',
			strictMatch: false
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(mockEditor.toBBCode('<div></div>'), 'No style attribute').toBe('');
		expect(mockEditor.toBBCode('<div style="padding: 1em"></div>'), 'Has style attribute').toBe('matched');

		sceditor.formats.bbcode.remove('test');
	});

	it('Should match styles first', () => {
		sceditor.formats.bbcode.set('style', {
			styles: { padding: null },
			format: 'style'
		});
		sceditor.formats.bbcode.set('tag', {
			tags: { div: null },
			format: 'tag({0})'
		});

		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(mockEditor.toBBCode('<div style="padding:1em"></div>')).toBe('tag(style)');

		sceditor.formats.bbcode.remove('style');
		sceditor.formats.bbcode.remove('tag');
	});

	it('Should convert percentage font-size spans back to size 1-7', () => {
		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		expect(mockEditor.toBBCode('<span style="font-size:50%">a</span>')).toBe('[size=1]a[/size]');
		expect(mockEditor.toBBCode('<span style="font-size:90%">a</span>')).toBe('[size=4]a[/size]');
		expect(mockEditor.toBBCode('<span style="font-size:120%">a</span>')).toBe('[size=6]a[/size]');
		expect(mockEditor.toBBCode('<span style="font-size:140%">a</span>')).toBe('[size=7]a[/size]');
		expect(mockEditor.toBBCode('<span style="font-size:115%">a</span>'), 'Nearest').toBe('[size=6]a[/size]');
		expect(mockEditor.toBBCode('<font size="3">a</font>'), 'Legacy font tag').toBe('[size=3]a[/size]');
	});

	it('Should round-trip code and note without a default attribute', () => {
		const mockEditor = { opts: defaultOptions };
		(new sceditor.formats.bbcode()).init.call(mockEditor);

		const roundTrip = (bbcode) => mockEditor.toBBCode(mockEditor.fromBBCode(bbcode)).trim();

		expect(roundTrip('[code]a[/code]')).toBe('[code]a[/code]');
		expect(roundTrip('[code=markup]a[/code]')).toBe('[code=markup]a[/code]');
		expect(roundTrip('[note]a[/note]')).toBe('[note]a[/note]');
		expect(roundTrip('[note=info]a[/note]')).toBe('[note=info]a[/note]');
	});

});
