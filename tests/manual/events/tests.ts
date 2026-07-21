document.addEventListener('DOMContentLoaded', function () {
	patchConsole();

	runner.setup(function (this: Any) {
		const textarea = document.getElementById('testarea') as HTMLTextAreaElement;

		sceditor.create(textarea, {
			width: '100%',
			autofocus: true,
			plugins: '',
			toolbar: 'bold,italic,underline',
			autofocusEnd: true,
			enablePasteFiltering: true
		});

		this.editor = sceditor.instance(textarea);

		runner.run();
	});
});

runner.test({
	title: 'WYSIWYG Keydown',
	instructions: 'Press any key in the WYSIWYG editor.',
	teardown: function (this: Any) {
		this.editor.unbind('keydown', this.handler);
	}
}, function (this: Any, done: Any) {
	this.handler = function () {
		done(true);
	};

	this.editor.bind('keydown', this.handler);
});

runner.test({
	title: 'WYSIWYG Keypress',
	instructions: 'Press any key in the WYSIWYG editor.',
	teardown: function (this: Any) {
		this.editor.unbind('keypress', this.handler);
	}
}, function (this: Any, done: Any) {
	this.handler = function () {
		done(true);
	};

	this.editor.bind('keypress', this.handler);
});

runner.test({
	title: 'WYSIWYG Keyup',
	instructions: 'Press any key in the WYSIWYG editor.',
	teardown: function (this: Any) {
		this.editor.unbind('keyup', this.handler);
	}
}, function (this: Any, done: Any) {
	this.handler = function () {
		done(true);
	};

	this.editor.bind('keyup', this.handler);
});

runner.test({
	title: 'WYSIWYG Keypress prevent default',
	instructions: 'Press any key in the WYSIWYG editor.',
	setup: function (this: Any) {
		this.editor.val('');
	},
	teardown: function (this: Any) {
		this.editor.unbind('keypress', this.handler);
	}
}, function (this: Any, done: Any) {
	const that = this;

	this.handler = function (e: Any) {
		e.preventDefault();

		setTimeout(function () {
			done(that.editor.getBody().textContent === '');
		}, 100);
	};

	this.editor.bind('keypress', this.handler);
});

runner.test({
	title: 'WYSIWYG shortcut',
	instructions: 'Press ctrl+j in the WYSIWYG editor.',
	teardown: function (this: Any) {
		this.editor.removeShortcut('ctrl+j');
	}
}, function (this: Any, done: Any) {
	const handler = function () {
		done(true);

		return false;
	};

	this.editor.addShortcut('ctrl+j', handler);
});

runner.test({
	title: 'WYSIWYG function shortcut',
	instructions: 'Press ctrl+shift+f3 in the WYSIWYG editor.',
	teardown: function (this: Any) {
		this.editor.removeShortcut('ctrl+shift+f3');
	}
}, function (this: Any, done: Any) {
	const handler = function () {
		done(true);

		return false;
	};

	this.editor.addShortcut('ctrl+shift+f3', handler);
});

runner.test({
	title: 'WYSIWYG selectionchanged',
	instructions: 'Select the text "jumps over" and nothing else.',
	setup: function (this: Any) {
		this.editor.val(
			'<p>The quick brown fox jumps over the lazy dog.</p>'
		);
	},
	teardown: function (this: Any) {
		this.editor.val('');
		this.editor.unbind('selectionchanged', this.handler);
	}
}, function (this: Any, done: Any) {
	const editor = this.editor;

	this.handler = function () {
		let selectedText;
		const range = editor.getRangeHelper().selectedRange();

		if (range && typeof range.text !== 'undefined') {
			selectedText = range.text;
		} else if (range) {
			selectedText = range.toString();
		}

		console.info('Selected text: "' + selectedText + '"');

		if (!/^ ?jumps over ?$/.test(selectedText)) {
			return;
		}

		done(true);
	};

	editor.bind('selectionchanged', this.handler);
});

runner.test({
	title: 'WYSIWYG contextmenu',
	instructions: 'Right click inside the WYSIWYG editor.',
	teardown: function (this: Any) {
		this.editor.unbind('contextmenu', this.handler);
	}
}, function (this: Any, done: Any) {
	this.handler = function () {
		done(true);

		return false;
	};

	this.editor.focus();
	this.editor.bind('contextmenu', this.handler);
});

