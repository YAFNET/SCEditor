import * as utils from './utils.js';

/**
 * Cache of camelCase CSS property names
 */
const cssPropertyNameCache: Record<string, string> = {};

/**
 * Node type constant for element nodes
 */
export const ELEMENT_NODE = 1;

/**
 * Node type constant for text nodes
 */
export const TEXT_NODE = 3;

/**
 * Node type constant for comment nodes
 */
export const COMMENT_NODE = 8;

/**
 * Node type document nodes
 */
export const DOCUMENT_NODE = 9;

/**
 * Node type constant for document fragments
 */
export const DOCUMENT_FRAGMENT_NODE = 11;

function toFloat(value: string): number {
	const parsed = parseFloat(value);

	return isFinite(parsed) ? parsed : 0;
}

/**
 * Creates an element with the specified attributes
 *
 * Will create it in the current document unless context
 * is specified.
 */
export function createElement(
	tag: string,
	attributes?: Record<string, unknown>,
	context?: Document
): HTMLElement {
	const node = (context || document).createElement(tag);

	utils.each(attributes || {}, function (key, value) {
		if (key === 'style') {
			node.style.cssText = value as string;
		} else if (key in node) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(node as any)[key] = value;
		} else {
			node.setAttribute(key, String(value));
		}
	});

	return node;
}

/**
 * Returns an array of parents that matches the selector
 */
export function parents(node: Node | null | undefined, selector?: string): HTMLElement[] {
	const result: HTMLElement[] = [];
	let current: Node | null = node ?? null;

	while ((current = current && current.parentNode) &&
		!/(9|11)/.test(String(current.nodeType))) {
		if (!selector || is(current, selector)) {
			result.push(current as HTMLElement);
		}
	}

	return result;
}

/**
 * Gets the first parent node that matches the selector
 */
export function parent(node: Node | null | undefined, selector?: string): HTMLElement | undefined {
	let current: Node | null = node ?? null;

	while ((current = current && current.parentNode) &&
		!/(9|11)/.test(String(current.nodeType))) {
		if (!selector || is(current, selector)) {
			return current as HTMLElement;
		}
	}

	return undefined;
}

/**
 * Checks the passed node and all parents and
 * returns the first matching node if any.
 */
export function closest(node: Node | null | undefined, selector: string): HTMLElement | undefined {
	return is(node, selector) ? node as HTMLElement : parent(node, selector);
}

/**
 * Removes the node from the DOM
 */
export function remove(node: Node): void {
	if (node.parentNode) {
		node.parentNode.removeChild(node);
	}
}

/**
 * Appends child to parent node
 */
export function appendChild(node: Node, child: Node): void {
	node.appendChild(child);
}

/**
 * Finds any child nodes that match the selector
 */
export function find(node: ParentNode, selector: string): NodeListOf<Element> {
	return node.querySelectorAll(selector);
}

/**
 * For on() and off() if to add/remove the event
 * to the capture phase
 */
export const EVENT_CAPTURE = true;

/**
 * For on() and off() if to add/remove the event
 * to the bubble phase
 */
export const EVENT_BUBBLE = false;

type SceEventHandler = EventListener & Record<string, EventListener | undefined>;

/**
 * Adds an event listener for the specified events.
 *
 * Events should be a space separated list of events.
 *
 * If selector is specified the handler will only be
 * called when the event target matches the selector.
 *
 * @see off()
 */
export function on(node: Node | Window, events: string, fn: EventListener, capture?: boolean): void;
// eslint-disable-next-line max-params
export function on(node: Node | Window, events: string, selector: string, fn: EventListener, capture?: boolean): void;
// eslint-disable-next-line max-params
export function on(
	node: Node | Window,
	events: string,
	selector: string | EventListener,
	fn?: EventListener | boolean,
	capture?: boolean
): void {
	events.split(' ').forEach(function (event) {
		let handler: EventListener;

		if (utils.isString(selector) && utils.isFunction(fn)) {
			const delegatedFn = fn as SceEventHandler;
			const cacheKey = `_sce-event-${event}${selector}`;

			handler = delegatedFn[cacheKey] || function (e: Event) {
				let target = e.target as Node | null;

				while (target && target !== node) {
					if (is(target, selector)) {
						delegatedFn.call(target, e);
						return;
					}

					target = target.parentNode;
				}
			};

			delegatedFn[cacheKey] = handler;
		} else {
			handler = selector as EventListener;
			capture = fn as boolean | undefined;
		}

		node.addEventListener(event, handler, capture || false);
	});
}

