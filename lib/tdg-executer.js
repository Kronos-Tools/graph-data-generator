/* jslint node: true, esnext: true */
"use strict";



class TdgExecuter {
	error(message) {
		this._validationErrorCount++;
		console.log(message);
	}
	info(message) {
		console.log(message);
	}
	debug(message) {
		console.log(message);
	}

	constructor(opts) {
		if (!opts) {
			opts = {};
		}

		this.dbname = opts.dbname ? opts.dbname : "tdg.db";

		this.model = undefined;

		// The writer to be used
		this.writer = undefined;

		this.registry = {};


		// Each object will get a unique ID.
		this.id = 0;
	}

	createVertices() {

		this.model.vertices.forEach(vertex => {

			const minId = this.id;
			const count = vertex.tdg.count_all;
			const maxId = minId + count - 1;
			this.id = maxId;
			this.registry[vertex.name] = {
				"count_all": count,
				"min_id": minId,
				"max_id": maxId
			};
			this.id++;
		});

	}

	createEdges() {
		this.model.edges.forEach(edge => {
			const edgeObject = this.createEdge(edge);
			this.writer.writeEdge(edgeObject);

			if (edge.tdg.store) {
				this.registry[edge.name] = edgeObject;
			}
		});
	}

	createEdge(edge) {
		this.info(`create edge ${edge.name}`);

		const count = edge.tdg.count_all;
		const min = edge.tdg.min;
		const max = edge.tdg.max;
		const reuseTarget = edge.tdg.reuse_target;
		const unique = edge.tdg.unique;

		const minId = this.id;
		const maxId = minId + count - 1;
		this.id = maxId;

		this.registry[edge.name] = {
			"count_all": count,
			"min_id": minId,
			"max_id": maxId
		};


		// the result of the created relations.
		// Array of arrays.
		// The first array '0' is the source.minId
		// a = [[1,4,8], [2,9,27,6]]
		// This means: The first source object has 3 target objects with the IDs in the array.
		// The second source object has 4 target objects
		let rel = [];

		// get the source range
		if (!this.registry[edge.src.name]) {
			this.error({
				"message": `The source object src=${edge.src.name} does not exists in the registry`,
				"object": edge
			});
			throw "error";
		}
		const sMin = this.registry[edge.src.name].min_id;
		const sMax = this.registry[edge.src.name].max_id;


		if (edge.src.path) {
			if (edge.target.path) {
				//--------------------------------------
				//- Source and target a comming from a edge
				//--------------------------------------
				let usedTargets;
				let availableSources;

				if (!this.registry[edge.src.path]) {
					this.error({
						"message": `The source object src=${edge.src.path} does not exists in the registry`,
						"object": edge
					});
					throw "error";
				}
				if (!this.registry[edge.target.path]) {
					this.error({
						"message": `The target object src=${edge.target.path} does not exists in the registry`,
						"object": edge
					});
					throw "error";
				}

				const edgeSource = this.registry[edge.src.path].objects;
				const edgeTarget = this.registry[edge.target.path].objects;

				// in this case the result needs to be saved in a hash
				const tmpObj = this.createSourceFromSourceEdge(edgeSource);

				// check that both array have the same size
				if (edgeTarget.length !== edgeSource.length) {
					this.error({
						"message": `The source and target arrays are of different size: src=${edgeSource.length}, target=${edgeTarget.length}`,
						"object": edge
					});
					return;
				}

				let createdElements = 0;
				if (min > 0) {
					createdElements = this.fillMinValuesFromEdgeToEdge(min, tmpObj, edgeSource, edgeTarget, reuseTarget, unique);
				}
				this.fillRandomValuesFromEdgeToEdge(max, tmpObj, edgeSource, edgeTarget, createdElements, count, reuseTarget,
					unique);

				// Convert the tmpResult Object to the normal array format
				const keys = Object.keys(tmpObj);
				keys.forEach(key => {
					const targets = tmpObj[key];
					rel.push({
						"s": key,
						"t": targets
					});
				});

			} else {
				throw new Error("Not implemented");
			}
		} else {
			//--------------------------------------
			//- Source and target a normal vertices
			//--------------------------------------


			// get the target range
			const tMin = this.registry[edge.target.name].min_id;
			const tMax = this.registry[edge.target.name].max_id;

			let usedTargets;
			let availableSources;

			rel = this.createSourceFromRange(sMin, sMax);
			const availableTargets = this.createArrayFromRange(tMin, tMax);


			let createdElements = 0;
			if (min > 0) {
				this.fillMinValues(min, rel, availableTargets, reuseTarget, unique);
				createdElements = min * (sMax - sMin + 1);
			}
			this.fillRandomValues(max, rel, availableTargets, createdElements, count, reuseTarget, unique);
		}

		const retObject = {
			"name": edge.name,
			"type": 'edge',
			"src_name": edge.src.name,
			"target_name": edge.target.name,
			"start_index": this.registry[edge.src.name],
			"objects": rel
		};

		this.debug(`created the edge`);

		return retObject;
	}

