let gulp = require('gulp');
let plato = require('es6-plato');
let fs = require("fs");

let appSrc = './lib/**';
let testSrc = './test/**';

let appOutputDir = './artifacts/lib';
let testOutputDir = './artifacts/test';

let complexityRules = {};

let data = fs.readFileSync('.eslintrc');
let lintRules = JSON.parse(data);

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
