# salo.js
Google Analytics plugin that stores unsent hits on client-side until they are successfully sent.

**salo.js** implements Universal Google Analytics Web Tracking (analytics.js) [Plugins](https://developers.google.com/analytics/devguides/collection/analyticsjs/plugins) and [Tasks](https://developers.google.com/analytics/devguides/collection/analyticsjs/tasks) APIs.
Hits are saved into browser's `localStorage` with [simpleStorage.js](https://github.com/andris9/simpleStorage) module. All modern browsers (including mobile) are supported from the box, but you can use (jStorage)[http://www.jstorage.info/] to support such older browsers like IE7 or Firefox 3.

Plugin will resent hits in case if reporting has been failed, was terminated or timeouted. It will  automatically load and retry reporting of saved but unsent hits from previous pages if they are located on same domain as current. Because hits are saved in [Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/v1/) format, stored hits have all dimensions/metrics from the page where they were created and are associated with that page in GA Reporting. Loaded hits are reported in heir historical order. [QueueTime](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#qt) is used to report hits with original date/time information.

## Getting Started
Add salo.js script on all your pages:
``` html
<html>
  <head>
  	...
  	<script>
  	 	...
  	 	ga('create', 'UA-XXXXXXX', 'auto');
  		ga('send', 'pageview');
	</script>
	<!-- Put salo.js right after your GA tracking code --> 
	<script src="https://raw.githubusercontent.com/vmysla/salo.js/master/dist/salo+simplestorage+autoprovide.min.js"></script>
  ...
```
Any hit can be stored, processed and reported by `salo.js` when it has `useSalo` attribute which is set to `true`:
``` javascript
	ga('send', 'event', 'challange', 'accepted', {
        useSalo : True,
	});
...
```
This attribute can be ignored when:
* `useBeacon` is set to `true`, because it doesn't support delivery notification callbacks.
* `transport` is set, because it might construct payload in other format than Measurement Protocol.
* `hitCallback` is set, because we can't guarantee that hit wouldn't be sent too late or any other page.

When you already have a site with all the tracking on it, you might want to use `salo.js` for some of your events without changing of the existing code. This is possible. You can add own patterns of hits which you would like to be stored automatically:

``` javascript
    
    // use salo.js for all events with 'challange' as their event category:
    ga('salo:watch', {
       hitType       : 'event'
       eventCategory : 'challange',
    });
    
	ga('send', 'event', 'challange', 'accepted'); // processed by salo.js
	ga('send', 'event', 'game', 'started');
	ga('send', 'event', 'challange', 'given'); // processed by salo.js
	
```

Regardless `salo.js` doesn't block or delay any regular hits, we recommend place it after your regular tracking code for pageviews. By this approach you would be sure that `salo.js` can't affect your GA reporting for pageview. There is no benefits for `salo.js` to be placed above the code for pageviews. Plugin will start looking for saved hits right after pageview was reported. In another hand, you may want put it between `ga('create')` and `ga('send', 'pageview')` when you want store pageviews as well:

``` html
<script src="https://raw.githubusercontent.com/vmysla/salo.js/master/dist/salo+simplestorage.min.js"></script>
<script>
	ga('create', 'UA-XXXXXXX', 'auto');
	ga('require', 'salo');
	ga('provide', 'salo', window['salo'] );
	ga('send', 'pageview');
</script>
```

### Sources and special distributed versions 
Code of `salo.js` plugin can be found [here](https://github.com/vmysla/salo.js/blob/master/src/salo.js).
To setup development environment and get source code on your local machine you have to clone this repository, install dependencies and build probably build it: 
``` bash
git clone https://github.com/vmysla/salo.js
cd salo.js
npm install
gulp build
# /src/salo.js - source code
# /dist/salo.min.js - compressed version
# /dist/salo+simpleStorage.min.js - version recommended to use on your site
```

## Configuration

Custom options can be set with GA require call:

``` javascript
	ga('require', 'salo', {
		storage : require('jStorage') // use jStorage.js for IE7 support
	});
...
```
Below you can find the list of all options which can be passed into plugin:

* **storage**   - Object with get(), set(), index(), removeKey() methods. (window['simpleStorage'] by defaults) 
* **storageTimeout**   - max TTL in milliseconds for stored hits after which they would be expired (3 hours by defaults)  


* **transport**   - Function which is used to report a particular hit. (tracker.get('sendHitTask') by defaults) 
* **transportTimeout** - max time in milliseconds for plugin to wait response from GA on reported hit (5 seconds by defaults)  
* **transportMethod** - GA transport method used for reporting which can be image, xhr or beacon ('image' by defaults) 
* **transportUrl**  - GA reporting URL (//www.google-analytics.com/collect by defaults) 


* **timing**  - Object with setTimeout(), clearTimeout() methods and Date class. (window by defaults) 

## 

## Troubleshoot and Testing
See Jasmine tests [here](https://github.com/vmysla/salo.js/blob/master/test/salo.spec.js).

By defaults `salo.js` plugin is enabled right after it was provided to GA. It will disable itself automatically in case of receiving any JavaScript exception during execution of `salo.send()` or `hit.get('hitCallback')` functions. In a such case corresponding GA exception will be reported, tracker will be switched back to original version of `sendHitTask`.

You can disable or enable `salo.js` anytime from the code:
``` javascript

// Next line will disable salo.js plugin
	ga('salo:disable');
	
//  Uncomment line below to enable salo.js plugin after it was disabled:
//  ga('salo:enable');
...
```
We respect people who don't histate to contact in case of any issue they found and love those who has ideas for improvements!