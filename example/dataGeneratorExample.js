/* jslint node: true, esnext: true */
"use strict";

const path = require('path');

// This would be const gdg = require('graph-data-generator');
const gdg = require('../index').main;


// The directory for the generated data
const targetDir = path.join(__dirname, 'volatile/result');

// these functions are necessary to build the edges
const customEdgeFunctions = require('./fixtures/custom_functions_edge').functions;

const exporterAccount = require('./lib/export/exporter_account').exporterAccountFactory();
const customExporter = {
	"exporter-account": exporterAccount
};

// The config files to use.
// For better readability I have splitted the configuration files into two parts
const config = path.join(__dirname, 'fixtures/config/config.json');
const configExport = path.join(__dirname, 'fixtures/config/config_export.json');

// This enables you to provide your own data generator functions
const customDataGenerators = {};



const options = {
	"target_dir": targetDir,
	"data_generators": customDataGenerators,
	"custom_edge_functions": customEdgeFunctions,
	"custom_exporter": customExporter,
	"config": [
		config,
		configExport
	]
};

gdg(options);
