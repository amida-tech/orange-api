let gulp = require('gulp');
let plato = require('es6-plato');

let appSrc = './lib/**';
let testSrc = './test/**';

let appOutputDir = './artifacts/lib';
let testOutputDir = './artifacts/test';


let lintRules = {
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "script"
    },
    "env": {
        "node": true,
        "mocha": true
    },
    "rules": {
        "curly": 0,
        "key-spacing": 1,
        "no-shadow": 0,
        "no-underscore-dangle": 0,
        "camelcase": 0,
        "no-use-before-define": [2, 'nofunc'],
        "max-len": [1, 120, 4],
        "new-cap": 0,
        "no-unused-expressions": 0,
        "smells/no-switch": 1,
        "smells/no-complex-switch-case": 1,
        "smells/no-setinterval": 1,
        "smells/no-complex-string-concat": 1,
        "no-multi-spaces": [2, {
            "exceptions": {
                "VariableDeclarator": true
            }
        }],
        "no-unused-vars": 1
    },
    "parser": "babel-eslint",
    "plugins": [
        "smells"
    ]
};


let complexityRules = {

};

let platoArgs = {
    title: 'Orange-API',
    eslint: lintRules,
    complexity: complexityRules
};

function analysis() {
  return plato.inspect(appSrc, appOutputDir, platoArgs);
}

function testAnalysis() {
  return plato.inspect(testSrc, testOutputDir, platoArgs);
}

gulp.task('appAnalysis', analysis);
gulp.task('testAnalysis', testAnalysis);
