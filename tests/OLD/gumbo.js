/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */
"use strict";


const iterationCount = 20;

const registry = {
	"application": {
		"name": "application",
		"tdg": {
			"count_all": 10
		},
		"min_id": 0,
		"max_id": 9,
		"type": "vertex"
	},
	"account": {
		"name": "account",
		"description": "An account of an application",
		"tdg": {
			"count_all": 1000
		},
		"min_id": 10,
		"max_id": 1009,
		"type": "vertex"
	}
};


const elementConfig = {
	"name": "application",
	"start": 10,
	"while": {
		"add": 10,
		"remove": 4
	}
};

gugu(registry, iterationCount, registry.application, elementConfig);

function warning(msg) {
	console.log(msg);
}

function gugu(registry, iterationCount, vertex, elementConfig) {

	for (let currentIteration = 0; currentIteration < iterationCount; currentIteration++) {
		console.log(`Iteration ${currentIteration}`);

		// ----------------------------------
		// -- Initial phase iteration '0'
		// ----------------------------------
		if (currentIteration === 0) {
			startIteration(registry, vertex, elementConfig);
		}

		// ----------------------------------
		// -- Iterations
		// ----------------------------------
		iterAdd(registry, vertex, currentIteration, iterationCount, elementConfig);
		iterRemove(registry, vertex, currentIteration, iterationCount, elementConfig);
	}


	logme(vertex, iterationCount, elementConfig);
}

/**
 * Adds elements over time.
 * @param registry (object) The object contains all the vertices
 * @param vertex (object) The original vertex object
 * @param currentIteration (number) The number of the current iteration
 * @param iterationCount (number) The total number of iterations
 * @param elementConfig (object) The element configuration
 */
