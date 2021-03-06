'use strict';

angular.module('asymmetrik.groups').service('groupService', ['$http', '$q', '$log', 'authService', 'Authentication',
	function ($http, $q, $log, authService, Authentication) {

	var roles = {};
	roles.map = {
		admin: { label: 'Group Admin', description: 'This user can manage the membership and metadata of the group', role: 'admin' },
		editor: { label: 'Editor', description: 'This user can create/edit/delete resources within this group', role: 'editor' }
	};
	roles.array = [ roles.map.admin, roles.map.editor ];

	var sort = {};
	sort.map = {
		title: {label: 'Title', sort: 'title_lowercase', dir: 'ASC'},
		relevance: {label: 'Relevance', sort: 'score', dir: 'DESC'}
	};
	sort.array = [ sort.map.title, sort.map.relevance ];


	/**
	 * Public methods to be exposed through the service
	 */


	/**
	 * Basic CRUD Operations and Search
	 */

	// Create
	function create(group) {
		var request = $http({
			method: 'post',
			url: 'group',
			data: group
		});
		return request.then(function(response) {
			// We need to reload the user
			authService.getCurrentUser();
			return response.data;
		}, handleFailure);
	}

	// Retrieve
	function get(id) {
		var request = $http({
			method: 'get',
			url: 'group/' + id
		});
		return request.then(handleSuccess, handleFailure);
	}

	// Update
	function update(group) {
		var request = $http({
			method: 'post',
			url: 'group/' + group._id,
			data: group
		});
		return request.then(handleSuccess, handleFailure);
	}

	// Delete
	function remove(id) {
		var request = $http({
			method: 'delete',
			url: 'group/' + id
		});
		return request.then(function(response) {
			authService.getCurrentUser();
			return response.data;
		}, handleFailure);
	}

	// Search groups (admin feature)
	function search(q, s, pageable) {
		var request = $http({
			method: 'post',
			url: 'groups',
			data: {s: s, q: q},
			params: pageable
		});
		return request.then(handleSuccess, handleFailure);
	}

	function selectionList() {
		var query = {};
		if (!Authentication.isAdmin()) {
			query = { _id: { $in: Authentication.editableGroups().map(function(group) { return group._id; }) } };
		}

		return search(query, undefined, { sort: 'title', runCount:false });
	}

	function list() {
		return search(undefined, undefined, { size: 100 }).then(
			function(result){ return result.elements; },
			handleFailure);
	}

	/**
	 * Group Membership and Role Management
	 */

	// Search for users in a group
	function searchMembers(groupId, q, s, pageable) {
		var request = $http({
			method: 'post',
			url: 'group/' + groupId + '/users',
			data: {s: s, q: q},
			params: pageable
		});
		return request.then(handleSuccess, handleFailure);
	}

	// Grant a user a role in a group
	function addUserRole(groupId, userId, role) {
		var request = $http({
			method: 'post',
			url: 'group/' + groupId + '/user/' + userId + '/role',
			params: {
				role: role
			}
		});
		return request.then(function(response) {
			reloadUser(userId);
			return response.data;
		}, handleFailure);
	}

	// Remove a user role in a group
	function removeUserRole(groupId, userId, role) {
		var request = $http({
			method: 'delete',
			url: 'group/' + groupId + '/user/' + userId + '/role',
			params: {
				role: role
			}
		});
		return request.then(function(response) {
			reloadUser(userId);
			return response.data;
		}, handleFailure);
	}

	function addUser(groupId, userId) {
		var request = $http({
			method: 'post',
			url: 'group/' + groupId + '/user/' + userId
		});
		return request.then(function(response) {
			reloadUser(userId);
			return response.data;
		}, handleFailure);
	}

	function removeUser(groupId, userId) {
		var request = $http({
			method: 'delete',
			url: 'group/' + groupId + '/user/' + userId
		});
		return request.then(function(response) {
			reloadUser(userId);
			return response.data;
		}, handleFailure);
	}


	/**
	 * Private methods
	 */
	function userActiveInGroup(user, group) {
		if(true === user.bypassAccessCheck) {
			return true;
		} else {
			// Check the required external groups against the user's externalGroups
			return _.difference(group.requiresExternalGroups, user.externalGroups).length === 0;
		}
	}

	function getGroupPermissions(user, group) {
		var groupPermissions;

		// Try to find the groupId in the list of groups on the user
		user.groups.some(function(gps) {
			if(gps._id === group._id) {
				groupPermissions = gps;
				return true;
			}
			else {
				return false;
			}
		});

		return groupPermissions;
	}

	function reloadUser(userId) {
		// If the userId matches the current user, reload the current user
		if(null != Authentication.user && Authentication.user._id === userId) {
			authService.getCurrentUser();
		}

	}

	function handleSuccess(response) {
		return response.data;
	}

	function handleFailure(response) {
		if (!angular.isObject(response.data) || null == response.data.message) {
			return ( $q.reject('An unknown error occurred.') );
		}

		return $q.reject(response.data.message);
	}


	// Return the public API
	return ({

		roles: roles,
		sort: sort,

		create: create,
		get: get,
		list: list,
		selectionList: selectionList,
		search: search,
		update: update,
		remove: remove,

		searchMembers: searchMembers,
		addUser: addUser,
		removeUser: removeUser,
		addUserRole: addUserRole,
		removeUserRole: removeUserRole,
		userActiveInGroup: userActiveInGroup,
		getGroupPermissions: getGroupPermissions

	});

}]);
