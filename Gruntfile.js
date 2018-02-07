/*global module:false */
module.exports = function( grunt ) {
  'use strict';
  var SOURCES = [ 'src/**/*.js' ];
  var DEMOSOURCES = [ 'demo/scripts/**/*.js' ];
  var TESTSOURCES = [ 'test/spec/**/*.js' ];
  var DISTSOURCES = [
    'src/module.js',
    'src/tree-repeat.js'
  ];
  var DISTDIR = 'dist';
  var TASK_IMPORTS = [
    'grunt-contrib-concat',
    'grunt-contrib-uglify',
    'grunt-contrib-jshint',
    'grunt-contrib-watch',
    'grunt-contrib-connect',
    'grunt-contrib-copy',
    'grunt-contrib-clean',
    'grunt-bowerful'
  ];


  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    clean: {
      dist: [DISTDIR],
      site: ['site']
    },

    copy: {
      demo: {
        expand: true,
        cwd: 'demo/',
        src: ['**/*'],
        dest: 'site/'
      },
      concat: {
        expand: true,
        flatten: true,
        src: [ '<%= concat.dist.dest %>' ],
        dest: 'site/components/angular-tree-repeat/'
      }
    },

    concat: {
      options: {
        stripBanners: {
          line: true
        },
        banner: '// <%= pkg.name %> - v<%= pkg.version %>\n\n'
      },
      dist: {
        src: DISTSOURCES,
        dest: DISTDIR + '/<%= pkg.name %>.js'
      }
    },

    uglify: {
      options: {
        banner: '/* <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> */ ',
        mangle: {
          topleve: true,
          defines: {
            NDEBUG: true
          }
        },
        squeeze: {},
        codegen: {}
      },
      dist: {
        src: [ 'src/*.js' ],
        dest: DISTDIR + '/<%= pkg.name %>.min.js'

      }
    },

    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true
      },
      grunt: {
        src: [ 'Gruntfile.js' ],
        options: {node:true}
      },
      source: {
        src: SOURCES.concat(DEMOSOURCES),
        options: {
          globals: {
            angular: true
          }
        }
      },

      test: {
        src: TESTSOURCES,
        options: {
          globals: {
            angular: true,
            inject: true,
            _: false,
            _V_: false,
            afterEach: false,
            beforeEach: false,
            confirm: false,
            context: false,
            describe: false,
            expect: false,
            it: false,
            jasmine: false,
            mostRecentAjaxRequest: false,
            qq: false,
            runs: false,
            spyOn: false,
            spyOnEvent: false,
            waitsFor: false,
            xdescribe: false,
            xit: false,
            setFixtures: false,
            sandbox: false
          }
        }
      }
    },

    docco: {
      tree: {
        src: SOURCES,
        dest: 'docs/',
        options: {
          layout: "parallel"
        }
      }
    },

    bowerful: {
      site: {
        directory: 'site/components',

        packages: {
          'angular': "1.2.x",
          'angular-route': "1.2.x",
          jquery: "1.9.x",
          json3: "3.2.x",
          "es5-shim": "2.0.x",
          "bootstrap.css": "2.1.1",
          "jasmine-jquery": "1.x"
        }
      }
    },

    connect: {
      site: {
        options: {
          port: 8000,
          hostname: '*',
          base: 'site',
          livereload: true
        }
      },
      docs: {
        options: {
          port: 9001,
          base: 'docs',
          livereload: true
        }
      }
    },

    watch: {
      options: {
        livereload: true
      },
      sources: {
        files: SOURCES,
        tasks: ['jshint:source', 'concat', 'copy:concat']
      },
      demo: {
        files: ['demo/**/*'],
        tasks: ['jshint:source', 'copy:demo']
      },
      tests: {
        files: TESTSOURCES,
        tasks: ['test', 'jshint:test']
      },
      gruntFile: {
        files: ['Gruntfile.js'],
        tasks: ['jshint:grunt']
      }
    }

  });

  TASK_IMPORTS.forEach(grunt.loadNpmTasks);

  grunt.registerTask('default', ['jshint', 'doc']);

  grunt.registerTask('dist', ['jshint', 'concat', 'min']);

  grunt.registerTask('doc', ['docco']);
  grunt.registerTask('min', ['uglify']);

  // 'demo' task - stage demo system into 'site' and watch for source changes
  grunt.registerTask('build-site', ['bowerful', 'copy:demo', 'concat', 'copy:concat']);
  grunt.registerTask('demo', ['clean:site', 'build-site', 'connect:site', 'watch']);

  var shell = require('shelljs');
  var semver = require('semver');

  function run(cmd, msg){
    shell.exec(cmd, {silent:true});
    if( msg ){
      grunt.log.ok(msg);
    }
  }

  grunt.registerTask('release-prepare', 'Set up submodule to receive a new release', function(){
    // Make sure we have the submodule in dist
    run("git submodule init");
    run("git submodule update");
    run("cd dist; git checkout master");
    // Bump version
    var newVer = grunt.config('pkg').version;
    var comp = grunt.file.readJSON(DISTDIR+"/bower.json");
    grunt.log.writeln("Package version: " + newVer);
    grunt.log.writeln("Component version: " + comp.version);
    if( !semver.gt( newVer, comp.version ) ){
      grunt.warn("Need to up-version package.json first!");
    }
  });


  grunt.registerTask('release-commit', 'push new build to bower component repo', function(){
    // Stamp version
    var newVer = grunt.config('pkg').version;
    var comp = grunt.file.readJSON(DISTDIR+"/bower.json");
    grunt.log.writeln("Package version: " + newVer);
    grunt.log.writeln("Component version: " + comp.version);
    if( !semver.gt( newVer, comp.version ) ){
      grunt.warn("Need to up-version package.json first!");
    }
    comp.version = newVer;
    grunt.file.write(DISTDIR+"/bower.json", JSON.stringify(comp, null, '  ')+'\n');
    // Commit submodule
    // Tag submodule
    run('cd dist; git commit -a -m"Build version '+ newVer +'"', "Commited to bower repo");
    run('cd dist; git tag ' + newVer + ' -m"Release version '+ newVer +'"', "Tagged bower repo");
    // Commit and tag this.
    run('git commit -a -m"Build version '+ newVer +'"', "Commited to source repo");
    run('git tag ' + newVer + ' -m"Release version '+ newVer +'"', "Tagged source repo");
    run("git submodule update");
    // push?
    grunt.log.ok("DON'T FORGET TO PUSH BOTH!");
  });

  grunt.registerTask('release', 'build and push to the bower component repo',
                     ['release-prepare', 'dist', 'release-commit']);

  var docco = require('docco');

  grunt.registerMultiTask('docco', 'Docco processor.', function() {
      var task = this,
      fdone = 0,
      flength = this.files.length,
      done = this.async();

      this.files.forEach(function(file) {
        docco.document(task.options({ output: file.dest, args: file.src }), function(){
          if(++fdone === flength){
            done();
          }
        });
      });
    });
};
