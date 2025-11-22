(function () {
	'use strict';

	var _assert = {
		ok: function (actual, description, info) {
			console.assert(actual, description);

			if (!actual && info) {
				console.info(info);
			}
		},
		equal: function (actual, expected, description) {
			_assert.ok(
				actual == expected,
				description,
				`Expected "${actual}" == "${expected}"`
			);
		},
		strictEqual: function (actual, expected, description) {
			_assert.ok(
				actual === expected,
				description,
				`Expected "${actual}" === "${expected}"`
			);
		},
		notEqual: function (actual, expected, description) {
			_assert.ok(
				actual != expected,
				description,
				`Expected "${actual}" != "${expected}"`
			);
		},
		notStrictEqual: function (actual, expected, description) {
			_assert.ok(
				actual !== expected,
				description,
				`Expected "${actual}" !== "${expected}"`
			);
		},
		throws: function (method, expected, description) {
			var undef;
			var exception = false;

			if (description === undef) {
				description = expected;
				expected    = undef;
			}

			try {
				method.call(null);
			} catch (ex) {
				exception = ex;
			}

			if (expected === undef) {
				_assert.ok(
					exception,
					description,
					'No exception was thrown.'
				);
			} else {
				_assert.ok(
					exception == expected,
					description,
					'Expected exception and actual exception did not match.'
				);
			}
		}
	};

	var _bind = function (fn, that) {
		return function () {
			return fn.apply(that, arguments);
		};
	};


	class TestRunner {
		constructor() {
			this.assert = _assert;
			this._tests = [];

			this._currentTestIndex = -1;
			this._testObjectThis = {};
		}
		_currentTest() {
			var undef;

			if (this._currentTestIndex < 0) {
				return undef;
			}

			return this._tests[this._currentTestIndex];
		}
		_failedTests() {
			const failed = [];

			for (let i = 0; i < this._tests.length; i++) {
				if (this._tests[i].passed === false) {
					failed.push(this._tests[i]);
				}
			}

			return failed;
		}
		_skippedTests() {
			const skipped = [];

			for (let i = 0; i < this._tests.length; i++) {
				if (this._tests[i].skipped) {
					skipped.push(this._tests[i]);
				}
			}

			return skipped;
		}
		_incrementTest() {
			var title, instructions, totalFailed;
			const $currentTestDisplay = document.querySelector('.current-test');

			this._currentTestIndex++;
			this._updateProgress();

			if (this._currentTest()) {
				title = this._currentTest().title;
				instructions = this._currentTest().instructions;
			} else {
				totalFailed = this._failedTests().length;

				title = 'Finished!';
				instructions = `Testing complete. ${totalFailed} of ${this._totalTests()} tests failed, ${this._skippedTests().length} skipped.`;

				$currentTestDisplay.classList.add(totalFailed ? 'failed' : 'passed');
			}

			$currentTestDisplay.querySelector('h3').textContent = title;
			$currentTestDisplay.querySelector('p').textContent = instructions;
		}
		_updateProgress() {
			const currentPercent = (this._currentPosition() / this._totalTests()) * 100;

			document.getElementById('progress-info').textContent = this._currentPosition() + ' / ' + this._totalTests();

			document.getElementById('progress').style.width = currentPercent + '%';
		}
		_currentPosition() {
			return Math.min(
				Math.max(this._currentTestIndex, 0), this._totalTests()
			);
		}
		_totalTests() {
			return this._tests.length;
		}
		_setupTests() {
			var test, testIdx, that = this;

			for (testIdx = 0; testIdx < this._tests.length; testIdx++) {
				test = this._tests[testIdx];

				const h3 = document.createElement('h3');
				h3.textContent = test.title;
				const p = document.createElement('p');
				p.textContent = test.instructions;

				const $test = document.createElement('div');

				$test.classList.add('test');

				$test.append(h3);
				$test.append(p);

				this._tests[testIdx].display = $test;
				document.getElementById('tests').append($test);
			}

			document.querySelector('.current-test a').addEventListener('click', () => {
				that._skipTest();

				return false;
			});
		}
		_done(passed) {
			const currentTest = this._currentTest();

			if (currentTest) {
				currentTest.display.classList.add(passed ? 'passed' : 'failed');
				currentTest.passed = !!passed;
				currentTest.skipped = false;

				if (passed) {
					console.info(`Test: "${currentTest.title}" passed.`);
				} else {
					console.error(`Test: "${currentTest.title}" failed.`);
				}
			}

			this._runNext();
		}
		_skipTest() {
			const currentTest = this._currentTest();

			if (!currentTest) {
				return;
			}

			currentTest.passed = true;
			currentTest.skipped = true;

			console.info('Test: "' + currentTest.title + '" skipped.');

			this._runNext();
		}
		_runNext() {
			var currentTest;
			const $testsContainer = document.getElementById('tests');

			currentTest = this._currentTest();
			if (currentTest) {
				if (currentTest.teardown) {
					currentTest.teardown.call(this._testObjectThis);
				}
			}

			this._incrementTest();

			currentTest = this._currentTest();
			if (currentTest) {
				scrollTop($testsContainer,
					$testsContainer.scrollTop +
					currentTest.display.offsetHeight +
					currentTest.display.top -
					$testsContainer.getBoundingClientRect().height
				);

				if (currentTest.setup) {
					currentTest.setup.call(this._testObjectThis);
				}

				currentTest.test.call(this._testObjectThis, _bind(this._done, this));
			} else {
				scrollTop($testsContainer,$testsContainer[0].scrollHeight);

				console.info('Test finished!');
			}
		}
		run() {
			this._setupTests();

			setTimeout(function () {
				scrollTop(document.getElementById('tests'), 0);
			});

			this._runNext();
		}
		test(options, test) {
			this._tests.push({
				title: options.title,
				instructions: options.instructions,
				setup: options.setup,
				teardown: options.teardown,
				test: test
			});
		}
		setup(init) {
			init.call(this._testObjectThis);
		}
	}












function scrollTop(el, value) {
  var win;
  if (el.window === el) {
    win = el;
  } else if (el.nodeType === 9) {
    win = el.defaultView;
  }

  if (value === undefined) {
    return win ? win.pageYOffset : el.scrollTop;
  }

  if (win) {
    win.scrollTo(win.pageXOffset, value);
  } else {
    el.scrollTop = value;
  }
}


	window.runner = new TestRunner();
}());


