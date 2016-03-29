/* jslint node: true, esnext: true */
"use strict";

const INFO_COUNTER = 100000;



/**
 * Creates a single edge object
 * @param model (object) The global model
 * @param logger (object) The logger
 * @param edgeConfig (object) The configuration how to create this edge
 * @param customFunctions (object) An object with all the available custum functions
 */
const createEdge = function (model, logger, edgeConfig, customFunctions) {

	// The amount of edges to create
	const count = edgeConfig.tdg.count_all;

	// how many targets each source should have as a minimum
	const min = edgeConfig.tdg.min;
	// how many targets each source should have as a maximum
	const max = edgeConfig.tdg.max;

	// First caculate the concrete count of elements for each source object
	logger.info(`Create the counter model for the edge '${edgeConfig.name}'`);
	const counterModel = calculateEdgeTargetCounts(model, logger, edgeConfig, customFunctions);

	//let usedTargets = {};
	const resObj = {};

	logger.info(`Create the edges '${edgeConfig.name}'. Should create ${count} edges`);

	let sourceIds = getSourceIds(model, logger, edgeConfig);

	let usedTarget = new Set();

	// get the available target ids for this source id
	let availableTargets = targetIds(model, logger, edgeConfig);


	//--------------------------------------
	//- Iterate the source IDs
	//--------------------------------------
	let counter = 0;
	let counterAll = 0;
	sourceIds.forEach(srcId => {

		// availableTargets = targetIds(model, logger, edgeConfig);
		// usedTarget = new Set();

		if (!resObj[srcId] && counterModel[srcId] > 0) {
			resObj[srcId] = [];
		}

		let subRes;
		//-----------------------------------------
		// No random value
		//-----------------------------------------
		for (let i = 0; i < counterModel[srcId]; i++) {
			resObj[srcId].push(availableTargets[i]);
		}
		availableTargets.splice(0, counterModel[srcId]);

		counter = counter + counterModel[srcId];
		counterAll = counterAll + counterModel[srcId];

		if (counter >= INFO_COUNTER) {
			counter = 0;
			logger.info(`Created ${counterAll} elements`);
		}

	});

	const retObject = {
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
	const count = edgeConfig.tdg.count_all;

	// how many targets each source should have as a minimum
	const min = edgeConfig.tdg.min;
	// how many targets each source should have as a maximum
	const max = edgeConfig.tdg.max;

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

	// check if we exceed max count
	if (count > sourceIds.length * max) {
		const err = {
			"message": `'count_all'=${count} exceeds the amount of source*max=${sourceIds.length*max} (source='${sourceIds.length}', max='${max}')`,
			"object": edgeConfig
		};
		logger.error(err);
		throw new Error(err);
	}


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
			logger.error({
				"message": `Could not create all the min values because the 'count_all' is too small`,
				"object": edgeConfig
			});
		}
	}

	// Claculate how many elements in average per source we could create as a max
	let tmpMax = Math.floor(count / sourceIds.length);
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
	let targetIdsLength = getTargetIdsLength(model, logger, edgeConfig);

	if (targetIdsLength < count) {
		const err = {
			"message": `Not enaught target IDs. Need '${count}' elements but only have '${targetIdsLength}' elements`,
			"object": edgeConfig
		};
		logger.error(err);
		throw new Error(err);
	}



	let lastCount = -1;
	while (elementCounter < count) {
		round++;
		if (!tmpMax) {
			tmpMax = 1;
		}

		if (lastCount === elementCounter) {
			// could not get an increase of the value.
			const err = {
				"message": `Could not increase the value over ${elementCounter} but expetced are ${count}.`,
				"object": edgeConfig
			};
			logger.error(err);
			throw new Error(err);
		} else {
			lastCount = elementCounter;
		}

		// now we need to fill the rest
		sourceIds.forEach(srcId => {
			if (elementCounter >= count) {
				// we have reached the amount of elements
				return;
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


				if (tmpMax > maxValue) {
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
 * Returns all the source IDs for the source object
 * This function could be overwritten by a function in the form
 * targetIdsLength<edgeName> If a function with this name exists
 * it will be called instead of this one
 * @param model (object) The model object
 * @param logger (object) The logger object
 * @param edgeConfig (object) The config object for this edge
 * @return targetIds (number) The number of abailable target ids
 */
function getTargetIdsLength(model, logger, edgeConfig) {
	// The source is a normal vertex
	const sMin = model.registry.vertices[edgeConfig.target].min_id;
	const sMax = model.registry.vertices[edgeConfig.target].max_id;
	return sMax - sMin + 1;
}


/**
 * Returns all the source IDs for the source object
 * This function could be overwritten by a function in the form
 * targetIds<edgeName> If a function with this name exists
 * it will be called instead of this one
 * @param model (object) The model object
 * @param logger (object) The logger object
 * @param edgeConfig (object) The config object for this edge
 * @param sourceId (number) The source ID these targets are for
 * @return targetIds (number) The number of abailable target ids
 */
function targetIds(model, logger, edgeConfig, sourceId) {
	// The source is a normal vertex
	const sMin = model.registry.vertices[edgeConfig.target].min_id;
	const sMax = model.registry.vertices[edgeConfig.target].max_id;
	return createArrayFromRange(sMin, sMax);
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

	// The source is a normal vertex
	const sMin = model.registry.vertices[edgeConfig.src].min_id;
	const sMax = model.registry.vertices[edgeConfig.src].max_id;
	return createArrayFromRange(sMin, sMax);
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
