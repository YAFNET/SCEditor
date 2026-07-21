(function () {
	'use strict';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type Any = any;

	const evalConsoleInput = function () {
		try {
			const codeInput = document.querySelector('#console-input textarea') as HTMLTextAreaElement;
			const code = codeInput.value;

			console.info('> ' + code);

			eval.call(window, code);
		} catch (ex) {
			console.error(ex);
		}
	};

	const createEditor = function () {
		const coptionsInput = document.querySelector('#debug-options textarea') as HTMLTextAreaElement;
		const optionsStr = coptionsInput.value;

		if (window.instance) {
			window.instance.destroy();
		}

		try {
			const options = (new Function('return ' + optionsStr))() as Any;
			const textarea = document.getElementById('testarea') as HTMLTextAreaElement;

			sceditor.create(textarea, options);
			window.instance = sceditor.instance(textarea);
		} catch (ex) {
			console.error(ex);
		}
	};

	patchConsole();
	createEditor();

	(document.querySelector('#console-input textarea') as HTMLElement)
		.addEventListener('keypress', function (e) {
			if ((e as KeyboardEvent).which === 13) {
				evalConsoleInput();

				return false;
			}

			return undefined;
		});

	(document.querySelector('#console-input input') as HTMLElement)
		.addEventListener('click', function () {
			evalConsoleInput();

			return false;
		});

	(document.querySelector('#debug-options input') as HTMLElement)
		.addEventListener('click', function () {
			createEditor();

			return false;
		});
}());
