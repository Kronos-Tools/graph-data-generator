/* jslint node: true, esnext: true */
"use strict";

class ExampleGenerator {
	constructor(config) {
		this.config = config;
	}

	/**
	 * writes the chunk data or parts of it
	 * @param fieldConfig (object) The generator configuration
	 * @param dataContext (object) This context is active for the whole generation process. This could be used to make data unique
	 * @param chunkContext (object) This context is is active for one chunk (row) of data
	 * @param dispatcher (object) This calling generator dispatcher
	 * @return val (string, number) The generated data
	 */
	createValue(fieldConfig, dataContext, chunkContext, dispatcher) {

	}

}

/**
 * Initializes the custom writer
 * @param config (object) The exporter configuration
 * @return dataGenerator (object) New created custom data generator
 */
module.exports.factory = function (config) {
	return new ExampleGenerator(config);
};

module.exports.ExampleGenerator = ExampleGenerator;
