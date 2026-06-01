import { describe, it, expect } from 'vitest';
import defaultOptions from 'src/lib/defaultOptions.js';
import 'src/sceditor.js';
import 'src/formats/bbcode.js';

describe('plugins/bbcode - Nesting', () => {

	it('inline bbcodes must be inside block ones', () => {
		sceditor.formats.bbcode.set('thisblockstyle', {
			styles: { color: null },
			isInline: false,
			format: '[block]{0}[/block]',
			html: '<block>{0}</block>'
		});
		sceditor.formats.bbcode.set('thisinlinestyle', {
			styles: { opacity: null },
			format: '[inline]{0}[/inline]',
			html: '<inline>{0}</inline>'
		});
		sceditor.formats.bbcode.set('thisblockbbcode', {
			tags: { block: { test: null } },
			isInline: false,
			format: '[block]{0}[/block]',
			html: '<block>{0}</block>'
		});
		sceditor.formats.bbcode.set('thisinlinebbcode', {
			tags: { block: { testing: null } },
			format: '[inline]{0}[/inline]',
			html: '<inline>{0}</inline>'
		});

		const mockEditor = { opts: defaultOptions };
		const format = new sceditor.formats.bbcode;
		format.init.call(mockEditor);

		expect(
			mockEditor.toBBCode('<theme style="opacity:1;color:red;"></theme>')
		).toBe('[block][inline][/inline][/block]');

		expect(
			mockEditor.toBBCode('<block test="yhm" testing="lol"></block>')
		).toBe('[block][inline][/inline][/block]');

		sceditor.formats.bbcode.remove('thisblockstyle');
		sceditor.formats.bbcode.remove('thisinlinestyle');
		sceditor.formats.bbcode.remove('thisblockbbcode');
		sceditor.formats.bbcode.remove('thisinlinebbcode');
	});

});
