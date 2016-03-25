/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */
"use strict";

// const chai = require('chai');
// const assert = chai.assert;
// const expect = chai.expect;
// const should = chai.should();

const fs = require('fs');
const path = require("path");
const rimraf = require('rimraf');

const tdg = require('../../lib/exports');


const tdgTimeshiftDispatcher = tdg.tdgTimeshiftDispatcherFactory();

const fixturesDir = path.join(__dirname, 'fixtures');
const volatileDir = path.join(__dirname, 'volatile');

// loads the registry content as expected
const registry = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'registry.json')));

// loads the model as it is expected
const modelJsonData = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'timeshift.json')));

// prepare the timeshift dispatcher
tdgTimeshiftDispatcher.model = modelJsonData;
tdgTimeshiftDispatcher.registry = registry;


tdgTimeshiftDispatcher.createTimeshift();
