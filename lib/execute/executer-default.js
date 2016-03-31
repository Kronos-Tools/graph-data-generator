/* jslint node: true, esnext: true */
"use strict";

const Logger = require('../util/logger');

const createVertex = require('./vertex');
const timeShift = require('./time-shift-vertex');
const keyData = require('./key_data');

/**
 * This class creates the vertices
 */

class ExecuterDefault extends Logger {
	constructor(opts) {
		super(opts);

		if (!opts.model) {
			throw new Error("No model given");
		}

		this.model = opts.model;
		this.data_generator = opts.data_generator;
		this.id = opts.start_id ? opts.start_id : 0;
	}

	run() {
		this.id = createVertex(this.model, this.id, this);
		this.id = timeShift(this.model, this.id, this);
		keyData(this.model, this, this.data_generator);
	}

}



module.exports.executerDefaultFactory = function (options) {
	return new ExecuterDefault(options);
};
module.exports.ExecuterDefault = ExecuterDefault;
