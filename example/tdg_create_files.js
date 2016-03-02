/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */

"use strict";

const tdg = require('../index');
const tdgFileExporterFactory = tdg.TdgFileExporter;

const fs = require('fs');
const path = require("path");
const rimraf = require('rimraf');

const fixturesDir = path.join(__dirname, '../tests/fixtures');
const volatileDir = path.join(__dirname, '../tests/volatile');


const modelContent1 = fs.readFileSync(path.join(fixturesDir, 'model_exporter.json'));
const json1 = JSON.parse(modelContent1);

const registry = createRegistry(volatileDir, [
	"Vertex_application_key_data.json",
	"Vertex_identity_key_data.json",
	"Vertex_account_key_data.json"
]);


const options = {
	"model": json1,
	"target_dir": volatileDir
};

const tdgFileExporter = tdgFileExporterFactory(options);
tdgFileExporter.registry = registry;
tdgFileExporter.run();


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
