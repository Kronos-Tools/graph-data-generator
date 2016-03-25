/* jslint node: true, esnext: true */
"use strict";

/**
 * Shift the vertices over the time
 * @param model (object) The configuration model
 * @param logger (object) A logger module
 */
module.exports = function (model, logger) {

	const iterationCount = model.time_shift.global.iterations;
	const tsVertices = model.time_shift.vertices;

	// loop the iterations of time shifting
	for (let currentIteration = 0; currentIteration < iterationCount; currentIteration++) {
		logger.debug(`TimeShift: Work on iteration ${currentIteration}`);
		// ----------------------------------
		// -- Initial phase iteration '0'
		// ----------------------------------
		if (currentIteration === 0) {
			Object.keys(tsVertices).forEach((vertexName) => {
				logger.debug(`TimeShift: Create start elements for ${vertexName}`);
				const tsVertexConfig = tsVertices[vertexName];
				startIteration(model.registry, tsVertexConfig, logger);
			});
		}

		// ----------------------------------
		// -- Iterations
		// ----------------------------------
		Object.keys(tsVertices).forEach((vertexName) => {
			logger.debug(`TimeShift: Shift elements for ${vertexName}`);
			const tsVertexConfig = tsVertices[vertexName];
			iterAdd(model.registry, tsVertexConfig, logger, currentIteration, iterationCount);
			iterRemove(model.registry, tsVertexConfig, logger, currentIteration, iterationCount);
		});
	}

	// after all remove the status fields from the registry
	logger.debug(`TimeShift: Delete time shift status`);
	Object.keys(model.registry.vertices).forEach((vertexName) => {
		const vertex = model.registry.vertices[vertexName];
		delete(vertex.timeshift_status);
	});

};
/**
 * Removes elements over time.
 * @param registry (object) The object contains all the vertices
 * @param elementConfig (object) The element configuration
 * @param currentIteration (number) The number of the current iteration
 * @param logger (object) A logger object
 * @param iterationCount (number) The total number of iterations
 */
function iterRemove(registry, elementConfig, logger, currentIteration, iterationCount) {
	if (elementConfig.remove) {
		const vertexName = elementConfig.name;
		const vertex = registry.vertices[vertexName];
		const status = vertex.timeshift_status;
		const remainingIterations = iterationCount - currentIteration;
		const remainingElements = elementConfig.remove - status.removed.length;
		if (remainingElements > 0) {
			let removedElements;
			if (remainingIterations === 1) {
				// This is the last iteration, add all not already added
				removedElements = removeElements(remainingElements, status, logger, currentIteration);
			} else {
				const elemToremove = Math.floor(remainingElements / remainingIterations);
				if (elemToremove > 0) {
					// add more then one element in each iteration
					removedElements = removeElements(elemToremove, status, logger, currentIteration);
				} else {
					if (status.remove_on_iteration) {
						if (currentIteration === status.remove_on_iteration) {
							delete(status.remove_on_iteration);
							removedElements = removeElements(1, status, logger, currentIteration);
						}
					} else {
						const removeAfterEach = Math.floor(1 / (remainingElements / remainingIterations));
						status.remove_on_iteration = currentIteration + removeAfterEach;
						// store the value in the status object o
						logger.debug("   " + `Remove on iteration  ${status.remove_on_iteration}`);
					}
				}
			}

			let thisIterChange;
			if (vertex.timeshift_store.iter[currentIteration]) {
				thisIterChange = vertex.timeshift_store.iter[currentIteration];
			} else {
				thisIterChange = {};
				vertex.timeshift_store.iter[currentIteration] = thisIterChange;
			}
			if (removedElements) {
				thisIterChange.r = removedElements;
				// store the added values
				logger.debug("   " + `r:${removedElements.length}`);
			}
		}
	}

	// -----------------------------------
	// -- now check for sub elements
	// -----------------------------------
	if (elementConfig.sub_vertex) {
		Object.keys(elementConfig.sub_vertex).forEach((name) => {
			const subConfig = elementConfig.sub_vertex[name];
			iterRemove(registry, subConfig, logger, currentIteration, iterationCount);
		});
	}
}

/**
 * Remove the given amount of elements from the result array. Also updates the
 * current available elements
 * @param elemCount (number) The number of elements to add
 * @param status (object) This objects trakc which elements are currently active and which still available
 * @param logger (object) A logger object
 * @param currentIteration (number) The number of the current iteration
 * @return result (array) The new added elements
 */
