/* jslint node: true, esnext: true */
"use strict";

const INFO_COUNTER = 100000;



/**
 * Creates a single edge object
 * @param model (object) The global model
 * @param logger (object) The logger
 * @param edgeConfig (object) The configuration how to create this edge
 */
const createEdge = function (model, logger, edgeConfig) {

	const customFunctions = model.edge_custom_functions;

	// The amount of edges to create
	const count = edgeConfig.tdg.count_all;

	// how many targets each source should have as a minimum
	const min = edgeConfig.tdg.min;
	// how many targets each source should have as a maximum
	const max = edgeConfig.tdg.max;

	// if a source object should only have unique targets
	const unique = edgeConfig.tdg.unique;

	// defines if the element count is per source or for all the elements
	let elementsPerSource = false;
	if (edgeConfig.tdg.target && edgeConfig.tdg.target.elements_per_source) {
		elementsPerSource = true;
	}

	// First caculate the concrete count of elements for each source object
	logger.info(`Create the counter model for the edge '${edgeConfig.name}'`);
	if (edgeConfig.tdg.need_random) {
		logger.debug(`Take random values`);
	} else {
		logger.debug(`Take NO random values`);
	}
	const counterModel = calculateEdgeTargetCounts(model, logger, edgeConfig, customFunctions);
	if (!counterModel) {
		return;
	}

	//let usedTargets = {};
	const resObj = {};

	logger.info(`Create the edges '${edgeConfig.name}'. Should create ${count} edges`);

	let sourceIds;
	if (edgeConfig.tdg.src && edgeConfig.tdg.src.function) {
		sourceIds = customFunctions[edgeConfig.tdg.src.function](model, edgeConfig, logger);
	} else {
		sourceIds = getSourceIds(model, logger, edgeConfig);
	}

	let usedTarget = new Set();

	// get the available target ids for this source id
	let availableTargets;
	if (!elementsPerSource) {
		if (edgeConfig.tdg.target && edgeConfig.tdg.target.function) {

			// there is a custom function defined.
			availableTargets = customFunctions[edgeConfig.tdg.target.function.elements](model, edgeConfig, logger);
		} else {
			availableTargets = getTargetIds(model, logger, edgeConfig);
		}

		availableTargets = cleanupTargetIds(model, logger, edgeConfig, availableTargets);
	}

	//--------------------------------------
	//- Iterate the source IDs
	//--------------------------------------
	let counter = 0;
	let counterAll = 0;
	if (elementsPerSource || (availableTargets && availableTargets.length > 0)) {
		sourceIds.forEach(srcId => {

			// get the available targets
			if (elementsPerSource) {
				if (edgeConfig.tdg.target && edgeConfig.tdg.target.function) {
					// there is a custom function defined.
					availableTargets = customFunctions[edgeConfig.tdg.target.function.elements](model, edgeConfig, logger, srcId);
				} else {
					availableTargets = getTargetIds(model, logger, edgeConfig);
				}
				usedTarget = new Set();

				availableTargets = cleanupTargetIds(model, logger, edgeConfig, availableTargets, srcId);
			}

			if (availableTargets && availableTargets.length > 0) {
				if (!unique) {
					usedTarget = undefined;
				}


				if (!resObj[srcId] && counterModel[srcId] > 0) {
					resObj[srcId] = [];
				}

				let subRes;
				if (!edgeConfig.tdg.need_random) {
					//-----------------------------------------
					// No random value
					//-----------------------------------------
					for (let i = 0; i < counterModel[srcId]; i++) {
						resObj[srcId].push(availableTargets[i]);
					}
					if (!elementsPerSource && unique) {
						availableTargets.splice(0, counterModel[srcId]);
					}

					counter = counter + counterModel[srcId];
					counterAll = counterAll + counterModel[srcId];
				} else {
					//-----------------------------------------
					// With random value
					//-----------------------------------------
					subRes = createValues(logger, edgeConfig, counterModel[srcId], availableTargets, usedTarget);

					if (!elementsPerSource && usedTarget) {
						const tmp = availableTargets;
						availableTargets = [];
						tmp.forEach(val => {
							if (!usedTarget.has(val)) {
								availableTargets.push(val);
							}
						});
						usedTarget = new Set();
					}

					//logger.debug(`Created ${subRes.length} edges for source = ${srcId}`);

					// Store the array in the result object
					subRes.forEach(val => {
						resObj[srcId].push(val);
						counter++;
						counterAll++;
					});

				}

				if (counter >= INFO_COUNTER) {
					counter = 0;
					logger.info(`Created ${counterAll} elements`);
				}
			} else {
				const err = `${edgeConfig.name}: No targets available for edge with source id '${srcId}'`;
				logger.debug(err);
			}
		});
	} else {
		const err = `${edgeConfig.name}: No targets available.`;
		logger.warn(err);
	}

	const retObject = {
		"count_all": counterAll,
		"name": edgeConfig.name,
		"type": 'edge',
		"src_name": edgeConfig.src,
		"target_name": edgeConfig.target,
		"objects": resObj
	};

	logger.info(`Created ${counterAll} edges at all`);

	return retObject;

};

