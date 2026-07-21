/**
 * SCEditor Mentions Plugin
 * http://www.sceditor.com/
 *
 * Copyright (C) 2011-2026, Sam Clarke (samclarke.com)
 *
 * SCEditor is licensed under the MIT license:
 *	http://www.opensource.org/licenses/mit-license.php
 *
 * @author Sam Clarke
 */
(function (sceditor) {
	'use strict';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type Any = any;

	sceditor.plugins.mentions = function (this: Any) {
		let editor: Any;

		this.init = function (this: Any) {
			editor = this;
			editor.opts.onToggleMode = initMentions;
		};

		this.signalReady = function () {
			initMentions();
		};

		function initMentions() {
			mentions({
				element: editor,
				lookup: 'user',
				url: editor.opts.mentionsUrl,
				onclick: function (data: Any) { editor.insert(`[userlink]${data.name}[/userlink]`); }
			});
		}

		function mentions(optsArg: Any = {}) {
			const opts = Object.assign({},
				{
					lookup: 'lookup',
					id: '',
					selector: '',
					element: null,
					symbol: '@',
					items: [],
					item_template:
						'<a class="dropdown-item" href="#" style="font-family: var(--bs-body-font-family);"><img src="${item.avatar}" alt="avatar" class="me-2 img-thumbnail" style="max-width:20px;max-height:20px" /> ${item.name}</a>',
					onclick: undefined,
					url: ''
				},
				optsArg);

			const $e = opts.element.inSourceMode()
				? opts.element.getSourceEditor()
				: opts.element.getContentAreaContainer().contentWindow.document.body;

			if (!$e)
				return console.error('Invalid element selector', opts);

			const $lookup = document.createElement('div');
			($lookup as Any).classList = `fixed-top autohide ${opts.lookup}`;
			$e.parentNode.insertBefore($lookup, $e.nextSibling);

			$e.addEventListener('keydown', processKey);
			$e.addEventListener('keyup', showLookup);
			$e.addEventListener('click', hideLookup);

			let start: Any, end: Any, prevWord: Any;

			let isFixed = false;
			let $el: Any = $lookup.parentNode;
			while ($el && $el.nodeName.toLowerCase() !== 'body' && !isFixed) {
				isFixed = window.getComputedStyle($el).getPropertyValue('position').toLowerCase() === 'fixed';
				$el = $el.parentElement;
			}

			function showLookup(event: Any): Any {
				if (event.code === 'Escape') {
					return hideLookup();
				}

				let sel, text, curr;

				if (opts.element.inSourceMode()) {
					sel = document.getSelection();
					const $parent = opts.element.getSourceEditor();
					text = $parent.value || '';
					curr = (sel as Any).baseOffset;

				} else {
					sel = opts.element.getContentAreaContainer().contentWindow.document.getSelection();

					text = opts.element.val() || '';
					curr = (sel as Any).baseOffset;
				}

				const getLength = (arr: Any) => arr instanceof Array && arr.length > 0 ? arr[0].length : 0;

				start = curr - getLength(text.slice(0, curr).match(/[\S]+$/g));
				end = curr + getLength(text.slice(curr).match(/^[\S]+/g));

				const word = text.substring(start, end);

				if (!word || word[0] !== opts.symbol) {
					prevWord = '';
					return hideLookup();
				}

				if (word === prevWord)
					return undefined;

				prevWord = word;

				const pos = { x: 0, y: 0 };

				const parentRect = opts.element.inSourceMode()
					? opts.element.getSourceEditor().getBoundingClientRect()
					: opts.element.getContentAreaContainer().contentWindow.document.body.getBoundingClientRect();

				pos.y = parentRect.top + 30;
				pos.x = parentRect.left + 20;

				$lookup.style.left = pos.x + 'px';
				$lookup.style.top = pos.y + 'px';

				// query
				const query = word.slice(1);

				let token = '';
				const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');

				if (tokenInput != null) {
					token = (tokenInput as Any).value;
				}

				if (query.length >= 3) {
					fetch(opts.url.replace('{q}', query),
							{
								method: 'GET',
								headers: {
									'Accept': 'application/json',
									'Content-Type': 'application/json;charset=utf-8',
									'RequestVerificationToken': token
								}
							})
						.then(response => response.json())
						.then(data => opts.items = data);
				}

				const items = opts.items
					.filter((e: Any) => e.name.toLowerCase().includes(word.slice(1).toLowerCase()))
					// `item` is referenced dynamically inside the eval'd template
					// string below (via closure), not statically - can't rename it.
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					.map((item: Any) => eval(
						'`<li class="mention-li-nt ${opts.lookup}" data-name = "${item.name}" data-id = "${item.id}">' +
						opts.item_template +
						'</li>`'));

				if (!items.length)
					return hideLookup();

				$lookup.innerHTML = `<ul class="dropdown-menu dropdown-mentions show">${items.join('')}</ul>`;
				[...($lookup.firstElementChild as Any).children]
					.forEach(($el: Any) => $el.addEventListener('click', onClick) ||
						$el.addEventListener('mouseenter', onHover));
				($lookup.firstElementChild as Any).children[0].classList.add('active');


				if ($lookup.hasAttribute('hidden'))
					$lookup.removeAttribute('hidden');

				const bounding = $lookup.getBoundingClientRect();
				if (!(bounding.top >= 0 &&
					bounding.left >= 0 &&
					bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
					bounding.right <= (window.innerWidth || document.documentElement.clientWidth)))
					$lookup.style.top = parseInt($lookup.style.top) - 10 - $lookup.clientHeight + 'px';

				return undefined;
			}

			function hideLookup() {
				if (!$lookup.hasAttribute('hidden'))
					$lookup.setAttribute('hidden', 'true');
			}

			function onClick(event: Any) {
				const deleteItem = event.target.classList.contains('mention-li-nt')
					? event.target
					: event.target.parentElement;

				opts.onclick(deleteItem.dataset);

				const value = opts.element.val();

				opts.element.val(value.replace(value.substring(start + 1, end), ''));

				hideLookup();
			}

			function onHover(event: Any) {
				const $el = event.target.closest('.mention-li-nt');
				if ($el.classList.contains('active'))
					return;

				[...($lookup.firstElementChild as Any).children]
					.filter(($el: Any) => $el.classList.contains('active'))
					.forEach(($el: Any) => $el.classList.remove('active'));
				$el.classList.add('active');
			}

			function processKey(event: Any) {
				const code = event.key;
				if (['ArrowUp', 'ArrowDown', 'Enter'].indexOf(code) == -1 || $lookup.hasAttribute('hidden'))
					return;

				event.preventDefault();
				if (code == 'Enter')
					return ($lookup.querySelector('.active') as Any).click();

				const $children = [...($lookup.firstElementChild as Any).children];
				const curr = $children.findIndex(($el: Any) => $el.classList.contains('active'));
				$children[curr].classList.remove('active');

				const $next = $children[($children.length + curr + (code == 'ArrowUp' ? -1 : 1)) % $children.length];
				$next.classList.add('active');
				$next.scrollIntoView(false);

				return undefined;
			}
		}
	} as Any;
}(sceditor));
