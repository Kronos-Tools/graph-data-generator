/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */
"use strict";

const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const should = chai.should();

const fs = require('fs');
const path = require("path");
const rimraf = require('rimraf');

const tdg = require('../index');
const tdgWriterFactory = tdg.TdgWriter;

const fixturesDir = path.join(__dirname, 'fixtures');
const volatileDir = path.join(__dirname, 'fixtures', 'volatile');

// Set the model to the executer
const writer = tdgWriterFactory({
	"targetDir": volatileDir
});

describe('adapter-outbound-file: test events', function () {
	/**
	 * Clears the test directory. This is the directory where the files will be written
	 */
	beforeEach(function () {
		// Delete the the 'volatile' directory
		try {
			rimraf.sync(volatileDir);
		} catch (err) {
			console.log(err);
		}
		fs.mkdirSync(volatileDir);
	});

	it('Write simple', function (done) {
		const filePath = path.join(volatileDir, 'write_1.json');
		const obj = {
			"name": "Herbert",
			"lastName": "batz"
		};
		const stream = fs.createWriteStream(filePath);
		writer.writeObjectStream(obj, stream);

		// need to wait until the file is written
		setTimeout(() => {
			const fileContent = fs.readFileSync(filePath);
			const resJson = JSON.parse(fileContent);

			assert.deepEqual(obj, resJson);
			done();
		}, 100);
	});

	it('Write edge', function (done) {
		const filePath = path.join(volatileDir, 'write_1.json');
		const obj = {
			"name": "application_has_entitlement",
			"type": "edge",
			"src_name": "application",
			"target_name": "entitlement",
			"objects": {
				"0": [
					3010,
					3011
				],
				"1": [
					1010,
					1011
				],
				"2": [
					2010,
					2011
				]
			}
		};
		const stream = fs.createWriteStream(filePath);
		writer.writeObjectStream(obj, stream);

		// need to wait until the file is written
		setTimeout(() => {
			const fileContent = fs.readFileSync(filePath);
			const resJson = JSON.parse(fileContent);

			assert.deepEqual(obj, resJson);
			done();
		}, 200);
	});


});
