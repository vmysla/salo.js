/// @usage 
/// 
/// test('Test scenario description', function(test, saved, reported, err){
/// 	
/// 	// test.tracker.debug = true;
/// 	// test.timing.debug = true;
/// 	// test.storage.debug = true;
/// 		
/// 	// test.send(arg0, arg1)
/// 	//	arg0 - category/action pair to sent
/// 	//  arg1 - callback function to execute when hit was delivered
/// 	//  returns hit object with deliver() method
/// 	
/// 	test.send('debug/jasmine', function(){});
/// 	
/// 	// saved().len - count of keys saved
/// 	// saved().all - names of keys saved
/// 	
/// 	expect( saved().len ).toBe(0, err('Nothing should be saved as events dont use salo'));
/// 	
/// 	
/// 	// reported().len - count of delivered events
/// 	// reported().all - category/action pairs of delivered events
/// 	
/// 	expect( reported().len ).toBe(0, err('Nothing should be reported as nothing was sent'));
/// 	
/// })
/// .after('1 second', function(test, saved, reported, err){
/// 
///		test.deliver('debug/jasmine');
///		
/// 	expect( saved().len ).toBe(0, err('Nothing should be saved as events dont use salo'));
/// 	expect( reported().len ).toBe(1, err('One event was delivered therefore it was reported'));
/// 	
/// })
/// .done();
/// 


module.exports = function MockHelper_proxy(salo, MockTiming, MockTracker, MockStorage){

	return function test(fn){		

		var mockTiming = new MockTiming();
		var mockTracker = new MockTracker(mockTiming);
		var mockStorage = new MockStorage(mockTiming);
		
		var instance = salo( mockTracker, { 
			'storage' : mockStorage, 
			'timing'  : mockTiming,
			'transportTimeout' : mockTiming.TIME_5_SECONDS,
			'storageTimeout'   : mockTiming.TIME_5_MINUTES
		});

		var test = {

			temp    : {
				'data': {}, 
				'get' : function(attr){ return test.temp.data[attr]; },
				'set' : function(attr, value){ test.temp.data[attr] = value; }
			},

			salo    : instance,
			tracker : mockTracker,
			storage : mockStorage,
			timing  : mockTiming,
			fakeEvents : {},

			after            : function(){},
			sendFakeEvent    : function(){},
			deliverFakeEvent : function(){}
		};



		test.send = test.sendFakeEvent = function test_sendFakeEvent(eventCategoryLabel, hitCallback){
			var parts = eventCategoryLabel.split('/');
			var fakeEvent = { 
				hitType : 'event', 
				eventCategory : parts[0], 
				eventLabel    : parts[1], 
				useSalo : parts[1].indexOf('salo')==0 ? true : false,
				useBeacon: false,
				hitCallback : hitCallback
			}
			var result = test.fakeEvents[eventCategoryLabel] = mockTracker.send(fakeEvent);
			return result;
		}

		test.deliver = test.deliverFakeEvent = function test_deliverFakeEvent(eventCategoryLabel){
			var hitEvent = test.fakeEvents[eventCategoryLabel];
			if(!hitEvent) {
				throw new Error('Hit '+eventCategoryLabel+' wasnt sent to be delivered');
			}
			hitEvent.deliver();
		}

		test.after = function test_after(txtTime, fn){
			var parts = txtTime.split(' ');
			var offset = parseInt(parts[0],10);
			var units  = parts[1][0];
			switch(units){
				case('s') : mockTiming.addTime(offset*mockTiming.TIME_1_SECOND);
							break;
				case('m') : mockTiming.addTime(offset*mockTiming.TIME_1_MINUTE);
							break;
				case('h') : mockTiming.addTime(offset*mockTiming.TIME_1_HOUR);
							break;
			}
			if(fn)fn(test, test.storage.stored, test.tracker.reported, function (msg){
					return ( msg )
						+'\r\n'+ ( 'test.storage.stored='+ JSON.stringify(test.storage.stored()) )
						+'\r\n'+ ( 'test.tracker.reported='+ JSON.stringify(test.tracker.reported()) )
						+'\r\n'+ ( !test.storage.debug ? '' : 'test.storage.data='+ JSON.stringify(test.storage.data) )
						+'\r\n'+ ( !test.storage.debug ? '' : 'test.storage.saved='+ JSON.stringify(test.storage.saved) )
						+'\r\n'+ ( !test.storage.debug ? '' : 'test.storage.deleted='+ JSON.stringify(test.storage.deleted) )
						+'\r\n'+ ( !test.tracker.debug ? '' : 'test.tracker.data='+ JSON.stringify(test.tracker.data) )
						+'\r\n'+ ( !test.tracker.debug ? '' : 'test.tracker.sent='+ JSON.stringify(test.tracker.sent) )
						+'\r\n'+ ( !test.tracker.debug ? '' : 'test.tracker.succeded='+ JSON.stringify(test.tracker.succeded) )
						+'\r\n'+ ( !test.timing.debug  ? '' : 'test.timing.timeouts='+ JSON.stringify(test.timing.timeouts, true, 2) );
				});
			return test;
		}
		
		test.done = function(){
			test.timing.reset();
			test.tracker.reset();
			test.storage.reset();
		}


		test.debug = function(val){
			console.debug('================');

			test.storage.debug = val;
			test.tracker.debug = val;
		}
				
		return test.after('0 seconds', fn);
	}
}
