/* jslint node: true, esnext: true */
"use strict";



/**
 * Validates the vertices of the given model
 * @param model (object) The config model
 * @param logger (object) The logger to logg the errors
 * @return isOk (boolean) False if an error was found
 */
module.exports = function (model, logger) {
	logger.info(`Validate the time shift config`);
	const timeShift = model.time_shift;

	// validate the global part
	let isOk = validateGlobal(timeShift, logger);

	if (!validateVertices(model, logger)) {
		isOk = false;
	}

	return isOk;
};

/**
 * Validates the vertices part of the time-shift configuration
 * @param model (object) The config model
 * @param logger (object) The logger to logg the errors
 * @return isOk (boolean) False if an error was found
 */
function validateVertices(model, logger) {
	let isOk = true;

	if (!model.time_shift.vertices) {
		isOk = false;
		const err = {
			"message": `There is no 'vertices' section defined in the time-shift config: ${JSON.stringify(model.time_shift)}`
		};
		logger.error(err);
	}

	if (!_validateVertices(model, model.time_shift.vertices, logger)) {
		isOk = false;
	}

	return isOk;
}

/**
 * Validates the vertices part of the time-shift configuration
 * @param model (object) The config model
 * @param elements (object) The object containing one or more config elements
 * @param logger (object) The logger to logg the errors
 * @return isOk (boolean) False if an error was found
 */
function _validateVertices(model, elements, logger) {
	let isOk = true;

	Object.keys(elements).forEach((vertexName) => {
		const vertexConf = elements[vertexName];
		vertexConf.name = vertexName;

		if (!_validateSingleVertex(model, vertexConf, logger)) {
			isOk = false;
		}

		// if the vertex contains sub vertex objects call this function recursivly
		if (vertexConf.sub_vertex) {
			if (!_validateVertices(model, vertexConf.sub_vertex, logger)) {
				isOk = false;
			}
		}
	});
	return isOk;
}

/**
 * Validates a single vertex configuration
 * @param model (object) The config model
 * @param vertexTimeShiftConfig (object) A single vertex timeShift configuration to validate
 * @param logger (object) The logger to logg the errors
 * @return isOk (boolean) False if an error was found
 */
function _validateSingleVertex(model, vertexTimeShiftConfig, logger) {
	const vertexName = vertexTimeShiftConfig.name;
	let isOk = true;

	// ------------------------------------------
	// - Check that the referenced vertex exists
	// ------------------------------------------
	const vertex = model.vertices[vertexName];
	if (!vertex) {
		const err = {
			"message": `The vertex '${vertexName}' could not be found.`,
			"config": vertexTimeShiftConfig
		};
		logger.error(err);
		isOk = false;
	}

	// ------------------------------------------
	// - Check attributes
	// ------------------------------------------
	if (!vertexTimeShiftConfig.start) {
		const err = {
			"message": `The timeShift config does not have a 'start' attribute`,
			"config": vertexTimeShiftConfig
		};
		logger.error(err);
		isOk = false;
	}

	// ------------------------------------------
	// - Validate the distribution count
	// ------------------------------------------
	const countAll = vertex.tdg.count_all;

	let sum = vertexTimeShiftConfig.start;
	if (vertexTimeShiftConfig.add) {
		sum += vertexTimeShiftConfig.add;
	}

	if (sum !== countAll) {
		const err = {
			"message": `The sum of the changes is ${sum} but the overall amount of data is ${countAll}. Both values should be the same size`,
			"config": vertexTimeShiftConfig
		};
		logger.error(err);
		isOk = false;
	}

	if (vertexTimeShiftConfig.remove) {
		// remove must not be greater than start+add
		const remove = vertexTimeShiftConfig.remove;
		if (remove > sum) {
			const err = {
				"message": `The amount of removes '${remove}' must not be greater than the amaount of available elements '${sum}' (start + add)`,
				"config": vertexTimeShiftConfig
			};
			logger.error(err);
			isOk = false;
		}

		if (vertexTimeShiftConfig.recur) {
			const recur = vertexTimeShiftConfig.recur;

			if (recur > remove) {
				const err = {
					"message": `The amount of recurrence '${recur}' must not be greater than the amount of the removes '${remove}'`,
					"config": vertexTimeShiftConfig
				};
				logger.error(err);
				isOk = false;
			}
		}


	} else {
		if (vertexTimeShiftConfig.recur) {
			const err = {
				"message": `The attribute recur only works if there are removes defined`,
				"config": vertexTimeShiftConfig
			};
			logger.error(err);
			isOk = false;
		}
	}

	return isOk;
}

/**
 * Validates the global part of the time-shift configuration
 * @param timeShiftConfig (object) The time-shift part of the config model
 * @param logger (object) The logger to logg the errors
 * @return isOk (boolean) False if an error was found
 */
function validateGlobal(timeShiftConfig, logger) {
	let isOk = true;

	if (!timeShiftConfig.global) {
		isOk = false;
		const err = {
			"message": `There is no 'global' section defined in the time-shift config: ${JSON.stringify(timeShiftConfig)}`
		};
		logger.error(err);
	}

	if (!timeShiftConfig.global.iterations) {
		isOk = false;
		const err = {
			"message": `There is no 'global.iterations' property defined in the time-shift config: ${JSON.stringify(timeShiftConfig.global)}`
		};
		logger.error(err);
	}
	return isOk;
}
