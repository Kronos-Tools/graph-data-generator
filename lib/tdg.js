/* jslint node: true, esnext: true */
"use strict";


/**
 * Creates the relation between two objects
 {
 	"src": "account",					// The source 1
 	"relation": "has",				// The type name of this relation
 	"target": "entitlement",	// The target n
 	"constraints": {					// Constraints for this relation
 		"min": 5,								// The minimum amount
 		"max": 11000						// The maximum amaount
 	}
 },
 "count_all": 20000000,			// the amaount of realations to be created
 "count_current": 9000000
 }
 */
function createObjectRelation(relationDefinition) {

}

/**
 * Creates the object defined by the object definition
 * @param objectDefinition
 {
	 "name": "account",					// The name of this object type. The name must be unique
	 "count_all": 4600000 			// The amount of objects to create
 }
 */
function createObjects(objectDefinition) {
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

	for (let i = 0; i < objectDefinition.count_all; i++) {
		// TODO create object
	}
}
