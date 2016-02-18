/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */

"use strict";

const model = require('../lib/model-tdg').factory();
const executer = require('../lib/tdg-executer').factory();
const writerFactory = require('../lib/tdg-writer').factory;


const fs = require('fs');
const path = require("path");
const rimraf = require('rimraf');

const fixturesDir = path.join(__dirname, 'fixtures');
const volatileDir = path.join(__dirname, 'fixtures', 'volatile');


//const structureContent = fs.readFileSync(path.join(fixturesDir, 'test_structure.json'));
const structureContent = fs.readFileSync(path.join(fixturesDir, 'model_small.json'));
const structureJson = JSON.parse(structureContent);

console.log("# Start model parsing");
model.init(structureJson);

console.log("# Start executer");

// Set the model to the executer
const writer = writerFactory({
	"targetDir": volatileDir
});
executer.model = model;
executer.writer = writer;
executer.createVertices();
executer.createEdges();

writer.writeObject("statistic", {
	"name": "statistic",
	"data": executer.statistic
});
