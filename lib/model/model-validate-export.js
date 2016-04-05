/* jslint node: true, esnext: true */
"use strict";



/**
 * Validates the vertices of the given model
 * @param model (object) The config model
 * @param logger (object) The logger to logg the errors
 * @return isOk (boolean) False if an error was found
 */
module.exports = function (model, logger) {
	logger.info(`Validate the export config`);

	let isOk = true;


	if (!model.data_generator) {
		logger.error({
			"message": `The model does not contain a data generator`
		});

		isOk = false;
	}

	if (model.export_config) {
		Object.keys(model.export_config).forEach((objectName) => {
			const config = model.export_config[objectName];
			config.name = objectName;
			if (!validateObject(model, logger, config)) {
				isOk = false;
			}
		});
	} else {
		logger.info('No export config defined');
	}

	return isOk;
};


/**
 * Validates a single export configuration
 * @param model (object) The model
 * @param logger (object) The logger
 * @param config (object) The configuration to validate
 * @return isOk (boolean) False if an error was found
 */
function validateObject(model, logger, config) {
	let isOk = 0;

	isOk += _validateExporter(model, logger, config);
	isOk += _validateWriter(model, logger, config);
	isOk += _validateSources(model, logger, config);
	isOk += _validateDataGenerator(model, logger, config);

	if (isOk > 0) {
		return false;
	}
	return true;
}

/**
 * Iterates each generation method and calls it to proof that the configiration is working
 */
function _validateDataGenerator(model, logger, config) {
	let isOk = 0;

	const dataGenerator = model.data_generator;

	if (!config.data.columns) {
		logger.error({
			"message": `${config.name}: The configuration does not have a 'data.columns' property`,
			"object": config
		});
		isOk++;
	} else {
		Object.keys(config.data.columns).forEach((columnName) => {
			const colConfig = config.data.columns[columnName];
			try {
				dataGenerator.createData(colConfig);
			} catch (err) {
				let errMsg;
				if (typeof err === 'string') {
					errMsg = err;
				} else if (typeof err === 'object') {
					if (err.message) {
						errMsg = err.message;
					} else {
						errMsg = JSON.stringify(err);
					}
				}
				logger.error({
					"message": `${config.name}: Column='${columnName}': The data generator throws an error`,
					"error": errMsg,
					"object": colConfig
				});
				isOk++;
			}

		});
	}

	return isOk;
}


/**
 * Validate the 'source' property
 * @param model (object) The model
 * @param logger (object) The logger
 * @param config (object) The configuration to validate
 * @return isOK (number) If isOK greater than 0 than en error was detected
 */
function _validateSources(model, logger, config) {
	let isOk = 0;

	// does the data property exists
	if (!config.data) {
		logger.error({
			"message": `${config.name}: The configuration does not have a 'data' property`,
			"object": config
		});
		isOk++;
	} else {
		if (!config.data.sources) {
			logger.error({
				"message": `${config.name}: The configuration does not have a 'data.sources' property`,
				"object": config
			});
			isOk++;
		} else {
			// check that the sources exists
			config.data.sources.forEach((source) => {
				// we could only check against the vertex config as at this point in time no data
				// was generated
				if (!model.vertices_registry[source]) {
					logger.error({
						"message": `${config.name}: The given source='${source}' is not a created vertex.`,
						"object": config
					});
					isOk++;
				}
			});
		}
	}
	return isOk;
}

/**
 * Validate the 'exporter_writer' property
 * @param model (object) The model
 * @param logger (object) The logger
 * @param config (object) The configuration to validate
 * @return isOK (number) If isOK greater than 0 than en error was detected
 */
function _validateWriter(model, logger, config) {
	let isOk = 0;

	// does the property exists
	if (!config.exporter_writer) {
		logger.error({
			"message": `${config.name}: The configuration does not have a 'exporter_writer' property`,
			"object": config
		});
		isOk++;
	} else {
		// does the exporter exists
		if (config.exporter_writer.type) {
			if (!model.exporter_writer_factory[config.exporter_writer.type]) {
				logger.error({
					"message": `${config.name}: The writer '${config.exporter_writer}' is not registered at the model`,
					"object": config
				});
				isOk++;
			} else {
				const writer = model.exporter_writer_factory[config.exporter_writer.type];
				if (writer.validate) {
					// if the writer has a validate function we let him validate his configurations
					if (!writer.validate(model, logger, config.exporter_writer)) {
						isOk++;
					}
				}
			}
		}

	}



	return isOk;
}



/**
 * Validate the 'exporter' property
 * @param model (object) The model
 * @param logger (object) The logger
 * @param config (object) The configuration to validate
 * @return isOK (number) If isOK greater than 0 than en error was detected
 */
function _validateExporter(model, logger, config) {
	let isOk = 0;

	// does the property exists
	if (!config.exporter) {
		logger.error({
			"message": `${config.name}: The configuration does not have a 'exporter' property`,
			"object": config
		});
		isOk++;
	}

	// does the exporter exists
	if (!model.exporter[config.exporter]) {
		logger.error({
			"message": `${config.name}: The exporter '${config.exporter}' is not registered at the model`,
			"object": config
		});
		isOk++;
	}

	return isOk;
}
