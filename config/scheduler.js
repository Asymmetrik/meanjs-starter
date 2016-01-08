'use strict';

var mongoose = require('mongoose'),
	path = require('path'),
	q = require('q'),

	deps = require(path.resolve('./config/dependencies.js')),
	config = deps.config,
	logger = deps.logger,
	auditLogger = deps.auditLogger;

/*
 * Services are configured in the application configuration
 * Each service has a config object that looks like the following:
 * {
 * 		interval: 10000,
 * 		file: '/path/to/file.js',
 * 		config: {  }
 * }
 */

var keepAlive = true;
var interval;
var services = [];

function timeoutHandler() {

	// Loop over all of the services
	services.forEach(function(service) {
		try {
			// If interval has passed since the last run, run now
			if(!service.running && Date.now() > service.lastRun + service.interval) {

				// Service is running
				service.running = true;
				var startTs = Date.now();

				// Run and update the last run time
				service.service.run(service.config).then(function() {
					service.lastRun = Date.now();
					service.running = false;
					logger.debug('Scheduler: Ran %s in %s ms', service.file, (Date.now() - startTs));
				}, function(err) {
					// failure... eventually, we may want to react differently
					service.lastRun = Date.now();
					service.running = false;
					logger.warn('Scheduler: %s failed in %s ms', service.file, (Date.now() - startTs));
				});

			}
		} catch(err) {
			// the main loop won't die if a service is failing
			logger.error(err, 'Scheduler: Unexpected error running scheduled service: %s, continuing execution.', service.file);
		}
	});

	if(keepAlive) {
		setTimeout(timeoutHandler, interval);
	}
}


module.exports.start = function() {
	// Only start if we're actually configured
	if(null != config.scheduler) {
		var serviceConfigs = config.scheduler.services || [];

		// Initialize the services
		serviceConfigs.forEach(function(serviceConfig) {
			var service = {};

			// Get the implementation of the service
			service.file = serviceConfig.file;
			service.service = require(path.resolve(serviceConfig.file));

			// Store the original service config
			service.config = serviceConfig.config;

			// Get the service run interval
			service.interval = serviceConfig.interval;
			service.lastRun = 0;

			// Validate the service
			if(null == service.interval || service.interval < 1000) {
				logger.warn(service, 'Scheduler: Bad service configuration provided');
			} else {
				// Store it in the services array
				services.push(service);
			}
		});

		// Start the timer
		interval = config.scheduler.interval || 10000;
		setTimeout(timeoutHandler, 0);
	}
};
