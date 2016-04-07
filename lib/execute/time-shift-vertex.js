/* jslint node: true, esnext: true */
"use strict";

const dcopy = require('deep-copy');

const edgesHelper = require('./edge_parent_child');
const edgesHelper2 = require('./edge');

/**
 * Shift the vertices over the time
 * @param model (object) The configuration model
 * @param logger (object) A logger module
 */
module.exports = function (model, nextId, logger) {
	const iterationCount = model.time_shift.iterations;
	const tsVertices = model.vertices;
	const tsEdges = model.edges;

	// ------------------------------------------------------------------------------------------------------
	// VERTEX only: loop the iterations for time shifting
	// ------------------------------------------------------------------------------------------------------
	for (let currentIteration = 0; currentIteration < iterationCount; currentIteration++) {
		logger.info("-----------------------------------------------------------");
		logger.info(`TimeShift: Work on iteration ${currentIteration}`);
		logger.info("-----------------------------------------------------------");
		// ----------------------------------
		// -- Initial phase iteration '0'
		// ----------------------------------
		if (currentIteration === 0) {
			logger.debug(`TimeShift: Create start elements.`);
			startIteration(model, logger, tsVertices);
		} else {
			// ----------------------------------
			// -- Iterations
			// ----------------------------------
			iterAdd(model, tsVertices, logger, currentIteration, iterationCount);
			iterRemove(model, tsVertices, logger, currentIteration, iterationCount);

		}

	}

	logger.info("-----------------------------------------------------------");
	logger.info(`Start with the edges`);
	logger.info("-----------------------------------------------------------");


	// ------------------------------------------------------------------------------------------------------
	// Edges only: loop the iterations for time shifting
	// ------------------------------------------------------------------------------------------------------

	// normal edges set
	const ignoreEdgesSet = new Set();
	Object.keys(tsEdges).forEach((edge) => {
		ignoreEdgesSet.add(edge.name);
	});

	// loop the iterations for time shifting
	for (let currentIteration = 0; currentIteration < iterationCount; currentIteration++) {
		logger.info("-----------------------------------------------------------");
		logger.info(`TimeShift: Work on iteration ${currentIteration}`);
		logger.info("-----------------------------------------------------------");

		Object.keys(model.registry.vertices).forEach((vertexName) => {
			const vertex = model.registry.vertices[vertexName];
			// update time shift status for iteration
			updateTimeShiftStatusVertex(vertex, currentIteration);
		});

		Object.keys(model.registry.edges).forEach((edgeName) => {
			const edge = model.registry.edges[edgeName];
			if (!ignoreEdgesSet.has(edgeName)) {
				// ok, update time shift status for iteration
				updateTimeShiftStatusEdge(edge, currentIteration);
			}
		});


		// ----------------------------------
		// -- Iterations
		// ----------------------------------
		iterAddEdges(model, tsEdges, logger, currentIteration, iterationCount);

		// print status
		logger.info("-----------------------------------------------------------");
		Object.keys(tsEdges).forEach((edgeName) => {
			if (model.registry.edges[edgeName].time_shift_status) {
				logger.info(`Created '${model.registry.edges[edgeName].time_shift_status.count_all}' edges for '${edgeName}'`);
			} else {
				logger.info(`Created '0' edges for '${edgeName}'`);
			}
		});
		logger.info("-----------------------------------------------------------");


	}

	// after all remove the status fields from the registry
	logger.debug(`TimeShift: Delete time shift status`);
	Object.keys(model.registry.vertices).forEach((vertexName) => {
		const vertex = model.registry.vertices[vertexName];
		delete(vertex.time_shift_status);
	});

	Object.keys(model.registry.edges).forEach((edgeName) => {
		const edge = model.registry.edges[edgeName];
		delete(edge.time_shift_status);
	});


};


function updateTimeShiftStatusVertex(vertex, currentIteration) {
	if (currentIteration === 0) {
		vertex.time_shift_status = {
			"active": [],
			"removed": []
		};
	}

	const active = vertex.time_shift_status.active;
	const removed = vertex.time_shift_status.removed;
	const changes = vertex.time_shift_store.iter[currentIteration];

	if (changes) {
		arrayRemoveElements(active, changes.r);
		arrayRemoveElements(removed, changes.a);
		arrayConcatUnique(active, changes.a);
		arrayConcatUnique(removed, changes.r);
	}
}

