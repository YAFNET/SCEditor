export default [{
    languageOptions: {
        ecmaVersion: 5,
        sourceType: 'script'
    },

    rules: {
        "dot-notation": 'off',

        "max-len": ['error', {
            code: 400,
            ignoreUrls: true,
            ignoreRegExpLiterals: true
        }]
    }
}];