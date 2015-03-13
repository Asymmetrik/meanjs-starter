'use strict';

var _ = require('lodash'),
	mongoose = require('mongoose'),
	passport = require('passport'),
	path = require('path'),

	deps = require(path.resolve('./config/dependencies.js')),
	util = deps.utilService,
	logger = deps.logger,
	auditLogger = deps.auditLogger,

	User = mongoose.model('User'),
	UserAgreement = mongoose.model('UserAgreement');


/**
 * Private methods
 */

function searchEuas(req, res) {

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

	UserAgreement.search(query, search, limit, offset, sortArr).then(function(result){

		// success
		var toReturn = {
			totalSize: result.count,
			pageNumber: page,
			pageSize: size,
			totalPages: Math.ceil(result.count/size),
			elements: result.results
		};

		// Serialize the response
		res.jsonp(toReturn);
	}, function(error){
		// failure
		logger.error(error);
		return util.send400Error(res, error);
	});
}


/**
 * Standard Operations
 */

// Publish the EUA
exports.publishEua = function(req, res) {
	var eua = req.euaParam;
	eua.published = Date.now();

	eua.save(function(err){
		util.catchError(res, err, function() {
			res.jsonp(eua);
		});
	});
};


// Accept the current EUA
exports.acceptEua = function(req, res) {

	// Make sure the user is logged in
	if(null == req.user){
		util.send400Error(res, 'User is not signed in');
		return;
	}

	User.findOneAndUpdate(
		{ _id: req.user._id },
		{ acceptedEua: Date.now() },
		{ new: true, upsert: false },
		function(err, user) {
			util.catchError(res, err, function() {
				// Audit accepted eua
				auditLogger.audit('eua accepted', 'eua', 'accepted',
					User.auditCopy(user), {});

				res.jsonp(User.fullCopy(user));
			});
		});

};

// Create a new User Agreement
exports.createEua = function(req, res) {
	var eua = new UserAgreement(req.body);
	eua.created = Date.now();
	eua.updated = eua.created;

	eua.save(function(err) {
		util.catchError(res, err, function() {
			// Audit eua creates
			auditLogger.audit('eua create', 'eua', 'create',
				User.auditCopy(req.user),
				{ eua: UserAgreement.auditCopy(eua) });

			res.jsonp(eua);
		});
	});
};


// Retrieve the Current User Agreement
exports.getCurrentEua = function(req, res) {
	UserAgreement.getCurrentEua().then(function(result) {
		return res.jsonp(result);
	}, function(error){
		// failure
		logger.error(error);
		return util.send400Error(res, error);
	});
};


// Retrieve the arbitrary User Agreement
exports.getEuaById = function(req, res) {

	// The eua is placed into this parameter by the middleware
	var eua = req.euaParam;

	if(null == eua){
		res.status(400).send({
			message: 'End User Agreement does not exist'
		});
		return;
	}

	res.jsonp(eua);
};


// Search (Retrieve) all user Agreements
exports.searchEuas = function(req, res) {
	searchEuas(req, res);
};


// Update a User Agreement
exports.updateEua = function(req, res) {

	// The persistence user
	var eua = req.euaParam;

	// A copy of the original user for auditing
	var originalEua = UserAgreement.auditCopy(eua);

	if(null == eua){
		res.status(400).send({
			message: 'Could not find end user agreement'
		});
		return;
	}

	// Copy over the new user properties
	eua.text = req.body.text;
	eua.title = req.body.title;

	// Update the updated date
	eua.updated = Date.now();

	// Save the user
	eua.save(function(err) {
		util.catchError(res, err, function() {
			// Audit user update
			auditLogger.audit('end user agreement updated', 'eua', 'update',
				User.auditCopy(req.user),
				{ before: originalEua, after: UserAgreement.auditCopy(eua) });

			res.jsonp(eua);
		});
	});
};


// Delete a User Agreement
exports.deleteEua = function(req, res) {
	var eua = req.euaParam;

	if(null == eua){
		res.status(400).send({
			message: 'Could not find end user agreement'
		});
		return;
	}

	// Delete the eua
	eua.remove(function(err) {
		util.catchError(res, err, function() {
			// Audit eua delete
			auditLogger.audit('eua deleted', 'eua', 'delete',
				User.auditCopy(req.user),
				{ eua: UserAgreement.auditCopy(eua) });

			res.json(eua);
		});
	});
};


//EUA middleware - stores user corresponding to id in 'userParam'
exports.euaById = function(req, res, next, id) {
	UserAgreement.findOne({
		_id: id
	}).exec(function(err, eua) {
		if (err) return next(err);
		if (!eua) return next(new Error('Failed to load User Agreement ' + id));
		req.euaParam = eua;
		next();
	});
};


//EUA route auth middleware
exports.requiresEua = function(req, res, next) {
	UserAgreement.getCurrentEua().then(function(result){

		// compare the current eua to the user's acceptance state
		if(null == result || null == result.published || User.hasRoles(req.user, ['admin']) || (req.user.acceptedEua && req.user.acceptedEua >= result.published)){
			// if the user's acceptance is valid, then proceed
			return next();
		} else {
			return res.status(403).send({
				type: 'eua',
				message: 'User must accept end-user agreement.'
			});
		}

	}, function(error){
		// failure
		logger.error(error);
		return util.send400Error(res, error);
	});

};
