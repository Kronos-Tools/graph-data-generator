/* jslint node: true, esnext: true */
"use strict";

const DEFAULT_constraint = {
	"min": 1,
	"max": 1,
	"connect_all_targets": false,
	"reuse_target": false
};

const TDG = {

	/**
	 * Process the graph definition to generate
	 * @param graphDefinition (Object) The JSON defines the graph
	 * @param withType (boolean) Should the type of the object be stored in the object?
	 */
	loadStructure(graphDefinition, withType) {
			console.log("Process json");

			const objectDefinitions = graphDefinition.objects;
			if (!objectDefinitions) {
				throw new Error("The structure deifines no objects");
			}

			const res = {
				"objects": {},
				"relations": {}
			};
			// --------------------------------------------
			// First create all the objects
			// --------------------------------------------
			for (let i = 0; i < objectDefinitions.length; i++) {
				const objectDefinition = objectDefinitions[i];
				const createdObjects = this.createObject(objectDefinition, withType);
				const objectType = objectDefinition.name;
				res.objects[objectType] = createdObjects;
			}

			// --------------------------------------------
			// Then create all the relations
			// --------------------------------------------
			const relations = graphDefinition.relations;
			if (relations) {
				for (let i = 0; i < relations.length; i++) {
					const relation = relations[i];
					const relationType = relation.name;

					const createdRelations = this.createObjectRelation(relation, res.objects, withType);
					res.relations[relationType] = createdRelations;
				}
			}



			console.log(res.relations);

		},

		/**
		 * Extracts the object type from a relation configuration.
		 * It could be a string or and object containing the type
		 * @param relationDefinition (Object) The original relation definition
		 * @param key (string) The name of the key
		 */
		_getObjectTypeFromRelation(relationDefinition, key) {
			if (typeof relationDefinition.rel[key] === 'string') {
				return relationDefinition.rel[key];
			} else if (relationDefinition.rel[key].type) {
				return relationDefinition.rel[key].type;
			} else {
				throw new Error({
					"type": "no object type in relation",
					"name": key,
					"object": relationDefinition
				});

			}
		},

		/**
		 * Returns the objects to be taken in a relation.
		 * If the count id greater than the count of objects the
		 * objects will be returned as they are
		 */
		_getObjectsForRelation(count, objects) {
			const objectCount = Object.keys(objects).length;
			if (objectCount > count) {
				const retObjects = [];
				const keys = Object.keys(objects);
				for (let i = 0; i < count; i++) {
					const obj = objects[this._getRandomKey(keys)];
					retObjects.push(obj);
				}
				return retObjects;
			} else {
				return objects;
			}

		},

		/**
		 * Returns a random key from the array of keys. The key taken will be removed from the array
		 * @param keyArray (Array) This array contains all the possible keys. A taken key will be removed from the array
		 * @return key (String) The key found
		 */
		_getRandomKey(keyArray) {
			if (keyArray.length > 10) {
				const idx = Math.floor((Math.random() * keyArray.length));
				const key = keyArray[idx];
				keyArray.splice(idx, 1); // remove from the available keys
				return key;
			} else {
				return keyArray.pop();
			}
		},

		/**
		 * Creates the relation between two objects
		 * @param relationDefinition
		 {
		  "name": "account_has_entitlement",		// The type name of this relation. Must be unique
		 	"src": "account",					// The source 1
		 	"target": "entitlement",	// The target n
		 	"constraint": {					// constraint for this relation
		 		"min": 5,								// The minimum amount
		 		"max": 11000						// The maximum amaount
		 	}
		 },
		 "count_all": 20000000,			// the amaount of realations to be created
		 "count_current": 9000000
		 }
		 * @param objects (object) The json with all the objects
		 * @param withType (boolean) Should the type of the object be stored in the object?
		 */
		createObjectRelation(relationDefinition, objects, withType) {
			// The type of the source object
			const sourceType = this._getObjectTypeFromRelation(relationDefinition, 'src');

			// the type of the target object
			const targetType = this._getObjectTypeFromRelation(relationDefinition, 'target');

			// the counts for the data creation
			const countParameter = this._createObjectRelation_prepareParameter(relationDefinition, objects, withType);

			if (!objects[sourceType]) {
				throw new Error({
					"type": "Objects for type not existing",
					"name": sourceType,
					"object": relationDefinition
				});
			}
			if (!objects[targetType]) {
				throw new Error({
					"type": "Objects for type not existing",
					"name": targetType,
					"object": relationDefinition
				});
			}

			const sourceObjects = this._getObjectsForRelation(countParameter.source_count, objects[sourceType]);
			const targetObjects = this._getObjectsForRelation(countParameter.target_count, objects[targetType]);

			// Iterate the source objects and add the targets
			let sourceId;

			const availableTargetKeys = Object.keys(targetObjects);


			const createdRelations = new Array(countParameter.count_all);
			//--------------------------------------------------------------
			// the first step is to create the min amount for each object
			//--------------------------------------------------------------
			let resultIdx = 0;
			for (sourceId in sourceObjects) {
				for (let i = 0; i < countParameter.constraint.min; i++) {
					const targetKey = this._getRandomKey(availableTargetKeys);
					const obj = targetObjects[targetKey];
					createdRelations[resultIdx] = {
						"src": sourceObjects[sourceId],
						"target": obj
					};
					resultIdx++;
				}

				// If the availabe targets are too less add them again
				if (availableTargetKeys.length < countParameter.constraint.min) {
					Object.keys(targetObjects).forEach(val => {
						availableTargetKeys.push(val);
					});
				}
			}

			//--------------------------------------------------------------
			// the second step is to create as many as ordered
			//--------------------------------------------------------------
			for (sourceId in sourceObjects) {
				//if (resultIdx < countParameter.count_all) {}
			}

			return {
				"source_type": sourceType,
				"target_type": targetType,
				"relations": createdRelations
			};
		},

		/**
		 * Creates the absolutes counts for all the possible parameter.
		 * Also it validates the given or compute counts
		 * @param relationDefinition (Object) The relation definition
		 * @param objects (Object) The object containing all the created objects needed for this relation
		 */
		_createObjectRelation_prepareParameter(relationDefinition, objects) {
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

			this._checkParameter(relationDefinition, ["rel"]);
			this._checkParameter(relationDefinition.rel, ["name", "src", "target"]);

			// The name of the source object
			const src = this._getObjectTypeFromRelation(relationDefinition, 'src');

			// The name of the target object
			const target = this._getObjectTypeFromRelation(relationDefinition, 'target');

			// the name of this relation
			const type = relationDefinition.rel.name;


			// Check that the source and target obejcts exists
			this._checkParameter(objects, [src, target], "missing object");

			const constraint = {};
			Object.assign(constraint, DEFAULT_constraint, relationDefinition.constraint);


			const sourceCount = Object.keys(objects[src]).length;
			const targetCount = Object.keys(objects[target]).length;

			if (sourceCount > targetCount && !constraint.reuse_target) {
				throw new Error({
					"type": "sourceCount > targetCount",
					"name": type,
					"object": relationDefinition
				});
			}

			/**
			 * Computes a count out of a given string
			 * @param counter (string, number, boolean) The Object to create the number from
			 * @param objectCount (number) The amaount of available objects
			 * @return resultCount (number) The absolute count
			 */
			function extractCount(counter, objectCount) {
				let resultCount;

				if (counter) {
					if (typeof counter === 'number') {
						resultCount = counter;
					} else if (typeof counter === 'boolean') {
						resultCount = objectCount;
					} else if (typeof counter === 'string') {
						// allowed is /\d{1..3}%/
						// percentage of the source objects
						if (/^\d{1..3}\%$/.test(counter)) {
							let val = counter;
							val.replace("%");
							val = parseInt(val);
							if (val <= 100) {
								// we got a value
								if (val === 100) {
									resultCount = val;
								} else {
									resultCount = Math.round(objectCount - objectCount * val / 100);
								}

							}
						}
						if (!resultCount) {
							throw new Error({
								"type": "invalid count_all for source in relation",
								"name": "count_all",
								"object": relationDefinition
							});
						}
					}
				}

				if (!resultCount) {
					throw new Error({
						"type": "Could not compute value",
						"name": "source_count",
						"object": relationDefinition
					});
				}

				return resultCount;
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
			if (src.count_all) {
				res.source_count = extractCount(src.count_all, sourceCount);
			} else {
				res.source_count = sourceCount;
			}

			// ---------------------
			// target_count #how many of the target objects should be taken
			// ---------------------
			if (target.count_all) {
				res.target_count = extractCount(target.count_all, targetCount);
			} else {
				res.target_count = sourceCount;
			}


			// ---------------------
			// reuse_target #define if a target object may be used more than once
			// ---------------------
			if (target.reuse === 'undefined') {
				res.reuse_target = false;
			} else {
				if (target.reuse) {
					res.reuse_target = true;
				} else {
					res.reuse_target = false;
				}
			}


			// Constraint commons
			if (!relationDefinition.constraint) {
				relationDefinition.constraint = {
					"min": 1,
					"max": 1
				};
			}
			// ---------------------
			// constraint.min #how many children should one parent have as a minimum. This number is in relation to the source_count not to the available source objects
			// ---------------------
			if (relationDefinition.constraint.min) {
				res.constraint.min = relationDefinition.constraint.min;
			} else {
				res.constraint.min = 1;
			}
			if (res.constraint.min > res.target_count) {
				throw new Error({
					"type": "min > available target count",
					"name": "constraint.min",
					"object": relationDefinition,
					"derived_object": res
				});
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
				throw new Error({
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

				if (res.count_all > res.target_count && !res.reuse_target) {
					throw new Error({
						"type": "count_all > possible",
						"name": "count_all",
						"object": relationDefinition,
						"derived_object": res
					});
				}

				if (res.count_all < res.target_count) {
					throw new Error({
						"type": "count_all < source_count",
						"name": "count_all",
						"object": relationDefinition,
						"derived_object": res
					});
				}

			} else {

				// In this case compute the minimum between min and max per source
				res.count_all = res.constraint.min * res.source_count;
				if (res.count_all > res.target_count && !res.reuse_target) {
					throw new Error({
						"type": "count_all > possible",
						"name": "count_all",
						"object": relationDefinition,
						"derived_object": res
					});
				}

				// In this case compute the middle between min and max per source
				res.count_all = (res.constraint.min + res.constraint.max - res.constraint.min) * res.source_count;
				if (res.count_all > res.target_count && !res.reuse_target) {
					res.count_all = res.target_count;
				}

			}


			return res;
		},

		/**
		 * Checks that the given object has all the expected parameters
		 * @param obj (object) The object to proof
		 * @param keys (array) An array of keys the object must have
		 * @param typeMessage (string, optional) The message for the type field
		 */
		_checkParameter(obj, keys, typeMessage) {
			if (!typeMessage) {
				typeMessage = "missing key";
			}
			keys.forEach(function (key) {
				if (obj[key] === undefined) {
					throw new Error({
						"type": typeMessage,
						"name": key,
						"object": obj
					});
				}
			});
		},

		/**
		 * Creates the object defined by the object definition
		 * @param objectDefinition
		 {
			 "name": "account",					// The name of this object type. The name must be unique
			 "count_all": 4600000 			// The amount of objects to create
		 }
		 * @param withType (boolean) Should the type of the object be stored in the object?
		 * @return objects (Array) An array of the created objects
		 */
		createObject(objectDefinition, withType) {
			this._checkParameter(objectDefinition, ["count_all", "name"]);

			const objects = {};
			for (let i = 0; i < objectDefinition.count_all; i++) {
				const obj = {
					"id": i
				};

				if (withType) {
					obj.type = objectDefinition.name;
				}

				objects[obj.id] = obj;
			}

			return objects;
		}


};

module.exports = TDG;