/**
 * Removes an event listener for the specified events.
 *
 * @see on()
 */
export function off(node: Node | Window, events: string, fn: EventListener, capture?: boolean): void;
// eslint-disable-next-line max-params
export function off(node: Node | Window, events: string, selector: string, fn: EventListener, capture?: boolean): void;
// eslint-disable-next-line max-params
export function off(
	node: Node | Window,
	events: string,
	selector: string | EventListener,
	fn?: EventListener | boolean,
	capture?: boolean
): void {
	events.split(' ').forEach(function (event) {
		let handler: EventListener | undefined;

		if (utils.isString(selector) && utils.isFunction(fn)) {
			handler = (fn as SceEventHandler)[`_sce-event-${event}${selector}`];
		} else {
			handler = selector as EventListener;
			capture = fn as boolean | undefined;
		}

		if (handler) {
			node.removeEventListener(event, handler, capture || false);
		}
	});
}

/**
 * Gets the value of the attr param.
 */
export function attr(node: Element, attr: string): string | null;
/**
 * If value is specified but null the attribute
 * will be removed otherwise the attr value will
 * be set to the passed value.
 */
export function attr(node: Element, attr: string, value: string | null): void;
export function attr(node: Element, attr: string, value?: string | null): string | null | void {
	if (arguments.length < 3) {
		return node.getAttribute(attr);
	}

	if (value === null || value === undefined) {
		removeAttr(node, attr);
	} else {
		node.setAttribute(attr, value);
	}
}

/**
 * Removes the specified attribute
 */
export function removeAttr(node: Element, attr: string): void {
	node.removeAttribute(attr);
}

/**
 * Sets the passed elements display to none
 */
export function hide(node: HTMLElement): void {
	css(node, 'display', 'none');
}

/**
 * Sets the passed elements display to default
 */
export function show(node: HTMLElement): void {
	css(node, 'display', '');
}

/**
 * Toggles an elements visibility
 */
export function toggle(node: HTMLElement): void {
	if (isVisible(node)) {
		hide(node);
	} else {
		show(node);
	}
}

/**
 * Gets a computed CSS value for the given rule.
 */
export function css(node: Element | Window, rule: string): string | null;
/**
 * Sets a batch of inline CSS values.
 *
 * Rules should be in camelCase format and not
 * hyphenated like CSS properties.
 */
export function css(node: HTMLElement, rule: Record<string, string | number>): void;
/**
 * Sets an inline CSS value.
 *
 * Rules should be in camelCase format and not
 * hyphenated like CSS properties.
 */
export function css(node: HTMLElement, rule: string, value: string | number): void;
export function css(
	node: HTMLElement | Element | Window,
	rule: string | Record<string, string | number>,
	value?: string | number
): string | null | void {
	if (arguments.length < 3) {
		if (utils.isString(rule)) {
			return (node as Element).nodeType === 1 ?
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(getComputedStyle(node as Element) as any)[rule] :
				null;
		}

		utils.each(rule as Record<string, string | number>,
			function (key, value) {
				css(node as HTMLElement, key, value);
			});
	} else {
		// isNaN returns false for null, false and empty strings
		// so need to check it's truthy or 0
		const isNumeric = (value || value === 0) && !isNaN(value as number);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(node as HTMLElement).style[rule as any] = isNumeric ? value + 'px' : value as string;
	}
}


/**
 * Gets all the data-* attributes on a node as an object.
 */
export function data(node: Node): Record<string, string> | undefined;
/**
 * Gets a single data attribute's value.
 */
export function data(node: Node, key: string): string | null | undefined;
/**
 * Sets a data attribute's value.
 *
 * Unlike the jQuery version this only stores data
 * in the DOM attributes which means only strings
 * can be stored.
 */
