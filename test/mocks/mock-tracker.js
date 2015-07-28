module.exports = MockTracker;

function MockTracker(timing){

	var tracker = this;

	tracker.debug = false;
	tracker.data = {};
	tracker.enabled  = true;
	tracker.sent = [];
	tracker.succeded = [];
	tracker.errors = [];
	tracker.will_succeed = {};
	tracker.was_sent = {};
	tracker.hitCallbacks = {};

	tracker.reset = function(){
		tracker.debug = false;
		tracker.data = {};
		tracker.enabled  = true;
		tracker.sent = [];
		tracker.succeded = [];
		tracker.will_succeed = {};
		tracker.was_sent = {};
		tracker.hitCallbacks = {};
	}

	tracker.disable = function(){
		tracker.enabled  = false;
	};

	tracker.enable = function(){
		tracker.enabled  = true;
	};

	tracker.get = function MockTracker_get(key){
		return tracker.data[key];
	};

	tracker.set = function MockTracker_set(key, value){
		return tracker.data[key] = value;
	};

	tracker.data['sendHitTask'] = 
	tracker.sendHitTask = function(hit){
		var pl = hit.get('hitPayload').replace(/&qt=.*$/ig,'');
		if(tracker.debug) console.log('tracker.sendHitTask', pl, tracker.will_succeed[pl], tracker.was_sent[pl], hit.get('hitCallback').toString() );
		
		if(tracker.will_succeed[pl]){
			tracker.succeded.push(pl.replace(/event=/ig,''));
			var cb = hit.get('hitCallback');
			if(cb) cb();
		} else {
			tracker.was_sent[pl] = hit.get('hitCallback');
		}
	};

	tracker.send = function(data){

		var eventCategoryLabel = data.eventCategory+'/'+data.eventLabel;

		if(tracker.debug) console.log('tracker.send', eventCategoryLabel, data.hitCallback ? '(+hitCallback)' : '');	

		data.hitPayload = "event="+eventCategoryLabel;

		var hit = {
			'data': data, 
			'get' : function(attr){ return data[attr]; },
			'set' : function(attr, value){ data[attr] = value; }
		}

		if(tracker.enabled) {
			tracker.was_sent[data.hitPayload] = false;
			tracker.will_succeed[data.hitPayload] = tracker.will_succeed[data.hitPayload] || false;
			tracker.sent.push(eventCategoryLabel);
			var transport = tracker.data['sendHitTask'];
			transport(hit);
		}

		return {
			deliver : function(){ 
				if(tracker.debug) console.log(tracker.will_succeed);
				if(tracker.debug) console.log(tracker.was_sent);
				if(tracker.debug) console.log('tracker.deliver', data.hitPayload, tracker.will_succeed[data.hitPayload], tracker.was_sent[data.hitPayload] );
				if(tracker.was_sent[data.hitPayload]){
					tracker.succeded.push(data.hitPayload.replace(/event=/ig,''));
					var cb = tracker.was_sent[data.hitPayload];
					if(cb) cb();
				} else {
					tracker.will_succeed[data.hitPayload]=true;
				}
			}
		}
	};

	tracker.reported = function(){
		return {
			len  : tracker.succeded.length,
			all  : tracker.succeded.join(',')
		}
	}
}