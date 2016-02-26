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
const tdgModel = tdg.TdgModel();
const tdgExecuter = tdg.TdgExecuterData();
const tdgWriterFactory = tdg.TdgWriter;

const fixturesDir = path.join(__dirname, 'fixtures');
const volatileDir = path.join(__dirname, 'fixtures', 'volatile');


// Set the model to the executer
const writer = tdgWriterFactory({
	"targetDir": volatileDir
});

tdgExecuter.model = tdgModel;
tdgExecuter.writer = writer;


describe('executer', function () {
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

	it('array from range', function (done) {
		const arr = tdgExecuter.createArrayFromRange(5, 9);
		const arrExp = [5, 6, 7, 8, 9];
		assert.deepEqual(arrExp, arr);
		done();
	});


});