function updateTimeShiftStatusEdge(edge, currentIteration) {
	if (currentIteration === 0) {
		edge.time_shift_status = {
			"active": {},
			"removed": {}
		};
	}

	const active = edge.time_shift_status.active;
	const removed = edge.time_shift_status.removed;
	const changes = edge.time_shift_store.iter[currentIteration];

	if (changes) {
		if (changes.a) {
			Object.keys(changes.a).forEach((key) => {
				if (!active[key]) {
					active[key] = changes.a[key];
				} else {
					arrayConcatUnique(active[key], changes.a[key]);
				}

				if (removed[key]) {
					arrayRemoveElements(removed[key], changes.a);
					if (removed[key].length === 0) {
						delete(removed[key]);
					}
				}
			});
		}

		if (changes.r) {
			Object.keys(changes.r).forEach((key) => {
				if (!removed[key]) {
					removed[key] = changes.r[key];
				} else {
					arrayConcatUnique(removed[key], changes.r[key]);
				}

				if (active[key]) {
					arrayRemoveElements(active[key], changes.r);
					if (active[key].length === 0) {
						delete(active[key]);
					}
				}
			});
		}
	}

}

/**
 * Adds the elements from array2 to the array1
 */
function arrayConcatUnique(array1, array2) {
	if (!array1) {
		array1 = [];
	}
	if (array2) {
		array2.forEach((val) => {
			if (array1.indexOf(val) < 0) {
				array1.push(val);
			}
		});
	}
}
/**
 * removes the elements from an array and returns the new array
 */
function arrayRemoveElements(array, remove) {
	if (remove && remove.length > 0) {
		const result = [];
		array.forEach((val) => {
			if (remove.indexOf(val) < 0) {
				result.push(val);
			}
		});
		array = result;
	}
}

/**
 * Adds new edges
 * @param registry (object) The object contains all the vertices
 * @param elementConfigs (object) An object with the element configurations for the edges
 * @param logger (object) A logger object
 * @param currentIteration (number) The number of the current iteration
 * @param iterationCount (number) The total number of iterations
 * @param parentVertex (object) The parent vertes if there is any
 */
function iterAddEdges(model, elementConfigs, logger, currentIteration, iterationCount, parentVertex) {
	const registry = model.registry;
	Object.keys(elementConfigs).forEach((edgeName) => {
		logger.debug(`TimeShift edge: Add elements for ${edgeName}`);

		const edgeConfig = elementConfigs[edgeName];

		let edge;
		if (currentIteration === 0) {
			// at this point of time there is NO single edge of this type.
			if (edgeConfig.time_shift.start) {
				const edgeConfigNew = dcopy(edgeConfig);
				edgeConfigNew.tdg.count_all = edgeConfig.time_shift.start;
				edge = edgesHelper2.createEdge(model, logger, edgeConfigNew);
			}
		} else {
			// now create the edges per iteration
			const remainingIterations = iterationCount - currentIteration;
			const status = model.registry.edges[edgeName].time_shift_status;
			const remainingElements = (edgeConfig.tdg.count_all - status.count_all);


			if (remainingElements > 0) {
				let addedElements;
				if (remainingIterations === 1) {
					// This is the last iteration, add all not already added
					const edgeConfigNew = dcopy(edgeConfig);
					edgeConfigNew.tdg.count_all = remainingElements;
					edge = edgesHelper2.createEdge(model, logger, edgeConfigNew);
				} else {
					const elemToAdd = Math.floor(remainingElements / remainingIterations);
					if (elemToAdd > 0) {
						// add more then one element in each iteration
						const edgeConfigNew = dcopy(edgeConfig);
						edgeConfigNew.tdg.count_all = elemToAdd;
						edge = edgesHelper2.createEdge(model, logger, edgeConfigNew);
					} else {
						if (status.add_on_iteration) {
							if (currentIteration === status.add_on_iteration) {
								delete(status.add_on_iteration);
								const edgeConfigNew = dcopy(edgeConfig);
								edgeConfigNew.tdg.count_all = 1;
								edge = edgesHelper2.createEdge(model, logger, edgeConfigNew);
							}
						} else {
							const addAfterEach = Math.floor(1 / (remainingElements / remainingIterations));
							status.add_on_iteration = currentIteration + addAfterEach;
							// store the value in the status object o
							logger.debug("   " + `Add on iteration  ${status.add_on_iteration}`);
						}
					}
				}
			}
		}

		if (edge) {
			moveEdgesToIteration(model, logger, edge, currentIteration);
		}
	});

}

