/* jslint node: true, esnext: true */
"use strict";

const faker = require('faker');

/**
 * This data generator is an adapter to the faker data creator
 */

class GeneratorFaker {
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
		let funcName = fieldConfig.function;
		let option = fieldConfig.option;

		const funcNameParts = funcName.split('.');
		const fakerFunc = faker[funcNameParts[0]][funcNameParts[1]];


		let uniqueSet;
		if (fieldConfig.unique) {
			uniqueSet = dispatcher.getUniqueSet(fieldConfig);
		}


		let val;
		let tryCount = 50;
		do {
			if (option) {
				val = fakerFunc(option);
			} else {
				val = fakerFunc();
			}

			if (fieldConfig.unique) {
				if (uniqueSet.has(val)) {
					val = undefined;
				} else {
					uniqueSet.add(val);
				}
			}

			tryCount--;
			if (tryCount < 0) {
				throw new Error({
					"message": `Could not get a unique value for the given regex`,
					"object": fieldConfig
				});
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
module.exports.generatorFakerFactory = function (config) {
	return new GeneratorFaker(config);
};

module.exports.GeneratorFaker = GeneratorFaker;
