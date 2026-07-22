import * as dom from './dom.js';
import * as escape from './escape.js';
import * as utils from './utils.js';

interface OuterTextResult {
	node: Node;
	offset: number;
	text: string;
}

/**
 * Gets the text, start/end node and offset for
 * length chars left or right of the passed node
 * at the specified offset.
 *
 * @private
 */
const outerText = function (range: Range, isLeft: boolean, length: number): OuterTextResult {
	let nodeValue: string;
	let remaining: number;
	let start: number;
	let end: number;
	let node: Node | undefined;
	let text = '';
	let next: Node | null = range.startContainer;
	let offset = range.startOffset;

	// Handle cases where node is a paragraph and offset
	// refers to the index of a text node.
	// 3 = text node
	if (next && next.nodeType !== 3) {
		next = next.childNodes[offset];
		offset = 0;
	}

	start = end = offset;

	while (length > text.length && next && next.nodeType === 3) {
		nodeValue = next.nodeValue as string;
		remaining = length - text.length;

		// If not the first node, start and end should be at their
		// max values as will be updated when getting the text
		if (node) {
			end = nodeValue.length;
			start = 0;
		}

		node = next;

		if (isLeft) {
			start = Math.max(end - remaining, 0);
			offset = start;

			text = nodeValue.substr(start, end - start) + text;
			next = node.previousSibling;
		} else {
			end = Math.min(remaining, nodeValue.length);
			offset = start + end;

			text += nodeValue.substr(start, end);
			next = node.nextSibling;
		}
	}

	return {
		node: (node || next) as Node,
		offset: offset,
		text: text
	};
};

export interface RangeHelperInstance {
	insertHTML(html: string, endHTML?: string): false | undefined;
	insertNode(node: Node, endNode?: Node): false | undefined;
	cloneSelected(): Range | undefined;
	selectedRange(): Range | undefined;
	hasSelection(): boolean | undefined;
	selectedHtml(): string;
	parentNode(): Node | undefined;
	getFirstBlockParent(node?: Node): Node | null | undefined;
	insertNodeAt(start: boolean, node: Node): false | undefined;
	insertMarkers(): void;
	getMarker(id: string): HTMLElement | null;
	removeMarker(id: string): void;
	removeMarkers(): void;
	saveRange(): void;
	selectRange(range: Range): void;
	restoreRange(): false | undefined;
	selectOuterText(left: number, right: number): false | undefined;
	getOuterText(before: boolean, length: number): string;
	replaceKeyword(
		keywords: Array<[string, string]>,
		includeAfter: boolean,
		keywordsSorted?: boolean,
		longestKeyword?: number,
		requireWhitespace?: boolean,
		keypressChar?: string
	): boolean;
	compare(rngA: Range | undefined, rngB?: Range): boolean;
	clear(): void;
}

/**
 * Range helper
 *
 * @class RangeHelper
 * @name RangeHelper
 */
