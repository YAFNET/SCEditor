(function () {
	'use strict';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type Any = any;

	const _formatObject = function (obj: Any) {
		if (!obj) {
			return obj;
		}

		if (obj instanceof Error) {
			let errorMsg = 'Error: ' + (obj.message || (obj as Any).description);

			if (obj.stack) {
				errorMsg += '\n' + obj.stack;
			}

			return errorMsg;
		}

		return String(obj);
	};

	const _patchConsoleMethod = function (output: HTMLElement, method: 'info' | 'warn' | 'error' | 'debug' | 'log') {
		const originalMethod = console[method];

		return function (this: Any, msg: Any, ...args: Any[]) {
			const div = document.createElement('div');
			div.className = method;
			div.textContent = _formatObject(msg);

			output.appendChild(div);
			output.scrollTop = output.scrollHeight;

			if (!originalMethod) {
				return;
			}

			if (originalMethod.apply) {
				originalMethod.apply(this, [msg, ...args]);
			} else {
				(originalMethod as Any)(msg);
			}
		};
	};

	const _patchAssertMethod = function (output: HTMLElement) {
		const originalMethod = console.assert;

		return function (this: Any, assertionArg: Any, msg: Any, ...args: Any[]) {
			const assertion = document.createElement('span');
			assertion.textContent = assertionArg ? 'Assertion passed: ' :
				'Assertion failed: ';

			const div = document.createElement('div');
			div.className = 'assert';
			div.className += assertionArg ? ' assert-passed' : ' assert-failed';

			div.appendChild(assertion);
			div.appendChild(document.createTextNode(msg));

			output.appendChild(div);
			output.scrollTop = output.scrollHeight;

			if (!originalMethod) {
				return;
			}

			if (originalMethod.apply) {
				originalMethod.apply(this, [assertionArg, msg, ...args]);
			} else {
				(originalMethod as Any)(msg);
			}
		};
	};

	const _patchClearMethod = function (output: HTMLElement) {
		const originalMethod = console.clear;

		return function (this: Any, ...args: Any[]) {
			output.innerHTML = '';

			if (!originalMethod) {
				return;
			}

			if ((originalMethod as Any).apply) {
				(originalMethod as Any).apply(this, args);
			} else {
				originalMethod();
			}
		};
	};

	window.patchConsole = function (outputDiv?: HTMLElement) {
		const output = outputDiv || document.getElementById('console-output') as HTMLElement;

		console.info = _patchConsoleMethod(output, 'info');
		console.warn = _patchConsoleMethod(output, 'warn');
		console.error = _patchConsoleMethod(output, 'error');
		console.debug = _patchConsoleMethod(output, 'debug');
		console.log = _patchConsoleMethod(output, 'log');
		console.assert = _patchAssertMethod(output);
		console.clear = _patchClearMethod(output);

		window.onerror = function (msg, url, line) {
			console.error(`Caught global error: ${msg} on line ${line} of ${url}`);
		};
	};
}());
