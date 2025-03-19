(function () {
	'use strict';

	var evalConsoleInput = function () {
		try {
			const codeInput = document.querySelector('#console-input textarea');
			const code = codeInput.value;

			console.info('> ' + code);
			
			eval.call(window, code);
		} catch (ex) {
			console.error(ex);
		}
	};

	var createEditor = function () {
		const coptionsInput = document.querySelector('#debug-options textarea');
		const optionsStr = coptionsInput.value;

		if (window.instance) {
			window.instance.destroy();
		}

		try {
			const options = (new Function('return ' + optionsStr))();
			const textarea = document.getElementById('testarea');

			sceditor.create(textarea, options);
			window.instance = sceditor.instance(textarea);
		} catch (ex) {
			console.error(ex);
		}
	};

	patchConsole();
	createEditor();

	document.querySelector('#console-input textarea')
		.addEventListener('keypress', function (e) {
			if (e.which === 13) {
				evalConsoleInput();

				return false;
			}
		});

	document.querySelector('#console-input input')
		.addEventListener('click', function () {
			evalConsoleInput();

			return false;
		});

	document.querySelector('#debug-options input')
		.addEventListener('click', function () {
			createEditor();

			return false;
		});
}());