/**
 * The newly created edge has all the elements stored unter objects.
 * This data has to be moved to the current iteration. Also the status
 * entry has to be updated
 */
function moveEdgesToIteration(model, logger, newEdge, currentIteration) {
	let existingEdge;
	if (model.registry.edges[newEdge.name]) {
		existingEdge = model.registry.edges[newEdge.name];
	} else {
		// the edge has not exists before
		existingEdge = newEdge;
		model.registry.edges[newEdge.name] = existingEdge;
		if (!existingEdge.time_shift_store) {
			existingEdge.time_shift_store = {
				"iter": []
			};

			existingEdge.time_shift_status = {
				"count_all": 0,
				"active": {},
				"removed": {},
				"removed_by_src": {},
				"removed_by_target": {},
			};
		}
	}


	// iterate the source IDs
	if (newEdge.objects) {
		if (currentIteration === 0) {
			// no checks needed just move all
			existingEdge.time_shift_status.active = dcopy(newEdge.objects);
			existingEdge.time_shift_status.count_all = newEdge.count_all;

			const iterElem = {
				"a": newEdge.objects
			};
			existingEdge.time_shift_store.iter.push(iterElem);

			delete(newEdge.objects);

		} else {
			// in this case it is alot more work to do
			existingEdge.time_shift_status.count_all = existingEdge.time_shift_status.count_all + newEdge.count_all;

			// stores the data of the current iteration
			let iterVal = {};
			if (existingEdge.time_shift_store.iter[currentIteration]) {
				iterVal = existingEdge.time_shift_store.iter[currentIteration];
			} else {
				existingEdge.time_shift_store.iter[currentIteration] = iterVal;
			}
			Object.keys(newEdge.objects).forEach((sourceId) => {
				// ------------
				// add to ITER
				// ------------
				if (!iterVal.a) {
					iterVal.a = {};
				}

				if (!iterVal.a[sourceId]) {
					iterVal.a[sourceId] = newEdge.objects[sourceId];
				} else {
					newEdge.objects[sourceId].forEach((val) => {
						iterVal.a[sourceId].push(val);
					});
				}
				// ------------
				// add to status
				// ------------
				if (!existingEdge.time_shift_status.active[sourceId]) {
					existingEdge.time_shift_status.active[sourceId] = [];
				}

				newEdge.objects[sourceId].forEach((val) => {
					existingEdge.time_shift_status.active[sourceId].push(val);
				});
			});
		}
	}
}

/**
 * Removes elements over time.
 * @param model (object) The object contains all the vertices
 * @param elementConfig (object) The element configuration
 * @param currentIteration (number) The number of the current iteration
 * @param logger (object) A logger object
 * @param iterationCount (number) The total number of iterations
 */
