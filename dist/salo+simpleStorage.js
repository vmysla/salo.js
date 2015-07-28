/* jshint browser: true */
/* global define: false */

// AMD shim
(function(root, factory) {

    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports !== 'undefined') {
        module.exports = factory();
    } else {
        root.simpleStorage = factory();
    }

}(this, function() {

    'use strict';

    var
        VERSION = '0.1.3',

        /* This is the object, that holds the cached values */
        _storage = false,

        /* How much space does the storage take */
        _storage_size = 0,

        _storage_available = false,

        _ttl_timeout = null;

    // This method might throw as it touches localStorage and doing so
    // can be prohibited in some environments
    function _init() {

        // If localStorage does not exist, the following throws
        // This is intentional
        window.localStorage.setItem('__simpleStorageInitTest', 'tmpval');
        window.localStorage.removeItem('__simpleStorageInitTest');

        // Load data from storage
        _load_storage();

        // remove dead keys
        _handleTTL();

        // start listening for changes
        _setupUpdateObserver();

        // handle cached navigation
        if ('addEventListener' in window) {
            window.addEventListener('pageshow', function(event) {
                if (event.persisted) {
                    _reloadData();
                }
            }, false);
        }

        _storage_available = true;
    }

    /**
     * Sets up a storage change observer
     */
    function _setupUpdateObserver() {
        if ('addEventListener' in window) {
            window.addEventListener('storage', _reloadData, false);
        } else {
            document.attachEvent('onstorage', _reloadData);
        }
    }

    /**
     * Reload data from storage when needed
     */
    function _reloadData() {
        try {
            _load_storage();
        } catch (E) {
            _storage_available = false;
            return;
        }
        _handleTTL();
    }

    function _load_storage() {
        var source = localStorage.getItem('simpleStorage');

        try {
            _storage = JSON.parse(source) || {};
        } catch (E) {
            _storage = {};
        }

        _storage_size = _get_storage_size();
    }

    function _save() {
        try {
            localStorage.setItem('simpleStorage', JSON.stringify(_storage));
            _storage_size = _get_storage_size();
        } catch (E) {
            return E;
        }
        return true;
    }

    function _get_storage_size() {
        var source = localStorage.getItem('simpleStorage');
        return source ? String(source).length : 0;
    }

    function _handleTTL() {
        var curtime, i, len, expire, keys, nextExpire = Infinity,
            expiredKeysCount = 0;

        clearTimeout(_ttl_timeout);

        if (!_storage || !_storage.__simpleStorage_meta || !_storage.__simpleStorage_meta.TTL) {
            return;
        }

        curtime = +new Date();
        keys = _storage.__simpleStorage_meta.TTL.keys || [];
        expire = _storage.__simpleStorage_meta.TTL.expire || {};

        for (i = 0, len = keys.length; i < len; i++) {
            if (expire[keys[i]] <= curtime) {
                expiredKeysCount++;
                delete _storage[keys[i]];
                delete expire[keys[i]];
            } else {
                if (expire[keys[i]] < nextExpire) {
                    nextExpire = expire[keys[i]];
                }
                break;
            }
        }

        // set next check
        if (nextExpire != Infinity) {
            _ttl_timeout = setTimeout(_handleTTL, Math.min(nextExpire - curtime, 0x7FFFFFFF));
        }

        // remove expired from TTL list and save changes
        if (expiredKeysCount) {
            keys.splice(0, expiredKeysCount);

            _cleanMetaObject();
            _save();
        }
    }

    function _setTTL(key, ttl) {
        var curtime = +new Date(),
            i, len, added = false;

        ttl = Number(ttl) || 0;

        // Set TTL value for the key
        if (ttl !== 0) {
            // If key exists, set TTL
            if (_storage.hasOwnProperty(key)) {

                if (!_storage.__simpleStorage_meta) {
                    _storage.__simpleStorage_meta = {};
                }

                if (!_storage.__simpleStorage_meta.TTL) {
                    _storage.__simpleStorage_meta.TTL = {
                        expire: {},
                        keys: []
                    };
                }

                _storage.__simpleStorage_meta.TTL.expire[key] = curtime + ttl;

                // find the expiring key in the array and remove it and all before it (because of sort)
                if (_storage.__simpleStorage_meta.TTL.expire.hasOwnProperty(key)) {
                    for (i = 0, len = _storage.__simpleStorage_meta.TTL.keys.length; i < len; i++) {
                        if (_storage.__simpleStorage_meta.TTL.keys[i] == key) {
                            _storage.__simpleStorage_meta.TTL.keys.splice(i);
                        }
                    }
                }

                // add key to keys array preserving sort (soonest first)
                for (i = 0, len = _storage.__simpleStorage_meta.TTL.keys.length; i < len; i++) {
                    if (_storage.__simpleStorage_meta.TTL.expire[_storage.__simpleStorage_meta.TTL.keys[i]] > (curtime + ttl)) {
                        _storage.__simpleStorage_meta.TTL.keys.splice(i, 0, key);
                        added = true;
                        break;
                    }
                }

                // if not added in previous loop, add here
                if (!added) {
                    _storage.__simpleStorage_meta.TTL.keys.push(key);
                }
            } else {
                return false;
            }
        } else {
            // Remove TTL if set
            if (_storage && _storage.__simpleStorage_meta && _storage.__simpleStorage_meta.TTL) {

                if (_storage.__simpleStorage_meta.TTL.expire.hasOwnProperty(key)) {
                    delete _storage.__simpleStorage_meta.TTL.expire[key];
                    for (i = 0, len = _storage.__simpleStorage_meta.TTL.keys.length; i < len; i++) {
                        if (_storage.__simpleStorage_meta.TTL.keys[i] == key) {
                            _storage.__simpleStorage_meta.TTL.keys.splice(i, 1);
                            break;
                        }
                    }
                }

                _cleanMetaObject();
            }
        }

        // schedule next TTL check
        clearTimeout(_ttl_timeout);
        if (_storage && _storage.__simpleStorage_meta && _storage.__simpleStorage_meta.TTL && _storage.__simpleStorage_meta.TTL.keys.length) {
            _ttl_timeout = setTimeout(_handleTTL, Math.min(Math.max(_storage.__simpleStorage_meta.TTL.expire[_storage.__simpleStorage_meta.TTL.keys[0]] - curtime, 0), 0x7FFFFFFF));
        }

        return true;
    }

    function _cleanMetaObject() {
        var updated = false,
            hasProperties = false,
            i;

        if (!_storage || !_storage.__simpleStorage_meta) {
            return updated;
        }

        // If nothing to TTL, remove the object
        if (_storage.__simpleStorage_meta.TTL && !_storage.__simpleStorage_meta.TTL.keys.length) {
            delete _storage.__simpleStorage_meta.TTL;
            updated = true;
        }

        // If meta object is empty, remove it
        for (i in _storage.__simpleStorage_meta) {
            if (_storage.__simpleStorage_meta.hasOwnProperty(i)) {
                hasProperties = true;
                break;
            }
        }

        if (!hasProperties) {
            delete _storage.__simpleStorage_meta;
            updated = true;
        }

        return updated;
    }

    ////////////////////////// PUBLIC INTERFACE /////////////////////////

    try {
        _init();
    } catch (E) {}

    return {

        version: VERSION,

        canUse: function() {
            return !!_storage_available;
        },

        set: function(key, value, options) {
            if (key == '__simpleStorage_meta') {
                return false;
            }

            if (!_storage) {
                return false;
            }

            // undefined values are deleted automatically
            if (typeof value == 'undefined') {
                return this.deleteKey(key);
            }

            options = options || {};

            // Check if the value is JSON compatible (and remove reference to existing objects/arrays)
            try {
                value = JSON.parse(JSON.stringify(value));
            } catch (E) {
                return E;
            }

            _storage[key] = value;

            _setTTL(key, options.TTL || 0);

            return _save();
        },

        get: function(key) {
            if (!_storage) {
                return false;
            }

            if (_storage.hasOwnProperty(key) && key != '__simpleStorage_meta') {
                // TTL value for an existing key is either a positive number or an Infinity
                if (this.getTTL(key)) {
                    return _storage[key];
                }
            }
        },

        deleteKey: function(key) {

            if (!_storage) {
                return false;
            }

            if (key in _storage) {
                delete _storage[key];

                _setTTL(key, 0);

                return _save();
            }

            return false;
        },

        setTTL: function(key, ttl) {
            if (!_storage) {
                return false;
            }

            _setTTL(key, ttl);

            return _save();
        },

        getTTL: function(key) {
            var ttl;

            if (!_storage) {
                return false;
            }

            if (_storage.hasOwnProperty(key)) {
                if (_storage.__simpleStorage_meta &&
                    _storage.__simpleStorage_meta.TTL &&
                    _storage.__simpleStorage_meta.TTL.expire &&
                    _storage.__simpleStorage_meta.TTL.expire.hasOwnProperty(key)) {

                    ttl = Math.max(_storage.__simpleStorage_meta.TTL.expire[key] - (+new Date()) || 0, 0);

                    return ttl || false;
                } else {
                    return Infinity;
                }
            }

            return false;
        },

        flush: function() {
            if (!_storage) {
                return false;
            }

            _storage = {};
            try {
                localStorage.removeItem('simpleStorage');
                return true;
            } catch (E) {
                return E;
            }
        },

        index: function() {
            if (!_storage) {
                return false;
            }

            var index = [],
                i;
            for (i in _storage) {
                if (_storage.hasOwnProperty(i) && i != '__simpleStorage_meta') {
                    index.push(i);
                }
            }
            return index;
        },

        storageSize: function() {
            return _storage_size;
        }
    };

}));
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