	/**
	 * @param sourceCount (number) Amount of source objects
	 * @param maxValues (number) The maximum number of objects to be created
	 * @param resObj (object) The object to store the result
	 * @param availableTargets (array) The array with the available target ids
	 * @param createdElements(number) The number of relations already created
	 * @param amount(number) The number of relations to be created
	 * @param reuseTarget (boolean) Could the targets be reused for different or the same source
	 * @param unique (boolean) If true, the target per source should be uniques. (makes only sence with reuseTarget = true)
	 */
	fillRandomValuesFromEdgeToEdge(maxValues, resObj, edgeSource, edgeTarget, createdElements, amount, reuse, unique) {
		// the maximum amaount of target to be created per source

		// Count in which round of generation we are.
		// To avaoid that the first elements are filled with a too big amaount of elements the max amaount
		// will be increased in each round
		let round = 1;
		let lastCreatedAmount = -1;

		while (createdElements < amount) {
			if (createdElements === lastCreatedAmount) {
				console.log(`Expect to create '${amount}' elements, but could only get '${createdElements}' elements`);
				throw new Error("Could not create enaugh edges. The targets run out");
			} else {
				lastCreatedAmount = createdElements;
			}

			// Iterate over the source array objects
			for (let j = 0; j < edgeSource.length; j++) {
				const subSource = edgeSource[j].t;
				const subTarget = edgeTarget[j].t;

				// get the source elements which will be filled in this round
				let sourceObjectsToFill = subSource;
				if (subSource.length > 20) {
					sourceObjectsToFill = this.randomValuesGet(subSource, Math.floor((Math.random() * (subSource.length /
						2)) + subSource.length / 2));
				}

				for (let i = 0; i < sourceObjectsToFill.length; i++) {

					let countNewObjectsToCreate = maxValues;
					if (resObj[sourceObjectsToFill[i]]) {
						let countNewObjectsToCreate = maxValues - resObj[sourceObjectsToFill[i]].length;
					}

					if (countNewObjectsToCreate > 20 && round < 5) {
						countNewObjectsToCreate = Math.floor(Math.random() * (countNewObjectsToCreate * round * 10 / 100));
					} else {
						countNewObjectsToCreate = Math.floor(Math.random() * (countNewObjectsToCreate + 1));
					}

					if (countNewObjectsToCreate + createdElements > amount) {
						countNewObjectsToCreate = amount - createdElements;
					}

					let subRes;
					if (unique) {
						subRes = this.createValues(countNewObjectsToCreate, subTarget, resObj[sourceObjectsToFill[i]], reuse);
					} else {
						subRes = this.createValues(countNewObjectsToCreate, subTarget, undefined, reuse);
					}

					createdElements = createdElements + subRes.length;

					subRes.forEach(val => {
						resObj[sourceObjectsToFill[i]].push(val);
					});


					if (createdElements >= amount) {
						break;
					}
				}
				if (createdElements >= amount) {
					break;
				}

			}


			round++;
		}
	}


	/**
	 * @param sourceCount (number) Amount of source objects
	 * @param minValues (number) The minimun number of objects to be created
	 * @param resObject (object) The result object
	 * @param edgeSource (array) An array of objects with the source values
	 * @param edgeTarget (array) An Array of objects with the target values
	 * @param reuseTarget (boolean) Could the targets be reused for different or the same source
	 * @param unique (boolean) If true, the target per source should be uniques. (makes only sence with reuseTarget = true)
	 * @return amaount (number) of created objects
	 */
	fillMinValuesFromEdgeToEdge(minValues, resObject, edgeSource, edgeTarget, reuse, unique) {
		let amount = 0;
		for (let i = 0; i < edgeSource.length; i++) {
			const subSource = edgeSource[i].t;
			const subTarget = edgeTarget[i].t;

			let usedTargets = [];

			// iterates over the amount of source objects
			for (let j = 0; j < subSource.length; j++) {
				if (reuse) {
					usedTargets = [];
				}
				let subRes;
				if (unique) {
					// console.log(i);
					// console.log(`Min Values : ${minValues}`);
					// console.log(`subTarget  : ${subTarget.length}`);
					// console.log(`usedTargets: ${usedTargets.length}`);
					// console.log(`reuse      : ${reuse}`);
					subRes = this.createValues(minValues, subTarget, usedTargets, reuse);
				} else {
					subRes = this.createValues(minValues, subTarget, undefined, reuse);
				}
				subRes.forEach(val => {
					amount++;
					resObject[subSource[j]].push(val);
					//resArray[i].t.push(val);
				});
			}

		}
		return amount;
	}