/**
 * If an edge is created in a timeshift iteration all the already used targets needs to be removed.
 * @param model (object) The model
 * @param logger (object) The logger object
 * @param availableTargets (array) The newly created available targets
 * @param srcId(string) The source ID this targets are for. If no srcId is given, we need to test for all sources
 * @return availableTargets (array) The cleaned availabale targets
 */
function cleanupTargetIds(model, logger, edgeConfig, availableTargets, srcId) {

	// if the edge does not exists we have nothing to check
	if (model.registry.edges[edgeConfig.name] && availableTargets) {
		// build a set of the available targets
		const availSet = new Set();
		availableTargets.forEach((val) => {
			availSet.add(val);
		});

		availableTargets = [];

		const existingEdgeStatus = model.registry.edges[edgeConfig.name].time_shift_status;
		const fields = ['active', 'removed', 'removed_by_src', 'removed_by_target'];
		fields.forEach((fieldName) => {
			if (srcId) {
				if (existingEdgeStatus[fieldName][srcId]) {
					existingEdgeStatus[fieldName][srcId].forEach((id) => {
						// Check if this id is in the set
						if (availSet.has(id)) {
							availSet.delete(id);
						}
					});
				}
			} else {
				Object.keys(existingEdgeStatus[fieldName]).forEach((subSrcId) => {
					if (existingEdgeStatus[fieldName][subSrcId]) {
						existingEdgeStatus[fieldName][subSrcId].forEach((id) => {
							// Check if this id is in the set
							if (availSet.has(id)) {
								availSet.delete(id);
							}
						});
					}
				});
			}
		});

		availSet.forEach((val) => {
			availableTargets.push(val);
		});
	}
	return availableTargets;
}

/**
 * Creates the edges for the given config
 * @param model (object) The configuration model
 * @param nextId (number) The next id (sequence) to use
 * @param logger (object) A logger module
 */
const createEdges = function (model, nextId, logger) {
	const registry = model.registry;

	if (!registry.edges) {
		registry.edges = {};
	}

	// Iterate the edges configuration
	Object.keys(model.edges).forEach(edgeName => {
		const edgeConfig = model.edges[edgeName];
		logger.info(`create edge ${edgeName}`);

		const edgeObject = createEdge(model, logger, edgeConfig, model.edge_custom_functions);
		model.registry.edges[edgeName] = edgeObject;

	});

};

/* Creates random values. It will take the ids from an array of available ids
 * @param count (number) how many objects to create
 * @param availableTargets (map) A map with the available targets as values. The keys are number from 0 to the size of the map
 * @param usedTargets (object) An object with the already used targets for the current source id
 */
