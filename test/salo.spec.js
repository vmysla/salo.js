describe('salo', function(){

	var mockTiming  = require('./mocks/mock-timing.js');
	var mockTracker = require('./mocks/mock-tracker.js');
	var mockStorage = require('./mocks/mock-storage.js');
	var mockHelper  = require('./helpers/mock-helper.js');	

	var salo = require('../src/salo.js');
	var test = mockHelper(salo, mockTiming, mockTracker, mockStorage);


	it('should not do anything when nothing was sent', function(){
		test(function(test, saved, reported, err){
			expect( saved().len ).toBe(0, err('Nothing should be saved as nothing was sent'));
			expect( reported().len ).toBe(0, err('Nothing should be reported as nothing was sent'));
		});
	});


	it('should not do anything when regular event was sent', function(){
		test(function(test, saved, reported, err){
			test.send('event/normal-1').deliver();
			expect( saved().len ).toBe(0, err('Nothing should be saved as normal event was sent'));
			expect( reported().all ).toBe("event/normal-1", err('Normal event should be reported'));
		});
	});


	it('should not do anything when regular events were sent', function(){

		test(function(test, saved, reported, err){
			test.send('event/normal-1').deliver();
			test.after('1 second');
			test.send('event/normal-2').deliver();
			expect( saved().len ).toBe(0, err('Nothing should be saved as normal events were sent'));
			expect( reported().all ).toBe("event/normal-1,event/normal-2", err('Normal event should be reported is same order as sent'));
		});

		test(function(test, saved, reported, err){
			test.send('event/normal-1');
			test.after('1 second');
			test.send('event/normal-2');
			test.deliver('event/normal-1');
			test.deliver('event/normal-2');
			expect( saved().len ).toBe(0, err('Nothing should be saved as normal events were sent'));
			expect( reported().all ).toBe("event/normal-1,event/normal-2", err('Normal event should be reported is same order as sent'));
		});

		test(function(test, saved, reported, err){
			test.send('event/normal-1');
			test.after('1 second');
			test.send('event/normal-2');
			test.deliver('event/normal-2');
			test.deliver('event/normal-1');
			expect( saved().len ).toBe(0, err('Nothing should be saved as normal events were sent'));
			expect( reported().all ).toBe("event/normal-2,event/normal-1", err('Normal event can be delivered in any order'));
		});

	});
		

	it('should not do anything when regular events were sent but hitCallback was executed twice', function(){
		test(function(test, saved, reported, err){
			test.temp.set('hitCallbackExecutions', 0 )
			test.send('event/normal-1', function onHitCallback(){ 
				test.temp.set('hitCallbackExecutions', test.temp.get('hitCallbackExecutions') + 1 ); 
			});
		})
		.after('1 second', function(test, saved, reported, err){
			test.send('event/normal-2');
			expect( saved().len ).toBe(0, err('Nothing should be saved as normal events were sent'));
			expect( reported().len ).toBe(0, err('Nothing should be reported because none of events was delivered'));
			expect( test.temp.get('hitCallbackExecutions') ).toBe(0, err('hitCallback should not be executed none of events was delivered'));
		})
		.after('1 second', function(test, saved, reported, err){
			test.deliver('event/normal-1');	
			expect( saved().len ).toBe(0, err('Nothing should be saved as normal events were sent'));
			expect( reported().len ).toBe(1, err('One event was reported because it is delivered'));
			expect( test.temp.get('hitCallbackExecutions') ).toBe(1, err('hitCallback should be executed once as one event was delivered'));
		})
		.after('1 second', function(test, saved, reported, err){
			test.deliver('event/normal-1');
			expect( saved().len ).toBe(0, err('Nothing should be saved as normal events were sent'));
			expect( test.temp.get('hitCallbackExecutions') ).toBe(1, err('hitCallback should not be executed twice for same event'));
		})
		.after('1 minute', function(test, saved, reported, err){
			test.deliver('event/normal-2');
			expect( saved().len ).toBe(0, err('Nothing should be saved as normal events were sent'));
			expect( test.temp.get('hitCallbackExecutions') ).toBe(1, err('hitCallback should be executed only for first event'));
		});
	});

	
	it('should not affect order nor priority of reporting for normal hits', function(){
		
		test(function(test, saved, reported, err){
			test.send('event/normal-1').deliver();
			test.after('1 second');
			test.send('event/salo-1').deliver();
			expect( saved().len ).toBe(0, err('Nothing should be saved as both events were delivered'));
			expect( reported().all ).toBe("event/normal-1,event/salo-1", err('Both events were delivered'));
		});

		test(function(test, saved, reported, err){
			test.send('event/normal-1');
			expect( saved().len ).toBe(0, err('Normal should not be saved'));
		})
		.after('1 second', function(test, saved, reported, err){
			test.send('event/salo-1');
			expect( saved().len ).toBe(1, err('Matched events should be saved'));
		}).after('1 second', function(test, saved, reported, err){
			test.deliver('event/normal-1');
			test.deliver('event/salo-1');
		}).after('1 second', function(test, saved, reported, err){
			expect( saved().len ).toBe(0,err('Nothing should be saved as all events were sent'));
			expect( reported().all ).toBe("event/normal-1,event/salo-1", err('Both events should be reported is same order as sent'));
		});

		test(function(test, saved, reported, err){	
			test.send('event/normal-1');
			test.send('event/salo-1');
			expect( saved().len ).toBe(1, err('Only matched event should be saved'));

			test.after('1 second');
			expect( saved().len ).toBe(1, err('Matched event should be queued until reporting for normal event is in progress'));

			test.after('1 second');
			test.send('event/normal-2');
			expect( saved().len ).toBe(1, err('Matched event should be queued until reporting for normal events is in progress'));
			expect( reported().len ).toBe(0, err('None of events was delivered'));

			test.deliver('event/normal-1');
			expect( saved().len ).toBe(1, err('Matched event should be queued until reporting for any of normal events is in progress'));
			expect( reported().len ).toBe(1, err('First normal event was delivered'));

			test.deliver('event/normal-2');
			expect( saved().len ).toBe(1, err('Matched event should be queued until reporting for any of normal events is in progress'));
			expect( reported().len ).toBe(2, err('Both normal events were delivered'));

			test.deliver('event/salo-1');
			expect( saved().len ).toBe(0, err('Matched event should be removed from storage because it was sent and delivered'));
			expect( reported().len ).toBe(3, err('All three events were delivered'));
		});	

		test(function(test, saved, reported, err){
		
			test.after('1 second');
			test.send('event/normal-1');
			
			test.after('1 second');
			test.send('event/salo-1');

			test.after('1 second');
			test.send('event/normal-2');
			
			test.after('1 minute');
			test.deliver('event/normal-1');
			test.deliver('event/salo-1');
			test.deliver('event/normal-2');

			expect( saved().len ).toBe(0, err('Everything was delivered'));
			expect( reported().all ).toBe('event/normal-1,event/normal-2,event/salo-1', err('Marked event should be sent after normal events'));
		});	

		test(function(test, saved, reported, err){
		
				test.send('event/normal-1');

				test.after('1 second');
				test.send('event/salo-1');

				test.after('1 second');
				test.send('event/normal-2');
				
				test.after('1 minute');
				test.deliver('event/normal-1');

				test.after('1 minute');
				test.deliver('event/salo-1');

				test.after('1 minute');
				test.deliver('event/normal-2');

				expect( saved().len ).toBe(0, err('Everything was delivered'));
				expect( reported().all ).toBe('event/normal-1,event/salo-1,event/normal-2', err('Marked event should be sent when there is no normal events which are sent now'));
		});	
	});


	it('should correctly handle reporting and expiration temeouts', function(){

		test(function(test, saved, reported, err){
			test.send('event/salo-1');
			test.after('5 hours');
			expect( saved().len ).toBe(0, err('Matched but not delivered event should be removed from storage by timeout'));
			expect( reported().len ).toBe(0, err('Expired event cannot be reported'));
		});

		test(function(test, saved, reported, err){

			test.send('event/normal-1');

			test.after('1 second');
			test.send('event/salo-1');
			
			test.after('1 hour');
			test.deliver('event/normal-1');
			
			test.after('1 hour');
			expect( saved().len ).toBe(0, err('Matched but unsent event should be removed from storage by timeout'));
			expect( reported().len ).toBe(1, err('Expired event cannot be reported'));
		});
	});


	it('should load and send all saved when possible', function(){
		test(function(test, saved, reported, err){

			test.send('event/normal-1');

			test.after('1 second');
			test.send('event/salo-1').deliver();
			
			test.after('1 second');
			test.send('event/salo-2').deliver();

			test.after('1 second');
			test.send('event/salo-3').deliver();

			expect( saved().len ).toBe(3, err('Matched events should be saved while reporting for normal events is in progress'));
			expect( reported().len ).toBe(0, err('Matched events are blocked until normal events are not sent'));

			test.after('1 second');
			test.deliver('event/normal-1');
			
			expect( saved().len ).toBe(0, err('Delivered events should be removed from storage'));
			expect( reported().len ).toBe(4, err('Everything is reported'));
			expect( reported().all ).toBe("event/normal-1,event/salo-1,event/salo-2,event/salo-3", err('Marked events should be sent in historical order'));
		});
	});

})