	/**
	 * @param sourceCount (number) Amount of source objects
	 * @param maxValues (number) The maximum number of objects to be created
	 * @param resArray (array) The array to store the result
	 * @param availableTargets (array) The array with the available target ids
	 * @param createdElements(number) The number of relations already created
	 * @param amount(number) The number of relations to be created
	 * @param reuseTarget (boolean) Could the targets be reused for different or the same source
	 * @param unique (boolean) If true, the target per source should be uniques. (makes only sence with reuseTarget = true)
	 */
	fillRandomValues(maxValues, resArray, availableTargets, createdElements, amount, reuse, unique) {
		// the maximum amaount of target to be created per source

		// Count in which round of generation we are.
		// To avaoid that the first elements are filled with a too big amaount of elements the max amaount
		// will be increased in each round
		let round = 1;

		const sourceObjects = this.createArrayFromRange(0, resArray.length - 1);
		let lastCreatedAmount = -1;

		while (createdElements < amount) {
			if (createdElements === lastCreatedAmount) {
				console.log(`Expect to create '${amount}' elements, but could only get '${createdElements}' elements`);
				throw new Error("Could not create enaugh edges. The targets run out");
			} else {
				lastCreatedAmount = createdElements;
			}

			// get the source elements which will be filled in this round
			let sourceObjectsToFill = sourceObjects;
			if (sourceObjects.length > 20) {
				sourceObjectsToFill = this.randomValuesGet(sourceObjects, Math.floor((Math.random() * (sourceObjects.length /
					2)) + sourceObjects.length / 2));
			}
			for (let i = 0; i < sourceObjectsToFill.length; i++) {
				const idx = sourceObjectsToFill[i];

				let countNewObjectsToCreate = maxValues;
				if (resArray[idx].t) {
					countNewObjectsToCreate = maxValues - resArray[idx].t.length;
				}


				if (countNewObjectsToCreate > 20 && round < 5) {
					countNewObjectsToCreate = Math.floor(Math.random() * (countNewObjectsToCreate * round * 10 / 100));
				} else {
					countNewObjectsToCreate = Math.floor(Math.random() * (countNewObjectsToCreate + 1));
				}

				if (countNewObjectsToCreate + createdElements > amount) {
					countNewObjectsToCreate = amount - createdElements;
				}


				let subRes;
				if (unique) {
					subRes = this.createValues(countNewObjectsToCreate, availableTargets, resArray[idx].t, reuse);
				} else {
					subRes = this.createValues(countNewObjectsToCreate, availableTargets, undefined, reuse);
				}

				createdElements = createdElements + subRes.length;

				subRes.forEach(val => {
					resArray[idx].t.push(val);
				});


				if (createdElements >= amount) {
					break;
				}
			}

			round++;
		}
	}


	/**
	 * @param sourceCount (number) Amount of source objects
	 * @param minValues (number) The minimun number of objects to be created
	 * @param resArray (array) The array to store the result
	 * @param availableTargets (array) The array with the available target ids
	 * @param reuseTarget (boolean) Could the targets be reused for different or the same source
	 * @param unique (boolean) If true, the target per source should be uniques. (makes only sence with reuseTarget = true)
	 */
	fillMinValues(minValues, resArray, availableTargets, reuse, unique) {
		// iterates over the amount of source objects
		for (let i = 0; i < resArray.length; i++) {
			let subRes;
			if (unique) {
				subRes = this.createValues(minValues, availableTargets, resArray[i].t, reuse);
			} else {
				subRes = this.createValues(minValues, availableTargets, undefined, reuse);
			}
			subRes.forEach(val => {
				resArray[i].t.push(val);
			});
		}
	}

	/**
	 * @param sourceCount (number) Amount of source objects
	 * @param minValues (number) The minimun number of objects to be created
	 * @param resArray (array) The array to store the result
	 * @param availableTargets (array) The array with the available target ids
	 * @param reuseTarget (boolean) Could the targets be reused for different or the same source
	 * @param unique (boolean) If true, the target per source should be uniques. (makes only sence with reuseTarget = true)
	 */
	fillMinValuesFromArray(minValues, resArray, availableTargets, reuse, unique) {
		// iterates over the amount of source objects
		for (let i = 0; i < resArray.length; i++) {
			let subRes;
			if (unique) {
				subRes = this.createValues(minValues, availableTargets[i], resArray[i], reuse);
			} else {
				subRes = this.createValues(minValues, availableTargets[i], undefined, reuse);
			}
			resArray[i].push(subRes);
		}
	}

