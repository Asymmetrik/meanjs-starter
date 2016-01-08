
'use strict';

var _ = require('lodash'),
	mongoose = require('mongoose'),
	passport = require('passport'),
	path = require('path'),
	q = require('q'),

	deps = require(path.resolve('./config/dependencies.js')),
	config = deps.config,
	dbs = deps.dbs,
	util = deps.utilService,
	logger = deps.logger,
	auditService = deps.auditService,

	accessCheckerService = require(path.resolve('./app/access-checker/server/services/access-checker.server.service.js')),
	CacheEntry = dbs.admin.model('CacheEntry');


/**
 * Public methods
 */

module.exports.searchEntries = function(req, res) {

	// Handle the query/search/page
	var query = req.body.q;
	var search = req.body.s;

	var page = req.query.page;
	var size = req.query.size;
	var sort = req.query.sort;
	var dir = req.query.dir;

	// Limit has to be at least 1 and no more than 100
	if(null == size){ size = 20; }
	size = Math.max(1, Math.min(100, size));

	// Page needs to be positive and has no upper bound
	if(null == page){ page = 0; }
	page = Math.max(0, page);

	// Sort can be null, but if it's non-null, dir defaults to DESC
	if(null != sort && dir == null){ dir = 'DESC'; }

	// Create the variables to the search call
	var limit = size;
	var offset = page*size;
	var sortArr;
	if(null != sort){
		sortArr = [{ property: sort, direction: dir }];
	}

	CacheEntry.search(query, search, limit, offset, sortArr).then(function(result){

		// Create the return copy of the users
		var entries = [];
		result.results.forEach(function(element){
			entries.push(CacheEntry.fullCopy(element));
		});

		// success
		var toReturn = {
			totalSize: result.count,
			pageNumber: page,
			pageSize: size,
			totalPages: Math.ceil(result.count/size),
			elements: entries
		};

		// Serialize the response
		res.jsonp(toReturn);
	}, function(error){
		// failure
		logger.error(error);
		return util.send400Error(res, error);
	});
};



// Match users given a search fragment
exports.matchEntries = function(req, res) {
	// Handle the query/search/page
	var query = req.body.q;
	var search = req.body.s;

	var page = req.query.page;
	var size = req.query.size;
	var sort = req.query.sort;
	var dir = req.query.dir;

	// Limit has to be at least 1 and no more than 100
	if(null == size){ size = 20; }
	size = Math.max(1, Math.min(100, size));

	// Page needs to be positive and has no upper bound
	if(null == page){ page = 0; }
	page = Math.max(0, page);

	// Sort can be null, but if it's non-null, dir defaults to DESC
	if(null != sort && dir == null){ dir = 'ASC'; }

	// Create the variables to the search call
	var limit = size;
	var offset = page*size;
	var sortArr;
	if(null != sort){
		sortArr = [{ property: sort, direction: dir }];
	}

	CacheEntry.containsQuery(query, ['key', 'valueString'], search, limit, offset, sortArr).then(function(result){

		// Create the return copy of the users
		var entries = [];
		result.results.forEach(function(element){
			entries.push(CacheEntry.fullCopy(element));
		});

		// success
		var toReturn = {
			totalSize: result.count,
			pageNumber: page,
			pageSize: size,
			totalPages: Math.ceil(result.count/size),
			elements: entries
		};

		// Serialize the response
		res.jsonp(toReturn);
	}, function(error){
		// failure
		logger.error(error);
		return util.send400Error(res, error);
	});
};

exports.refreshEntry = function(req, res) {
	if(null == req.params.key) {
		util.handleErrorResponse(res, { status: 400, type: 'bad-request', message: 'Missing \'key\' request argument' });
	}
	else {
		accessCheckerService.refreshEntry(req.params.key).then(function() {
			res.status(204).end();
		}, function(error) {
			util.handleErrorResponse(res, { status: 500, type: 'error', message: error });
		});
	}
};

exports.deleteEntry = function(req, res) {
	if(null == req.params.key) {
		util.handleErrorResponse(res, { status: 400, type: 'bad-request', message: 'Missing \'key\' request argument' });
	}
	else {
		accessCheckerService.deleteEntry(req.params.key).then(function() {
			res.status(204).end();
		}, function(error) {
			util.handleErrorResponse(res, { status: 500, type: 'error', message: error });
		});
	}
};

exports.refreshCurrentUser = function(req, res) {
	var key = (null != req.user && null != req.user.providerData)? req.user.providerData.dnLower: undefined;
	accessCheckerService.refreshEntry(key).then(function() {
		res.status(204).end();
	}, function(error) {
		util.handleErrorResponse(res, { status: 500, type: 'error', message: error });
	});
};