function createValues(logger, edgeConfig, count, availableTargets, usedTargets) {

	if (usedTargets) {
		// in this case we could not take a value more than once.
		// So the availableTargets.length must be greater than count.
		if (availableTargets.length < count) {
			const err =
				`${edgeConfig.name}: Not enaught available targets. Requested are '${count}', but available are only '${availableTargets.length}' for edge '${edgeConfig.name}'.`;
			logger.warn(err);
			count = availableTargets.length;
		}
	}

	const mapSize = availableTargets.length;

	function getValue(idx) {
		let val;
		do {
			val = availableTargets[idx];
			if (usedTargets) {
				if (usedTargets.has(val)) {
					val = undefined;
				} else {
					usedTargets.add(val);
				}
			}

			if (!val) {
				idx++;
				if (idx >= mapSize) {
					idx = 0;
				}
			}
		} while (!val);

		return val;
	}

	const res = [];

	// check if the target allows to create this amaount of elements
	let newElementCounter = 0;
	while (res.length < count) {
		const idx = Math.floor(Math.random() * mapSize);
		const val = getValue(idx);
		res.push(val);
	}

	return res;
}



/**
 * Calculate the counts of the objects to be created in an edge.
 * How many targets to assign to each source objects
 * The result is an array of target counts
 * @param model (object) The model object
 * @param logger (object) The logger object
 * @param edgeConfig (object) The edge configuration
 * @param customFunctions (object) The object with the custom functions
 * @return counterModel (object) The calculated counts in an edge for each source
 */
function calculateEdgeTargetCounts(model, logger, edgeConfig, customFunctions) {
	// The amount of edges to create
	let count = edgeConfig.tdg.count_all;

	// how many targets each source should have as a minimum
	const min = edgeConfig.tdg.min;
	// how many targets each source should have as a maximum
	const max = edgeConfig.tdg.max;

	const unique = edgeConfig.tdg.unique;

	// defines if the element count is per source or for all the elements
	let elementsPerSource = false;
	if (edgeConfig.tdg.target && edgeConfig.tdg.target.elements_per_source) {
		elementsPerSource = true;
	}

	let elementCounter = 0;

	// stores for each source ID the amount oof childs to create
	// counterModel = {srcId: <num>}
	const counterModel = {};

	let sourceIds;
	if (edgeConfig.tdg.src && edgeConfig.tdg.src.function) {
		// there is a custom function defined.
		sourceIds = customFunctions[edgeConfig.tdg.src.function](model, edgeConfig, logger);
	} else {
		sourceIds = getSourceIds(model, logger, edgeConfig);
	}

	if (!sourceIds || sourceIds.length === 0) {
		const err = `${edgeConfig.name}: Could not get any source ids for this edge`;
		logger.warn(err);
		return;
	}

	// check if we exceed max count
	if (count > sourceIds.length * max) {
		const err =
			`${edgeConfig.name}: 'count_all'=${count} exceeds the amount of source*max=${sourceIds.length*max} (source='${sourceIds.length}', max='${max}')`;
		logger.warn(err);
		//throw new Error(err);
	}

	if (!model.registry.edges) {
		model.registry.edges = {};
	}

	if (!model.registry.edges[edgeConfig.name]) {
		// min values only if this edge has not exists before
		if (min > 0) {
			sourceIds.forEach(srcId => {
				if (counterModel[srcId]) {
					counterModel[srcId] = counterModel[srcId] + min;
				} else {
					counterModel[srcId] = min;
				}
				elementCounter = elementCounter + min;
			});

			if (elementCounter > count) {
				logger.warn(
					`${edgeConfig.name}: count_all='${count}' is too small to create the MIN for each source. Increase count_all to '${elementCounter}'`
				);
				count = elementCounter;
			}
		}
	}

	// Claculate how many elements in average per source we could create as a max
	let tmpMax = Math.floor(count / sourceIds.length);

	if (max > tmpMax) {
		tmpMax = ((max - tmpMax) / 2) + tmpMax;
	}

	if (tmpMax > max) {
		tmpMax = max;
	}
	if (min) {
		tmpMax = tmpMax - min;
	}
	if (tmpMax < 1) {
		tmpMax = 1;
	}

	let round = 1;

	// get the available target ids for this source id
	let targetIdsLength;
	if (!elementsPerSource) {
		if (edgeConfig.tdg.target && edgeConfig.tdg.target.function) {
			// there is a custom function defined.
			targetIdsLength = customFunctions[edgeConfig.tdg.target.function.amount](model, edgeConfig, logger);
		} else {
			targetIdsLength = getTargetIds(model, logger, edgeConfig).length;
		}

		if (unique) {
			if (targetIdsLength < count) {
				const err =
					`${edgeConfig.name}: Not enaught target IDs. Need '${count}' elements but only have '${targetIdsLength}' elements`;
				logger.error(err);
				throw new Error(err);
			}
		}
	}


	let lastCount = -1;
	while (elementCounter < count) {
		round++;
		if (!tmpMax) {
			tmpMax = 1;
		}

		if (lastCount === elementCounter) {
			// could not get an increase of the value.
			const err = `${edgeConfig.name}: Could not increase the value over ${elementCounter} but expetced are ${count}.`;
			logger.warn(err);
			break;
		} else {
			lastCount = elementCounter;
		}

		// now we need to fill the rest
		sourceIds.forEach(srcId => {
			if (elementCounter >= count) {
				// we have reached the amount of elements
				return;
			}

			// get the available target ids for this source id
			if (elementsPerSource) {
				if (edgeConfig.tdg.target && edgeConfig.tdg.target.function) {
					// there is a custom function defined.
					targetIdsLength = customFunctions[edgeConfig.tdg.target.function.amount](model, edgeConfig, logger, srcId);
				} else {
					targetIdsLength = getTargetIds(model, logger, edgeConfig).length;
				}
			}
			if (targetIdsLength === undefined) {
				throw new Error("No target IDs");
			}

			let maxValue = targetIdsLength;

			// are there already objects for this account
			if (counterModel[srcId]) {
				maxValue = maxValue - counterModel[srcId];
			}

			if (maxValue > 0) {
				if (tmpMax > maxValue) {
					tmpMax = maxValue;
				}
				if (elementCounter + tmpMax > count) {
					tmpMax = (count - elementCounter);
				}

				let valCount = 1;
				if (tmpMax > 1) {
					valCount = Math.floor(Math.random() * tmpMax);
				}

				if (valCount > maxValue && elementsPerSource) {
					throw new Error("Kann nicht sein");
				}

				if (tmpMax > maxValue && unique) {
					// skip this round
				} else {
					elementCounter = elementCounter + valCount;
					if (counterModel[srcId]) {
						counterModel[srcId] = counterModel[srcId] + valCount;
					} else {
						counterModel[srcId] = valCount;
					}
				}
			}
		});
	}
	return counterModel;
}



