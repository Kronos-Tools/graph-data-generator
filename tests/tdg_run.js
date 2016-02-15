/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */

"use strict";

const tdgExecuter = require('../lib/tdg-executer');
const tdgPreprocessor = require('../lib/tdg-preprocessor');

const fs = require('fs');
const path = require("path");
const rimraf = require('rimraf');

const fixturesDir = path.join(__dirname, 'fixtures');
const volatileDir = path.join(__dirname, 'fixtures', 'volatile');


//const structureContent = fs.readFileSync(path.join(fixturesDir, 'test_structure.json'));
const structureContent = fs.readFileSync(path.join(fixturesDir, 'new_definition.json'));
const structureJson = JSON.parse(structureContent);

if (tdgPreprocessor.loadStructure(structureJson, volatileDir, false)) {
	// The file could be successfully be processed. Now start generating data

	// reload the precpressed JSON
	const structureContent = fs.readFileSync(path.join(volatileDir, 'prePrcessedGraphDefinition.json'));
	const structureJson = JSON.parse(structureContent);

	tdgExecuter.loadStructure(structureJson, volatileDir);
}