export default function RangeHelper(
	this: RangeHelperInstance,
	win: Window,
	d: Document | null | undefined,
	sanitize: (html: string) => string
) {
	const doc: Document = d || (win as unknown as { contentDocument?: Document }).contentDocument || win.document;
	const startMarker = 'sceditor-start-marker';
	const endMarker = 'sceditor-end-marker';
	const base = this;

	/**
	 * Inserts HTML into the current range replacing any selected
	 * text.
	 *
	 * If endHTML is specified the selected contents will be put between
	 * html and endHTML. If there is nothing selected html and endHTML are
	 * just concatenate together.
	 *
	 * @return False on fail
	 * @function
	 * @name insertHTML
	 * @memberOf RangeHelper.prototype
	 */
	base.insertHTML = function (html: string, endHTML?: string) {
		const range = base.selectedRange();

		if (!range) {
			return false;
		}

		if (endHTML) {
			html += base.selectedHtml() + endHTML;
		}

		const div = dom.createElement('p', {}, doc);
		const node = doc.createDocumentFragment();
		div.innerHTML = sanitize(html);

		while (div.firstChild) {
			dom.appendChild(node, div.firstChild);
		}

		base.insertNode(node);

		return undefined;
	};

	/**
	 * Prepares HTML to be inserted by adding a zero width space
	 * if the last child is empty and adding the range start/end
	 * markers to the last child.
	 *
	 * @private
	 */
	function _prepareInput(node: Node | string, endNode?: Node | string, returnHtml?: boolean): Node | string | undefined {
		let frag: DocumentFragment = doc.createDocumentFragment();

		if (typeof node === 'string') {
			if (endNode) {
				node += base.selectedHtml() + endNode;
			}

			frag = dom.parseHTML(node);
		} else {
			dom.appendChild(frag, node);

			if (endNode) {
				dom.appendChild(frag, base.selectedRange()!.extractContents());
				dom.appendChild(frag, endNode as Node);
			}
		}

		let lastChild: Node | null = frag.lastChild;
		if (!lastChild) {
			return undefined;
		}

		// isInline() treats a null/non-element node as inline (returns true),
		// so lastChild is never dereferenced here once it becomes null.
		while (!dom.isInline(lastChild.lastChild, true)) {
			lastChild = lastChild.lastChild!;
		}

		if (dom.canHaveChildren(lastChild)) {
			// Webkit won't allow the cursor to be placed inside an
			// empty tag, so add a zero width space to it.
			if (!lastChild.lastChild) {
				dom.appendChild(lastChild, doc.createTextNode('\u200B'));
			}
		} else {
			lastChild = frag;
		}

		base.removeMarkers();

		// Append marks to last child so when restored cursor will be in
		// the right place
		dom.appendChild(lastChild!, _createMarker(startMarker));
		dom.appendChild(lastChild!, _createMarker(endMarker));

		if (returnHtml) {
			const div = dom.createElement('div');
			dom.appendChild(div, frag);

			return div.innerHTML;
		}

		return frag;
	}

	/**
	 * The same as insertHTML except with DOM nodes instead
	 *
	 * <strong>Warning:</strong> the nodes must belong to the
	 * document they are being inserted into. Some browsers
	 * will throw exceptions if they don't.
	 *
	 * Returns boolean false on fail
	 *
	 * @return {false|undefined}
	 * @function
	 * @name insertNode
	 * @memberOf RangeHelper.prototype
	 */
	base.insertNode = function (node: Node, endNode?: Node) {
		let first: ChildNode | null | undefined;
		let last: ChildNode | null | undefined;
		const input = _prepareInput(node, endNode) as Node | undefined;
		const range = base.selectedRange()!;
		const parent = range.commonAncestorContainer;
		const emptyNodes: Node[] = [];

		if (!input) {
			return false;
		}

		function removeIfEmpty(node: Node | null | undefined) {
			// Only remove empty node if it wasn't already empty
			if (node && dom.isEmpty(node) && emptyNodes.indexOf(node) < 0) {
				dom.remove(node);
			}
		}

		if (range.startContainer !== range.endContainer) {
			utils.each(parent.childNodes, function (_, node) {
				if (dom.isEmpty(node)) {
					emptyNodes.push(node);
				}
			});

			first = (input as DocumentFragment).firstChild;
			last = (input as DocumentFragment).lastChild;
		}

		range.deleteContents();

		// FF allows <br /> to be selected but inserting a node
		// into <br /> will cause it not to be displayed so must
		// insert before the <br /> in FF.
		// 3 = TextNode
		if (parent && parent.nodeType !== 3 && !dom.canHaveChildren(parent)) {
			dom.insertBefore(input, parent);
		} else {
			range.insertNode(input);

			// If a node was split or its contents deleted, remove any resulting
			// empty tags. For example:
			// <p>|test</p><div>test|</div>
			// When deleteContents could become:
			// <p></p>|<div></div>
			// So remove the empty ones
			removeIfEmpty(first && first.previousSibling);
			removeIfEmpty(last && last.nextSibling);
		}

		base.restoreRange();

		return undefined;
	};

	/**
	 * Clones the selected Range
	 *
	 * @function
	 * @name cloneSelected
	 * @memberOf RangeHelper.prototype
	 */
	base.cloneSelected = function () {
		const range = base.selectedRange();

		if (range) {
			return range.cloneRange();
		}

		return undefined;
	};

	/**
	 * Gets the selected Range
	 *
	 * @function
	 * @name selectedRange
	 * @memberOf RangeHelper.prototype
	 */
	base.selectedRange = function () {
		let range: Range | undefined;
		let firstChild: Node;
		const sel = win.getSelection();

		if (!sel) {
			return undefined;
		}

		// When creating a new range, set the start to the first child
		// element of the body element to avoid errors in FF.
		if (sel.rangeCount <= 0) {
			firstChild = doc.body;
			while (firstChild.firstChild) {
				firstChild = firstChild.firstChild;
			}

			range = doc.createRange();
			// Must be setStartBefore otherwise it can cause infinite
			// loops with lists in WebKit. See issue 442
			range.setStartBefore(firstChild);

			sel.addRange(range);
		}

		if (sel.rangeCount > 0) {
			range = sel.getRangeAt(0);
		}

		return range;
	};

	/**
	 * Gets if there is currently a selection
	 *
	 * @function
	 * @name hasSelection
	 * @since 1.4.4
	 * @memberOf RangeHelper.prototype
	 */
	base.hasSelection = function () {
		const sel = win.getSelection();

		return !!sel && sel.rangeCount > 0;
	};

	/**
	 * Gets the currently selected HTML
	 *
	 * @function
	 * @name selectedHtml
	 * @memberOf RangeHelper.prototype
	 */
	base.selectedHtml = function () {
		const range = base.selectedRange();

		if (range) {
			const div = dom.createElement('p', {}, doc);
			dom.appendChild(div, range.cloneContents());

			return div.innerHTML;
		}

		return '';
	};

	/**
	 * Gets the parent node of the selected contents in the range
	 *
	 * @function
	 * @name parentNode
	 * @memberOf RangeHelper.prototype
	 */
	base.parentNode = function () {
		const range = base.selectedRange();

		if (range) {
			return range.commonAncestorContainer;
		}

		return undefined;
	};

	/**
	 * Gets the first block level parent of the selected
	 * contents of the range.
	 *
	 * @param [n] The element to get the first block level parent from
	 * @function
	 * @name getFirstBlockParent
	 * @since 1.4.1
	 * @memberOf RangeHelper.prototype
	 */
	base.getFirstBlockParent = function (node?: Node) {
		const func = function (elm: Node | null | undefined): Node | null | undefined {
			if (!dom.isInline(elm as Node, true)) {
				return elm;
			}

			elm = elm ? elm.parentNode : null;

			return elm ? func(elm) : elm;
		};

		return func(node || base.parentNode());
	};

	/**
	 * Inserts a node at either the start or end of the current selection
	 *
	 * @function
	 * @name insertNodeAt
	 * @memberOf RangeHelper.prototype
	 */
	base.insertNodeAt = function (start: boolean, node: Node) {
		const currentRange = base.selectedRange();
		const range = base.cloneSelected();

		if (!range) {
			return false;
		}

		range.collapse(start);
		range.insertNode(node);

		// Reselect the current range.
		// Fixes issue with Chrome losing the selection. Issue#82
		if (currentRange) {
			base.selectRange(currentRange);
		}

		return undefined;
	};

	/**
	 * Creates a marker node
	 *
	 * @private
	 */
	function _createMarker(id: string): HTMLSpanElement {
		base.removeMarker(id);

		const marker = dom.createElement('span', {
			id: id,
			className: 'sceditor-selection sceditor-ignore',
			style: 'display:none;line-height:0'
		}, doc) as HTMLSpanElement;

		marker.innerHTML = ' ';

		return marker;
	}

	/**
	 * Inserts start/end markers for the current selection
	 * which can be used by restoreRange to re-select the
	 * range.
	 *
	 * @memberOf RangeHelper.prototype
	 * @function
	 * @name insertMarkers
	 */
	base.insertMarkers = function () {
		const currentRange = base.selectedRange();
		const startNode = _createMarker(startMarker);

		base.removeMarkers();
		base.insertNodeAt(true, startNode);

		// Fixes issue with end marker sometimes being placed before
		// the start marker when the range is collapsed.
		if (currentRange && currentRange.collapsed) {
			startNode.parentNode!.insertBefore(
				_createMarker(endMarker), startNode.nextSibling);
		} else {
			base.insertNodeAt(false, _createMarker(endMarker));
		}
	};

	/**
	 * Gets the marker with the specified ID
	 *
	 * @function
	 * @name getMarker
	 * @memberOf RangeHelper.prototype
	 */
	base.getMarker = function (id: string) {
		return doc.getElementById(id);
	};

	/**
	 * Removes the marker with the specified ID
	 *
	 * @function
	 * @name removeMarker
	 * @memberOf RangeHelper.prototype
	 */
	base.removeMarker = function (id: string) {
		const marker = base.getMarker(id);

		if (marker) {
			dom.remove(marker);
		}
	};

	/**
	 * Removes the start/end markers
	 *
	 * @function
	 * @name removeMarkers
	 * @memberOf RangeHelper.prototype
	 */
	base.removeMarkers = function () {
		base.removeMarker(startMarker);
		base.removeMarker(endMarker);
	};

	/**
	 * Saves the current range location. Alias of insertMarkers()
	 *
	 * @function
	 * @name saveRage
	 * @memberOf RangeHelper.prototype
	 */
	base.saveRange = function () {
		base.insertMarkers();
	};

	/**
	 * Select the specified range
	 *
	 * @function
	 * @name selectRange
	 * @memberOf RangeHelper.prototype
	 */
	base.selectRange = function (range: Range) {
		const sel = win.getSelection();
		const container = range.endContainer;

		// Check if cursor is set after a BR when the BR is the only
		// child of the parent. In Firefox this causes a line break
		// to occur when something is typed. See issue #321
		if (range.collapsed && container &&
			!dom.isInline(container, true)) {

			let lastChild: ChildNode | Node | null = container.lastChild;
			while (lastChild && dom.is(lastChild, '.sceditor-ignore')) {
				lastChild = lastChild.previousSibling;
			}

			if (dom.is(lastChild, 'br')) {
				const rng = doc.createRange();
				rng.setEndAfter(lastChild as Node);
				rng.collapse(false);

				if (base.compare(range, rng)) {
					range.setStartBefore(lastChild as Node);
					range.collapse(true);
				}
			}
		}

		if (sel) {
			base.clear();
			sel.addRange(range);
		}
	};

	/**
	 * Restores the last range saved by saveRange() or insertMarkers()
	 *
	 * @function
	 * @name restoreRange
	 * @memberOf RangeHelper.prototype
	 */
	base.restoreRange = function () {
		let range = base.selectedRange();
		const start = base.getMarker(startMarker);
		const end = base.getMarker(endMarker);

		if (!start || !end || !range) {
			return false;
		}

		const isCollapsed = start.nextSibling === end;

		range = doc.createRange();
		range.setStartBefore(start);
		range.setEndAfter(end);

		if (isCollapsed) {
			range.collapse(true);
		}

		base.selectRange(range);
		base.removeMarkers();

		return undefined;
	};

	/**
	 * Selects the text left and right of the current selection
	 *
	 * @since 1.4.3
	 * @function
	 * @name selectOuterText
	 * @memberOf RangeHelper.prototype
	 */
	base.selectOuterText = function (left: number, right: number) {
		const range = base.cloneSelected();

		if (!range) {
			return false;
		}

		range.collapse(false);

		const start = outerText(range, true, left);
		const end = outerText(range, false, right);

		range.setStart(start.node, start.offset);
		range.setEnd(end.node, end.offset);

		base.selectRange(range);

		return undefined;
	};

	/**
	 * Gets the text left or right of the current selection
	 *
	 * @since 1.4.3
	 * @function
	 * @name selectOuterText
	 * @memberOf RangeHelper.prototype
	 */
	base.getOuterText = function (before: boolean, length: number) {
		const range = base.cloneSelected();

		if (!range) {
			return '';
		}

		range.collapse(!before);

		return outerText(range, before, length).text;
	};

	/**
	 * Replaces keywords with values based on the current caret position
	 *
	 * @param keywords
	 * @param includeAfter      If to include the text after the
	 *                          current caret position or just
	 *                          text before
	 * @param keywordsSorted    If the keywords array is pre
	 *                          sorted shortest to longest
	 * @param longestKeyword    Length of the longest keyword
	 * @param requireWhitespace If the key must be surrounded
	 *                          by whitespace
	 * @param keypressChar      If this is being called from
	 *                          a keypress event, this should be
	 *                          set to the pressed character
	 * @function
	 * @name replaceKeyword
	 * @memberOf RangeHelper.prototype
	 */
	// eslint-disable-next-line max-params
	base.replaceKeyword = function (
		keywords: Array<[string, string]>,
		includeAfter: boolean,
		keywordsSorted?: boolean,
		longestKeyword?: number,
		requireWhitespace?: boolean,
		keypressChar?: string
	) {
		if (!keywordsSorted) {
			keywords.sort(function (a, b) {
				return a[0].length - b[0].length;
			});
		}

		const whitespaceRegex = '(^|[\\s\xA0\u2002\u2003\u2009])';
		let keywordIdx = keywords.length;
		const whitespaceLen = requireWhitespace ? 1 : 0;
		let maxKeyLen = longestKeyword ||
            keywords[keywordIdx - 1][0].length;

		if (requireWhitespace) {
			maxKeyLen++;
		}

		keypressChar = keypressChar || '';
		let outerTextStr = base.getOuterText(true, maxKeyLen);
		const leftLen = outerTextStr.length;
		outerTextStr += keypressChar;

		if (includeAfter) {
			outerTextStr += base.getOuterText(false, maxKeyLen);
		}

		while (keywordIdx--) {
			const keyword = keywords[keywordIdx][0];
			const keywordLen = keyword.length;
			const startIndex = Math.max(0, leftLen - keywordLen - whitespaceLen);
			let matchPos = -1;

			if (requireWhitespace) {
				const match = outerTextStr
					.substr(startIndex)
					.match(new RegExp(whitespaceRegex +
						escape.regex(keyword) + whitespaceRegex));

				if (match && match.index !== undefined) {
					// Add the length of the text that was removed by
					// substr() and also add 1 for the whitespace
					matchPos = match.index + startIndex + match[1].length;
				}
			} else {
				matchPos = outerTextStr.indexOf(keyword, startIndex);
			}

			if (matchPos > -1) {
				// Make sure the match is between before and
				// after, not just entirely in one side or the other
				if (matchPos <= leftLen &&
					matchPos + keywordLen + whitespaceLen >= leftLen) {
					const charsLeft = leftLen - matchPos;

					// If the keypress char is white space then it should
					// not be replaced, only chars that are part of the
					// key should be replaced.
					base.selectOuterText(
						charsLeft,
						keywordLen - charsLeft -
							(/^\S/.test(keypressChar) ? 1 : 0)
					);

					base.insertHTML(keywords[keywordIdx][1]);
					return true;
				}
			}
		}

		return false;
	};

	/**
	 * Compares two ranges.
	 *
	 * If rangeB is undefined it will be set to
	 * the current selected range
	 *
	 * @function
	 * @name compare
	 * @memberOf RangeHelper.prototype
	 */
	base.compare = function (rngA: Range | undefined, rngB?: Range) {
		if (!rngB) {
			rngB = base.selectedRange();
		}

		if (!rngA || !rngB) {
			return !rngA && !rngB;
		}

		return rngA.compareBoundaryPoints(Range.END_TO_END, rngB) === 0 &&
			rngA.compareBoundaryPoints(Range.START_TO_START, rngB) === 0;
	};

	/**
	 * Removes any current selection
	 *
	 * @since 1.4.6
	 * @function
	 * @name clear
	 * @memberOf RangeHelper.prototype
	 */
	base.clear = function () {
		const sel = win.getSelection() as (Selection & { empty?: () => void }) | null;

		if (sel) {
			if (sel.removeAllRanges) {
				sel.removeAllRanges();
			} else if (sel.empty) {
				sel.empty();
			}
		}
	};
}