function iterRemove(model, elementConfigs, logger, currentIteration, iterationCount, parentVertex) {
	logger.debug(`TimeShift: Remove elements`);

	const registry = model.registry;
	Object.keys(elementConfigs).forEach((vertexName) => {
		const elementConfig = elementConfigs[vertexName];
		const vertex = registry.vertices[vertexName];

		// stores all the ids removed for the current vertex
		const allRemovedIds = new Set();

		if (parentVertex) {
			const edgeName = `${parentVertex.name}_has_${vertex.name}`;
			const edge = registry.edges[edgeName];

			// ----------------------------------------------------------
			// -- Remove all the edges where the parent was removed
			// ----------------------------------------------------------
			// In this case we need to check if a parent element is removed.
			// In this case all the children need to be removed also
			if (parentVertex.time_shift_status.removed.length > 0) {
				// to know which element has which children we need the edges
				parentVertex.time_shift_status.removed.forEach((parentId) => {
					// get all the edges with this parent ID
					if (edge.time_shift_status.active[parentId]) {
						edge.time_shift_status.removed_by_parent[parentId] = edge.time_shift_status.active[parentId];

						let thisIterChange;
						if (edge.time_shift_store.iter[currentIteration]) {
							thisIterChange = edge.time_shift_store.iter[currentIteration];
							if (!thisIterChange.r) {
								thisIterChange.r = {};
							}
						} else {
							thisIterChange = {
								"r": {}
							};
							edge.time_shift_store.iter[currentIteration] = thisIterChange;
						}

						thisIterChange.r[parentId] = edge.time_shift_status.active[parentId];
						// store the added values

						logger.debug(
							`TimeShift edge: Iteration='${iterationCount}' parent removed for child edge ${edgeName}: Removed the elements ${JSON.stringify(thisIterChange)}`
						);

						edge.time_shift_status.active[parentId].forEach((val) => {
							allRemovedIds.add(val);
						});

						delete(edge.time_shift_status.active[parentId]);
					}
				});
			}

			// ----------------------------------------------------------
			// -- If this is a child element we need to go over the edges for removing the elements
			// ----------------------------------------------------------
			const status = edge.time_shift_status;
			const remainingIterations = iterationCount - currentIteration;
			let removedCount = 0;
			Object.keys(status.removed).forEach((parentId) => {
				removedCount = removedCount + status.removed[parentId].length;
			});
			const remainingElements = elementConfig.time_shift.remove - removedCount;

			if (remainingElements > 0) {
				let removedElements;

				if (remainingIterations === 1) {
					// This is the last iteration, add all not already added
					removedElements = removeElementsParentChild(remainingElements, status, logger, currentIteration);
				} else {
					const elemToremove = Math.floor(remainingElements / remainingIterations);
					if (elemToremove > 0) {
						// add more then one element in each iteration
						removedElements = removeElementsParentChild(elemToremove, status, logger, currentIteration);
					} else {
						if (status.remove_on_iteration) {
							if (currentIteration === status.remove_on_iteration) {
								delete(status.remove_on_iteration);
								removedElements = removeElementsParentChild(1, status, logger, currentIteration);
							}
						} else {
							const removeAfterEach = Math.floor(1 / (remainingElements / remainingIterations));
							status.remove_on_iteration = currentIteration + removeAfterEach;
							// store the value in the status object o
							logger.debug("   " + `Remove on iteration  ${status.remove_on_iteration}`);
						}
					}
				}

				if (removedElements) {
					logger.debug(
						`TimeShift edge: Iteration='${iterationCount}' removed from edge ${edgeName}: Removed the elements ${JSON.stringify(removedElements)}`
					);
					Object.keys(removedElements).forEach((parentId) => {

						// -------------
						// update the iter changes
						// -------------
						let thisIterChange;
						if (edge.time_shift_store.iter[currentIteration]) {
							thisIterChange = edge.time_shift_store.iter[currentIteration];
							if (!thisIterChange.r) {
								thisIterChange.r = {};
							}
						} else {
							thisIterChange = {
								"r": {}
							};
							edge.time_shift_store.iter[currentIteration] = thisIterChange;
						}

						if (!thisIterChange.r[parentId]) {
							thisIterChange.r[parentId] = [];
						}
						// -------------
						// add to the removed elements
						// -------------
						if (!edge.time_shift_status.removed[parentId]) {
							edge.time_shift_status.removed[parentId] = [];
						}

						removedElements[parentId].forEach((val) => {
							thisIterChange.r[parentId].push(val);
							edge.time_shift_status.removed[parentId].push(val);
							allRemovedIds.add(val);
						});

						// -------------
						// delete from the active ones
						// -------------
						const delIndex = removedElements[parentId].length;
						if (removedElements[parentId].length < edge.time_shift_status.active[parentId].length) {
							// only some elements where removed
							const newActive = [];
							for (let i = removedElements[parentId].length - 1; i < edge.time_shift_status.active[parentId].length; i++) {
								newActive.push(edge.time_shift_status.active[parentId][i]);
							}
							edge.time_shift_status.active[parentId] = newActive;
						} else {
							// all the elements of that parent where removed
							delete(edge.time_shift_status.active[parentId]);
						}

					});
				}
			}
		} else {
			const status = vertex.time_shift_status;
			const remainingIterations = iterationCount - currentIteration;
			const remainingElements = elementConfig.time_shift.remove - status.removed.length;

			// ----------------------------------------------------------
			// -- Remove the vertices to be removed
			// ----------------------------------------------------------
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
				if (vertex.time_shift_store.iter[currentIteration]) {
					thisIterChange = vertex.time_shift_store.iter[currentIteration];
				} else {
					thisIterChange = {};
					vertex.time_shift_store.iter[currentIteration] = thisIterChange;
				}
				if (removedElements) {
					thisIterChange.r = removedElements;
					// store the added values
					logger.debug("   " + `r:${removedElements.length}`);

					removedElements.forEach((val) => {
						allRemovedIds.add(val);
					});
				}

			}
		}

		// update the vertex status
		// iterate the active vertex IDs
		if (allRemovedIds.size > 0) {
			if (!vertex.time_shift_store.iter[currentIteration]) {
				vertex.time_shift_store.iter[currentIteration] = {};
			}
			if (!vertex.time_shift_store.iter[currentIteration].r) {
				vertex.time_shift_store.iter[currentIteration].r = [];
			}

			const newActive = [];
			vertex.time_shift_status.active.forEach((id) => {
				if (allRemovedIds.has(id)) {
					// the id vas deleted
					vertex.time_shift_status.removed.push(id);
					vertex.time_shift_store.iter[currentIteration].r.push(id);
				} else {
					// the id still exists
					newActive.push(id);
				}
			});
			vertex.time_shift_status.active = newActive;
		}

		// -----------------------------------
		// -- now check for sub elements
		// -----------------------------------
		if (elementConfig.vertices) {
			iterRemove(model, elementConfig.vertices, logger, currentIteration, iterationCount, vertex);
		}

	});

}