export function data(node: Node, key: string, value: unknown): void;
export function data(
	node: Node,
	key?: string,
	value?: unknown
): Record<string, string> | string | null | undefined | void {
	const argsLength = arguments.length;
	const result: Record<string, string> = {};

	if (node.nodeType === ELEMENT_NODE) {
		const element = node as Element;

		if (argsLength === 1) {
			utils.each(element.attributes, function (_, attribute) {
				if (/^data\-/i.test(attribute.name)) {
					result[attribute.name.substr(5)] = attribute.value;
				}
			});

			return result;
		}

		if (argsLength === 2) {
			return attr(element, `data-${key}`);
		}

		attr(element, `data-${key}`, String(value));
	}

	return undefined;
}

/**
 * Checks if node matches the given selector.
 */
export function is(node?: Node | Window | null, selector?: string): boolean {
	let result = false;

	if (node && (node as Node).nodeType === ELEMENT_NODE) {
		const element = node as Element & {
			msMatchesSelector?: (selector: string) => boolean;
			webkitMatchesSelector?: (selector: string) => boolean;
		};

		result = (element.matches ||
			element.msMatchesSelector ||
			element.webkitMatchesSelector)!.call(element, selector as string);
	}

	return result;
}


/**
 * Returns true if node contains child otherwise false.
 *
 * This differs from the DOM contains() method in that
 * if node and child are equal this will return false.
 */
export function contains(node: Node, child: Node): boolean {
	return node !== child && !!node.contains && node.contains(child);
}

export function previousElementSibling(node: Node, selector?: string): Element | null {
	const prev = (node as Element).previousElementSibling;

	if (selector && prev) {
		return is(prev, selector) ? prev : null;
	}

	return prev;
}

export function insertBefore(node: Node, refNode: Node): Node {
	return refNode.parentNode!.insertBefore(node, refNode);
}

function classes(node: HTMLElement): string[] {
	return node.className.trim().split(/\s+/);
}

export function hasClass(node: HTMLElement, className: string): boolean {
	return is(node, `.${className}`);
}

export function addClass(node: HTMLElement, className: string): void {
	const classList = classes(node);

	if (classList.indexOf(className) < 0) {
		classList.push(className);
	}

	node.className = classList.join(' ');
}

export function removeClass(node: HTMLElement, className: string): void {
	const classList = classes(node);

	utils.arrayRemove(classList, className);

	node.className = classList.join(' ');
}

/**
 * Toggles a class on node.
 *
 * If state is specified and is truthy it will add
 * the class.
 *
 * If state is specified and is falsey it will remove
 * the class.
 */
export function toggleClass(node: HTMLElement, className: string, state?: boolean): void {
	const shouldAdd = utils.isUndefined(state) ? !hasClass(node, className) : state;

	if (shouldAdd) {
		addClass(node, className);
	} else {
		removeClass(node, className);
	}
}

/**
 * Gets the width of the passed node.
 */
export function width(node: HTMLElement): number;
/**
 * Sets the width of the passed node.
 */
export function width(node: HTMLElement, value: number | string): void;
export function width(node: HTMLElement, value?: number | string): number | void {
	if (utils.isUndefined(value)) {
		const cs = getComputedStyle(node);
		const padding = toFloat(cs.paddingLeft) + toFloat(cs.paddingRight);
		const border = toFloat(cs.borderLeftWidth) + toFloat(cs.borderRightWidth);

		return node.offsetWidth - padding - border;
	}

	css(node, 'width', value);
}

/**
 * Gets the height of the passed node.
 */
export function height(node: HTMLElement): number;
/**
 * Sets the height of the passed node.
 */
export function height(node: HTMLElement, value: number | string): void;
export function height(node: HTMLElement, value?: number | string): number | void {
	if (utils.isUndefined(value)) {
		const cs = getComputedStyle(node);
		const padding = toFloat(cs.paddingTop) + toFloat(cs.paddingBottom);
		const border = toFloat(cs.borderTopWidth) + toFloat(cs.borderBottomWidth);

		return node.offsetHeight - padding - border;
	}

	css(node, 'height', value);
}

/**
 * Triggers a custom event with the specified name and
 * sets the detail property to the data object passed.
 */
export function trigger(node: HTMLElement | Window, eventName: string, data?: unknown): void {
	let event: CustomEvent;

	if (utils.isFunction(window.CustomEvent)) {
		event = new CustomEvent(eventName, {
			bubbles: true,
			cancelable: true,
			detail: data
		});
	} else {
		event = (node as HTMLElement).ownerDocument.createEvent('CustomEvent');
		event.initCustomEvent(eventName, true, true, data);
	}

	node.dispatchEvent(event);
}

