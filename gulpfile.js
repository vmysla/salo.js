'use strict';

var gulp       = require('gulp');
var karma      = require('karma');
var rename     = require('gulp-rename');
var concat     = require('gulp-concat');
var insert     = require('gulp-insert');
var closure = require('gulp-closure-compiler-service');

gulp.task('test', function(done) {

    karma.server.start({
        configFile: __dirname + '/karma.conf.js'
    }, done);

});

gulp.task('build', function(done) {

    gulp.src('./src/salo.js')
        .pipe(gulp.dest('./dist'))
        .pipe(closure({compilation_level: 'ADVANCED_OPTIMIZATIONS'}))
        .pipe(rename('salo.min.js'))
        .pipe(gulp.dest('./dist'));

    gulp.src(['./node_modules/simplestorage.js/simpleStorage.js','./src/salo.js'])
        .pipe(concat('salo+simplestorage.js'))
        .pipe(gulp.dest('./dist'))
        .pipe(closure({compilation_level: 'ADVANCED_OPTIMIZATIONS'}))
        .pipe(rename('salo+simplestorage.min.js'))    	
        .pipe(gulp.dest('./dist'));

    gulp.src(['./node_modules/simplestorage.js/simpleStorage.js','./src/salo.js'])
        .pipe(concat('salo+simplestorage+autoprovide.js'))
        .pipe(insert.append('window[window["GoogleAnalyticsObject"]]("require", "salo");'))
        .pipe(insert.append('window[window["GoogleAnalyticsObject"]]("provide", "salo", salo);'))
        .pipe(gulp.dest('./dist'))
        .pipe(closure({compilation_level: 'ADVANCED_OPTIMIZATIONS'}))
        .pipe(rename('salo+simplestorage+autoprovide.min.js'))    	
        .pipe(gulp.dest('./dist'));
});
