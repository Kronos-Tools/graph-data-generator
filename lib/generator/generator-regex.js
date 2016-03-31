/* jslint node: true, esnext: true */
"use strict";

const RandExp = require('randexp');

/**
 * This data generator is an adapter to the faker data creator
 */

class GeneratorRegex {
	constructor(config) {
		this.config = config;
	}

	/**
	 * @param fieldConfig (object) The generator configuration
	 * @param dataContext (object) This context is active for the whole generation process. This could be used to make data unique
	 * @param chunkContext (object) This context is is active for one chunk (row) of data
	 * @param dispatcher (object) This calling generator dispatcher
	 * @return val (string, number) The generated data
	 */
	createValue(fieldConfig, dataContext, chunkContext, dispatcher) {
		if (!fieldConfig.exp) {
			const err = {
				"message": `The generator config does not contain an 'exp' property`,
				"object": fieldConfig
			};
			dispatcher.error(err);
			throw new Error(err);
		}


		let regExString = fieldConfig.exp;
		let caseSensitive = false;
		if (fieldConfig.case_sensitive) {
			caseSensitive = true;
		}


		// Regex generator
		if (!dataContext.__regex__) {
			dataContext.__regex__ = {};
		}

		let generator = dataContext.__regex__[fieldConfig.field_name];
		if (!generator) {
			if (caseSensitive) {
				generator = new RandExp(regExString, 'i');
			} else {
				generator = new RandExp(regExString);
			}
			dataContext.__regex__[fieldConfig.field_name] = generator;
		}

		let uniqueSet;
		if (fieldConfig.unique) {
			uniqueSet = dispatcher.getUniqueSet(fieldConfig);
		}

		// now generate the value
		let val;
		let tryCount = 50;
		do {
			val = generator.gen();
			if (fieldConfig.unique) {
				if (uniqueSet.has(val)) {
					val = undefined;
				} else {
					uniqueSet.add(val);
				}
			}

			tryCount--;
			if (tryCount < 0) {
				const err = {
					"message": `Could not get a unique value for the given regex`,
					"object": fieldConfig
				};
				dispatcher.error(err);
				throw new Error(err);
			}
		} while (!val);
		return val;
	}

}

/**
 * Initializes the custom writer
 * @param config (object) The exporter configuration
 * @return dataGenerator (object) New created custom data generator
 */
module.exports.generatorRegexFactory = function (config) {
	return new GeneratorRegex(config);
};

module.exports.GeneratorRegex = GeneratorRegex;