/**
 * Returns if a node is visible.
 */
export function isVisible(node: Element): boolean {
	return !!node.getClientRects().length;
}

/**
 * Convert CSS property names into camel case
 */
function camelCase(string: string): string {
	return string
		.replace(/^-ms-/, 'ms-')
		.replace(/-(\w)/g, function (_match, char) {
			return char.toUpperCase();
		});
}


/**
 * Loop all child nodes of the passed node
 *
 * The function should accept 1 parameter being the node.
 * If the function returns false the loop will be exited.
 *
 * @param node
 * @param func           Callback which is called with every
 *                        child node as the first argument.
 * @param innermostFirst  If the innermost node should be passed
 *                        to the function before it's parents.
 * @param siblingsOnly    If to only traverse the nodes siblings
 * @param reverse         If to traverse the nodes in reverse
 */
// eslint-disable-next-line max-params
export function traverse(
	node: Node,
	func: (node: Node) => boolean | void,
	innermostFirst?: boolean,
	siblingsOnly?: boolean,
	reverse?: boolean
): boolean | void {
	let current: Node | null = reverse ? node.lastChild : node.firstChild;

	while (current) {
		const next: Node | null = reverse ? current.previousSibling : current.nextSibling;

		if (
			(!innermostFirst && func(current) === false) ||
			(!siblingsOnly && traverse(
				current, func, innermostFirst, siblingsOnly, reverse
			) === false) ||
			(innermostFirst && func(current) === false)
		) {
			return false;
		}

		current = next;
	}
}

/**
 * Like traverse but loops in reverse
 * @see traverse
 */
export function rTraverse(
	node: Node,
	func: (node: Node) => boolean | void,
	innermostFirst?: boolean,
	siblingsOnly?: boolean
): void {
	traverse(node, func, innermostFirst, siblingsOnly, true);
}

/**
 * Parses HTML into a document fragment
 *
 * @since 1.4.4
 */
export function parseHTML(html: string, context?: Document): DocumentFragment {
	context = context || document;

	const ret = context.createDocumentFragment();
	const tmp = createElement('div', {}, context);

	tmp.innerHTML = html;

	while (tmp.firstChild) {
		appendChild(ret, tmp.firstChild);
	}

	return ret;
}

/**
 * Checks if an element has any styling.
 *
 * It has styling if it is not a plain <div> or <p> or
 * if it has a class, style attribute or data.
 *
 * @since 1.4.4
 */
export function hasStyling(node: HTMLElement): boolean {
	return !!node && (!is(node, 'p,div') || !!node.className ||
		!!attr(node, 'style') || !utils.isEmptyObject(data(node) || {}));
}

/**
 * Converts an element from one type to another.
 *
 * For example it can convert the element <b> to <strong>
 *
 * @since 1.4.4
 */
