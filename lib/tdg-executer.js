/* jslint node: true, esnext: true */
"use strict";

const llm = require('loglevel-mixin');
class _TdgExecuter {}
llm.defineLoggerMethods(_TdgExecuter.prototype, llm.defaultLogLevels);

class TdgExecuter extends llm.LogLevelMixin(_TdgExecuter, llm.defaultLogLevels, llm.defaultLogLevels.info) {

	log(level, arg) {
		this._validationErrorCount++;
		console.log(`${level}: ${JSON.stringify(arg, null, 2)}`);
	}

	constructor(opts) {
		super();

		if (!opts) {
			opts = {};
		}

		// The amount of elements after an info message will be printed
		this.infoCounter = opts.infoCounter ? opts.infoCounter : 100000;

		// The loaded model to be executed
		this.model = opts.model;

		// The writer to be used
		this.writer = opts.writer;

		// A registry to store the created values
		this.registry = {};

		// Each object will get a unique ID. It will start with this ID
		this.id = opts.start_id ? opts.start_id : 0;
	}

	/**
	 * Called before the vertex will be created
	 * @param config (object) The configuration of this vertex
	 */
	beforeVertex(config) {}

	/**
	 * Called after the vertex was created
	 * @param config (object) The configuration of this vertex
	 */
	afterVertex(config) {}

	/**
	 * Called before the edge will be created
	 * @param config (object) The configuration of this edge
	 */
	beforeEdge(config) {}

	/**
	 * Called after the edge was created
	 * @param config (object) The configuration of this edge
	 */
	afterEdge(config) {}

	/**
	 * Create all the vertices defined in the model
	 */
	createVertices() {
		this.model.vertices.forEach(vertex => {
			this.info(`create vertex ${vertex.name}`);
			this.beforeVertex(vertex);

			const minId = this.id;
			const count = vertex.tdg.count_all;
			const maxId = minId + count - 1;
			this.id = maxId;
			this.registry[vertex.name] = vertex;
			vertex.min_id = minId;
			vertex.max_id = maxId;
			vertex.type = 'vertex';

			this.id++;

			this.writer.writeVertex(vertex);

			this.afterVertex(vertex);
		});
	}

	/**
	 * Create all the edges defined in the model
	 */
	createEdges() {
		this.model.edges.forEach(edge => {
			this.info(`create edge '${edge.name}'`);
			this.beforeEdge(edge);

			const edgeObject = this.createEdge(edge);
			this.registry[edge.name] = edgeObject;

			this.info(`Write the edge '${edgeObject.name}'.`);
			this.writer.writeEdge(edgeObject);

			this.afterEdge(edge);
		});
	}

	createEdge(edgeConfig) {
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

		// calculate the the unique IDs count
		const minId = this.id;
		const maxId = minId + count - 1;
		this.id = maxId;

		// First caculate the concrete count of elements for each source objects
		this.info(`Create the counter model for the edge '${edgeConfig.name}'`);
		if (edgeConfig.tdg.need_random) {
			this.debug(`Take random values`);
		} else {
			this.debug(`Take NO random values`);
		}
		const counterModel = this.calculateEdgeTargetCounts(edgeConfig);

		// Writes the counter model
		// this.writer.writeObject('counterModel', {
		// 	"name": edgeConfig.name,
		// 	"objects": counterModel
		// });

		//let usedTargets = {};
		const resObj = {};

		this.info(`Create the edges '${edgeConfig.name}'. Should create ${count} edges`);

		let sourceIds;
		if (edgeConfig.tdg.src && edgeConfig.tdg.src.function) {
			sourceIds = this[edgeConfig.tdg.src.function](edgeConfig);
		} else {
			sourceIds = this.sourceIds(edgeConfig);
		}

		let usedTarget = new Set();

		// get the available target ids for this source id
		let availableTargets;
		if (!elementsPerSource) {
			if (edgeConfig.tdg.target && edgeConfig.tdg.target.function) {

				if (!edgeConfig.tdg.target.function.elements) {
					const err = {
						"message": `There is no function to get the target elements defined`,
						"object": edgeConfig
					};
					this.error(err);
					throw new Error(err);
				}
				if (!this[edgeConfig.tdg.target.function.elements]) {
					const err = {
						"message": `The function '${edgeConfig.tdg.target.function.elements}' to get the target elements is not defined`,
						"object": edgeConfig
					};
					this.error(err);
					throw new Error(err);
				}


				// there is a custom function defined.
				availableTargets = this[edgeConfig.tdg.target.function.elements](edgeConfig);
			} else {
				availableTargets = this.targetIds(edgeConfig);
			}
		}

		//--------------------------------------
		//- Iterate the source IDs
		//--------------------------------------
		let counter = 0;
		let counterAll = 0;
		sourceIds.forEach(srcId => {

			// get the available targets
			if (elementsPerSource) {
				if (edgeConfig.tdg.target && edgeConfig.tdg.target.function) {
					// there is a custom function defined.
					availableTargets = this[edgeConfig.tdg.target.function.elements](edgeConfig, srcId);
				} else {
					availableTargets = this.targetIds(edgeConfig);
				}
				usedTarget = new Set();
			}

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
				subRes = this.createValues(edgeConfig, counterModel[srcId], availableTargets, usedTarget);

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

				this.debug(`Created ${subRes.length} edges for source = ${srcId}`);

				// Store the array in the result object
				subRes.forEach(val => {
					resObj[srcId].push(val);
					counter++;
					counterAll++;
				});

			}



			if (counter >= this.infoCounter) {
				counter = 0;
				this.info(`Created ${counterAll} elements`);
			}

		});

