module.exports = function(config) {

  var istanbul = require('browserify-istanbul');

  config.set({

    frameworks  : ['browserify', 'jasmine'],
    reporters   : ['nyan', 'progress', 'coverage'],
    browsers    : ['PhantomJS'],

    files         : [ 'test/*.spec.js' ],
    preprocessors : { 'test/*.spec.js': ['browserify'] },
    require       : { jquery : 'jquery-browserify' },

    browserify: {
        debug : true, // output source maps
        transform : [istanbul({
            ignore : ['**/node_modules/**']
        })],
    }
    
  })
};