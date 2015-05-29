"use strict";
module.exports = function (grunt) {

    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-express-server');
    grunt.loadNpmTasks('grunt-jsbeautifier');

    grunt.registerTask('default', ['jshint', 'jsbeautifier', 'express:dev', 'mochaTest']);
    grunt.registerTask('server', ['jshint', 'jsbeautifier', 'express:dev', 'watch']);

    // Print a timestamp (useful for when watching)
    grunt.registerTask('timestamp', function () {
        grunt.log.subhead(Date());
    });

    grunt.initConfig({
        jshint: {
            files: ['./lib/*.js', './test/*.js', './test/**/*.js', 'gruntfile.js', 'package.json', 'app.js'],
            options: {
                browser: true,
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: false,
                boss: true,
                eqnull: true,
                node: true,
                expr: true,
                globals: {
                    'xit': true,
                    'xdescribe': true,
                    'it': true,
                    'describe': true,
                    'before': true,
                    'beforeEach': true,
                    'after': true,
                    'afterEach': true,
                    'done': true
                }
            }
        },
        jsbeautifier: {
            files: ['Gruntfile.js', 'app.js', 'lib/*.js', 'test/**/*.js'],
            options: {
                config: '.jsbeautifyrc'
            }
        },
        express: {
            dev: {
                options: {
                    script: './app.js',
                    logs: {
                        out: './tmp/test_log.out',
                        err: './tmp/test_log.err'
                    }
                }
            }
        },
        watch: {
            all: {
                files: ['./lib/*.js', './test/*/*.js', 'app.js', 'gruntfile.js'],
                tasks: ['default']
            }
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    timeout: '10000'
                },
                src: ['test/*.js', 'test/**/*.js']
            }
        }
    });
};