runner.test({
	title: 'WYSIWYG nodechanged',
	instructions: 'Follow the instructions inside the WYSIWYG editor.',
	setup: function (this: Any) {
		this.editor.val(
			'<p id="a" style="background: #ecf0f1">Click anywhere here.</p>' +
			'<p id="b" style="background: #84C692">Then click here.</p>'
		);
	},
	teardown: function (this: Any) {
		this.editor.unbind('nodechanged', this.handler);
		this.editor.val('');
	}
}, function (this: Any, done: Any) {
	const editor = this.editor;
	const body = editor.getBody();
	const firstNode = body.ownerDocument.getElementById('a');
	const lastNode = body.ownerDocument.getElementById('b');
	let foundFirst = false;

	this.handler = function () {
		const currentNode = editor.currentNode();

		if (!foundFirst) {
			if (currentNode === firstNode ||
				currentNode.parentNode === firstNode) {
				foundFirst = true;

				console.info('First node clicked.');
			}

			return;
		}

		if (currentNode !== lastNode &&
				currentNode.parentNode !== lastNode) {
			return;
		}

		console.info('Second node clicked.');
		done(true);
	};

	editor.blur();
	editor.bind('nodechanged', this.handler);
});

runner.test({
	title: 'WYSIWYG blur',
	instructions: 'Click outside of the WYSIWYG editor.',
	teardown: function (this: Any) {
		this.editor.unbind('blur', this.handler);
	}
}, function (this: Any, done: Any) {
	this.handler = function () {
		done(true);
	};

	this.editor.focus();
	this.editor.bind('blur', this.handler);
});

runner.test({
	title: 'WYSIWYG focus',
	instructions: 'Click inside the WYSIWYG editor.',
	teardown: function (this: Any) {
		this.editor.unbind('focus', this.handler);
	}
}, function (this: Any, done: Any) {
	this.handler = function () {
		done(true);
	};

	this.editor.blur();
	this.editor.bind('focus', this.handler);
});

runner.test({
	title: 'Source editor Keydown',
	instructions: 'Press any key in the source editor.',
	setup: function (this: Any) {
		this.editor.sourceMode(true);
		this.editor.val('');
		this.editor.focus();
	},
	teardown: function (this: Any) {
		this.editor.unbind('keydown', this.handler);
	}
}, function (this: Any, done: Any) {
	this.handler = function () {
		done(true);
	};

	this.editor.bind('keydown', this.handler);
});

runner.test({
	title: 'Source editor Keypress',
	instructions: 'Press any key in the source editor.',
	teardown: function (this: Any) {
		this.editor.unbind('keypress', this.handler);
	}
}, function (this: Any, done: Any) {
	this.handler = function () {
		done(true);
	};

	this.editor.bind('keypress', this.handler);
});

runner.test({
	title: 'Source editor Keyup',
	instructions: 'Press any key in the source editor.',
	teardown: function (this: Any) {
		this.editor.unbind('keyup', this.handler);
	}
}, function (this: Any, done: Any) {
	this.handler = function () {
		done(true);
	};

	this.editor.bind('keyup', this.handler);
});

runner.test({
	title: 'Source Keypress prevent default',
	instructions: 'Press any key in the WYSIWYG editor.',
	setup: function (this: Any) {
		this.editor.val('');
	},
	teardown: function (this: Any) {
		this.editor.unbind('keypress', this.handler);
	}
}, function (this: Any, done: Any) {
	const that = this;

	this.handler = function (e: Any) {
		e.preventDefault();

		setTimeout(function () {
			done(that.editor.val() === '');
		}, 100);
	};

	this.editor.bind('keypress', this.handler);
});

runner.test({
	title: 'Source editor shortcut',
	instructions: 'Press ctrl+j in the source editor.',
	teardown: function (this: Any) {
		this.editor.removeShortcut('ctrl+j');
	}
}, function (this: Any, done: Any) {
	const handler = function () {
		done(true);

		return false;
	};

	this.editor.addShortcut('ctrl+j', handler);
});

runner.test({
	title: 'Source editor contextmenu',
	instructions: 'Right click inside the source editor.',
	teardown: function (this: Any) {
		this.editor.unbind('contextmenu', this.handler);
	}
}, function (this: Any, done: Any) {
	this.handler = function () {
		done(true);

		return false;
	};

	this.editor.focus();
	this.editor.bind('contextmenu', this.handler);
});

runner.test({
	title: 'Source editor blur',
	instructions: 'Click outside of the source editor.',
	teardown: function (this: Any) {
		this.editor.unbind('blur', this.handler);
	}
}, function (this: Any, done: Any) {
	this.handler = function () {
		done(true);
	};

	this.editor.focus();
	this.editor.bind('blur', this.handler);
});

runner.test({
	title: 'Source editor focus',
	instructions: 'Click inside the source editor.',
	teardown: function (this: Any) {
		this.editor.unbind('focus', this.handler);
	}
}, function (this: Any, done: Any) {
	this.handler = function () {
		done(true);
	};

	this.editor.blur();
	this.editor.bind('focus', this.handler);
});
