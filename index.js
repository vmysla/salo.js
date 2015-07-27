var ga   = window['ga'];
var salo = require('./src/salo.js');
var conf = { 
	'storage' : require('simplestorage.js') 
};

ga('provide', 'salo', salo);
ga('require', 'salo', conf);
