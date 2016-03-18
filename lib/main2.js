/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */

"use strict";

const fs = require('fs');
const path = require('path');

const tdg = require('./exports');

const modelFunctions = {};

const dataGenerators = {
	"faker": tdg.tdgDataGeneratorFakerFactory(),
	"regex": tdg.tdgDataGeneratorRegexFactory(),
	"tdg": tdg.tdgDataGeneratorTdgFactory(),
	"entitlement": tdg.tdgDataGeneratorEntitlementFactory()
};

const exporterWriter = {
	"tdg-exporter-writer-csv": tdg.tdgExporterWriterCsvFactory
};

const exporter = {
	"tdg-exporter-default": tdg.tdgExporterDefaultFactory()
};

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
 * Add custom exporter
 * @param functions (object) An hash with all the cutsom functions.
 */
const addCustomExporter = function (exporterObjects) {
	Object.keys(exporterObjects).forEach(name => {
		exporter[name] = exporterObjects[name];
	});
};

/**
 * Add custom exporter-writer
 * @param functions (object) An hash with all the cutsom functions.
 */
const addCustomExporterWriter = function (exporterWriter) {
	Object.keys(exporterWriter).forEach(name => {
		exporter[name] = exporterWriter[name];
	});
};

/**
 * Add custom data generators
 * @param functions (object) An hash with all the cutsom functions.
 */
const addCustomGenerator = function (generator) {
	Object.keys(generator).forEach(name => {
		dataGenerators[name] = generator[name];
	});
};

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



const run = function (opts) {
	validateOptions(opts);

	let tdgModel = tdg.tdgModelFactory();
	let needWriter = false;
	let executer;
	if (opts.config_file) {
		prepareModel(tdgModel, opts.config_file);
		needWriter = true;
		executer = tdg.tdgExecuterFactory({
			"functions": modelFunctions
		});
	}

	let tdgDataGeneratorDispatcher;
	if (opts.config_file_key_data) {
		prepareModel(tdgModel, opts.config_file_key_data);
		needWriter = true;

		// in this case also the dataGenerator is needed
		tdgDataGeneratorDispatcher = tdg.tdgDataGeneratorDispatcherFactory({
			"custom_generators": dataGenerators
		});
		executer = tdg.tdgExecuterDataFactory({
			"dataGenerator": tdgDataGeneratorDispatcher,
			"functions": modelFunctions
		});
	}

	let tdgWriter;
	if (needWriter) {
		// Set the model to the executer
		tdgWriter = tdg.tdgWriterFactory({
			"target_dir": opts.target_dir
		});
	}

	if (executer) {
		executer.model = tdgModel;
		if (tdgWriter) {
			executer.writer = tdgWriter;
		}
	}

	let tdgExporter;
	if (opts.config_file_exporter) {

		if (!tdgDataGeneratorDispatcher) {
			// in this case also the dataGenerator is needed
			tdgDataGeneratorDispatcher = tdg.tdgDataGeneratorDispatcherFactory({
				"custom_generators": dataGenerators
			});
		}

		const exporterConfig = {
			"model": JSON.parse(fs.readFileSync(opts.config_file_exporter)),
			"target_dir": opts.target_dir,
			"data_generator": tdgDataGeneratorDispatcher,
			"exporter": exporter,
			"exporter_writer": exporterWriter
		};
		tdgExporter = tdg.tdgExporterDispatcherFactory(exporterConfig);
	}

	// There are the key data files given
	let registry;
	if (opts.json_files) {
		// the model is already created
		registry = createRegistry(opts.json_files.src_dir, opts.json_files.files);
	}

	if (opts.key_data_json_files) {
		// the key data is already created
		registry = createRegistry(opts.key_data_json.src_dir, opts.key_data_json.files);
	}

	//---------------------------------------------------------------------------------
	// Start the process
	//---------------------------------------------------------------------------------


	//---------------------------
	// base model
	//---------------------------
	let promiseBase = executeBaseModel(opts, executer);

	//---------------------------
	// key data
	//---------------------------
	let promiseKeyData = executeKeyData(promiseBase, opts, executer);

	//---------------------------
	// export files
	//---------------------------
	let promiseExport = executeExporter(promiseKeyData, opts, tdgExporter);



};
/**
 * Exports the test data
 * @param promise (promise) The promise from the previous task to wait for
 * @param opts (object) The options of the run method
 * @param executer (object) The executer which creates the base model
 * @return promise (promise)
 */
function executeExporter(promise, opts, exporter) {
	if (opts.config_file_exporter) {
		return promise.then((registry) => {
			console.log("------------------------------------------------------------------");
			console.log("-- export files");
			console.log("------------------------------------------------------------------");
			exporter.registry = registry;
			return exporter.run();
		});

	}
	return Promise.resolve();
}


/**
 * Execute the creation of the base model data or loads existing base model data
 * @param opts (object) The options of the run method
 * @param executer (object) The executer which creates the base model
 * @return promise (promise)
 */
function executeBaseModel(opts, executer) {
	if (opts.config_file) {
		// create the base model
		console.log("------------------------------------------------------------------");
		console.log("-- create vertices");
		console.log("------------------------------------------------------------------");
		return executer.createVertices()
			.then(() => {
				console.log("------------------------------------------------------------------");
				console.log("-- create edges");
				console.log("------------------------------------------------------------------");
				return executer.createEdges();
			});

	} else if (opts.base_model_dir && opts.base_model_files) {
		executer.registry = createRegistry(opts.base_model_dir, opts.base_model_files);
	}
	return Promise.resolve();
}

/**
 * Execute the creation of the key data or loads existing key data
 * @param promise (promise) The promise from the previous task to wait for
 * @param opts (object) The options of the run method
 * @param executer (object) The executer which creates the base model
 * @return promise (promise) The promise contains the registry with the generated data
 */
function executeKeyData(promise, opts, executer) {
	if (opts.config_file_key_data) {
		// create also the keyData
		return promise.then(() => {
			console.log("------------------------------------------------------------------");
			console.log("-- create key data edges");
			console.log("------------------------------------------------------------------");
			return executer.createKeyDataEdges().then(() => {
				return Promise.resolve(executer.registry);
			});
		});
	} else if (opts.key_data_model_dir && opts.key_data_model_files) {
		return Promise.resolve(createRegistry(opts.key_data_model_dir, opts.key_data_model_files));
	}
	return Promise.reject();
}



/**
 * Initiliazes the model with the given config file
 * @param tdgModel (object) The TdgModel Object
 * @param fileName (string) The config file name
 */
function prepareModel(tdgModel, fileName) {
	// load the file content
	const modelContent = fs.readFileSync(fileName);
	const modelJsonData = JSON.parse(modelContent);
	tdgModel.init(modelJsonData);
}


/**
 * Validates the options.
 */
function validateOptions(opts) {
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
}


module.exports.run = run;
module.exports.addCustomFunctions = addCustomFunctions;
module.exports.addCustomExporter = addCustomExporter;
module.exports.addCustomExporterWriter = addCustomExporterWriter;
