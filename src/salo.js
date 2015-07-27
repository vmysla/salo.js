function salo(tracker, options){

	var UNDEFINED;

	var NOP = function(){};

	var TIME_1_SECOND  = 1000;
	var TIME_5_SECONDS = TIME_1_SECOND * 5;
	var TIME_1_MINUTE  = TIME_1_SECOND * 60;
	var TIME_1_HOUR    = TIME_1_MINUTE * 60;
	var TIME_3_HOURS   = TIME_1_HOUR   * 3;

	var patterns =  [{	
		'useSalo'		: 1, 
		'useBeacon'		: false,
		'hitCallback'	: UNDEFINED, 
		'transport'		: UNDEFINED 
	}];

	var inbox  = 0;
	var outbox = 0;

	var storageTimeout   = options['storageTimeout']   || TIME_3_HOURS;
	var transportTimeout = options['transportTimeout'] || TIME_5_SECONDS;

	var transportMethod  = options['transportMethod']  || 'image';
	var transportUrl     = options['transportUrl']     || '//www.google-analytics.com/collect';

	var timing    = options['timing']       || window;
	var storage   = options['storage']      || window['simpleStorage'];
	var transport = options['sendHitTask']  || tracker.get('sendHitTask');
	
	tracker.set('sendHitTask', send);


	function onSend(hit, savedId){

		if(!savedId) {
			inbox++;
			savedId = canSave(hit) && save(hit);
		}

		if( !savedId || (!outbox && lock(savedId)) ){

			var timeout = timing.setTimeout(function(){
				timeout = timeout && onDone(false);
			}, transportTimeout);

			var onSuccess = hit.get('hitCallback') || NOP;
			
			hit.set('hitCallback', function(){
				if(timeout) timeout = timing.clearTimeout(timeout);
				if(savedId) remove(savedId);
				if(onSuccess){
					onDone(true);
					onSuccess();
					onSuccess = UNDEFINED;
				}
			}, true); // for this hit only

			inbox--;
			outbox++;
			transport(hit);
		}
	}

	function onDone(success){
		outbox--;
		return success && load()
			|| timing.setTimeout(load, transportTimeout);
	}

	function send(hit, savedId){
		onSend(hit, savedId);
	}

	function canSave(hit){

		var pattern;
		var matched = false;
		var next = patterns.length;
		
		while(!matched && next--){

			pattern = patterns[next];
			matched = true;

			for(var attr in pattern){
				if(hit.get(attr) != pattern[attr]){
					matched = false;
					continue;	
				}
			}
		}

		return matched && pattern;
	}

	function save(hit){
		var savedId = 'hit' + currentTime();
		var payload = hit.get('hitPayload');
		var saved = storage.set(savedId, payload, ttl(storageTimeout) );
		return saved && savedId;
	}

	function load(){

		if(outbox>0) return;

		var keys = storage.index();
		var offset = 0;

		while(offset<keys.length){

			var key = keys[offset++];
			var match = key.match(/^hit(\d+)$/);

			if(match) {

				var creationTime = parseInt(match[1], 10);
				var queueTime = currentTime() - creationTime;

				var savedId = key;
				var payload = storage.get(savedId);

				var hit = model({
					'transport'	   : transportMethod,
					'transportUrl' : transportUrl,
					'hitPayload'   : payload + '&qt=' + queueTime
				});

				send(hit, savedId);
				continue;
			}	
		}	
	}

	function lock(savedId){
		var lockId = savedId + 'lock';
		if(storage.get(lockId)) return false;
		storage.set(lockId, 1, ttl(transportTimeout) );
		return true;
	}

	function remove(savedId){
		storage.deleteKey(savedId);
		storage.deleteKey(savedId + 'lock');
	}

	function model(data){
		return {
			'get'  : function(attr){ return data[attr]; },
			'set'  : function(attr, value){ data[attr] = value; }
		}
	}

	function currentTime(){
		var date = new timing.Date();
    	return date.getTime(); 
	}

	function ttl(time){
		return { TTL : time };
	}
}

module.exports = salo;