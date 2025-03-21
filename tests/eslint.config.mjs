import globals from 'globals';

export default [{
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
            less: true,
        },
    },

    rules: {
        "new-cap": 'off',
        strict: 'off',
        "max-params": 'off',
        "max-depth": ['error', 6],
        "max-len": 'off',
    },
}];