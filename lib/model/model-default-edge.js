/* jslint node: true, esnext: true */
"use strict";

const DEFAULT_TDG_EDGE = {
	"reuse": false,
	"unique": true,
	"need_random": false,
	"min": 1,
	"max": 1
};


/**
 * Set default values of an edge config
 * @param model (object) The config model
 * @param logger (object) The logger to logg the errors
 * @return isOk (boolean) False if an error was found
 */
module.exports = function (model, logger) {
	logger.info(`Set edge default values`);
	const edges = model.edges;


	// check that each element has a 'tdg' element
	Object.keys(edges).forEach(edgeName => {
		const edge = edges[edgeName];

		const merged = {};
		Object.assign(merged, DEFAULT_TDG_EDGE, edge.tdg);
		edge.tdg = merged;

	});
};
