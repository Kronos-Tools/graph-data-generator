/* jslint node: true, esnext: true */
"use strict";

class ExampleWriter {
	constructor(exporter, config) {
		super();

		// An hash with the provided exporter functions
		this.config = config;
	}

	/**
	 * writes the chunk data or parts of it
	 * @param chunk (object) The chunk data
	 */
	write(chunk) {

	}

	/**
	 * Closes the writer
	 */
	close() {

	}
}

/**
 * Initializes the custom writer
 * @param exporter (object) The exporter object
 * @param config (object) The exporter configuration
 * @return writer (object) New created custom writer
 */
module.exports.factory = function (exporter, options) {
	return new ExampleWriter(exporter, options);
};

module.exports.ExampleWriter = ExampleWriter;
