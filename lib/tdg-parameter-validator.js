/* jslint node: true, esnext: true */
"use strict";
const fs = require('fs');
const path = require("path");

const tdgUtil = require('./tdg-util');

/*
 * This module only produces relation between objects
 *
 */
const DEFAULT_constraint = {
	"min": 1,
	"max": 1,
	"connect_all_targets": false,
	"reuse_target": false
};


const ParameterValidator = {

	/*
	 * Validates one object definition
	 * It added an element 'sub_element_count_per_parent' to the objects object
	 * which has the count of objects to create for each sub object. If there is one
	 * @param definition (object) The object definition to validate
	 * @param logger (object) The logger for logging errors
	 * @param parent (array) An array with all the parent definitions
	 */
	validateVertexParameter(definition, statistic, logger, parent) {
			// Definition for a single object
			this.checkParameter(definition, ["name", "count_all"], undefined, logger);

			statistic[definition.name] = definition.count_all;

			if (parent && parent.length > 0) {
				logger.debug(`validate sub vertex ${definition.name} number ${parent.length}`);

				// this is a sub vertex
				this.checkParameter(definition, ["edge_name", "constraint"], undefined, logger);
				this._validateVertexParameterSub(definition, statistic, logger, parent);
			}
		},


		/*
		 * Validates the sub objects and also creates the definition with the amaount of data to create
		 * @param parentObjectCount (number) The amount of the parent object
		 * @param subDef (object) The object definition to validate
		 */
		_validateVertexParameterSub(definition, statistic, logger, parent) {
			const parentObjectCount = parent[parent.length - 1].count_all;

			const maxCount = definition.count_all;
			if (definition.constraint.min === undefined) {
				if (maxCount < parentObjectCount) {
					definition.constraint.min = 1;
				} else {
					definition.constraint.min = 0;
				}
			}
			if (definition.constraint.max === undefined) {
				definition.constraint.max = Math.floor(maxCount / 2);
			}

			if (definition.constraint.min > 0) {
				if (parentObjectCount * definition.constraint.min > maxCount) {
					logger.error({
						"type": "min * parent > count_all",
						"object": definition
					});
				}
			}

			// OK compute the amount of elements
			const elemCountArray = [];
			let currentCount = 0;
			// First set all the minCount or one

			for (let i = 0; i < parentObjectCount; i++) {
				currentCount++;
				if (currentCount > maxCount) {
					break;
				}
				elemCountArray.push(1);
			}

			// Counts the rounds of the while loop
			let roundCounter = 0;


			let lastCurrentCount = 0;
			// now add random amount of elements to each part
			while (currentCount < maxCount) {
				roundCounter++;

				if (lastCurrentCount == currentCount) {
					// we got no increase of the counter. Throw an error
					throw `Could not get more than ${lastCurrentCount} elements , but expected are: ${maxCount} elements`;
				} else {
					lastCurrentCount = currentCount;
				}

				for (let i = 0; i < parentObjectCount; i++) {


					let randomMax = definition.constraint.max - definition.constraint.min;
					if (roundCounter < 5) {
						// In the first round take only a little of the possible numbers
						if (randomMax > 100) {
							randomMax = Math.floor(randomMax * roundCounter / 10);
						}
					}

					let newVal = Math.floor((Math.random() * randomMax));
					if (currentCount + newVal > maxCount) {
						newVal = maxCount - currentCount;
					}

					if (elemCountArray[i] + newVal > definition.constraint.max) {
						newVal = definition.constraint.max - elemCountArray[i];
					}

					elemCountArray[i] = elemCountArray[i] + newVal;
					currentCount = currentCount + newVal;

					if (currentCount >= maxCount) {
						break;
					}

				}
			}
			definition.sub_element_count_per_parent = elemCountArray;
			statistic[definition.name] = elemCountArray;
		},


		/**
		 * Creates the absolutes counts for all the possible parameter.
		 * Also it validates the given or compute counts
		 * @param relationDefinition (Object) The relation definition
		 * @param sourceObjectCount (number) The amount of available source objects
		 * @param targetObjectCount (number) The amount of available target objects
		 */
		validateEdgeParameter(relationDefinition, statistic, logger, parent) {
			this.checkParameter(relationDefinition, ["rel"], undefined, logger);
			this.checkParameter(relationDefinition.rel, ["src", "target"], undefined, logger);

			// The name of the source object
			const srcName = tdgUtil.getObjectTypeFromRelation(relationDefinition, 'src', logger);

			// The name of the target object
			const targetName = tdgUtil.getObjectTypeFromRelation(relationDefinition, 'target', logger);

			const src = relationDefinition.rel.src;
			const target = relationDefinition.rel.target;

			const sourceObjectCount = statistic[srcName];
			if (!sourceObjectCount) {
				logger.error({
					"type": "missing statistc entry",
					"name": srcName,
					"object": relationDefinition
				});
			}

			const targetObjectCount = statistic[targetName];
			if (!targetObjectCount) {
				logger.error({
					"type": "missing statistc entry",
					"name": targetName,
					"object": relationDefinition
				});
			}

			if (Array.isArray(targetObjectCount)) {
				if (!Array.isArray(sourceObjectCount)) {
					logger.error({
						"type": "object count missmatch",
						"name": targetName,
						"message": "If the target object has an array of counts, the source object must also have an array of counts",
						"object": relationDefinition
					});
				} else {
					if (sourceObjectCount.length != targetObjectCount.length) {
						logger.error({
							"type": "object count missmatch",
							"name": targetName,
							"message": "If the target object has an array of counts, the source object must also have an array of counts",
							"object": relationDefinition
						});

					}
				}
			}

			// the name of this relation
			const type = relationDefinition.rel.name;



			const res = {
				"source_count": 0, // how many of the source objects should be taken
				"target_count": 0, // how many of the target objects should be taken
				"count_all": 0, // how many relations to be created at all
				"reuse_target": false, // a target object may not me used more than once
				"constraint": {
					"min": 0, // how many children should one parent have as a minimum. This number is in relation to the source_count not to the available source objects
					"max": 0 // how many children should one parent have as a maximum
				}
			};


			// Create the constrainst out of a merge of the existsing constraint and the default one
			const constraint = {};
			Object.assign(constraint, DEFAULT_constraint, relationDefinition.constraint);

			// ---------------------
			// reuse_target #define if a target object may be used more than once
			// ---------------------
			if (target.reuse === undefined) {
				res.reuse_target = false;
			} else {
				if (target.reuse) {
					res.reuse_target = true;
				} else {
					res.reuse_target = false;
				}
			}

			if (Array.isArray(sourceObjectCount) && !res.reuse_target) {
				for (let i = 0; i < sourceObjectCount.length; i++) {
					const sc = sourceObjectCount[i];
					let tc;
					if (Array.isArray(targetObjectCount)) {
						tc = targetObjectCount[i];
					} else {
						tc = targetObjectCount;
					}

					if (sc > tc) {
						logger.error({
							"type": "sourceCount > targetCount",
							"in_iteration": i,
							"name": type,
							"object": relationDefinition
						});
					}

				}
			} else {
				if (sourceObjectCount > targetObjectCount && !res.reuse_target) {
					logger.error({
						"type": "sourceCount > targetCount",
						"name": type,
						"object": relationDefinition
					});
				}

			}


			// ---------------------
			// count_all #how many relations to be created at all
			// ---------------------
			let countOfAllReleations;
			if (relationDefinition.count_all) {
				res.count_all = relationDefinition.count_all;
			}

			// ---------------------
			// source_count #how many of the source objects should be taken
			// ---------------------
			if (Array.isArray(sourceObjectCount)) {
				res.source_count = [];
				for (let i = 0; i < sourceObjectCount.length; i++) {
					if (src.count_all) {
						res.source_count[i] = this.extractCount(src.count_all, sourceObjectCount[i], relationDefinition, logger);
					} else {
						res.source_count[i] = sourceObjectCount[i];
					}
				}
			} else {
				if (src.count_all) {
					res.source_count = this.extractCount(src.count_all, sourceObjectCount, relationDefinition, logger);
				} else {
					res.source_count = sourceObjectCount;
				}
			}


			// ---------------------
			// target_count #how many of the target objects should be taken
			// ---------------------
			if (Array.isArray(targetObjectCount)) {
				res.target_count = [];
				for (let i = 0; i < targetObjectCount.length; i++) {
					if (target.count_all) {
						res.target_count[i] = this.extractCount(target.count_all, targetObjectCount[i], relationDefinition, logger);
					} else {
						res.target_count[i] = targetObjectCount[i];
					}
				}
			} else {
				if (target.count_all) {
					res.target_count = this.extractCount(target.count_all, targetObjectCount, relationDefinition, logger);
				} else {
					res.target_count = targetObjectCount;
				}
			}


			// ---------------------
			// constraint.min #how many children should one parent have as a minimum. This number is in relation to the source_count not to the available source objects
			// ---------------------
			if (relationDefinition.constraint.min) {
				res.constraint.min = relationDefinition.constraint.min;
			} else {
				res.constraint.min = 1;
			}

			let tmp = -1;
			res.target_count.forEach(val => {
				if (tmp < 0) {
					tmp = val;
				} else {
					tmp = Math.min(tmp, val);
				}
			});
			if (Array.isArray(res.target_count)) {
				if (res.constraint.min > tmp) {
					logger.error({
						"type": "min > available target count",
						"name": "constraint.min",
						"object": relationDefinition,
						"derived_object": res
					});
				}

			} else {
				if (res.constraint.min > res.target_count) {
					logger.error({
						"type": "min > available target count",
						"name": "constraint.min",
						"object": relationDefinition,
						"derived_object": res
					});
				}
			}


			// ---------------------
			// constraint.max #how many children should one parent have as a maximum
			// ---------------------
			if (relationDefinition.constraint.max) {
				res.constraint.max = relationDefinition.constraint.max;
			} else {
				res.constraint.max = res.constraint.min;
			}

			if (res.constraint.min > res.constraint.max) {
				logger.error({
					"type": "min > max",
					"name": "min and max",
					"object": relationDefinition,
					"derived_object": res
				});
			}

			// ---------------------
			// count_all #how many relations to be created at all
			// ---------------------



			if (relationDefinition.count_all) {
				res.count_all = relationDefinition.count_all;

				let tmp = res.target_count;
				if (Array.isArray(res.target_count)) {
					tmp = 0;
					res.target_count.forEach(e => tmp = tmp + e);
				}

				if (res.count_all > tmp && !res.reuse_target) {
					logger.error({
						"type": "count_all > possible",
						"name": "count_all",
						"object": relationDefinition,
						"derived_object": res
					});
				}

				if (Array.isArray(res.src_count)) {
					tmp = 0;
					res.src_count.forEach(e => tmp = tmp + e);
				}
				if (res.count_all < tmp) {
					logger.error({
						"type": "count_all < source_count",
						"name": "count_all",
						"object": relationDefinition,
						"derived_object": res
					});
				}

			} else {

				let tmp = res.target_count;
				if (Array.isArray(res.target_count)) {
					tmp = 0;
					res.target_count.forEach(e => tmp = tmp + e);
				}


				// In this case compute the minimum between min and max per source
				// test that the minimum count makes no problems
				res.count_all = res.constraint.min * res.source_count;
				if (res.count_all > tmp && !res.reuse_target) {
					console.log(`countAll=${res.count_all}  target_count=${tmp}  reuse_target=${res.reuse_target}`);
					logger.error({
						"type": "count_all > possible",
						"name": "count_all",
						"object": relationDefinition,
						"derived_object": res
					});
				}

				// In this case compute the middle between min and max per source
				res.count_all = (res.constraint.min + res.constraint.max - res.constraint.min) * res.source_count;
				if (res.count_all > tmp && !res.reuse_target) {
					res.count_all = tmp;
				}

			}

			// Update the original definition
			relationDefinition.counts = {};
			relationDefinition.counts.source_count = res.source_count;
			relationDefinition.counts.target_count = res.target_count;
			relationDefinition.counts.count_all = res.count_all;

			if (!relationDefinition.constraint) {
				relationDefinition.constraint = {};
			}
			relationDefinition.constraint.min = res.constraint.min;
			relationDefinition.constraint.max = res.constraint.max;


			// #####################################
			// #####################################

			if (Array.isArray(res.source_count)) {
				// OK compute the amount of elements
				const elemCountArray = [];
				let currentCount = 0;
				const maxCount = res.count_all;
				// First set all the minCount or one

				// Initialize the array
				for (let i = 0; i < res.source_count.length; i++) {
					elemCountArray[i] = [];
				}


				const minVal = relationDefinition.constraint.min;
				if (minVal > 0) {
					for (let i = 0; i < res.source_count.length; i++) {
						if (currentCount > res.count_all) {
							break;
						}
						for (let j = 0; j < res.source_count[i]; j++) {
							currentCount++;
							if (currentCount > res.count_all) {
								break;
							}
							elemCountArray[i].push(1);
						}
					}
				}

				// Count the while loops
				let roundCounter = 0;

				// The amount of complete elements from the last while loop
				let lastCurrentCount = 0;

				// now add random amount of elements to each part
				while (currentCount < maxCount) {
					roundCounter++;

					if (lastCurrentCount == currentCount) {
						// we got no increase of the counter. Throw an error
						throw `Could not get more than ${lastCurrentCount} elements , but expected are: ${maxCount} elements`;
					} else {
						lastCurrentCount = currentCount;
					}


					for (let i = 0; i < res.source_count.length; i++) {
						if (currentCount > res.count_all) {
							break;
						}
						for (let j = 0; j < res.source_count[i]; j++) {
							if (currentCount > res.count_all) {
								break;
							}

							const currVal = elemCountArray[i][j];

							let randomMax = res.constraint.max - res.constraint.min;
							if (roundCounter < 5) {
								// In the first round take only a little of the possible numbers
								if (randomMax > 100) {
									randomMax = Math.floor(randomMax * roundCounter / 10);
								}
							}



							// the value for an element is restricted by 3 parts hier:
							// 1. The maximal value at all
							// 2. The maximal value for this relation per element
							// 3. The available target elements
							// so first get the lowest of these numbers
							const newMaxVal = Math.min(res.constraint.max, res.target_count[i], maxCount - currentCount);
							if (newMaxVal == 1) {
								currentCount++;
								elemCountArray[i][j] = elemCountArray[i][j] + 1;
							} else {
								if (currVal <= newMaxVal) {
									// ok we could add elements

									let newVal = Math.floor((Math.random() * (randomMax)));
									if (currVal + newVal <= newMaxVal) {
										currentCount = currentCount + newVal;
										elemCountArray[i][j] = elemCountArray[i][j] + newVal;
									}
								}
							}
						}
					}
				}

				relationDefinition.counts.edges_per_source = elemCountArray;
			}



		},


		/**
		 * Computes a count out of a given string
		 * @param counter (string, number, boolean) The Object to create the number from
		 * @param objectCount (number) The amaount of available objects
		 * @param definition (object) The definition this part comes from. Only used in case of errors
		 * @return resultCount (number) The absolute count
		 */
		extractCount(counter, objectCount, definition, logger) {
			let resultCount;

			if (counter) {
				if (typeof counter === 'number') {
					resultCount = counter;
				} else if (typeof counter === 'boolean') {
					resultCount = objectCount;
				} else if (typeof counter === 'string') {
					// allowed is /\d{1..3}%/
					// percentage of the source objects
					if (/^\d{1,3}\%$/.test(counter)) {
						let val = counter;
						val.replace("\%", "");
						val = parseInt(val);
						if (val <= 100) {
							// we got a value
							if (val === 100) {
								resultCount = objectCount;
							} else {
								resultCount = Math.round(objectCount - objectCount * val / 100);
							}

						}
					}
					if (!resultCount) {
						logger.error({
							"type": "invalid count_all for source in relation",
							"name": "count_all",
							"object": definition
						});
					}
				}
			}

			if (!resultCount) {
				logger.error({
					"type": "Could not compute value",
					"name": "source_count",
					"object": definition
				});
			}

			return resultCount;
		},


		/**
		 * Checks that the given object has all the expected property keys
		 * @param obj (object) The object to proof
		 * @param keys (array) An array of keys the object must have
		 * @param typeMessage (string, optional) The message for the type field
		 */
		checkParameter(obj, keys, typeMessage, logger) {
			if (!typeMessage) {
				typeMessage = "missing key";
			}
			keys.forEach(function (key) {
				if (obj[key] === undefined) {
					logger.error({
						"type": typeMessage,
						"name": key,
						"object": obj
					});
				}
			});
		},

};

module.exports = ParameterValidator;