/**
 * Removes elements for parent child edges
 * @param elemToRemove (number) The number of elements to remove
 * @param status (object) This objects trakc which elements are currently active and which still available
 * @param logger (object) A logger object
 * @param currentIteration (number) The number of the current iteration
 * @return result (array) The new added elements
 */
function removeElementsParentChild(elemToRemove, status, logger, currentIteration) {

	const result = {};

	// stores the index for each source element
	const sourceIdx = {};
	let removedElements = 0;

	const parentIds = Object.keys(status.active);
	let lastCount = 0;

	do {
		parentIds.forEach((parentId) => {
			if (!sourceIdx[parentId]) {
				sourceIdx[parentId] = 0;
			}

			if (sourceIdx[parentId] < status.active[parentId].length) {
				if (!result[parentId]) {
					result[parentId] = [];
				}

				result[parentId].push(status.active[parentId][sourceIdx[parentId]]);
				sourceIdx[parentId]++;
				removedElements++;
			}
		});

		if (lastCount === removedElements) {
			// could not remove new elements
			const msg = `Should remove %{elemCount} elements but currently only ${status.active.length} are active.`;
			logger.warning(msg);
			removedElements = elemToRemove; // set to max to break from the while
		} else {
			lastCount = removedElements;
		}
	} while (removedElements < elemToRemove);

	return result;
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
			const msg = `Should remove %{elemCount} elements but currently only ${status.active.length} are active.`;
			logger.warning(msg);
			break;
		}
	}
	return result;
}

/**
 * Adds elements over time.
 * @param registry (object) The object contains all the vertices
 * @param elementConfigs (object) An object with the element configurations
 * @param logger (object) A logger object
 * @param currentIteration (number) The number of the current iteration
 * @param iterationCount (number) The total number of iterations
 * @param parentVertex (object) The parent vertes if there is any
 */
function iterAdd(model, elementConfigs, logger, currentIteration, iterationCount, parentVertex) {
	const registry = model.registry;
	Object.keys(elementConfigs).forEach((vertexName) => {
		logger.debug(`TimeShift: Add elements for ${vertexName}`);

		const vertexConfig = elementConfigs[vertexName];
		const vertex = registry.vertices[vertexName];
		const status = vertex.time_shift_status;
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
			if (vertex.time_shift_store.iter[currentIteration]) {
				thisIterChange = vertex.time_shift_store.iter[currentIteration];
			} else {
				thisIterChange = {};
				vertex.time_shift_store.iter[currentIteration] = thisIterChange;
			}
			if (addedElements) {
				thisIterChange.a = addedElements;
				// store the added values
				logger.debug("   " + `a:${addedElements.length}`);
			}
		}

		if (parentVertex) {
			// If there is a parent vertex we need to create a edge
			shiftParentChildEdgeAdd(model, logger, parentVertex, vertexConfig, currentIteration, iterationCount);
		}

		// -----------------------------------
		// -- now check for sub elements
		// -----------------------------------
		if (vertexConfig.vertices) {
			iterAdd(model, vertexConfig.vertices, logger, currentIteration, iterationCount, vertex);
		}
	});

}

