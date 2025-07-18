/**
 * SCEditor Mentions Plugin
 * http://www.sceditor.com/
 *
 * Copyright (C) 2011-2025, Sam Clarke (samclarke.com)
 *
 * SCEditor is licensed under the MIT license:
 *	http://www.opensource.org/licenses/mit-license.php
 *
 * @author Sam Clarke
 */
(function (sceditor) {
	'use strict';

	sceditor.plugins.mentions = function () {
		var editor;

		this.init = function () {
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
				onclick: function (data) { editor.insert(`[userlink]${data.name}[/userlink]`); }
			});
		}

		function mentions(opts = {}) {
			opts = Object.assign({},
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
				opts);

			const $e = opts.element.inSourceMode()
				? opts.element.getSourceEditor()
				: opts.element.getContentAreaContainer().contentWindow.document.body;

			if (!$e)
				return console.error('Invalid element selector', opts);

			var $lookup = document.createElement('div');
			$lookup.classList = `fixed-top autohide ${opts.lookup}`;
			$e.parentNode.insertBefore($lookup, $e.nextSibling);

			$e.addEventListener('keydown', processKey);
			$e.addEventListener('keyup', showLookup);
			$e.addEventListener('click', hideLookup);

			var start, end, prevWord;

			var isFixed = false;
			var $el = $lookup.parentNode;
			while ($el && $el.nodeName.toLowerCase() !== 'body' && !isFixed) {
				isFixed = window.getComputedStyle($el).getPropertyValue('position').toLowerCase() === 'fixed';
				$el = $el.parentElement;
			}

			function showLookup(event) {
				if (event.code === 'Escape') {
					return hideLookup();
				}

				var sel, text, curr;

				if (opts.element.inSourceMode()) {
					sel = document.getSelection();
					var $parent = opts.element.getSourceEditor();
					text = $parent.value || "";
					curr = sel.baseOffset;

				} else {
					sel = opts.element.getContentAreaContainer().contentWindow.document.getSelection();

					text = opts.element.val() || "";
					curr = sel.baseOffset;
				}

				var getLength = arr => arr instanceof Array && arr.length > 0 ? arr[0].length : 0;

				start = curr - getLength(text.slice(0, curr).match(/[\S]+$/g));
				end = curr + getLength(text.slice(curr).match(/^[\S]+/g));

				var word = text.substring(start, end);

				if (!word || word[0] !== opts.symbol) {
					prevWord = '';
					return hideLookup();
				}

				if (word === prevWord)
					return;

				prevWord = word;

				var pos = { x: 0, y: 0 };

				var parentRect = opts.element.inSourceMode()
					? opts.element.getSourceEditor().getBoundingClientRect()
					: opts.element.getContentAreaContainer().contentWindow.document.body.getBoundingClientRect();

				pos.y = parentRect.top + 30;
				pos.x = parentRect.left + 20;

				$lookup.style.left = pos.x + 'px';
				$lookup.style.top = pos.y + 'px';

				// query
				var query = word.slice(1);

				var token = '';
				var tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');

				if (tokenInput != null) {
					token = tokenInput.value;
				}

				if (query.length >= 3) {
					fetch(opts.url.replace('{q}', query),
							{
								method: 'GET',
								headers: {
									"Accept": 'application/json',
									"Content-Type": 'application/json;charset=utf-8',
									"RequestVerificationToken": token
								}
							})
						.then(response => response.json())
						.then(data => opts.items = data);
				}

				var items = opts.items
					.filter(e => e.name.toLowerCase().includes(word.slice(1).toLowerCase()))
					.map(item => eval(
						'`<li class="mention-li-nt ${opts.lookup}" data-name = "${item.name}" data-id = "${item.id}">' +
						opts.item_template +
						'</li>`'));

				if (!items.length)
					return hideLookup();

				$lookup.innerHTML = `<ul class="dropdown-menu show">${items.join('')}</ul>`;
				[...$lookup.firstElementChild.children]
					.forEach($el => $el.addEventListener('click', onClick) ||
						$el.addEventListener('mouseenter', onHover));
				$lookup.firstElementChild.children[0].classList.add('active');


				if ($lookup.hasAttribute('hidden'))
					$lookup.removeAttribute('hidden');

				var bounding = $lookup.getBoundingClientRect();
				if (!(bounding.top >= 0 &&
					bounding.left >= 0 &&
					bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
					bounding.right <= (window.innerWidth || document.documentElement.clientWidth)))
					$lookup.style.top = parseInt($lookup.style.top) - 10 - $lookup.clientHeight + 'px';
			}

			function hideLookup() {
				if (!$lookup.hasAttribute('hidden'))
					$lookup.setAttribute('hidden', true);
			}

			function onClick(event) {
				const deleteItem = event.target.classList.contains('mention-li-nt')
					? event.target
					: event.target.parentElement;

				opts.onclick(deleteItem.dataset);

				const value = opts.element.val();

				opts.element.val(value.replace(value.substring(start + 1, end), ''));

				hideLookup();
			}

			function onHover(event) {
				const $el = event.target.closest('.mention-li-nt');
				if ($el.classList.contains('active'))
					return;

				[...$lookup.firstElementChild.children]
					.filter($el => $el.classList.contains('active'))
					.forEach($el => $el.classList.remove('active'));
				$el.classList.add('active');
			}

			function processKey(event) {
				const code = event.key;
				if (['ArrowUp', 'ArrowDown', 'Enter'].indexOf(code) == -1 || $lookup.hasAttribute('hidden'))
					return;

				event.preventDefault();
				if (code == 'Enter')
					return $lookup.querySelector('.active').click();

				const $children = [...$lookup.firstElementChild.children];
				const curr = $children.findIndex($el => $el.classList.contains('active'));
				$children[curr].classList.remove('active');

				const $next = $children[($children.length + curr + (code == 'ArrowUp' ? -1 : 1)) % $children.length];
				$next.classList.add('active');
				$next.scrollIntoView(false);
			}
		}
	};
}(sceditor));