export function convertElement(element: Element, toTagName: string): HTMLElement {
	const newElement = createElement(toTagName, {}, element.ownerDocument);

	utils.each(element.attributes, function (_, attribute) {
		// HTML5 attribute names must not contain ASCII whitespace, ", ', >, /, or =.
		// Some browsers silently accept these (no throw), so check explicitly.
		if (/[\s"'>/=]/.test(attribute.name)) {
			return;
		}
		try {
			attr(newElement, attribute.name, attribute.value);
		} catch (_) { /* empty */ }
	});

	while (element.firstChild) {
		appendChild(newElement, element.firstChild);
	}

	element.parentNode!.replaceChild(newElement, element);

	return newElement;
}

/**
 * List of block level elements separated by bars (|)
 */
export const blockLevelList = '|body|hr|p|div|h1|h2|h3|h4|h5|h6|address|pre|' +
	'form|table|tbody|thead|tfoot|th|tr|td|li|ol|ul|blockquote|center|' +
	'details|section|article|aside|nav|main|header|hgroup|footer|fieldset|' +
	'dl|dt|dd|figure|figcaption|';

/**
 * List of elements that do not allow children separated by bars (|)
 *
 * @since  1.4.5
 */
export function canHaveChildren(node: Node): boolean {
	// 1  = Element
	// 9  = Document
	// 11 = Document Fragment
	if (!/11?|9/.test(String(node.nodeType))) {
		return false;
	}

	// List of empty HTML tags separated by bar (|) character.
	// Source: http://www.w3.org/TR/html4/index/elements.html
	// Source: http://www.w3.org/TR/html5/syntax.html#void-elements
	return ('|iframe|area|base|basefont|br|col|frame|hr|img|input|wbr' +
		'|isindex|link|meta|param|command|embed|keygen|source|track|' +
		'object|').indexOf(`|${node.nodeName.toLowerCase()}|`) < 0;
}

/**
 * Checks if an element is inline
 */
export function isInline(elm: Node | null | undefined, includeCodeAsBlock?: boolean): boolean {
	const nodeType = (elm || {} as Node).nodeType || TEXT_NODE;

	if (nodeType !== ELEMENT_NODE) {
		return nodeType === TEXT_NODE;
	}

	const tagName = (elm as Element).tagName.toLowerCase();

	if (tagName === 'code') {
		return !includeCodeAsBlock;
	}

	return blockLevelList.indexOf(`|${tagName}|`) < 0;
}

/**
 * Copy the CSS from 1 node to another.
 *
 * Only copies CSS defined on the element e.g. style attr.
 *
 * @deprecated since v3.1.0
 */
export function copyCSS(from: HTMLElement, to: HTMLElement): void {
	if (to.style && from.style) {
		to.style.cssText = from.style.cssText + to.style.cssText;
	}
}

/**
 * Checks if a DOM node is empty
 */
export function isEmpty(node: Node): boolean {
	if (node.lastChild && isEmpty(node.lastChild)) {
		remove(node.lastChild);
	}

	return node.nodeType === 3 ? !node.nodeValue :
		(canHaveChildren(node) && !node.childNodes.length);
}

/**
 * Fixes block level elements inside in inline elements.
 *
 * Also fixes invalid list nesting by placing nested lists
 * inside the previous li tag or wrapping them in an li tag.
 */
export function fixNesting(node: Node): void {
	traverse(node, function (node) {
		const list = 'ul,ol';
		const isBlock = !isInline(node, true) && node.nodeType !== COMMENT_NODE;
		let parent = node.parentNode as Node | null;

		// Any blocklevel element inside an inline element needs fixing.
		// Also <p> tags that contain blocks should be fixed
		if (isBlock && parent && (isInline(parent, true) || (parent as Element).tagName === 'P')) {
			// Find the last inline parent node
			let lastInlineParent = node;
			while (lastInlineParent.parentNode && (isInline(lastInlineParent.parentNode, true) ||
				(lastInlineParent.parentNode as Element).tagName === 'P')) {
				lastInlineParent = lastInlineParent.parentNode;
			}

			const before = extractContents(lastInlineParent, node);
			const middle = node;

			// Clone inline styling and apply it to the blocks children
			while (parent && isInline(parent, true)) {
				if (parent.nodeType === ELEMENT_NODE) {
					const clone = (parent as Element).cloneNode();
					while (middle.firstChild) {
						appendChild(clone, middle.firstChild);
					}

					appendChild(middle, clone);
				}
				parent = parent.parentNode;
			}

			insertBefore(middle, lastInlineParent);
			if (!isEmpty(before)) {
				insertBefore(before, middle);
			}
			if (isEmpty(lastInlineParent)) {
				remove(lastInlineParent);
			}
		}

		// Fix invalid nested lists which should be wrapped in an li tag
		if (isBlock && is(node, list) && is(node.parentNode, list)) {
			let li = previousElementSibling(node, 'li');

			if (!li) {
				li = createElement('li');
				insertBefore(li, node);
			}

			appendChild(li, node);
		}
	});
}

/**
 * Finds the common parent of two nodes
 */
export function findCommonAncestor(node1: Node, node2: Node): Node | undefined {
	if (node1 === node2 || contains(node1, node2)) {
		return node1;
	}

	let current: Node | null = node1;

	while ((current = current.parentNode)) {
		if (contains(current, node2)) {
			return current;
		}
	}

	return undefined;
}

export function getSibling(node: Node | null, previous?: boolean): Node | null {
	if (!node) {
		return null;
	}

	return (previous ? node.previousSibling : node.nextSibling) ||
		getSibling(node.parentNode, previous);
}

/**
 * Removes unused whitespace from the root and all it's children.
 *
 * @since 1.4.3
 */
export function removeWhiteSpace(root: HTMLElement): void {
	let nextNode: Node | null;
	let nodeValue: string;
	let nodeType: number;
	let next: Node | null;
	let previous: Node | null;
	let previousSibling: Node | null;
	let trimStart: boolean;

	const cssWhiteSpace = css(root, 'whiteSpace') as string;
	const preserveNewLines = /line$/i.test(cssWhiteSpace);
	let node: Node | null = root.firstChild;

	// Skip pre & pre-wrap with any vendor prefix
	if (/pre(\-wrap)?$/i.test(cssWhiteSpace)) {
		return;
	}

	while (node) {
		nextNode = node.nextSibling;
		nodeValue = node.nodeValue as string;
		nodeType = node.nodeType;

		if (nodeType === ELEMENT_NODE && node.firstChild) {
			removeWhiteSpace(node as HTMLElement);
		}

		if (nodeType === TEXT_NODE) {
			next = getSibling(node);
			previous = getSibling(node, true);
			trimStart = false;

			while (hasClass(previous as HTMLElement, 'sceditor-ignore')) {
				previous = getSibling(previous, true);
			}

			// If previous sibling isn't inline or is a textnode that
			// ends in whitespace, time the start whitespace
			if (isInline(node) && previous) {
				previousSibling = previous;

				while (previousSibling && previousSibling.lastChild) {
					previousSibling = previousSibling.lastChild;

					// eslint-disable-next-line max-depth
					while (previousSibling && hasClass(previousSibling as HTMLElement, 'sceditor-ignore')) {
						previousSibling = getSibling(previousSibling, true) as Node;
					}
				}

				trimStart = !previousSibling ? false : previousSibling.nodeType === TEXT_NODE ?
					/[\t\n\r ]$/.test(previousSibling.nodeValue as string) :
					!isInline(previousSibling);
			}

			// Clear zero width spaces
			nodeValue = nodeValue.replace(/\u200B/g, '');

			// Strip leading whitespace
			if (!previous || !isInline(previous) || trimStart) {
				nodeValue = nodeValue.replace(
					preserveNewLines ? /^[\t ]+/ : /^[\t\n\r ]+/,
					''
				);
			}

			// Strip trailing whitespace
			if (!next || !isInline(next)) {
				nodeValue = nodeValue.replace(
					preserveNewLines ? /(?<![\t ])[\t ]+$/ : /(?<![\t\n\r ])[\t\n\r ]+$/,
					''
				);
			}

			// Remove empty text nodes
			if (!nodeValue.length) {
				remove(node);
			} else {
				node.nodeValue = nodeValue.replace(
					preserveNewLines ? /[\t ]+/g : /[\t\n\r ]+/g,
					' '
				);
			}
		}

		node = nextNode;
	}
}

/**
 * Extracts all the nodes between the start and end nodes
 *
 * @param startNode	The node to start extracting at
 * @param endNode	The node to stop extracting at
 */
export function extractContents(startNode: Node, endNode: Node): DocumentFragment {
	const range = startNode.ownerDocument!.createRange();

	range.setStartBefore(startNode);
	range.setEndAfter(endNode);

	return range.extractContents();
}

/**
 * Gets the offset position of an element
 */
export function getOffset(node: HTMLElement): { left: number; top: number } {
	let left = 0;
	let top = 0;
	let current: (HTMLElement & { offsetParent: Element | null }) | null = node;

	while (current) {
		left += current.offsetLeft;
		top += current.offsetTop;
		current = current.offsetParent as HTMLElement | null;
	}

	return {
		left: left,
		top: top
	};
}

/**
 * Gets the value of a CSS property from the elements style attribute
 */
export function getStyle(elm: HTMLElement, property: string): string {
	const elmStyle = elm.style;

	if (!cssPropertyNameCache[property]) {
		cssPropertyNameCache[property] = camelCase(property);
	}

	property = cssPropertyNameCache[property];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let styleValue = (elmStyle as any)[property];

	// Add an exception for text-align
	if ('textAlign' === property) {
		styleValue = styleValue || css(elm, property);

		if (css(elm.parentNode as HTMLElement, property) === styleValue ||
			css(elm, 'display') !== 'block' || is(elm, 'hr,th')) {
			return '';
		}
	}

	return styleValue;
}

/**
 * Tests if an element has a style.
 *
 * If values are specified it will check that the styles value
 * matches one of the values
 */
export function hasStyle(elm: HTMLElement, property: string, values?: string | string[]): boolean {
	const styleValue = getStyle(elm, property);

	if (!styleValue) {
		return false;
	}

	return !values || styleValue === values ||
		(Array.isArray(values) && values.indexOf(styleValue) > -1);
}

/**
 * Returns true if both nodes have the same number of inline styles and all the
 * inline styles have matching values
 */
function stylesMatch(nodeA: HTMLElement, nodeB: HTMLElement): boolean {
	let i = nodeA.style.length;
	if (i !== nodeB.style.length) {
		return false;
	}

	while (i--) {
		const prop = nodeA.style[i];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if ((nodeA.style as any)[prop] !== (nodeB.style as any)[prop]) {
			return false;
		}
	}

	return true;
}

/**
 * Returns true if both nodes have the same number of attributes and all the
 * attribute values match
 */
function attributesMatch(nodeA: Element, nodeB: Element): boolean {
	let i = nodeA.attributes.length;
	if (i !== nodeB.attributes.length) {
		return false;
	}

	while (i--) {
		const prop = nodeA.attributes[i];
		const notMatches = prop.name === 'style' ?
			!stylesMatch(nodeA as HTMLElement, nodeB as HTMLElement) :
			prop.value !== attr(nodeB, prop.name);

		if (notMatches) {
			return false;
		}
	}

	return true;
}

/**
 * Removes an element placing its children in its place
 */
function removeKeepChildren(node: Node): void {
	while (node.firstChild) {
		insertBefore(node.firstChild, node);
	}

	remove(node);
}

/**
 * Merges inline styles and tags with parents where possible
 *
 * @since 3.1.0
 */
export function merge(node: Node): void {
	if (node.nodeType !== ELEMENT_NODE) {
		return;
	}

	const element = node as HTMLElement;
	let parent = element.parentNode as HTMLElement | null;
	const tagName = element.tagName;
	const mergeTags = /B|STRONG|EM|SPAN|FONT/;

	// Merge children (in reverse as children can be removed)
	let i = element.childNodes.length;
	while (i--) {
		merge(element.childNodes[i]);
	}

	// Should only merge inline tags and should not merge <br> tags
	if (!isInline(element) || tagName === 'BR') {
		return;
	}

	// Remove any inline styles that match the parent style
	i = element.style.length;
	while (i--) {
		const prop = element.style[i];
		if (parent && css(parent, prop) === css(element, prop)) {
			element.style.removeProperty(prop);
		}
	}

	// Can only remove / merge tags if no inline styling left.
	// If there is any inline style left then it means it at least partially
	// doesn't match the parent style so must stay
	if (!element.style.length) {
		removeAttr(element, 'style');

		// Remove font attributes if match parent
		if (tagName === 'FONT' && parent) {
			if ((css(element, 'fontFamily') as string).toLowerCase() ===
				(css(parent, 'fontFamily') as string).toLowerCase()) {
				removeAttr(element, 'face');
			}

			if (css(element, 'color') === css(parent, 'color')) {
				removeAttr(element, 'color');
			}

			if (css(element, 'fontSize') === css(parent, 'fontSize')) {
				removeAttr(element, 'size');
			}
		}

		// Spans and font tags with no attributes can be safely removed
		if (!element.attributes.length && /SPAN|FONT/.test(tagName)) {
			removeKeepChildren(element);
		} else if (mergeTags.test(tagName)) {
			const isBold = /B|STRONG/.test(tagName);
			const isItalic = tagName === 'EM';

			while (parent &&
				isInline(parent) &&
				(!isBold || /bold|700/i.test(css(parent, 'fontWeight') as string)) &&
				(!isItalic || css(parent, 'fontStyle') === 'italic')) {

				// Remove if parent match
				if ((parent.tagName === tagName ||
						(isBold && /B|STRONG/.test(parent.tagName))) &&
					attributesMatch(parent, element)) {
					removeKeepChildren(element);
					break;
				}

				parent = parent.parentNode as HTMLElement | null;
			}
		}
	}

	// Merge siblings if attributes, including inline styles, match
	const next = element.nextSibling as HTMLElement | null;
	if (next && next.tagName === tagName && attributesMatch(next, element)) {
		appendChild(element, next);
		removeKeepChildren(next);
	}
}