function removeElements(elemCount, status, logger, currentIteration) {
	const result = [];
	for (let i = 0; i < elemCount; i++) {
		if (status.active.length > 0) {
			// removes the first element from the active elements
			const elem = status.active.shift();
			status.removed.push(elem);
			result.push(elem);
		} else {
			const msg = {
				"message": `Should remove %{elemCount} elements but currently only ${status.active.length} are active.`,
				"iteration": currentIteration
			};
			logger.warning(msg);
			break;
		}
	}
	return result;
}

/**
 * Adds elements over time.
 * @param registry (object) The object contains all the vertices
 * @param elementConfig (object) The element configuration
 * @param logger (object) A logger object
 * @param currentIteration (number) The number of the current iteration
 * @param iterationCount (number) The total number of iterations
 */
function iterAdd(registry, elementConfig, logger, currentIteration, iterationCount) {
	const vertexName = elementConfig.name;
	const vertex = registry.vertices[vertexName];
	const status = vertex.timeshift_status;
	const remainingIterations = iterationCount - currentIteration;
	const remainingElements = (status.available.max - status.available.min) + 1;

	if (remainingElements > 0) {
		let addedElements;
		if (remainingIterations === 1) {
			// This is the last iteration, add all not already added
			addedElements = addElements(remainingElements, status, logger);
		} else {
			const elemToAdd = Math.floor(remainingElements / remainingIterations);
			if (elemToAdd > 0) {
				// add more then one element in each iteration
				addedElements = addElements(elemToAdd, status, logger);
			} else {
				if (status.add_on_iteration) {
					if (currentIteration === status.add_on_iteration) {
						delete(status.add_on_iteration);
						addedElements = addElements(1, status, logger);
					}
				} else {
					const addAfterEach = Math.floor(1 / (remainingElements / remainingIterations));
					status.add_on_iteration = currentIteration + addAfterEach;
					// store the value in the status object o
					logger.debug("   " + `Add on iteration  ${status.add_on_iteration}`);
				}
			}
		}

		let thisIterChange;
		if (vertex.timeshift_store.iter[currentIteration]) {
			thisIterChange = vertex.timeshift_store.iter[currentIteration];
		} else {
			thisIterChange = {};
			vertex.timeshift_store.iter[currentIteration] = thisIterChange;
		}
		if (addedElements) {
			thisIterChange.a = addedElements;
			// store the added values
			logger.debug("   " + `a:${addedElements.length}`);
		}
	}

	// -----------------------------------
	// -- now check for sub elements
	// -----------------------------------
	if (elementConfig.sub_vertex) {
		Object.keys(elementConfig.sub_vertex).forEach((name) => {
			const subConfig = elementConfig.sub_vertex[name];
			iterAdd(registry, subConfig, logger, currentIteration, iterationCount);
		});
	}

}


/**
 * Initializes the first iteration
 * @param registry (object) The object contains all the vertices
 * @param elementConfig (object) The element configuration
 * @param logger (object) A logger object
 * @return result (object) An object with an hash used for this vertex
 */
function startIteration(registry, elementConfig, logger) {
	const vertexName = elementConfig.name;
	const vertex = registry.vertices[vertexName];

	const store = {
		"start": [],
		"iter": []
	};


	// The status shows which elements currently active or still available
	// this information will not be stored after all iterations are processed
	const status = {
		"available": {
			"min": vertex.min_id,
			"max": vertex.max_id
		},
		"active": [],
		"removed": []
	};

	// set the initial values
	const start = elementConfig.start;
	if (start) {
		// there are start values to add
		const addedElements = addElements(start, status, logger);
		store.start = addedElements;
	}
	vertex.timeshift_status = status;
	vertex.timeshift_store = store;

	// -----------------------------------
	// -- now check for sub elements
	// -----------------------------------
	if (elementConfig.sub_vertex) {
		Object.keys(elementConfig.sub_vertex).forEach((name) => {
			const subConfig = elementConfig.sub_vertex[name];
			startIteration(registry, subConfig);
		});
	}
}

/**
 * Add the given amount of elements to the result array. Also updates the
 * current available elements
 * @param elemCount (number) The number of elements to add
 * @param status (object) This objects tracks which elements are currently active and which still available
 * @param logger (object) A logger object
 * @return result (array) The new added elements
 */
function addElements(elemCount, status, logger) {
	const result = [];
	for (let i = 0; i < elemCount; i++) {
		result.push(status.available.min);
		status.active.push(status.available.min);
		status.available.min++;
	}
	return result;
}
