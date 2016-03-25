/* jslint node: true, esnext: true */
"use strict";

const Executer = require('../util/executer');

const createVertex = require('./vertex');
const createEdges = require('./edge');
const timeShift = require('./time-shift-vertex');

/**
 * This class creates the vertices
 */

class ExecuterDefault extends Executer {
	constructor(opts) {
		super(opts);

		if (!opts.model) {
			throw new Error("No model given");
		}

		this.model = opts.model;
	}

	run() {
		this.id = createVertex(this.model, this.id, this);
		this.id = createEdges(this.model, this.id, this);
		timeShift(this.model, this);
	}

}



module.exports.executerDefaultFactory = function (options) {
	return new ExecuterDefault(options);
};
module.exports.ExecuterDefault = ExecuterDefault;
