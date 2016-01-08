'use strict';

var mongoose = require('mongoose'),
	path = require('path'),
	q = require('q'),

	deps = require(path.resolve('./config/dependencies.js')),
	config = deps.config,
	dbs = deps.dbs,
	util = deps.utilService,
	query = deps.queryService,
	logger = deps.logger,
	GetterSchema = deps.schemaService.GetterSchema;

/**
 * Schema Declaration
 */
var AuditSchema = new GetterSchema({
	created: {
		type: Date,
		default: Date.now,
		get: util.dateParse
	},
	message: { type: String },
	audit: {
		type: {
			auditType: { type: String },
			action: { type: String },
			actor: { type: String },
			object: { type: String }
		}
	}
});

/**
 * Index declarations
 */

// Created datetime index
AuditSchema.index({ 'created': -1 });

// Audit Type index
AuditSchema.index({ 'audit.auditType': 'text' });

// User index
AuditSchema.index({ 'audit.actor': 'text' });

// Text-search index
AuditSchema.index({ 'message': 'text', 'audit.auditType': 'text', 'audit.action': 'text', 'audit.object': 'text' });

/*****************
 * Lifecycle hooks
 *****************/


/*****************
 * Static Methods
 *****************/

// Search audit events by text and other criteria
AuditSchema.statics.search = function(queryTerms, searchTerms, limit, offset, sortArr) {
	return query.search(this, queryTerms, searchTerms, limit, offset, sortArr);
};

/**
 * Register the Schema with Mongoose
 */
mongoose.model('Audit', AuditSchema, 'audit');
