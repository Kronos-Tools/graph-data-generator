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

	// set the default values for the parent child edges
	defaultEdgesParentChild(model.vertices, logger, false);
};



/**
 * Validates all the vertex elements in the given vertices object.
 * Also it walk recursive into sub vertices
 * @param vertices (object) Object with all the vertices
 * @param logger (object) The logger to logg the errors
 * @param parent (object) The parent vertex if there is one
 * @return isOk (boolean) False if an error was found
 */
function defaultEdgesParentChild(vertices, logger, parent) {
	Object.keys(vertices).forEach(vertexName => {
		const vertex = vertices[vertexName];

		if (parent) {
			// we need a edge
			logger.info(`Set edge default values for the vertex ${vertex.name}`);

			if (!vertex.tdg.edge) {
				vertex.tdg.edge = {};
			}
			const merged = {};
			Object.assign(merged, DEFAULT_TDG_EDGE, vertex.tdg.edge);
			vertex.tdg.edge = merged;

			vertex.tdg.edge.src = parent.name;
			vertex.tdg.edge.target = vertex.name;
		}

		if (vertex.vertices) {
			defaultEdgesParentChild(vertex.vertices, logger, vertex);
		}
	});

}
