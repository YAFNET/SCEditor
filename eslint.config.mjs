import globals from 'globals';

export default [
	{
		languageOptions: {
			globals: {
				...globals.browser,
				sceditor: false,
			},

			ecmaVersion: 2018,
			sourceType: 'module'
		},

		rules: {
			"no-bitwise": 'error',
			camelcase: 'error',
			curly: 'error',
			eqeqeq: 'error',
			"guard-for-in": 'error',
			"wrap-iife": ['error', 'any'],

			indent: [
				'error', 'tab', {
					SwitchCase: 1
				}
			],

			"no-use-before-define": [
				'error', {
					functions: false
				}
			],

			"new-cap": [
				'error', {
					capIsNewExceptions: ['Event']
				}
			],

			"no-caller": 'error',

			"no-empty": [
				'error', {
					allowEmptyCatch: true
				}
			],

			"no-new": 'error',
			"no-plusplus": 'off',
			quotes: ['error', 'single'],
			"no-undef": 'error',
			"no-unused-vars": [
				'error', {
					"argsIgnorePattern": '^_',
					"varsIgnorePattern": '^_',
					"caughtErrorsIgnorePattern": '^_'
				}
			],
			strict: 'error',
			"max-params": ['error', 4],
			"max-depth": ['error', 4],

			"max-len": [
				'error', {
					code: 200,
					ignoreUrls: true,
					ignoreRegExpLiterals: true
				}
			],

			semi: ['error', 'always'],
			"no-cond-assign": ['error', 'except-parens'],
			"no-debugger": 'error',
			"no-eq-null": 'error',
			"no-eval": 'error',
			"no-unused-expressions": 'error',
			"block-scoped-var": 'error',
			"no-iterator": 'error',
			"linebreak-style": ['error', 'unix'],
			"comma-style": ['error', 'last'],
			"no-loop-func": 'error',
			"no-multi-str": 'error',
			"no-proto": 'error',
			"no-script-url": 'error',
			"no-shadow": 'off',
			"dot-notation": 'error',
			"no-new-func": 'error',
			"no-new-wrappers": 'error',
			"no-invalid-this": 'off',
			"no-with": 'error',

			"brace-style": [
				'error', '1tbs', {
					allowSingleLine: false
				}
			],

			"no-mixed-spaces-and-tabs": 'error',

			"key-spacing": [
				'error', {
					beforeColon: false,
					afterColon: true
				}
			],

			"space-unary-ops": 'error',
			"no-spaced-func": 'error',
			"array-bracket-spacing": ['error', 'never'],

			"keyword-spacing": [
				'error', {
					before: true,
					after: true
				}
			],

			"space-in-parens": ['error', 'never'],
			"comma-dangle": ['error', 'never'],
			"no-trailing-spaces": 'error',
			"eol-last": 'error',
			"space-infix-ops": 'error',
			"space-before-blocks": ['error', 'always']
		}
	}
];