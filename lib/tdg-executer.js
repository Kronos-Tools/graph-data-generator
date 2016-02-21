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

		// The amount of elements after an info message will be printed
		this.infoCounter = opts.infoCounter ? opts.infoCounter : 100000;

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
			this.info(`create vertex ${vertex.name}`);

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
		// a = {source_id:[targets]}
		// This means: The first source object has 3 target objects with the IDs in the array.
		// The second source object has 4 target objects
		let rel = {};

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
				// const edgeToEdgeRel = {
				// 	soureParent: {
				// 		child1: [target1, targetn]
				// 	}
				// }

				// this rel contains one more level
				rel = this.createSourceFromSourceEdge(edgeSource);

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
					createdElements = this.fillMinValuesFromEdgeToEdge(min, rel, edgeSource, edgeTarget, reuseTarget, unique);
				}
				this.fillRandomValuesFromEdgeToEdge(max, rel, edgeSource, edgeTarget, createdElements, count, reuseTarget, unique);
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
			let availableTargets = this.createArrayFromRange(tMin, tMax);


			let createdElements = 0;
			if (min > 0) {
				console.log(`Available Targets before minValue  = ${availableTargets.length}`);

				const usedTargets = this.fillMinValues(min, rel, availableTargets, reuseTarget, unique);
				createdElements = min * (sMax - sMin + 1);

				if (usedTargets && (reuseTarget === false)) {
					// we need to rebuild the availableTargets
					const tmp = [];
					availableTargets.forEach(val => {
						if (!usedTargets[val]) {
							tmp.push(val);
						}
					});

					availableTargets = tmp;
				}

				console.log(`Available Targets after minValue  = ${availableTargets.length}`);
			}
			availableTargets = this.fillRandomValues(max, rel, availableTargets, createdElements, count, reuseTarget, unique);
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

		// console.log(`this info count = ${this.infoCounter}`);

		// Count in which round of generation we are.
		// To avaoid that the first elements are filled with a too big amaount of elements the max amaount
		// will be increased in each round
		let round = 1;
		let lastCreatedAmount = -1;
		let elementsCounter = 0;

		const sourceParentKeys = Object.keys(edgeSource);
		const targetParentKeys = Object.keys(edgeTarget);


		let emtyRun = 0;
		while (createdElements < amount) {
			if (createdElements === lastCreatedAmount) {
				emtyRun++;
				if (emtyRun > 2) {
					throw new Error(
						`Expect to create '${amount}' elements, but could only get '${createdElements}' elements: Run out of targets`);
				}
			} else {
				lastCreatedAmount = createdElements;
			}


			// Iterate over the source array objects
			for (let j = 0; j < sourceParentKeys.length; j++) {
				const subSource = edgeSource[sourceParentKeys[j]];
				const subTarget = edgeTarget[targetParentKeys[j]];

				for (let i = 0; i < subSource.length; i++) {

					let countNewObjectsToCreate = maxValues;
					if (resObj[subSource[i]]) {
						countNewObjectsToCreate = maxValues - resObj[subSource[i]].length;
					}

					if (countNewObjectsToCreate > 20 && round < 5) {
						countNewObjectsToCreate = Math.floor(Math.random() * (countNewObjectsToCreate * round * 10 / 100));
					} else {
						countNewObjectsToCreate = Math.floor(Math.random() * (countNewObjectsToCreate + 1));
					}

					if (resObj[subSource[i]]) {
						if (countNewObjectsToCreate > maxValues - resObj[subSource[i]].length) {
							countNewObjectsToCreate = maxValues - resObj[subSource[i]].length;
						}
					}

					if (countNewObjectsToCreate === 0) {
						countNewObjectsToCreate = 1;
					}

					// reduce if we would reach the over all max count
					if (countNewObjectsToCreate + createdElements > amount) {
						countNewObjectsToCreate = amount - createdElements;
					}



					let subRes;
					if (unique) {
						if (subTarget.length === resObj[subSource[i]].length) {
							// got already all the possible targets for this object
							console.log(`target count '${subTarget.length} equals alreday set elements '${resObj[subSource[i]].length}`);
							continue;
						} else if (resObj[subSource[i]].length + countNewObjectsToCreate > subTarget.length) {
							countNewObjectsToCreate = subTarget.length - resObj[subSource[i]].length;
						}

						const uniqueObj = {};
						resObj[subSource[i]].forEach(val => {
							uniqueObj[val] = true;
						});
						subRes = this.createValues(countNewObjectsToCreate, subTarget, uniqueObj, reuse);
					} else {
						subRes = this.createValues(countNewObjectsToCreate, subTarget, undefined, reuse);
					}


					createdElements = createdElements + subRes.length;
					elementsCounter = elementsCounter + subRes.length;

					subRes.forEach(val => {
						if (resObj[subSource[i]] === undefined) {
							resObj[subSource[i]] = [];
						}
						resObj[subSource[i]].push(val);
					});

					if (elementsCounter > this.infoCounter) {
						this.info(`Created '${createdElements}' elements in round ${round}`);
						elementsCounter = 0;
					}

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

		const sourceParentKeys = Object.keys(edgeSource);
		const targetParentKeys = Object.keys(edgeTarget);


		for (let i = 0; i < sourceParentKeys.length; i++) {
			const subSource = edgeSource[sourceParentKeys[i]];
			const subTarget = edgeTarget[sourceParentKeys[i]];

			// iterates over the amount of source objects
			for (let j = 0; j < subSource.length; j++) {
				const realSourceKey = subSource[j];
				let subRes;
				if (unique) {
					const makeUniqueObj = {};
					subRes = this.createValues(minValues, subTarget, makeUniqueObj, reuse);
				} else {
					subRes = this.createValues(minValues, subTarget, undefined, reuse);
				}

				subRes.forEach(val => {
					amount++;
					if (resObject[subSource[j]] === undefined) {
						resObject[subSource[j]] = [];
					}
					resObject[subSource[j]].push(val);
				});
			}

		}
		return amount;
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
	fillRandomValues(maxValues, resObj, availableTargets, createdElements, amount, reuse, unique) {
		// the maximum amaount of target to be created per source

		// console.log(`this info count = ${this.infoCounter}`);
		// console.log(
		// 	`Need to create ${amount} elements. Availabale are: ${availableTargets.length}. Already created are ${createdElements}`
		// );


		// Count in which round of generation we are.
		// To avaoid that the first elements are filled with a too big amaount of elements the max amaount
		// will be increased in each round
		let round = 1;

		let lastCreatedAmount = -1;
		let elementsCounter = 0;

		let usedTargets = {};
		let emtyRun = 0;

		while (createdElements < amount) {
			if (createdElements === lastCreatedAmount) {
				emtyRun++;
				if (emtyRun > 2) {
					throw new Error(
						`Expect to create '${amount}' elements, but could only get '${createdElements}' elements: Run out of targets`);
				}
			} else {
				lastCreatedAmount = createdElements;
			}

			// get the source elements which will be filled in this round
			const sourceObjects = Object.keys(resObj);

			let currentCreationCount = maxValues;
			// Get the number of already existing targets for the current source

			if (round === 1) {
				// the first round we reduce the max value to have of availabe / sources
				currentCreationCount = Math.floor(availableTargets.length / sourceObjects.length);
			} else {

				if (currentCreationCount > amount - createdElements) {
					currentCreationCount = amount - createdElements;
				}

				if (currentCreationCount > 20 && round < 5) {
					currentCreationCount = Math.floor(Math.random() * (currentCreationCount * round * 10 / 100));
				}
			}

			for (let i = 0; i < sourceObjects.length; i++) {


				let countNewObjectsToCreate = Math.floor(Math.random() * currentCreationCount);
				if (countNewObjectsToCreate === 0) {
					countNewObjectsToCreate = 1;
				}

				// cleanup used Targes
				if (!reuse) {
					const usedCount = Object.keys(usedTargets).length;
					if (usedCount > 0 && usedCount * 20 > availableTargets.length) {

						//console.log(`Cleanup availableTargets: use count = ${usedCount}`);
						// reduce the available targets
						const tmp = [];
						availableTargets.forEach(val => {
							if (!usedTargets[val]) {
								tmp.push(val);
							}
						});

						availableTargets = tmp;
						usedTargets = {};
					}
				}

				const idx = sourceObjects[i];


				if (resObj[idx]) {
					if (countNewObjectsToCreate > maxValues - resObj[idx].length) {
						countNewObjectsToCreate = maxValues - resObj[idx].length;
					}
				}

				// reduce if we would reach the over all max count
				if (countNewObjectsToCreate + createdElements > amount) {
					countNewObjectsToCreate = amount - createdElements;
				}

				let subRes;

				if (reuse || availableTargets.length < 5000 || countNewObjectsToCreate * 6 > availableTargets.length) {
					// we could get the normal way as we do not delete from the available targets
					if (unique) {
						const makeUniqueObj = {};
						// add the already existing keys to this object
						resObj[idx].forEach(val => {
							makeUniqueObj[val] = true;
						});
						subRes = this.createValues(countNewObjectsToCreate, availableTargets, makeUniqueObj, reuse);
					} else {
						subRes = this.createValues(countNewObjectsToCreate, availableTargets, undefined, reuse);
					}

				} else {
					// if we do not reuse the elements, we do not need to distinquish between unique or not
					subRes = this.createValuesFast(countNewObjectsToCreate, availableTargets, usedTargets);
				}


				createdElements = createdElements + subRes.length;
				elementsCounter = elementsCounter + subRes.length;

				if (elementsCounter > this.infoCounter) {
					this.info(`Created '${createdElements}' elements in round ${round}`);
					elementsCounter = 0;
				}

				subRes.forEach(val => {
					resObj[idx].push(val);
				});


				if (createdElements >= amount) {
					break;
				}
			}

			round++;
		}

		// cleanup used Targes

		const usedCount = Object.keys(usedTargets).length;
		if (usedCount > 0) {
			console.log(`END: Cleanup availableTargets: use count = ${usedCount}`);
			// reduce the available targets
			const tmp = [];
			availableTargets.forEach(val => {
				if (!usedTargets[val]) {
					tmp.push(val);
				}
			});

			availableTargets = tmp;
			usedTargets = {};
		}



		// returns the still available targets
		return availableTargets;
	}


	/**
	 * @param sourceCount (number) Amount of source objects
	 * @param minValues (number) The minimun number of objects to be created
	 * @param resObj (object) The object to store the result
	 * @param availableTargets (array) The array with the available target ids
	 * @param reuseTarget (boolean) Could the targets be reused for different or the same source
	 * @param unique (boolean) If true, the target per source should be uniques. (makes only sence with reuseTarget = true)
	 */
	fillMinValues(minValues, resObj, availableTargets, reuse, unique) {
		// iterates over the amount of source objects
		const srcKeys = Object.keys(resObj);


		const usedTargets = {};
		for (let i = 0; i < srcKeys.length; i++) {
			let subRes;

			if (reuse || availableTargets.length < 5000 || minValues * 6 > availableTargets.length) {
				// we could get the normal way as we do not delete from the available targets
				if (unique) {
					const makeUniqueObj = {};
					// add the already existing keys to this object
					resObj[srcKeys[i]].forEach(val => {
						makeUniqueObj[val] = true;
					});
					subRes = this.createValues(minValues, availableTargets, makeUniqueObj, reuse);
				} else {
					subRes = this.createValues(minValues, availableTargets, undefined, reuse);
				}
			} else {
				// if we do not reuse the elements we do not need to distinquish between unique or not
				subRes = this.createValuesFast(minValues, availableTargets, usedTargets);
			}

			subRes.forEach(val => {
				if (resObj[srcKeys[i]] === undefined) {
					resObj[srcKeys[i]] = [];
				}
				resObj[srcKeys[i]].push(val);
			});
		}

		return usedTargets;
	}

	// /**
	//  * @param sourceCount (number) Amount of source objects
	//  * @param minValues (number) The minimun number of objects to be created
	//  * @param resArray (array) The array to store the result
	//  * @param availableTargets (array) The array with the available target ids
	//  * @param reuseTarget (boolean) Could the targets be reused for different or the same source
	//  * @param unique (boolean) If true, the target per source should be uniques. (makes only sence with reuseTarget = true)
	//  */
	// fillMinValuesFromArray(minValues, resArray, availableTargets, reuse, unique) {
	// 	// iterates over the amount of source objects
	// 	for (let i = 0; i < resArray.length; i++) {
	// 		let subRes;
	// 		if (unique) {
	// 			subRes = this.createValues(minValues, availableTargets[i], resArray[i], reuse);
	// 		} else {
	// 			subRes = this.createValues(minValues, availableTargets[i], undefined, reuse);
	// 		}
	// 		resArray[i].push(subRes);
	// 	}
	// }

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
		const ret = {};
		for (let i = minId; i <= maxId; i++) {
			ret[i] = [];
		}
		return ret;
	}

	/**
	 * Create an array of available IDs out of a range
	 */
	createSourceFromSourceEdge(sourceEdge) {
		const ret = {};
		const sKeys = Object.keys(sourceEdge);

		for (let i = 0; i < sKeys.length; i++) {
			const key = sKeys[i];
			for (let j = 0; j < sourceEdge[key].length; j++) {
				const targetKey = sourceEdge[key][j];
				ret[targetKey] = [];
			}
		}
		return ret;
	}

	/* Creates random values. It will take the ids from an array of available ids
	 * @param count (number) how many objects to create
	 * @param availableTargets (array) The array with the available target ids
	 * @param currentTargets (object) An object with the already used targets for the current source id
	 * @param usedTargets (array) An array with the already used numbers usedTargets[usedTarget] = true
	 */
	createValuesFast(count, availableTargets, usedTargets) {
		const result = {};
		for (let i = 0; i < count; i++) {
			result[this.randomValueGet(availableTargets, usedTargets)] = true;
		}
		return Object.keys(result);
	}


	/* Creates random values. It will take the ids from an array of available ids
	 * @param count (number) how many objects to create
	 * @param availableTargets (array) The array with the available target ids
	 * @param currentTargets (object) An object with the already used targets for the current source id
	 * @param usedTargets (array) An array with the already used numbers usedTargets[usedTarget] = true
	 */
	createValues(count, availableTargets, currentTargets, reuse) {
		const res = [];

		// check if the target allows to create this amaount of elements
		for (let i = 0; i < count; i++) {
			if (reuse) {
				// the target elements could be reused
				if (Math.floor(Object.keys(currentTargets).length / availableTargets * 100) > 70) {
					// already 80% of the available targest is set.
					// now we start from the beginning and take what is available
					const counter = 0;
					availableTargets.forEach(val => {
						if (count > counter) {
							if (!currentTargets[val]) {
								res.push(val);
								currentTargets[val] = true;
							}
							return res;
						}
					});
				} else {
					res.push(this.randomValueGet(availableTargets, currentTargets));
				}
			} else {
				// take the element from the available targets
				res.push(this.randomValueTake(availableTargets));
			}
		}
		return res;
	}



	// /**
	//  * Takes a random values from an array of available elements
	//  * @param availableTargets (array) Availabale elements
	//  * @param count (number) how many elements to takes
	//  */
	// randomValuesTake(availableTargets, count) {
	// 	const res = [];
	// 	for (let i = 0; i < count; i++) {
	// 		res.push(this.randomValueTake(availableTargets));
	// 	}
	// 	return res;
	// }


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

	// /**
	//  * Takes a random values from an array of available elements
	//  * @param availableTargets (array) Availabale elements
	//  * @param count (number) how many elements to takes
	//  */
	// randomValuesGet(availableTargets, count) {
	// 	if (!availableTargets || !count) {
	// 		throw new Error(`Missing parameter: 'availableTargets' and 'count' are mandatory fields`);
	// 	}
	//
	// 	if (count > availableTargets.length) {
	// 		throw new Error(`Should choose ${count} elements from ${availableTargets} available elements`);
	// 	}
	// 	const res = [];
	// 	const usedTargets = {};
	// 	for (let i = 0; i < count; i++) {
	// 		res.push(this.randomValueGet(availableTargets, usedTargets));
	// 	}
	// 	return res;
	// }


	/**
	 * gets a random value from an array of available targets.
	 * The element will not be removed from the available elements
	 * @param availableTargets (array) Availabale elements
	 * @param currentTargets (object optional) An object with the already used targets for the current source id
	 */
	randomValueGet(availableTargets, usedTargets) {
		// the maximal count to to find a unique random result
		let maxTryCount = 100;

		let val;

		while (!val) {
			const idx = Math.floor((Math.random() * (availableTargets.length)));
			val = availableTargets[idx];

			if (usedTargets) {
				if (usedTargets[val]) {
					val = undefined;
				} else {
					usedTargets[val] = true;
				}
			}

			maxTryCount--;
			if (maxTryCount < 0) {
				availableTargets.forEach(tmpVal => {
					if (!usedTargets[tmpVal]) {
						val = tmpVal;
					}
				});
				if (!val) {
					console.log(
						`Count availableTargets='${availableTargets.length}' and used targets='${Object.keys(usedTargets).length}'`);
					throw new Error("Could not get a unique random value");
				}
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
