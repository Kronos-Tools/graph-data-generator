/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */

"use strict";

const tdg = require('../index');

const tdgModel = tdg.TdgModel();
const tdgEexecuter = tdg.TdgExecuter();
const tdgWriterFactory = tdg.TdgWriter;


const fs = require('fs');
const path = require("path");
const rimraf = require('rimraf');

const fixturesDir = path.join(__dirname, 'fixtures');
const volatileDir = path.join(__dirname, 'fixtures', 'volatile');


//const structureContent = fs.readFileSync(path.join(fixturesDir, 'test_structure.json'));
//const structureContent = fs.readFileSync(path.join(fixturesDir, 'model_small.json'));
const structureContent = fs.readFileSync(path.join(fixturesDir, 'model_small-highValue.json'));
const structureJson = JSON.parse(structureContent);

console.log("# Start model parsing");
tdgModel.init(structureJson);

console.log("# Start executer");

// Set the model to the executer
const writer = tdgWriterFactory({
	"targetDir": volatileDir
});

tdgEexecuter.model = tdgModel;
tdgEexecuter.writer = writer;


createMethods(tdgEexecuter);

tdgEexecuter.createVertices();
tdgEexecuter.createEdges();

const gum = require('../lib/tdg-data-key-fields').factory();
gum.model = tdgEexecuter.model;
gum.registry = tdgEexecuter.registry;
gum.writer = tdgEexecuter.writer;
gum.createKeyDataEdges();

/**
 * Add the custum functions to the TDG-Executer
 */
function createMethods(tdgExecuter) {
	// Maps the accounts to its parent
	// idMapper[accountId] = applicationId
	const idMapper = {};

	/**
	 * This function will be called when the edge 'account_has_entitlement' will
	 * be created.
	 * It will return all the sources of the edge 'account_has_entitlement'.
	 * @param edgeConfig (object) The configuration part of the current edge
	 * @return resArray (array) An array with all account IDs
	 */
	tdgExecuter.getSourceApplicationHasAccount = function (edgeConfig) {
		const name = 'application_has_account';
		const sourceEdge = this.registry[name];
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
	 * @param edgeConfig (object) The configuration part of the current edge
	 * @param accountId (number) The current account ID
	 * @return resArray (array) An array with all potential entitlement ids
	 */
	tdgExecuter.getTargetApplicationHasEntitlement = function (edgeConfig, accountId) {
		const name = 'application_has_entitlement';

		// Get the generated edge data from the internal registry
		const sourceEdge = this.registry[name];

		// to get the entitlements we need to know the application
		const appId = idMapper[accountId];

		const resArray = sourceEdge.objects[appId];
		return resArray;
	};

	/**
	 * This function will be called when the edge 'account_has_entitlement' will
	 * be created.
	 * Returns the number of entitlements an application has
	 * @param edgeConfig (object) The configuration part of the current edge
	 * @param accountId (number) The current account ID
	 * @return resNumber (number) The amaount of entitlements this application has
	 */
	tdgExecuter.getSourceLengthApplicationHasEntitlement = function (edgeConfig, accountId) {
		const name = 'application_has_entitlement';

		// Get the generated edge data from the internal registry
		const sourceEdge = this.registry[name];

		// to get the entitlements we need to know the application
		const appId = idMapper[accountId];

		// the number of entitlements this application has
		const resNumber = sourceEdge.objects[appId].length;
		return resNumber;
	};
}
