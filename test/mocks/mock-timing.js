module.exports = MockTiming;

	function MockTiming(){
		
		var timing = this;

		timing.TIME_0_SECONDS = 0;
		timing.TIME_1_SECOND  = 1000;
		timing.TIME_5_SECONDS = timing.TIME_1_SECOND * 5;
		timing.TIME_1_MINUTE  = timing.TIME_1_SECOND * 60;
		timing.TIME_2_MINUTES = timing.TIME_1_MINUTE * 2;
		timing.TIME_5_MINUTES = timing.TIME_1_MINUTE * 5;
		timing.TIME_1_HOUR    = timing.TIME_1_MINUTE * 60;
		timing.TIME_3_HOURS   = timing.TIME_1_HOUR   * 3;

		timing.debug = false;
		timing.time = 0;
		timing.timeouts = [];

		timing.reset = function(){
			timing.debug = false;
			timing.time = 0;
			timing.timeouts = [];
		}

		timing.Date = function Date(){ 
			this.getTime = function getTime(){ return timing.time; }
		}


		timing.setTimeout = function setTimeout(fn, timeout){
			var nextId = timing.timeouts.push({
				fn : fn,
				timeout   : timeout,
				created   : timing.time,
				cleared   : false,
				trigger   : timing.time + timeout,
				triggered : false
			});
			var id = nextId-1;
			if(timing.debug) console.log('timing.setTimeout', id, fn, timeout);
			return id;
		}

		timing.clearTimeout = function clearTimeout(id){
			if(timing.debug) console.log('timing.clearTimeout', id);
			timing.timeouts[id].cleared = true;
		}

		timing.setTime = function addTime(value){
			timing.time = value;
		}

		timing.addTime = function addTime(delta){
			timing.time += delta;
			for(var i in timing.timeouts){
				var timeout = timing.timeouts[i];
				if(!timeout.cleared && !timeout.triggered){
					if(timing.time>=timeout.trigger){
						timeout.triggered = true;
						timeout.fn();
						return;
					}
				}
			}
		}
	}