		const retObject = {
			"name": edgeConfig.name,
			"type": 'edge',
			"src_name": edgeConfig.src.name,
			"target_name": edgeConfig.target.name,
			"objects": resObj
		};

		this.info(`Created ${counterAll} edges at all`);

		return retObject;

	}


	/* Creates random values. It will take the ids from an array of available ids
	 * @param count (number) how many objects to create
	 * @param availableTargets (map) A map with the available targets as values. The keys are number from 0 to the size of the map
	 * @param usedTargets (object) An object with the already used targets for the current source id
	 */
	createValues(edgeConfig, count, availableTargets, usedTargets) {

		if (usedTargets) {
			// in this case we could not take a value more than once.
			// So the availableTargets.length must be greater than count.
			if (availableTargets.length < count) {
				const err = {
					"message": `Not enaught available targets. Requested are '${count}', but available are only '${availableTargets.size}'.`,
					"object": edgeConfig
				};
				this.error(err);
				throw new Error(err);
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
	 * Returns all the source IDs for the source object
	 * This function could be overwritten by a function in the form
	 * sourceIds_<edgeName> If a function with this name exists
	 * it will be called instead of this one
	 * @param edgeConfig (object) The config object for this edge
	 * @return sourceIds (array) An Array with all the source IDs
	 */
	sourceIds(edgeConfig) {
		if (!this.registry[edgeConfig.src.name]) {
			const err = {
				"message": `The object with the name '${edgeConfig.src.name}' does not exists.`,
				"object": edgeConfig
			};
			this.error(err);
			throw new Error(err);
		} else if (this.registry[edgeConfig.src.name].type === 'vertex') {
			// The source is a normal vertex
			const sMin = this.registry[edgeConfig.src.name].min_id;
			const sMax = this.registry[edgeConfig.src.name].max_id;
			return this.createArrayFromRange(sMin, sMax);
		} else {
			const err = {
				"message": `If the source for an edge is an edge a custom sourceProvider needs to be created`,
				"object": edgeConfig
			};
			this.error(err);
			throw new Error(err);
		}
	}

	/**
	 * Returns all the source IDs for the source object
	 * This function could be overwritten by a function in the form
	 * targetIdsLength<edgeName> If a function with this name exists
	 * it will be called instead of this one
	 * @param edgeConfig (object) The config object for this edge
	 * @return targetIds (number) The number of abailable target ids
	 */
	targetIdsLength(edgeConfig) {

		if (!this.registry[edgeConfig.src.name]) {
			const err = {
				"message": `The object with the name '${edgeConfig.src.name}' does not exists.`,
				"object": edgeConfig
			};
			this.error(err);
			throw new Error(err);
		} else if (this.registry[edgeConfig.target.name].type === 'vertex') {
			// The source is a normal vertex
			const sMin = this.registry[edgeConfig.target.name].min_id;
			const sMax = this.registry[edgeConfig.target.name].max_id;
			return sMax - sMin + 1;
		} else {
			const err = {
				"message": `If the target element of an edge is not a Vertex, then a custom function is needed to create the targetIds`,
				"object": edgeConfig
			};
			this.error(err);
			throw new Error(err);
		}
	}


	/**
	 * Returns all the source IDs for the source object
	 * This function could be overwritten by a function in the form
	 * targetIds<edgeName> If a function with this name exists
	 * it will be called instead of this one
	 * @param edgeConfig (object) The config object for this edge
	 * @param sourceId (number) The source ID these targets are for
	 * @return targetIds (number) The number of abailable target ids
	 */
	targetIds(edgeConfig, sourceId) {
		if (!this.registry[edgeConfig.src.name]) {
			const err = {
				"message": `The object with the name '${edgeConfig.src.name}' does not exists.`,
				"object": edgeConfig
			};
			this.error(err);
			throw new Error(err);
		} else if (this.registry[edgeConfig.target.name].type === 'vertex') {
			// The source is a normal vertex
			const sMin = this.registry[edgeConfig.target.name].min_id;
			const sMax = this.registry[edgeConfig.target.name].max_id;
			return this.createArrayFromRange(sMin, sMax);
		} else {
			const err = {
				"message": `If the target element of an edge is not a Vertex, then a custom function is needed to create the targetIds`,
				"object": edgeConfig
			};
			this.error(err);
			throw new Error(err);
		}
	}



	/**
	 * Create an array of available IDs out of a range
	 * @param minId (number) The minimum ID
	 * @param maxId (number) The maximum ID
	 * @return ret (array) An array with all the ids
	 */
	createArrayFromRange(minId, maxId) {
		const ret = new Array(maxId - minId + 1);
		let idx = 0;
		for (let i = minId; i <= maxId; i++) {
			ret[idx] = i;
			idx++;
		}
		return ret;
	}

	/**
	 * Calculate the counts of the objects to be created in an edge
	 * @param edgeConfig (object) The edge configuration
	 * @return counterModel (object) The calculated counts in an edge for each source
	 */
	calculateEdgeTargetCounts(edgeConfig) {
		// The amount of edges to create
		const count = edgeConfig.tdg.count_all;

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
			sourceIds = this[edgeConfig.tdg.src.function](edgeConfig);
		} else {
			sourceIds = this.sourceIds(edgeConfig);
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
				this.error({
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
		let targetIdsLength;
		if (!elementsPerSource) {
			if (edgeConfig.tdg.target && edgeConfig.tdg.target.function) {
				// there is a custom function defined.
				if (!edgeConfig.tdg.target.function.amount) {
					const err = {
						"message": `There is no function for amaount defined`,
						"object": edgeConfig
					};
					this.error(err);
					throw new Error(err);
				}
				if (!this[edgeConfig.tdg.target.function.amount]) {
					const err = {
						"message": `The function '${edgeConfig.tdg.target.function.amount}' to get the amount of elements is not defined`,
						"object": edgeConfig
					};
					this.error(err);
					throw new Error(err);
				}
				targetIdsLength = this[edgeConfig.tdg.target.function.amount](edgeConfig);
			} else {
				targetIdsLength = this.targetIdsLength(edgeConfig);
			}

			if (unique) {
				if (targetIdsLength < count) {
					const err = {
						"message": `Not enaught target IDs. Need '${count}' elements but only have '${targetIdsLength}' elements`,
						"object": edgeConfig
					};
					this.error(err);
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
				const err = {
					"message": `Could not increase the value over ${elementCounter} but expetced are ${count}.`,
					"object": edgeConfig
				};
				this.error(err);
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

				// get the available target ids for this source id
				if (elementsPerSource) {
					if (edgeConfig.tdg.target && edgeConfig.tdg.target.function) {
						// there is a custom function defined.
						targetIdsLength = this[edgeConfig.tdg.target.function.amount](edgeConfig, srcId);
					} else {
						targetIdsLength = this.targetIdsLength(edgeConfig);
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


}

module.exports.factory = function (options) {
	return new TdgExecuter(options);
};

module.exports.executer = TdgExecuter;
