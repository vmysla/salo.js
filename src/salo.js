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

	var enabled, inbox, outbox;

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

		enabled = true;

		tracker.set('buildHitTask', saloBuildHit );
		tracker.set('sendHitTask', saloSendHit );	

		timing.setTimeout(tryLoadNextHitFromStorage, 1);	
	}

	function disable(error){

		enabled = false;

		if(error) {
			tracker.send('exception', {
	        	'exDescription' : '[salo.js]' + ' ' + error.message, 
	        	'nonInteraction': true,
	        	'exFatal'       : false
	    	});
		}
	}

	function build(hit){


		if( enabled && hit.get('hitType') == 'salo' ){

			var saloId, hitStorageKey, hitPayload, hitDateTime, hitQueueTime;

			if( saloId = /^salo(\d+)$/i.exec( hit.get('saloId') ) ){
				hitStorageKey = saloId[0];
				hitDateTime   = saloId[1];
				hitPayload    = storage.get( hitStorageKey );
				hitQueueTime  = currentTime() - hitDateTime;

				hit.set('transport', 'image', true);
				hit.set('hitPayload', hitPayload + '&qt=' + hitQueueTime, true);
			}
		} 
		else {

			gaBuildHit(hit);
		}	
	}


	function send(hit){

		if(!enabled){
			gaSendHit(hit);
		}

		var hitStorageKey = hit.get('saloId');

		if(!hitStorageKey){

			inbox++;
			hitStorageKey = trySaveHitToStorage(hit);
			
			if(hitStorageKey){
				return timing.setTimeout(tryLoadNextHitFromStorage, 1);
			}
		}

		if( !hitStorageKey || ( !outbox && tryLockHitFromStorage(hitStorageKey) ) ){

			var timeoutId, onHitCallback, isTransportTimeoutOrCompleted;
			
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
					timeoutId = false;
				}

				if(hitStorageKey) {

					removeHitFromStorage(hitStorageKey);
				}

				if(!isTransportTimeoutOrCompleted){

					timing.setTimeout(tryLoadNextHitFromStorage, 1);
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
			}

			isTransportTimeoutOrCompleted = false;
			onHitCallback = hit.get('hitCallback');
			hit.set('hitCallback', onTransportCompleted, true);
			timeoutId = timing.setTimeout(onTransportTimeout, transportTimeout);
			
			inbox--;
			outbox++;
			gaSendHit(hit);
			return true;
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

			var storageKey = keys[offset++];
			var match = storageKey.match(/^salo(\d+)$/);

			if(match) {
				return tracker.send({
					'hitType' : 'salo',
					'saloId'  : storageKey
				});
			}
		}
	}

	function tryLockHitFromStorage(saloId){
		var lockId = saloId + 'lock';
		if( storage.get(lockId) ) return false;
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

				return fn(arg0, arg1); 
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