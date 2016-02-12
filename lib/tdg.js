/* jslint node: true, esnext: true */
"use strict";

const TDG = {

	/**
	 * Process the graph definition to generate
	 * @param graphDefinition (Object) The JSON defines the graph
	 * @param withType (Boolean) Should the type of the object be stored in the object?
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

					const createdRelations = this.createObjectRelation(relation, withType);
					res.relations[relationType] = createdRelations;
				}
			}



			console.log(res);

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
		 * @param withType (Boolean) Should the type of the object be stored in the object?
		 */
		createObjectRelation(relationDefinition, withType) {

		},
		/**
		 * Creates the object defined by the object definition
		 * @param objectDefinition
		 {
			 "name": "account",					// The name of this object type. The name must be unique
			 "count_all": 4600000 			// The amount of objects to create
		 }
		 * @param withType (Boolean) Should the type of the object be stored in the object?
		 * @return objects (Array) An array of the created objects
		 */
		createObject(objectDefinition, withType) {
			if (objectDefinition.count_all === undefined) {
				throw new Error({
					"type": "missing key",
					"name": "count_all",
					"object": objectDefinition
				});
			}
			if (objectDefinition.name === undefined) {
				throw new Error({
					"type": "missing key",
					"name": "name",
					"object": objectDefinition
				});
			}

			let objects = [];
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
