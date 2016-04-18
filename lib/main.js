/* jslint node: true, esnext: true */
"use strict";

const fs = require('fs');
const tdg = require('./exports');
const mkdirp = require('mkdirp');

module.exports = function (options) {

	validateOptions(options);

	// create the data generator
	const dataGenerator = tdg.generatorDispatcherFactory(prepareDataGenerators(options));


	// The model stores all the configurations and created data
	const model = tdg.modelConfigFactory();

	// set the data henerator to the model
	model.data_generator = dataGenerator;

	// The executer executes the instructions given by the configuration
	const executer = tdg.executerDefaultFactory({
		"model": model,
		"data_generator": dataGenerator
	});

	// This writer writes the intermediate result
	const writerJson = tdg.writerJsonFactory({
		"target_dir": options.target_dir
	});

	// add the custom functions to the model
	if (options.custom_edge_functions) {
		model.addCustomEdgeFunctions(options.custom_edge_functions);
	}

	if (options.custom_exporter) {
		model.addCustomExporter(options.custom_exporter);
	}

	if (options.custom_exporter_writer) {
		// add the factories, not the objects
		model.addCustomExporterWriterFactory(options.custom_exporter_writer);
	}

	// create the exporter dispatcher
	const exporterDispatcher = tdg.exporterDispatcherFactory();

	const exporterDefault = tdg.exporterDefaultFactory();
	model.addCustomExporter({
		"tdg-exporter-default": exporterDefault
	});

	const csvWriterSyncFactory = tdg.csvWriterSyncFactory;
	const fixedWriterSyncFactory = tdg.fixedWriterSyncFactory;
	model.addCustomExporterWriterFactory({
		"tdg-exporter-writer-csv": csvWriterSyncFactory,
		"tdg-exporter-writer-fixed": fixedWriterSyncFactory
	});


	// load all the configuration files
	options.config.forEach((confFile) => {
		model.init(confFile);
	});

	// validate the loaded config files
	const isOk = model.validate(dataGenerator);


	if (isOk) {
		// Start the data generator
		executer.run();

		const promisses = [];
		Object.keys(model.registry.vertices).forEach((vertexName) => {
			const vertex = model.registry.vertices[vertexName];
			promisses.push(writerJson.writeVertex(vertex));
		});

		if (model.registry.edges && Object.keys(model.registry.edges).length > 0) {
			Object.keys(model.registry.edges).forEach((edgeName) => {
				const edge = model.registry.edges[edgeName];
				promisses.push(writerJson.writeEdge(edge));
			});
		}

		Promise.all(promisses).then(() => {
			exporterDispatcher.run(model, model, options.target_dir);

			console.log("--------------------------");
			console.log("-- Finished");
			console.log("--------------------------");
		}).catch((err) => {
			console.log("--------------------------");
			console.log(err);
			console.log("--------------------------");
		});


	} else {
		console.log("--------------------------");
		console.log("-- Finished with ERROR");
		console.log("--------------------------");
	}


};

/**
 * Mixes the default generators with the custom generators
 * @param options (object) The options Object
 * @return dataGenerators (object) The merged data generators
 */
function prepareDataGenerators(options) {
	// get the default generators
	const dataGenerators = {
		"faker": tdg.generatorFakerFactory(),
		"regex": tdg.generatorRegexFactory(),
		"tdg": tdg.generatorTdgFactory(),
		"entitlement": tdg.generatorEntitlementFactory()
	};

	if (options.data_generators) {
		Object.keys(options.data_generators).forEach((genName) => {
			dataGenerators[genName] = options.data_generators[genName];
		});
	}

	return {
		"custom_generators": dataGenerators
	};
}

/**
 * Validates the given options. If an erros was detected an error will be thrown.
 * @param options (object) The options to validate
 */
function validateOptions(options) {
	if (!options) {
		throw 'Error: No options given.';
	}

	if (!options.target_dir) {
		throw 'Error: No target directory given.';
	}

	if (!options.config) {
		throw "Error: No 'config' property given in the options.";
	} else {
		// if it is a single config make it an array
		if (typeof options.config === 'string') {
			options.config = [options.config];
		}
	}

	// Create the target directory if it does not exists
	let stats;
	try {
		stats = fs.lstatSync(options.target_dir);
	} catch (err) {
		// do nothing
	}

	if (!stats) {
		// the path does not exists, create it
		mkdirp.sync(options.target_dir);
	} else {
		if (!stats.isDirectory()) {
			throw `The given target_dir '${options.target_dir}' is not a directory`;
		}
	}

}
