module.exports = MockStorage;

	function MockStorage(timing){
		
		var storage = this;

		storage.debug = false;
		storage.enabled  = true;
		storage.data = {};
		storage.saved = [];
		storage.deleted = [];


		storage.reset = function(){
			storage.debug = false;
			storage.enabled  = true;
			storage.data = {};
			storage.saved = [];
			storage.deleted = [];
		}

		storage.disable = function(){
			storage.enabled  = false;
		};

		storage.enable = function(){
			storage.enabled  = true;
		};

		storage.get = function MockStorage_get(key){
			if(storage.enabled){
				return storage.data[key];	
			} 
		};

		storage.set = function MockStorage_set(key, value, options){
			if(storage.debug) console.log('storage.set', key, value, options);
			if(storage.enabled) {
				storage.saved.push(key+'='+value);
				storage.data[key] = value;
				timing.setTimeout(function deleteKey(){
					storage.deleteKey(key);	
				}, options.TTL);
				return true;
			}
		};

		storage.index = function(key){
			var keys = [];
			for(var key in storage.data) keys.push(key);
			return keys;
		};

		storage.deleteKey = function(key){
			if(storage.debug) console.log('storage.deleteKey', key);
			if(storage.enabled) {
				storage.deleted.push(key);
				delete storage.data[key];
			}
		};


		storage.stored = function(){
			var hits = [];
			var locks = 0;
			for(var key in storage.data) {
				if(key.indexOf('lock')<0) { hits.push(key); } else { locks++; }
			}
			return {
				len  : hits.length,
				all : hits.join(','),
				locks : locks
			}
		}
	}