function iterAdd(registry, vertex, currentIteration, iterationCount, elementConfig) {
	const status = vertex.timeshift_status;
	const remainingIterations = iterationCount - currentIteration;
	const remainingElements = (status.available.max - status.available.min) + 1;

	if (remainingElements > 0) {
		let addedElements;
		if (remainingIterations === 1) {
			// This is the last iteration, add all not already added
			addedElements = addElements(remainingElements, status);
		} else {
			const elemToAdd = Math.floor(remainingElements / remainingIterations);
			if (elemToAdd > 0) {
				// add more then one element in each iteration
				addedElements = addElements(elemToAdd, status);
			} else {
				if (status.add_on_iteration) {
					if (currentIteration === status.add_on_iteration) {
						delete(status.add_on_iteration);
						addedElements = addElements(1, status);
					}
				} else {
					const addAfterEach = Math.floor(1 / (remainingElements / remainingIterations));
					status.add_on_iteration = currentIteration + addAfterEach;
					// store the value in the status object o
					console.log("   " + `Add on iteration  ${status.add_on_iteration}`);
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
			console.log("   " + `a:${addedElements.length}`);
		}
	}

	// -----------------------------------
	// -- now check for sub elements
	// -----------------------------------
	if (elementConfig.sub_vertex) {
		Object.keys(elementConfig.sub_vertex).forEach((name) => {
			const subConfig = elementConfig.sub_vertex[name];
			const subVertex = registry[name];
			iterAdd(registry, subVertex, currentIteration, iterationCount, subConfig);
		});
	}

}


/**
 * Removes elements over time.
 * @param registry (object) The object contains all the vertices
 * @param vertex (object) The original vertex object
 * @param currentIteration (number) The number of the current iteration
 * @param iterationCount (number) The total number of iterations
 * @param elementConfig (object) The element configuration
 */
function iterRemove(registry, vertex, currentIteration, iterationCount, elementConfig) {
	if (elementConfig.while && elementConfig.while.remove) {
		const status = vertex.timeshift_status;
		const remainingIterations = iterationCount - currentIteration;
		const remainingElements = elementConfig.while.remove - status.removed.length;
		if (remainingElements > 0) {
			let removedElements;
			if (remainingIterations === 1) {
				// This is the last iteration, add all not already added
				removedElements = removeElements(remainingElements, status, currentIteration);
			} else {
				const elemToremove = Math.floor(remainingElements / remainingIterations);
				if (elemToremove > 0) {
					// add more then one element in each iteration
					removedElements = removeElements(elemToremove, status, currentIteration);
				} else {
					if (status.remove_on_iteration) {
						if (currentIteration === status.remove_on_iteration) {
							delete(status.remove_on_iteration);
							removedElements = removeElements(1, status, currentIteration);
						}
					} else {
						const removeAfterEach = Math.floor(1 / (remainingElements / remainingIterations));
						status.remove_on_iteration = currentIteration + removeAfterEach;
						// store the value in the status object o
						console.log("   " + `Remove on iteration  ${status.remove_on_iteration}`);
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
				console.log("   " + `r:${removedElements.length}`);
			}
		}
	}

	// -----------------------------------
	// -- now check for sub elements
	// -----------------------------------
	if (elementConfig.sub_vertex) {
		Object.keys(elementConfig.sub_vertex).forEach((name) => {
			const subConfig = elementConfig.sub_vertex[name];
			const subVertex = registry[name];
			iterRemove(registry, subVertex, currentIteration, iterationCount, subConfig);
		});
	}
}

/**
 * Remove the given amount of elements from the result array. Also updates the
 * current available elements
 * @param elemCount (number) The number of elements to add
 * @param status (object) This objects trakc which elements are currently active and which still available
 * @param currentIteration (number) The number of the current iteration
 * @return result (array) The new added elements
 */
function removeElements(elemCount, status, currentIteration) {
	const result = [];
	for (let i = 0; i < elemCount; i++) {
		if (status.active.length > 0) {
			// removes the first element from the active elements
			const elem = status.active.shift;
			status.removed.push(elem);
			result.push(elem);
		} else {
			const msg = {
				"message": `Should remove %{elemCount} elements but currently only ${status.active.length} are active.`,
				"iteration": currentIteration
			};
			warning(msg);
			break;
		}
	}
	return result;
}

/**
 * Initializes the first iteration
 * @param registry (object) The object contains all the vertices
 * @param vertex (object) The vertex object to distribute the elements for
 * @param elementConfig (object) The element configuration
 * @return result (object) An object with an hash used for this vertex
 */
function startIteration(registry, vertex, elementConfig) {
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
		const addedElements = addElements(start, status);
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
			const subVertex = registry[name];
			startIteration(registry, subVertex, subConfig);
		});
	}
}

/**
 * Add the given amount of elements to the result array. Also updates the
 * current available elements
 * @param elemCount (number) The number of elements to add
 * @param status (object) This objects trakc which elements are currently active and which still available
 * @return result (array) The new added elements
 */
function addElements(elemCount, status) {
	const result = [];
	for (let i = 0; i < elemCount; i++) {
		result.push(status.available.min);
		status.active.push(status.available.min);
		status.available.min++;
	}
	return result;
}

function logme(vertex, iterationCount, config) {
	let elemToRemove = 0;
	if (config.while && config.while.remove) {
		elemToRemove = config.while.remove;
	}
	console.log("---------------------------------------");
	console.log(`Name:             ${vertex.name}`);
	console.log(`Iterations:       ${iterationCount}`);
	console.log(`Elements to do:   ${vertex.max_id-vertex.min_id+1}`);
	console.log(`Elements to RM:   ${elemToRemove}`);
	console.log(`End Elements:     ${vertex.timeshift_status.active.length}`);
	console.log(`End Elements RM:  ${vertex.timeshift_status.removed.length}`);
	console.log(`Avail min:        ${vertex.timeshift_status.available.min}`);
	console.log(`Avail max:        ${vertex.timeshift_status.available.max}`);
	console.log(``);
	console.log(JSON.stringify(vertex.timeshift_store));
}
