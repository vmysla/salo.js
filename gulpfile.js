'use strict';

var gulp       = require('gulp');
var karma      = require('karma');
var rename     = require('gulp-rename');
var browserify = require('gulp-browserify');

gulp.task('test', function(done) {

	karma.server.start({
		configFile: __dirname + '/karma.conf.js'
	}, done);

});

gulp.task('build', function(done) {

	gulp.src('./index.js')
    	.pipe( browserify({ insertGlobals: false })	)
    	.pipe(rename('salo.js'))
   		.pipe(gulp.dest('./dist'));

});
