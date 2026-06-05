import { beforeEach, expect } from 'vitest';
import * as utils from './utils';

// Create QUnit-compatible fixture elements used by tests and utils
const fixture = document.createElement('div');
fixture.id = 'qunit-fixture';
document.body.appendChild(fixture);

const moduleFixture = document.createElement('div');
moduleFixture.id = 'qunit-module-fixture';
document.body.appendChild(moduleFixture);

// Clear the fixture before every test
beforeEach(() => {
	document.getElementById('qunit-fixture').replaceChildren();
});

// ── Custom matchers ──────────────────────────────────────────────────────────

const isNear = (actual, expected, maxDiff) =>
	actual >= expected - maxDiff || actual <= expected + maxDiff;

function normalizeNodes(parentNode) {
	let node = parentNode.firstChild;
	while (node) {
		if (node.nodeType === 3) {
			let next;
			while ((next = node.nextSibling) && next.nodeType === 3) {
				node.nodeValue += next.nodeValue;
				parentNode.removeChild(next);
			}
		} else {
			normalizeNodes(node);
		}
		node = node.nextSibling;
	}
}

function compareNodes(nodeA, nodeB) {
	if (
		(nodeA.nodeName && nodeB.nodeName &&
			nodeA.nodeName.toLowerCase() !== nodeB.nodeName.toLowerCase()) ||
		nodeA.nodeValue !== nodeB.nodeValue ||
		nodeA.nodeType !== nodeB.nodeType ||
		nodeA.className !== nodeB.className
	) {
		return false;
	}
	if (nodeA.nodeType === 1) {
		if (
			nodeA.attributes.length !== nodeB.attributes.length ||
			nodeA.childNodes.length !== nodeB.childNodes.length
		) {
			return false;
		}
		for (let i = 0; i < nodeA.attributes.length; i++) {
			const aAttr = nodeA.attributes[i];
			if (typeof aAttr.specified === 'undefined' || aAttr.specified) {
				if (aAttr.name === 'style') {
					if (nodeA.style.cssText !== nodeB.style.cssText) return false;
				} else if (nodeB.getAttribute(aAttr.name) !== aAttr.value) {
					return false;
				}
			}
		}
		for (let i = 0; i < nodeA.childNodes.length; i++) {
			if (!compareNodes(nodeA.childNodes[i], nodeB.childNodes[i])) return false;
		}
	}
	return true;
}

function compareHtml(actual, expected) {
	if (actual === expected) return true;
	if (!actual || !expected || typeof actual !== 'string' || typeof expected !== 'string') {
		return false;
	}
	const nodeA = utils.htmlToDiv(actual);
	const nodeB = utils.htmlToDiv(expected);
	if (nodeA.innerHTML === nodeB.innerHTML) return true;
	return compareNodes(nodeA, nodeB);
}

function nodeToString(node) {
	if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
	if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
		const template = document.createElement('template');
		template.append(node.cloneNode(true));
		return template.innerHTML;
	}
	return node.outerHTML;
}

expect.extend({
	toBeClose(received, expected, maxDiff) {
		const pass = isNear(received, expected, maxDiff);
		return {
			pass,
			message: () => pass
				? `Expected ${received} not to be within ${expected} +-${maxDiff}`
				: `Expected ${received} to be within ${expected} +-${maxDiff}`
		};
	},
	toBeHtmlEqual(received, expected) {
		const pass = compareHtml(received, expected);
		return {
			pass,
			message: () => pass
				? `Expected HTML not to be equal\nReceived: ${received}\nExpected: ${expected}`
				: `Expected HTML to be equal\nReceived: ${received}\nExpected: ${expected}`
		};
	},
	toBeNodesEqual(received, expected) {
		normalizeNodes(received);
		normalizeNodes(expected);
		const pass = compareNodes(received, expected);
		return {
			pass,
			message: () => pass
				? `Expected nodes not to be equal\nReceived: ${nodeToString(received)}\nExpected: ${nodeToString(expected)}`
				: `Expected nodes to be equal\nReceived: ${nodeToString(received)}\nExpected: ${nodeToString(expected)}`
		};
	}
});
