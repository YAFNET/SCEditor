/* eslint-env node */
/*global module:false, require:false*/
const libCoverage = require('istanbul-lib-coverage');
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');
const sass = require('sass');
const nodeResolve = require('@rollup/plugin-node-resolve').default;
const fs = require('fs');
const path = require('path');

module.exports = (grunt) => {
	require('time-grunt')(grunt);

	grunt.event.on('qunit.coverage',
		function(data) {
			const outputDir = __dirname + '/coverage';

			fs.rmSync(outputDir, { recursive: true, force: true });

			const coverageMap = libCoverage.createCoverageMap(data);
			const context = libReport.createContext({
				dir: outputDir,
				defaultSummarizer: 'nested',
				coverageMap: coverageMap
			});

			console.log('\n\n\nCoverage:');
			reports.create('text').execute(context);
			reports.create('html').execute(context);
			console.log('\n');
		});

	grunt.registerTask('dev-server',
		'Dev server',
		function() {
			const done = this.async();

			require('./tests/dev-server').create(9001, true).then(done, done);
		});

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		// Runs the unit tests
		qunit: {
			all: {
				options: {
					urls: ['http://localhost:9001/tests/unit/index.html'],
					// Some tests rely on failing URLs so want to ignore them
					console: false,
					inject: path.join(__dirname, './tests/test-bridge.js'),
					// Sandbox doesn't always work well on Linux so just disable
					puppeteer: { args: ['--no-sandbox'], headless: 'new' }
				}
			}
		},

		// Style checking of JS code using ESLint
		eslint: {
			source: {
				src: ['src/*.js']
			},
			formats: {
				options: {
                    overrideConfigFile: 'src/formats/eslint.config.mjs'
                },
				src: ['src/formats/**/*.js']
			},
			icons: {
				options: {
                    overrideConfigFile: 'src/icons/eslint.config.mjs'
                },
				src: ['src/icons/**/*.js']
			},
			lib: {
				src: ['src/lib/**/*.js']
			},
			plugins: {
				options: {
                    overrideConfigFile: 'src/plugins/eslint.config.mjs'
                },
				src: ['src/plugins/**/*.js']
			},
			tests: {
				options: {
                    overrideConfigFile: 'tests/eslint.config.mjs'
                },
				src: ['tests/**/*.js']
			},
			translations: {
				options: {
                    overrideConfigFile: 'languages/eslint.config.mjs'
                },
				src: 'languages/**/*.js'
			}
		},

		// Removes all the old files from the distributable directory
		clean: {
			build: ['minified/', 'coverage/'],
			dist: ['dist/']
		},

		// Copy files into the distributable directory ready to be compressed
		// into the ZIP archive
		copy: {
			dist: {
				files: [
					{
						expand: true,
						src: ['minified/**', 'languages/**'],
						dest: 'dist/'
					},
					{
						expand: true,
						cwd: 'src/',
						src: ['plugins/**.js', 'formats/**.js', 'icons/**.js'],
						dest: 'dist/development/'
					},
					{
						expand: true,
						cwd: 'src/themes/icons/',
						src: '*.png',
						dest: 'dist/development/themes/'
					},
					{
						expand: true,
						cwd: 'src/themes/',
						src: 'content/**',
						dest: 'dist/development/themes/'
					},
					{
						expand: true,
						src: 'README.md',
						dest: 'dist/'
					},
					{
						expand: true,
						src: 'MIT.txt',
						dest: 'dist/'
					},
					{
						expand: true,
						cwd: 'distributable/data/',
						src: 'example.html',
						dest: 'dist/'
					}
				]
			},
			build: {
				options: {
				},
				files: [
					{
						expand: true,
						cwd: 'src/themes/icons/',
						src: '*.png',
						dest: 'minified/themes/'
					},
					{
						expand: true,
						cwd: 'src/themes/',
						src: 'content/**',
						dest: 'minified/themes/',
						rename: function(dest, src) {
							return dest + src.replace('.css', '.min.css');
						}
					}
				]
			}
		},
		rollup: {
			options: {
				format: 'iife',
				external: ['jquery'],
				globals: {
					jquery: 'jQuery'
				},
				plugins: function() {
					return [
						nodeResolve({
							module: true
						})
					];
				}
			},
			build: {
				files: {
					'./minified/sceditor.min.js': [
						'./src/sceditor.js'
					]
				}
			},
			dist: {
				files: {
					'./dist/development/sceditor.js': [
						'./src/sceditor.js'
					]
				}
			}
		},

		// Minify the JavaScript
		uglify: {
			build: {
				options: {
					warnings: true,
					compress: true,
					mangle: true,
					banner: '/* SCEditor v<%= pkg.version %> | ' +
						'(C) 2017-<%= grunt.template.today(\'yyyy\') %>, Sam Clarke | sceditor.com/license */\n'
				},
				files: [
					{
						src: 'minified/sceditor.min.js',
						dest: 'minified/sceditor.min.js'
					},
					{
						expand: true,
						filter: 'isFile',
						cwd: 'src/',
						src: ['plugins/**.js', 'formats/**.js', 'icons/**.js'],
						dest: 'minified/'
					},
					{
						expand: true,
						filter: 'isFile',
						src: 'languages/**.js',
						dest: 'minified/'
					}
				]
			}
		},

		sass: {
			options: {
				implementation: sass,
				sourceMap: false
			},
			build: {
				files: {
					'minified/themes/sceditor.min.css': 'src/themes/sceditor.scss'
				}
			}
		},

		// Manage CSS vendor prefixes
		postcss: {
			build: {
				options: {
					processors: [
						require('autoprefixer')(),
						require('cssnano')()
					]
				},
				files: [
					{
						expand: true,
						filter: 'isFile',
						cwd: 'minified/',
						src: ['themes/**/*.css'],
						dest: 'minified/'
					}
				]
			}
		},

		// Creates the distributable ZIP file
		compress: {
			dist: {
				options: {
					archive: 'distributable/sceditor-<%= pkg.version %>.zip'
				},
				files: [
					{
						expand: true,
						cwd: 'dist/',
						src: ['**']
					}
				]
			}
		},

		devUpdate: {
			main: {
				options: {
					updateType: 'force',
					semver: false
				}
			}
		}
	});


	grunt.loadNpmTasks('@lodder/grunt-postcss');
	grunt.loadNpmTasks('@w8tcha/grunt-dev-update');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-rollup');
	grunt.loadNpmTasks('grunt-eslint');
	grunt.loadNpmTasks('grunt-sass');

	grunt.registerTask('default', ['test']);

	// Lints the JS and runs the unit tests
	grunt.registerTask('test', ['eslint', 'dev-server', 'qunit']);

	// Minifies the source
	grunt.registerTask('build',
		[
			'clean:build',
			'sass',
			'copy:build',
			'rollup:build',
			'uglify:build',
			'postcss:build'
		]);

	// Creates a directory containing the contents of
	// the release ZIP but without compressing it
	grunt.registerTask('dist',
		[
			'test',
			'build',
			'clean:dist',
			'rollup:dist',
			'copy:dist'
		]);

	// Creates the simplified distributable ZIP
	grunt.registerTask('release',
		[
			'dist',
			'compress:dist',
			'clean:dist'
		]);
};
