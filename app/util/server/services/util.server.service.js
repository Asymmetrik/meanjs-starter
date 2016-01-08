'use strict';

var path = require('path'),
	mongoose = require('mongoose'),
	deps = require(path.resolve('./config/dependencies.js')),
	config = deps.config,
	errorHandler = deps.errorHandler,
	logger = deps.logger;

function getValidationErrors(err) {
	var errors = [];

	if(null != err.errors) {
		for (var field in err.errors) {
			if(err.errors[field].path) {
				var message = (err.errors[field].type === 'required')? field + ' is required' : err.errors[field].message;
				errors.push({ field: field, message: message });
			}
		}
	}

	return errors;
}

module.exports.getErrorMessage = function(err) {
	if(typeof err === 'string') {
		return err;
	}

	var msg = 'unknown error';
	if(null != err.message) {
		msg = err.message;
	}

	if(null != err.stack) {
		msg = '[' + msg + '] ' + err.stack;
	}

	return msg;
};

module.exports.getClientErrorMessage = function(err) {
	if(config.exposeServerErrors) {
		return module.exports.getErrorMessage(err);
	} else {
		return 'A server error has occurred.';
	}
};

module.exports.handleErrorResponse = function(res, errorResult) {
	// Return the error state to the client, defaulting to 500
	errorResult = errorResult || {};

	if(errorResult.name === 'ValidationError') {
		var errors = getValidationErrors(errorResult);
		errorResult = {
			status: 400,
			type: 'validation',
			message: errors.map(function(e) { return e.message; }).join(', '),
			errors: errors
		};
	}

	// If the status is missing or invalid, default to 500
	if(!(errorResult.status >= 400 && errorResult.status <= 600)) {
		errorResult.status = 500;
	}

	// If it's a server error, get the client message
	if(errorResult.status >= 500 && errorResult.status < 600) {
		errorResult = {
			status: errorResult.status,
			type: 'server-error',
			message: module.exports.getClientErrorMessage(errorResult.message)
		};
	}

	// Send the response
	res.status(errorResult.status).json(errorResult);
};

module.exports.catchError = function(res, err, callback) {
	if (err) {
		logger.error(err);
		return this.send400Error(res, err);
	} else if (null != callback) {
		callback();
	}
};

module.exports.send400Error = function (res, err) {
	return res.status(400).json({
		message: errorHandler.getErrorMessage(err)
	});
};

module.exports.send403Error = function (res) {
	return res.status(403).json({
		message: 'User is not authorized'
	});
};

module.exports.validateNonEmpty = function (property) {
	return (null != property && property.length > 0);
};

module.exports.validateArray = function (arr) {
	return (null != arr && arr.length > 0);
};

module.exports.toLowerCase = function (v){
	return (null != v)? v.toLowerCase(): undefined;
};

module.exports.dateParse = function (date) {
	if (null == date)
		return null;

	return Date.parse(date);
};

function propToMongoose(prop, nonMongoFunction) {
	if (typeof prop === 'object' && prop.$date != null && typeof prop.$date === 'string') {
		return new Date(prop.$date);
	} else if (typeof prop === 'object' && prop.$obj != null && typeof prop.$obj === 'string') {
		return mongoose.Types.ObjectId(prop.$obj);
	}

	if (null != nonMongoFunction) {
		return nonMongoFunction(prop);
	}

	return null;
}

function toMongoose(obj) {
	if (null != obj) {
		if (typeof obj === 'object') {
			if (Array.isArray(obj)) {
				var arr = [];

				for (var index in obj) {
					arr.push(propToMongoose(obj[index], toMongoose));
				}

				return arr;
			} else {
				var newObj = {};

				for (var prop in obj) {
					newObj[prop] = propToMongoose(obj[prop], toMongoose);
				}

				return newObj;
			}
		}
	}

	return obj;
}

exports.toMongoose = toMongoose;