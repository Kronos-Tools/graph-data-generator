/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */

"use strict";

const tdg = require('../index');

const tdgModel = tdg.TdgModel();
const tdgEexecuter = tdg.TdgExecuter();
const tdgWriterFactory = tdg.TdgWriter;

const fs = require('fs');
const path = require("path");

const fixturesDir = path.join(__dirname, 'fixtures');
const volatileDir = path.join(__dirname, 'fixtures', 'volatile');


//const structureContent = fs.readFileSync(path.join(fixturesDir, 'test_structure.json'));
const structureContent = fs.readFileSync(path.join(fixturesDir, 'model_small.json'));
//const structureContent = fs.readFileSync(path.join(fixturesDir, 'model_small-highValue.json'));
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


/**
 * Add functions to the TDG-Executer
 */
function createMethods(tdgExecuter) {
	// Maps the accounts to its parent
	const idMapper = {};



	tdgExecuter.getSourceApplicationHasAccount = function (edgeConfig) {
		const name = 'application_has_account';
		const sourceEdge = this.registry[name];
		const resArray = [];

		Object.keys(sourceEdge.objects).forEach(appId => {
			sourceEdge.objects[appId].forEach(val => {
				resArray.push(val);
				idMapper[val] = appId;
			});
		});

		return resArray;
	};

	tdgExecuter.getTargetApplicationHasEntitlement = function (edgeConfig, accountId) {
		const name = 'application_has_entitlement';

		const sourceEdge = this.registry[name];
		const appId = idMapper[accountId];

		//		console.log(`appId = ${appId} for accountId = ${accountId}`);

		const resArray = sourceEdge.objects[appId];
		return resArray;

		// const resMap = new Map();
		// let keyCounter = 0;
		// resArray.forEach(val => {
		// 	resMap.set(keyCounter, val);
		// 	keyCounter++;
		// });
		//
		// return resMap;
	};

	tdgExecuter.getSourceLengthApplicationHasEntitlement = function (edgeConfig, accountId) {
		const name = 'application_has_entitlement';
		const sourceEdge = this.registry[name];

		const appId = idMapper[accountId];

		const resNumber = sourceEdge.objects[appId].length;

		//		console.log(`Get ${resNumber} possible targets for app ${appId}`);

		return resNumber;
	};



}