/**
 * Initializes the first iteration
 * @param model (object) The omodel object
 * @param logger (object) A logger object
 * @param verticesConfig (object) The configuration elememnts for the vertices
 * @return result (object) An object with an hash used for this vertex
 */
function startIteration(model, logger, verticesConfig, parentVertex) {
	const registry = model.registry;

	// Iterate over all the vertices configs
	Object.keys(verticesConfig).forEach((vertexName) => {
		const vertexConfig = verticesConfig[vertexName];
		const vertex = registry.vertices[vertexName];
		vertex.config = vertexConfig;

		logger.debug(`TimeShift: Create start elements for ${vertexName}`);

		const store = {
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
		const start = vertexConfig.time_shift.start;

		if (start) {
			if (parentVertex) {
				const addedElements = shiftParentChildEdgeAdd(model, logger, parentVertex, vertexConfig, 0);
				Object.keys(addedElements).forEach((parentId) => {
					// move these to the active ids
					const iterElem = {
						"a": []
					};
					store.iter.push(iterElem);
					addedElements[parentId].forEach((id) => {
						iterElem.a.push(id);
						status.active.push(id);
					});
				});
				status.available.min = status.available.min + status.active.length;
			} else {
				// there are start values to add
				const addedElements = addElements(start, status, logger);

				const iterElem = {
					"a": addedElements
				};
				store.iter.push(iterElem);

				status.active = dcopy(addedElements);
			}

			vertex.time_shift_status = status;
			vertex.time_shift_store = store;
		}

		if (vertexConfig.vertices) {
			startIteration(model, logger, vertexConfig.vertices, vertex);
		}
	});
}


/**
 * Creates an initial parent child edge and distributes the start values
 * @param model (object) The model
 * @param logger (object) The logger object
 * @param parentVertex (object) The parent vertex
 * @param childVertexConfig (object) The vertex configuration of the child vertex
 * @param currentIteration (number) The number of the current iteration
 * @param iterationCount (number) The total number of iterations
 * @return addedElements (object) The added elements for this iteration
 */
function shiftParentChildEdgeAdd(model, logger, parentVertex, childVertexConfig, currentIteration, iterationCount) {
	const edgeName = `${parentVertex.name}_has_${childVertexConfig.name}`;
	const edge = getParentChildEdge(model, logger, parentVertex, childVertexConfig, edgeName);

	// currently available parent IDs
	const availableParentIds = parentVertex.time_shift_status.active;

	logger.debug(`TimeShift edge: work on edge '${edgeName}'`);

	let addedElements;
	if (currentIteration === 0) {
		const elementsToAdd = childVertexConfig.time_shift.start;
		addedElements = addParentChildEdge(elementsToAdd, edge, logger, availableParentIds);
	} else {

		// get the count auf available elements
		let freeElementCount = 0;
		availableParentIds.forEach((parentId) => {
			if (edge.objects[parentId]) {
				freeElementCount = freeElementCount + edge.objects[parentId].length;
			}
		});

		if (freeElementCount > 0) {
			const remainingIterations = iterationCount - currentIteration;
			if (remainingIterations === 1) {
				// This is the last iteration, add all not already added
				//addedElements = addElements(remainingElements, status, logger);
				// ######################
				// add the rest of all the elements
				// ######################
				addedElements = addParentChildEdge(freeElementCount, edge, logger, availableParentIds);
			} else {
				const elemToAdd = Math.floor(freeElementCount / remainingIterations);
				if (elemToAdd > 0) {
					// add more then one element in each iteration
					// addedElements = addElements(elemToAdd, status, logger);
					// ######################
					// add the amount of given elements
					// ######################
					addedElements = addParentChildEdge(elemToAdd, edge, logger, availableParentIds);
				} else {
					if (edge.time_shift_status.add_on_iteration) {
						if (currentIteration === edge.time_shift_status.add_on_iteration) {
							const elemToAdd = edge.time_shift_status.add_on_iteration;
							delete(edge.time_shift_status.add_on_iteration);
							// ######################
							// add the amount of given elements
							// ######################
							addedElements = addParentChildEdge(elemToAdd, edge, logger, availableParentIds);
						}
					} else {
						const addAfterEach = Math.floor(1 / (freeElementCount / remainingIterations));
						edge.time_shift_status.add_on_iteration = currentIteration + addAfterEach;
						// store the value in the status object o
						logger.debug("   " + `Add on iteration  ${edge.time_shift_status.add_on_iteration}`);
					}
				}
			}

		}
	}

	if (addedElements) {
		logger.debug(`TimeShift edge: Iteration='${currentIteration}' Added the elements: ${JSON.stringify(addedElements)}`);

		edge.time_shift_store.iter[currentIteration] = {
			"a": addedElements
		};

		// update the time_shift_status
		const active = edge.time_shift_status.active;
		Object.keys(addedElements).forEach((parentId) => {
			if (active[parentId]) {
				addedElements[parentId].forEach((val) => {
					active[parentId].push(val);
				});
			} else {
				active[parentId] = addedElements[parentId];
			}

		});
	}
	return addedElements;
}

/**
 * Shift the edge data over the time
 * @param elemCount (number) The number of elements to add
 * @param edge (object) This current edgeObject
 * @param logger (object) A logger object
 * @param parentAvailableIds (array) An array with the available parent IDs
 * @return result (array) The new added elements
 */
function addParentChildEdge(elemCount, edge, logger, parentAvailableIds) {
	const result = {};

	// stores for each parent element the current index.
	const indexes = {};

	// set to true if an element could be added
	let isElementAdded = false;

	let currentCount = 0;
	do {
		isElementAdded = false;

		parentAvailableIds.forEach((parentId) => {

			if (edge.objects[parentId]) {
				if (!indexes[parentId]) {
					indexes[parentId] = 0;
				}

				// get the array of all available ids for one parent
				const availableIds = edge.objects[parentId];

				if (indexes[parentId] < availableIds.length) {
					// there is one element available
					isElementAdded = true;
					currentCount++;

					if (!result[parentId]) {
						result[parentId] = [];
					}

					result[parentId].push(edge.objects[parentId][indexes[parentId]]);
					indexes[parentId]++;
				}
			}
		});
	} while ((currentCount < elemCount) & isElementAdded);

	if (currentCount < elemCount) {
		const msg =
			`${edge.name}; Could not create all the elements as expected. Should create ${elemCount}, but could only get ${currentCount} elements`;
		logger.warn(msg);
	}

	// now cleanup the objects
	Object.keys(indexes).forEach((id) => {
		const idx = indexes[id];

		if (idx === edge.objects[id].length) {
			delete(edge.objects[id]);
		} else {
			const newArray = edge.objects[id].slice(idx);
			edge.objects[id] = newArray;
		}
	});

	return result;
}

/**
 * Creates an initial parent child edge or returns an existing one
 * @param model (object) The model
 * @param logger (object) The logger object
 * @param parentVertex (object) The parent vertex
 * @param childVertexConfig (object) The vertex configuration of the child vertex
 * @param edgeName (object) The name of the edge to be created
 */
function getParentChildEdge(model, logger, parentVertex, childVertexConfig, edgeName) {
	let edge;
	if (!model.registry.edges) {
		model.registry.edges = {};
	}

	if (!model.registry.edges[edgeName]) {
		// create the innitial edge object
		const edgeConfig = {
			"tdg": childVertexConfig.tdg.edge
		};
		edgeConfig.tdg.count_all = childVertexConfig.tdg.count_all;
		edgeConfig.name = edgeName;
		edgeConfig.src = parentVertex.name;
		edgeConfig.target = childVertexConfig.name;

		// Creates the default edge
		edge = edgesHelper.createEdge(model, logger, edgeConfig, {});
		model.registry.edges[edgeName] = edge;

		if (!edge.time_shift) {
			// set the initial time_shift structure
			edge.time_shift_store = {
				"iter": []
			};

			edge.time_shift_status = {
				"active": {},
				"removed": {},
				"removed_by_parent": {}
			};
		}
	} else {
		edge = model.registry.edges[edgeName];
	}
	return edge;
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