/**
 * Returns all the target IDs for the source object
 * This function could be overwritten by a function in the form
 * targetIds<edgeName> If a function with this name exists
 * it will be called instead of this one
 * @param model (object) The model object
 * @param logger (object) The logger object
 * @param edgeConfig (object) The config object for this edge
 * @param sourceId (number) The source ID these targets are for
 * @return targetIds (number) The number of abailable target ids
 */
function getTargetIds(model, logger, edgeConfig) {
	const vertexName = edgeConfig.target;
	const vertex = model.registry.vertices[vertexName];

	// return all the current available IDs
	return vertex.time_shift_status.active;

}

/**
 * Returns all the source IDs for the source object
 * This function could be overwritten by a function in the form
 * sourceIds_<edgeName> If a function with this name exists
 * it will be called instead of this one
 * @param model (object) The model object
 * @param logger (object) The logger object
 * @param edgeConfig (object) The config object for this edge
 * @return sourceIds (array) An Array with all the source IDs
 */
function getSourceIds(model, logger, edgeConfig) {
	const vertexName = edgeConfig.src;
	const vertex = model.registry.vertices[vertexName];

	// return all the current available IDs
	return vertex.time_shift_status.active;
}

/**
 * Create an array of available IDs out of a range
 * @param minId (number) The minimum ID
 * @param maxId (number) The maximum ID
 * @return ret (array) An array with all the ids
 */
function createArrayFromRange(minId, maxId) {
	const ret = new Array(maxId - minId + 1);
	let idx = 0;
	for (let i = minId; i <= maxId; i++) {
		ret[idx] = i;
		idx++;
	}
	return ret;
}

module.exports.createEdge = createEdge;
