/* jslint node: true, esnext: true */

"use strict";

// Maps the accounts to its parent
// idMapper[accountId] = applicationId
const idMapper = {};

/**
 * This function will be called when the edge 'account_has_entitlement' will
 * be created.
 * It will return all the sources of the edge 'account_has_entitlement'.
 * @param model (object) The model object
 * @param edgeConfig (object) The configuration part of the current edge
 * @param logger (object) The logger object
 * @return resArray (array) An array with all account IDs
 */
const getSourceApplicationHasAccount = function (model, edgeConfig, logger) {
	const name = 'application_has_account';
	const sourceEdge = model.registry.edges[name];
	const resArray = [];

	Object.keys(sourceEdge.objects).forEach(appId => {
		sourceEdge.objects[appId].forEach(val => {
			resArray.push(val);

			// Store which account belongs to which application
			idMapper[val] = appId;
		});
	});
	return resArray;
};

/**
 * This function will be called when the edge 'account_has_entitlement' will
 * be created.
 * It will return all the potential targets of the edge 'account_has_entitlement' for
 * a specific account.
 * @param model (object) The model object
 * @param edgeConfig (object) The configuration part of the current edge
 * @param logger (object) The logger object
 * @param accountId (number) The current account ID
 * @return resArray (array) An array with all potential entitlement ids
 */
const getTargetApplicationHasEntitlement = function (model, edgeConfig, logger, accountId) {
	const name = 'application_has_entitlement';

	// Get the generated edge data from the internal registry
	const sourceEdge = model.registry.edges[name];

	// to get the entitlements we need to know the application
	const appId = idMapper[accountId];

	const resArray = sourceEdge.objects[appId];
	return resArray;
};

/**
 * This function will be called when the edge 'account_has_entitlement' will
 * be created.
 * Returns the number of entitlements an application has
 * @param tdg (object) The model object
 * @param edgeConfig (object) The configuration part of the current edge
 * @param logger (object) The logger object
 * @param accountId (number) The current account ID
 * @return resNumber (number) The amaount of entitlements this application has
 */
const getSourceLengthApplicationHasEntitlement = function (model, edgeConfig, logger, accountId) {
	const name = 'application_has_entitlement';

	// Get the generated edge data from the internal registry
	const sourceEdge = model.registry.edges[name];

	// to get the entitlements we need to know the application
	const appId = idMapper[accountId];

	// the number of entitlements this application has
	const resNumber = sourceEdge.objects[appId].length;
	return resNumber;
};



/**
 * This function will be called when the edge 'account_has_entitlement' will
 * be created.
 * It will return all the potential targets of the edge 'account_has_entitlement' for
 * a specific account.
 * @param model (object) The model object
 * @param edgeConfig (object) The configuration part of the current edge
 * @param logger (object) The logger object
 * @param accountId (number) The current account ID
 * @return resArray (array) An array with all potential entitlement ids
 */
const getTargetAccountIdentity = function (model, edgeConfig, logger, accountId) {
	const name = 'identity';

	// Get the generated edge data from the internal registry
	const vertex = model.registry.vertices[name];

	const sMin = vertex.min_id;
	const sMax = vertex.max_id;

	const resArray = createArrayFromRange(sMin, sMax);
	return resArray;
};

/**
 * This function will be called when the edge 'account_has_entitlement' will
 * be created.
 * Returns the number of entitlements an application has
 * @param model (object) The model object
 * @param edgeConfig (object) The configuration part of the current edge
 * @param logger (object) The logger object
 * @param accountId (number) The current account ID
 * @return resNumber (number) The amaount of entitlements this application has
 */
const getSourceLengthAccountIdentity = function (model, edgeConfig, logger, accountId) {
	const name = 'identity';

	// Get the generated edge data from the internal registry
	const vertex = model.registry.vertices[name];

	const sMin = vertex.min_id;
	const sMax = vertex.max_id;

	// the number of entitlements this application has
	const resNumber = sMax - sMin;
	return resNumber;
};

/**
 * Create an array of available IDs out of a range
 * @param minId (number) The minimum ID
 * @param maxId (number) The maximum ID
 * @return ret (array) An array with all the ids
 */
function createArrayFromRange(minId, maxId) {
	const ret = new Array(maxId - minId + 1);
	let idx = 0;
	for (let i = minId; i <= maxId; i++) {
		ret[idx] = i;
		idx++;
	}
	return ret;
}
module.exports.functions = {
	"getSourceApplicationHasAccount": getSourceApplicationHasAccount,
	"getTargetApplicationHasEntitlement": getTargetApplicationHasEntitlement,
	"getSourceLengthApplicationHasEntitlement": getSourceLengthApplicationHasEntitlement,
	"getTargetAccountIdentity": getTargetAccountIdentity,
	"getSourceLengthAccountIdentity": getSourceLengthAccountIdentity
};
