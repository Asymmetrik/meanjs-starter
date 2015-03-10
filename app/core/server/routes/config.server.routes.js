'use strict';

var path = require('path'),
	config = require(path.resolve('./app/core/server/controllers/config.server.controller.js'));


module.exports = function(app) {

	// For now, just a single get for the global client configuration
	app.route('/config')
		.get(config.read);

};
