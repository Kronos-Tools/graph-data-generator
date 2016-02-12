/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */

"use strict";

const tdg = require('../lib/tdg');

const fs = require('fs');
const path = require("path");
const rimraf = require('rimraf');

const fixturesDir = path.join(__dirname, 'fixtures');
const volatileDir = path.join(__dirname, 'fixtures', 'volatile');



describe("TDG test", function () {
	beforeEach(function () {
		// Delete the the 'volatile' directory
		try {
			rimraf.sync(volatileDir);
		} catch (err) {
			console.log(err);
		}
		fs.mkdirSync(volatileDir);

	});

	it('create  a graph', function (done) {
		const structureContent = fs.readFileSync(path.join(fixturesDir, 'test_structure.json'));
		const structJson = JSON.parse(structureContent);

		tdg.loadStructure(structJson, true);
		done();

	});
});
