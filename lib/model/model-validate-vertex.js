/* jslint node: true, esnext: true */
"use strict";



/**
 * Validates the vertices of the given model
 * @param model (object) The config model
 * @param logger (object) The logger to logg the errors
 * @return isOk (boolean) False if an error was found
 */
module.exports = function (model, logger) {
	logger.info(`Validate the vertices`);
	const vertices = model.vertices;
	let isOk = true;

	if (!vertices) {
		logger.error(`The model does not contain any vertex`);
		isOk = false;
	}

	if (!timeShiftValidateGlobal(model, logger)) {
		isOk = false;
	}

	if (!validateVertices(vertices, logger)) {
		isOk = false;
	}
	return isOk;
};


/**
 * Validates all the vertex elements in the given vertices object.
 * Also it walk recursive into sub vertices
 * @param vertices (object) Object with all the vertices
 * @param logger (object) The logger to logg the errors
 * @return isOk (boolean) False if an error was found
 */
function validateVertices(vertices, logger) {
	let isOk = true;

	Object.keys(vertices).forEach(vertexName => {
		const vertex = vertices[vertexName];

		if (!vertex.name) {
			logger.error({
				"message": "The vertex object does not contain a 'name' property",
				"object": vertex
			});
			isOk = false;
		}

		if (!vertex.tdg) {
			logger.error({
				"message": "The vertex object does not contain a 'tdg' property",
				"object": vertex
			});
			isOk = false;
		} else {
			if (!vertex.tdg.count_all) {
				logger.error({
					"message": "The vertex object does not contain a 'tdg.count_all' property",
					"object": vertex
				});
				isOk = false;
			}
		}

		// ------------------------------------
		// check the time shift values
		// ------------------------------------
		if (!timeShiftvalidateSingleVertex(vertex, logger)) {
			isOk = false;
		}

		if (vertex.vertices) {
			// check that each element has a 'tdg' element
			if (!validateVertices(vertex.vertices, logger)) {
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
function timeShiftvalidateSingleVertex(vertex, logger) {
	const vertexName = vertex.name;
	let isOk = true;

	// ------------------------------------------
	// - Check for timeshift config, if not set default value
	// ------------------------------------------
	if (!vertex.time_shift) {
		vertex.time_shift = {
			"start": vertex.tdg.count_all
		};
	}



	// ------------------------------------------
	// - Check attributes
	// ------------------------------------------
	if (!vertex.time_shift.start) {
		const err = {
			"message": `The timeShift config does not have a 'start' attribute`,
			"config": vertex.time_shift
		};
		logger.error(err);
		isOk = false;
	}

	// ------------------------------------------
	// - Validate the distribution count
	// ------------------------------------------
	const countAll = vertex.tdg.count_all;

	let sum = vertex.time_shift.start;
	if (vertex.time_shift.add) {
		sum += vertex.time_shift.add;
	}

	if (sum !== countAll) {
		const err = {
			"message": `The sum of the changes is ${sum} but the overall amount of data is ${countAll}. Both values should be the same size`,
			"config": vertex.time_shift
		};
		logger.error(err);
		isOk = false;
	}

	if (vertex.time_shift.remove) {
		// remove must not be greater than start+add
		const remove = vertex.time_shift.remove;
		if (remove > sum) {
			const err = {
				"message": `The amount of removes '${remove}' must not be greater than the amaount of available elements '${sum}' (start + add)`,
				"config": vertex.time_shift
			};
			logger.error(err);
			isOk = false;
		}

		if (vertex.time_shift.recur) {
			const recur = vertex.time_shift.recur;

			if (recur > remove) {
				const err = {
					"message": `The amount of recurrence '${recur}' must not be greater than the amount of the removes '${remove}'`,
					"config": vertex.time_shift
				};
				logger.error(err);
				isOk = false;
			}
		}


	} else {
		if (vertex.time_shift.recur) {
			const err = {
				"message": `The attribute recur only works if there are removes defined`,
				"config": vertex.time_shift
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
function timeShiftValidateGlobal(model, logger) {
	let isOk = true;

	if (!model.time_shift) {
		model.time_shift = {
			"iterations": 1
		};
	}

	if (model.time_shift.iterations < 1) {
		const err = {
			"message": `The iterations count '${model.time_shift.iterations}' must be greater than '0'`,
			"config": model.time_shift
		};
		logger.error(err);
		isOk = false;
	}

	return isOk;
}
