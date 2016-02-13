/* jslint node: true, esnext: true */
"use strict";

const DEFAULT_CONSTRAINTS = {
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

			const objects = graphDefinition.objects;
			if (!objects) {
				throw new Error("The structure deifines no objects");
			}

			const res = {
				"objects": [],
				"relations": []
			};
			// --------------------------------------------
			// First create all the objects
			// --------------------------------------------
			for (let i = 0; i < objects.length; i++) {
				const obj = objects[i];
				const createdObjects = this.createObject(obj, withType);
				const objectType = obj.name;
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
		 * Creates the relation between two objects
		 * @param relationDefinition
		 {
		  "name": "account_has_entitlement",		// The type name of this relation. Must be unique
		 	"src": "account",					// The source 1
		 	"target": "entitlement",	// The target n
		 	"constraints": {					// Constraints for this relation
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
			this._checkParameter(relationDefinition, ["rel"]);
			this._checkParameter(relationDefinition.rel, ["name", "src", "target"]);

			// The name of the source object
			const src = relationDefinition.rel.src;

			// The name of the target object
			const target = relationDefinition.rel.target;

			// the name of this relation
			const type = relationDefinition.rel.name;

			// Check that the source and target obejcts exists
			this._checkParameter(objects, [src, target], "missing object");

			const constraints = {};
			Object.assign(constraints, DEFAULT_CONSTRAINTS, relationDefinition.constraints);


			const res = [];

			const sourceCount = objects[src].length;
			const targetCount = objects[target].length;

			if (sourceCount > targetCount && !constraints.reuse_target) {
				throw new Error({
					"type": "sourceCount > targetCount",
					"name": type,
					"object": relationDefinition
				});
			}

			// connect each source with one target
			// this is the default if no other constraints are given
			let j = 0; // target counter
			for (let i = 0; i < sourceCount; i++) {
				const obj = {
					"src": objects[src][i].id,
					"target": objects[target][j].id
				};

				if (withType) {
					obj.type = type;
				}

				res.push(obj);

				j++;
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


			const objects = [];
			for (let i = 0; i < objectDefinition.count_all; i++) {
				const obj = {
					"id": i
				};

				if (withType) {
					obj.type = objectDefinition.name;
				}

				objects.push(obj);
			}

			return objects;
		}


};

module.exports = TDG;
