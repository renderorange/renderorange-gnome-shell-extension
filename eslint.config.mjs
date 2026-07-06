import js from '@eslint/js';

const gjsGlobals = {
    ARGV: 'readonly',
    Debugger: 'readonly',
    GIRepositoryGType: 'readonly',
    globalThis: 'readonly',
    imports: 'readonly',
    Intl: 'readonly',
    log: 'readonly',
    logError: 'readonly',
    print: 'readonly',
    printerr: 'readonly',
    window: 'readonly',
    TextEncoder: 'readonly',
    TextDecoder: 'readonly',
    console: 'readonly',
    setTimeout: 'readonly',
    setInterval: 'readonly',
    clearTimeout: 'readonly',
    clearInterval: 'readonly',
};

const gjsRules = {
    ...js.configs.recommended.rules,

    'array-callback-return': 'error',
    'no-await-in-loop': 'error',
    'no-constant-binary-expression': 'error',
    'no-constructor-return': 'error',
    'no-duplicate-imports': 'error',
    'no-new-native-nonconstructor': 'error',
    'no-promise-executor-return': 'error',
    'no-self-compare': 'error',
    'no-template-curly-in-string': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unreachable-loop': 'error',
    'no-unused-private-class-members': 'error',
    'no-use-before-define': [
        'error',
        {
            functions: false,
            classes: true,
            variables: true,
            allowNamedExports: true,
        },
    ],

    'block-scoped-var': 'error',
    'complexity': 'warn',
    'consistent-return': 'error',
    'default-param-last': 'error',
    'eqeqeq': 'error',
    'no-array-constructor': 'error',
    'no-caller': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-extra-label': 'error',
    'no-iterator': 'error',
    'no-label-var': 'error',
    'no-loop-func': 'error',
    'no-multi-assign': 'warn',
    'no-new-object': 'error',
    'no-new-wrappers': 'error',
    'no-proto': 'error',
    'no-shadow': 'warn',
    'no-unused-vars': [
        'error',
        {
            varsIgnorePattern: '^_',
            argsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
        },
    ],
    'no-var': 'warn',
    'unicode-bom': 'error',
};

export default [
    // ESM files (extension.js, prefs.js, lib.js)
    {
        files: ['extension.js', 'prefs.js', 'lib.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...gjsGlobals,
                global: 'readonly',
            },
        },
        rules: {
            ...gjsRules,
            'no-restricted-globals': [
                'error',
                {name: 'Debugger', message: 'Internal use only'},
                {name: 'GIRepositoryGType', message: 'Internal use only'},
                {name: 'log', message: 'Use console.log()'},
                {name: 'logError', message: 'Use console.warn() or console.error()'},
            ],
            'no-restricted-properties': [
                'error',
                {object: 'imports', property: 'format', message: 'Use template strings'},
                {object: 'Lang', property: 'copyProperties', message: 'Use Object.assign()'},
                {object: 'Lang', property: 'bind', message: 'Use arrow notation or Function.prototype.bind()'},
                {object: 'Lang', property: 'Class', message: 'Use ES6 classes'},
            ],
        },
    },

    // Test files
    {
        files: ['tests/**/*.test.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': [
                'error',
                {varsIgnorePattern: '^_', argsIgnorePattern: '^_'},
            ],
        },
    },

    // v43 legacy files
    {
        files: ['v43/**/*.js'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'script',
            globals: {
                ...gjsGlobals,
                window: 'writable',
                global: 'readonly',
            },
        },
        rules: {
            ...gjsRules,
            'no-var': 'off',
            'no-shadow': 'off',
            'no-restricted-properties': 'off',
            'no-restricted-globals': [
                'error',
                {name: 'Debugger', message: 'Internal use only'},
                {name: 'GIRepositoryGType', message: 'Internal use only'},
            ],
            'no-unused-vars': [
                'error',
                {
                    varsIgnorePattern: '^_|^(init|enable|disable|fillPreferencesWindow)$',
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },

    // Ignore node_modules and tmp
    {
        ignores: ['node_modules/**', 'tmp/**'],
    },
];
