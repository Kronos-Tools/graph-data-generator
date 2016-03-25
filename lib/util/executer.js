/* jslint node: true, esnext: true */
"use strict";

const Logger = require('./logger');

/**
 * Stores all the configurations of how to create the data
 */

class Executer extends Logger {
	constructor(opts) {
		super();

		// Each object will get a unique ID. It will start with this ID
		this.id = opts.start_id ? opts.start_id : 0;
	}
}


module.exports = Executer;
