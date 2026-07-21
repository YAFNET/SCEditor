import globals from 'globals';
import tseslint from 'typescript-eslint';

// Shared style rules, applied (in JS or TS-adapted form) to both the plain
// module-style JS sources still awaiting conversion and their .ts replacements.
const moduleStyleRules = {
	'no-bitwise': 'error',
	camelcase: 'error',
	curly: 'error',
	eqeqeq: 'error',
	'guard-for-in': 'error',
	'wrap-iife': ['error', 'any'],

	indent: [
		'error', 'tab', {
			SwitchCase: 1
		}
	],

	'no-use-before-define': [
		'error', {
			functions: false
		}
	],

	'new-cap': [
		'error', {
			capIsNewExceptions: ['Event']
		}
	],

	'no-caller': 'error',

	'no-empty': [
		'error', {
			allowEmptyCatch: true
		}
	],

	'no-new': 'error',
	'no-plusplus': 'off',
	quotes: ['error', 'single'],
	strict: 'error',
	'max-params': ['error', 4],
	'max-depth': ['error', 4],

	'max-len': [
		'error', {
			code: 200,
			ignoreUrls: true,
			ignoreRegExpLiterals: true
		}
	],

	semi: ['error', 'always'],
	'no-cond-assign': ['error', 'except-parens'],
	'no-debugger': 'error',
	'no-eq-null': 'error',
	'no-eval': 'error',
	'no-unused-expressions': 'error',
	'block-scoped-var': 'error',
	'no-iterator': 'error',
	'linebreak-style': ['error', 'unix'],
	'comma-style': ['error', 'last'],
	'no-loop-func': 'error',
	'no-multi-str': 'error',
	'no-proto': 'error',
	'no-script-url': 'error',
	'no-shadow': 'off',
	'dot-notation': 'error',
	'no-new-func': 'error',
	'no-new-wrappers': 'error',
	'no-invalid-this': 'off',
	'no-with': 'error',

	'brace-style': [
		'error', '1tbs', {
			allowSingleLine: false
		}
	],

	'no-mixed-spaces-and-tabs': 'error',

	'key-spacing': [
		'error', {
			beforeColon: false,
			afterColon: true
		}
	],

	'space-unary-ops': 'error',
	'no-spaced-func': 'error',
	'array-bracket-spacing': ['error', 'never'],

	'keyword-spacing': [
		'error', {
			before: true,
			after: true
		}
	],

	'space-in-parens': ['error', 'never'],
	'comma-dangle': ['error', 'never'],
	'no-trailing-spaces': 'error',
	'eol-last': 'error',
	'space-infix-ops': 'error',
	'space-before-blocks': ['error', 'always']
};

// TS-specific replacements for the JS-only rules dropped from moduleStyleRules
// above (no-undef/no-unused-vars are better handled by the compiler/TS plugin).
const tsStyleRules = {
	...moduleStyleRules,
	'no-unused-vars': 'off',
	'@typescript-eslint/no-unused-vars': [
		'error', {
			argsIgnorePattern: '^_',
			varsIgnorePattern: '^_',
			caughtErrorsIgnorePattern: '^_'
		}
	],
	// The `var base = this;` closure-alias idiom is used throughout the
	// constructor-function classes (SCEditor, PluginManager, RangeHelper).
	'@typescript-eslint/no-this-alias': 'off',
	// SCEditor.js forward-declares ~30 private function bindings
	// (`let init: () => void; ... init = function () {...};`) so they can
	// call each other regardless of definition order, mirroring the
	// original `var` hoisting - these can't be `const`.
	'prefer-const': 'off'
};

export default [
	{
		files: ['src/*.js', 'src/lib/**/*.js'],
		languageOptions: {
			globals: {
				...globals.browser,
				sceditor: false
			},

			ecmaVersion: 2018,
			sourceType: 'module'
		},

		rules: {
			...moduleStyleRules,
			'no-undef': 'error',
			'no-unused-vars': [
				'error', {
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			]
		}
	},

	// TypeScript replacements for the ES-module sources above (src/*.ts,
	// src/lib/**/*.ts) as they get converted from .js.
	...tseslint.config({
		files: ['src/*.ts', 'src/lib/**/*.ts', 'src/types/**/*.ts'],
		extends: [tseslint.configs.recommended],
		languageOptions: {
			globals: {
				...globals.browser,
				sceditor: false
			},

			parserOptions: {
				ecmaVersion: 2020,
				sourceType: 'module'
			}
		},

		rules: tsStyleRules
	}),

	// Legacy global-style scripts (self-registering IIFEs against the
	// `sceditor` global, not ES modules) - kept loosely checked, same as
	// their old standalone eslint.config.mjs overrides.
	{
		files: ['src/formats/**/*.js', 'src/icons/**/*.js', 'src/plugins/**/*.js'],
		languageOptions: {
			ecmaVersion: 6,
			sourceType: 'script'
		}
	},

	// TypeScript replacements for the legacy global-style scripts above.
	...tseslint.config({
		files: ['src/formats/**/*.ts', 'src/icons/**/*.ts', 'src/plugins/**/*.ts'],
		extends: [tseslint.configs.recommended],
		languageOptions: {
			globals: {
				...globals.browser
			},

			parserOptions: {
				sourceType: 'script'
			}
		},

		rules: {
			// The `var base = this;` closure-alias idiom is used throughout
			// these constructor-function style formats/plugins.
			'@typescript-eslint/no-this-alias': 'off',
			// Several single-assignment locals mirror the original `var`
			// declarations that are conditionally assigned later.
			'prefer-const': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error', {
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			]
		}
	}),

	{
		files: ['languages/**/*.js'],
		languageOptions: {
			ecmaVersion: 5,
			sourceType: 'script'
		},

		rules: {
			'dot-notation': 'off',

			'max-len': ['error', {
				code: 400,
				ignoreUrls: true,
				ignoreRegExpLiterals: true
			}]
		}
	},

	...tseslint.config({
		files: ['languages/**/*.ts'],
		extends: [tseslint.configs.recommended],
		languageOptions: {
			globals: {
				...globals.browser
			},

			parserOptions: {
				sourceType: 'script'
			}
		},

		rules: {
			'dot-notation': 'off',

			'max-len': ['error', {
				code: 400,
				ignoreUrls: true,
				ignoreRegExpLiterals: true
			}]
		}
	}),

	{
		files: ['tests/**/*.ts'],
		languageOptions: {
			globals: {
				...globals.qunit,
				QUnit: true,
				module: true,
				test: true,
				asyncTest: true,
				rangy: true,
				sinon: true,
				runner: true,
				patchConsole: true,
				less: true
			}
		},

		rules: {
			'new-cap': 'off',
			strict: 'off',
			'max-params': 'off',
			'max-depth': ['error', 6],
			'max-len': 'off'
		}
	},

	// TypeScript replacement for tests/manual/**/*.js (dev-only interactive
	// QA pages, loaded via plain <script> tags against the built dist
	// bundle - not part of the vitest run). Needs the TS parser since the
	// generic `tests/**/*.ts` block above uses the default parser.
	...tseslint.config({
		files: ['tests/manual/**/*.ts'],
		extends: [tseslint.configs.recommended],
		languageOptions: {
			globals: {
				...globals.browser,
				sceditor: false,
				runner: false,
				patchConsole: false
			},

			parserOptions: {
				sourceType: 'script'
			}
		},

		rules: {
			'@typescript-eslint/no-this-alias': 'off',
			'prefer-const': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error', {
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			]
		}
	})
];