	/**
	 * Create an array of available IDs out of a range
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
		 * Create an array of available IDs out of a range
		 */
	createSourceFromRange(minId, maxId) {
		const ret = [];
		let idx = 0;
		for (let i = minId; i <= maxId; i++) {
			ret.push({
				"s": idx,
				"t": []
			});
			idx++;
		}
		return ret;
	}

	/**
	 * Create an array of available IDs out of a range
	 */
	createSourceFromSourceEdge(sourceEdge) {
		const ret = {};
		for (let i = 0; i < sourceEdge.length; i++) {
			for (let j = 0; j < sourceEdge[i].t.length; j++) {
				ret[sourceEdge[i].t[j]] = [];
			}
		}
		return ret;
	}

	/* Creates random values. It will take the ids from an array of available ids
	 * @param count (number) how many objects to create
	 * @param availableTargets (array) The array with the available target ids
	 * @param currentTargets (array) An array with the already used targets for the current source id
	 * @param usedTargets (array) An array with the already used numbers usedTargets[usedTarget] = true
	 */
	createValues(count, availableTargets, currentTargets, reuse) {
		const res = [];
		// check if the target allows to create this amaount of elements
		for (let i = 0; i < count; i++) {
			if (reuse) {
				// the target elements could be reused
				res.push(this.randomValueGet(availableTargets, currentTargets));
			} else {
				// take the element from the available targets
				res.push(this.randomValueTake(availableTargets));
			}
		}

		return res;
	}

	/**
	 * Takes a random values from an array of available elements
	 * @param availableTargets (array) Availabale elements
	 * @param count (number) how many elements to takes
	 */
	randomValuesTake(availableTargets, count) {
		const res = [];
		for (let i = 0; i < count; i++) {
			res.push(this.randomValueTake(availableTargets));
		}
		return res;
	}


	/**
	 * Takes a random values from an array of available elements
	 * @param availableTargets (array) Availabale elements
	 */
	randomValueTake(availableTargets) {
		const idx = Math.floor((Math.random() * (availableTargets.length)));
		const val = availableTargets[idx];
		availableTargets.splice(idx, 1);
		return val;
	}

	/**
	 * Takes a random values from an array of available elements
	 * @param availableTargets (array) Availabale elements
	 * @param count (number) how many elements to takes
	 */
	randomValuesGet(availableTargets, count) {
		const res = [];
		for (let i = 0; i < count; i++) {
			res.push(this.randomValueGet(availableTargets, res));
		}
		return res;
	}


	/**
	 * gets a random value from an array of available targets.
	 * The element will not be removed from the available elements
	 * @param availableTargets (array) Availabale elements
	 * @param usedTargets (array, optionsl) The elements already used for this source.
	 *					if given it will check if the new element already is in used. If not given
	 *					just returns the new  value.
	 */
	randomValueGet(availableTargets, usedTargets) {
		// the maximal count to to find a unique random result
		let maxTryCount = 100;

		let val;

		while (!val) {
			const idx = Math.floor((Math.random() * (availableTargets.length)));
			val = availableTargets[idx];

			if (usedTargets) {
				if (usedTargets.indexOf(val) > -1) {
					val = undefined;
				} else {
					usedTargets.push(val);
				}
			}

			maxTryCount--;
			if (maxTryCount < 0) {
				console.log("---- Available Targets ----");
				console.log(availableTargets);
				console.log("---- Used Targets ----");
				console.log(usedTargets);
				throw new Error("Could not get a unique random value");
			}
		}
		return val;
	}


	validateEdges() {
		this.model.edges.forEach(egde => {
			const sourceCount = this.registry[egde.src.name];
			const targetCount = this.registry[egde.target.name];
			const count = egde.tdg.count_all;
			const min = egde.tdg.min;
			const max = egde.tdg.max;
			const reuse_target = egde.tdg.reuse_target;
			const unique = egde.tdg.unique;

			if (count > targetCount) {
				// in this case either reuse is true or unique is false
				if (reuse_target === false && unique === true) {
					this.error({
						"message": "if 'count_all' > count of target objects either 'reuse_target' must be true or 'unique' is false",
						"object": egde
					});
				}
			}

		});
	}

}

module.exports.factory = function (options) {
	return new TdgExecuter(options);
};

module.exports.executer = TdgExecuter;
