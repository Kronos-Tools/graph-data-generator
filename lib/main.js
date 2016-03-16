/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */

"use strict";

const fs = require('fs');
const path = require('path');

const tdgModel = require('./tdg/tdg-model').factory();
const tdgExecuterFactory = require('./tdg/tdg-executer-data').factory;
const tdgWriterFactory = require('./tdg/tdg-writer').factory;


const tdgDataGeneratorFactory = require('./generator/data-generator').factory;


const tdgExporterFactory = require('./exporter/tdg-exporter').factory;
const tdgExporterCsvFactory = require('./exporter/tdg-exporter-csv');

const modelFunctions = {};
const dataGenerators = {};
const exporter = {};


/**
 * The main entry point to run the TestDataGenerator
 */
const run = function (opts) {
	if (typeof opts === 'string') {
		const confFile = opts;
		opts = {
			"config_file": confFile
		};
	}

	if (!opts.config_file) {
		throw `No configiuration file given.`;
	}


	if (!opts.target_dir) {
		opts.target_dir = ".";
	}

	console.log(`Config file      : ${opts.config_file}`);
	console.log(`Target directory : ${opts.target_dir}`);

	// load the file content
	const modelContent = fs.readFileSync(opts.config_file);
	const modelJsonData = JSON.parse(modelContent);

	tdgModel.init(modelJsonData);


	if (opts.config_file_key_data) {
		// load the file content
		const modelContentKey = fs.readFileSync(opts.config_file_key_data);
		const modelKeyJsonData = JSON.parse(modelContentKey);

		tdgModel.init(modelKeyJsonData);
	}

	// Set the model to the executer
	const writer = tdgWriterFactory({
		"target_dir": opts.target_dir
	});

	const tdgExecuter = tdgExecuterFactory({
		"functions": modelFunctions
	});


	tdgExecuter.model = tdgModel;
	tdgExecuter.writer = writer;

	//---------------------------
	// prepare data generator
	//---------------------------
	const dataGeneratorConfig = {};
	// TODO
	const tdgDataGenerator = tdgDataGeneratorFactory(dataGeneratorConfig);

	//---------------------------
	// prepare File exporter
	//---------------------------
	const exporterConfig = {
		"dataGenerator": tdgDataGenerator,
		"model": JSON.parse(fs.readFileSync(opts.config_file_exporter)),
		"target_dir": opts.target_dir,
		"exporter": exporter
	};
	const tdgExporter = tdgExporterFactory(exporterConfig);



	//---------------------------
	// Start the process
	//---------------------------
	tdgExecuter.createVertices()
		.then(() => {
			tdgExecuter.createEdges();
		})
		.then(() => {
			tdgExecuter.createKeyDataEdges();
		});
};


// const runKeyData = function () {
// 	// TODO
// };
//
// const runCreateFiles = function () {
// 	// TODO
// };

/**
 * This function could be used if
 */
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

/**
 * Add the custom functions to the TestDataGenerator
 * @param functions (object) An hash with all the cutsom functions.
 */
const addCustomFunctions = function (functions) {
	Object.keys(functions).forEach(name => {
		modelFunctions[name] = functions[name];
	});
};

/**
 * Add the custom functions to the TestDataGenerator
 * @param functions (object) An hash with all the cutsom functions.
 */
const addCustomExporter = function (exporter) {
	Object.keys(exporter).forEach(name => {
		exporter[name] = exporter[name];
	});
};

module.exports.run = run;
module.exports.addCustomFunctions = addCustomFunctions;
module.exports.addCustomExporter = addCustomExporter;
