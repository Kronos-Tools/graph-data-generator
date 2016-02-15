/* jslint node: true, esnext: true */
"use strict";
const fs = require('fs');
const path = require("path");

const Util = {

	writeObjectFile(destinationPath, object, objectName, objectType) {
			const fileName = path.join(destinationPath, `${objectType}_${objectName}.json`);
			this.writeJsonToFile(fileName, object);
		},

		writeJsonToFile(fileName, object) {
			fs.writeFileSync(fileName, JSON.stringify(object, null, 2));
		},


		/**
		 * Returns a random element from an array of elements. The element taken will be removed from the array
		 * @param elementArray (Array) This array contains all the possible elements. A taken element will be removed from the array
		 * @return element (String) The element found
		 */
		getRandomElement(elementArray) {
			if (elementArray.length > 10) {
				const idx = Math.floor((Math.random() * elementArray.length));
				const element = elementArray[idx];
				elementArray.splice(idx, 1); // remove from the available keys
				return element;
			} else {
				return elementArray.pop();
			}
		},
		/**
		 * Extracts the object type from a relation configuration.
		 * It could be a string or and object containing the type
		 * @param relationDefinition (Object) The original relation definition
		 * @param key (string) The name of the key
		 */
		getObjectTypeFromRelation(relationDefinition, key, logger) {
			if (typeof relationDefinition.rel[key] === 'string') {
				return relationDefinition.rel[key];
			} else if (relationDefinition.rel[key].type) {
				if (typeof relationDefinition.rel[key].type === 'string') {
					return relationDefinition.rel[key].type;
				} else if (relationDefinition.rel[key].type.name) {
					return relationDefinition.rel[key].type.name;
				}
			}
			logger.error({
				"type": "no object type in relation",
				"name": key,
				"object": relationDefinition
			});
		},


};

module.exports = Util;
