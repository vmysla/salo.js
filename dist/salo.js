function salo(tracker, options){

	var UNDEFINED;

	var NOP = function(){};

	var TIME_1_SECOND  = 1000;
	var TIME_5_SECONDS = TIME_1_SECOND * 5;
	var TIME_1_MINUTE  = TIME_1_SECOND * 60;
	var TIME_1_HOUR    = TIME_1_MINUTE * 60;
	var TIME_3_HOURS   = TIME_1_HOUR   * 3;

	var api = {
		'enable'  : enable,
		'disable' : disable,
		'watch'	  : watch
	}
	
	var patterns =  [{	
		'useSalo'		: true, 
		'useBeacon'		: false,
		'hitCallback'	: UNDEFINED, 
		'transport'		: UNDEFINED 
	}];

	var inbox, outbox;

	options = options || {};

	var storageTimeout   = options['storageTimeout']   || TIME_3_HOURS;
	var transportTimeout = options['transportTimeout'] || TIME_5_SECONDS;

	var timing    = options['timing']       || window;
	var storage   = options['storage']      || window['simpleStorage'];
	
	var gaBuildHit = tracker.get('buildHitTask');
	var gaSendHit  = tracker.get('sendHitTask');

	var saloBuildHit = safe(build);
	var saloSendHit  = safe(send);

	enable();

	function watch(pattern){ 
		patterns.push(pattern);
	}
	
	function enable(fn){

	  	inbox  = 0;
	  	outbox = 0;

		tracker.set('buildHitTask', saloBuildHit );
		tracker.set('sendHitTask', saloSendHit );		
	}

	function disable(error){

		tracker.set('buildHitTask', gaBuildHit );
		tracker.set('sendHitTask', saloSendHit );

		if(error) {
			tracker.send('exception', {
	        	'exDescription' : '[salo.js]' + ' ' + error.message, 
	        	'nonInteraction': true,
	        	'exFatal'       : false
	    	});
		}
	}

	function build(hit){

		if( hit.get('hitType') != 'salo' ){

			gaBuildHit(hit);
		} 
		else {

			var saloId, hitStorageKey, hitPayload, hitDateTime, hitQueueTime;

			if( saloId = /^salo(\d+)$/i.exec( hit.get('saloId') ) ){
				hitStorageKey = saloId[0];
				hitDateTime   = saloId[1];
				hitPayload    = storage.get( storageKey );
				hitQueueTime  = currentTime() - hitDateTime;
				hit.set('hitPayload', hitPayload + '&qt=' + hitQueueTime);
				saloSendHit(hit, hitStorageKey);
			}
		}		
	}


	function send(hit, hitStorageKey){

		if(!hitStorageKey){

			hitStorageKey = trySaveHitToStorage(hit);
			inbox++;	
		}

		if( !hitStorageKey || !outbox && tryLockHitFromStorage(hitStorageKey) ){

			var timeoutId = timing.setTimeout(onTransportTimeout, transportTimeout);
			var onHitCallback = hit.get('hitCallback') || NOP;
			var isTransportTimeoutOrCompleted = false;

			hit.set('hitCallback', onTransportCompleted, true);

			inbox--;
			outbox++;
			gaSendHit(hit);
			
			
			function onTransportTimeout(){

				if(!isTransportTimeoutOrCompleted){

					timeoutId = timing.setTimeout(tryLoadNextHitFromStorage, transportTimeout);
					isTransportTimeoutOrCompleted = true;
					outbox--;
				}
			}

			function onTransportCompleted(){

				if(timeoutId) {

					timing.clearTimeout(timeoutId);
				}

				if(hitStorageKey) {

					removeHitFromStorage(hitStorageKey);
				}

				if(!isTransportTimeoutOrCompleted){

					isTransportTimeoutOrCompleted = true;
					outbox--;
				}

				if(onHitCallback) {

					try { 
						onHitCallback(); 	
					} catch(e){
						// ignored
					};

					onHitCallback = UNDEFINED;
				}

				tryLoadNextHitFromStorage();
			}
				
		}
	}

	function testIfHitShouldBeSaved(hit){

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

		return matched;
	}

	function trySaveHitToStorage(hit){

		if( testIfHitShouldBeSaved(hit) ) {

			var hitStorageKey = 'salo' + currentTime();
			var hitPayload    = hit.get('hitPayload');
			return storage.set(hitStorageKey, hitPayload, ttl(storageTimeout) ) 
				&& hitStorageKey;
		}

		return false;
	}


	function tryLoadNextHitFromStorage(){

		if(outbox>0) return;

		var keys = storage.index();
		var offset = 0;

		while(offset<keys.length){

			var key = keys[offset++];
			var match = key.match(/^salo(\d+)$/);

			if(match) {
				var match = key.match(/^salo(\d+)$/);
				var creationTime = parseInt(match[1], 10);
				var queueTime = currentTime() - creationTime;

				var saloId  = key;

				var loaded = tracker.send({
						'hitType'      : 'salo',
						'saloId'       : saloId,
						'queueTime'    : queueTime //queueTime
				});

				if(loaded) return true;
			}
		}	
	}

	function tryLockHitFromStorage(saloId){
		var lockId = saloId + 'lock';
		if(storage.get(lockId)) return false;
		storage.set(lockId, 1, ttl(transportTimeout) );
		return true;
	}

	function removeHitFromStorage(saloId){
		storage.deleteKey(saloId);
		storage.deleteKey(saloId + 'lock');
	}

	function currentTime(){
		var date = new timing.Date();
    	return date.getTime(); 
	}

	function ttl(time){
		return { TTL : time };
	}



	function safe(fn){

		function proxy(arg0, arg1){

			try { 

				fn(arg0, arg1); 
			} 
			catch(e) { 

				disable(e); 
			}
		}
		
		return proxy;
	}
	
	return api;
}

if (typeof exports !== 'undefined') {
        module.exports = salo;
} 