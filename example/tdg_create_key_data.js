/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */

"use strict";
const merge = require('deepmerge');

const tdg = require('../index');

const tdgModel = tdg.TdgModel();
const tdgExecuter = tdg.TdgExecuterData();
const tdgWriterFactory = tdg.TdgWriter;


const fs = require('fs');
const path = require("path");
const rimraf = require('rimraf');

const fixturesDir = path.join(__dirname, '../tests/fixtures');
const volatileDir = path.join(__dirname, '../tests/volatile');


const modelContent1 = fs.readFileSync(path.join(fixturesDir, 'model_graph.json'));
const json1 = JSON.parse(modelContent1);

const modelContent2 = fs.readFileSync(path.join(fixturesDir, 'model_tdg_key_data.json'));
const json2 = JSON.parse(modelContent2);

const structureJson = merge(json1, json2);


console.log("# Start model parsing");
tdgModel.init(structureJson);

console.log("# Start executer");

// Set the model to the executer
const writer = tdgWriterFactory({
	"target_dir": volatileDir
});

tdgExecuter.model = tdgModel;
tdgExecuter.writer = writer;
tdgExecuter.registry = createRegistry(volatileDir, ["Edge_account_has_entitlement.json",
	"Edge_application_has_account.json",
	"Vertex_account.json",
	"Vertex_entitlement.json",
	"Edge_account_identity.json",
	"Edge_application_has_entitlement.json",
	"Vertex_application.json",
	"Vertex_identity.json"
]);


tdgExecuter.createKeyDataEdges();


function createRegistry(srcDir, files) {
	const registry = {};
	files.forEach(fileName => {
		const fullPath = path.join(srcDir, fileName);
		const content = fs.readFileSync(fullPath);
		const json = JSON.parse(content);
		registry[json.name] = json;
	});

	return registry;
}
