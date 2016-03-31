/* jslint node: true, esnext: true */
"use strict";

/**
 * Creates the vertices for the given config
 * @param model (object) The configuration model
 * @param nextId (number) The next id (sequence) to use
 * @param logger (object) A logger module
 * @return currentId (number) The new maxId to used
 */
module.exports = function (model, nextId, logger) {
	const registry = model.registry;

	if (!registry.vertices) {
		registry.vertices = {};
	}

	let currentId = nextId;

	Object.keys(model.vertices_registry).forEach(vertexName => {

		const vertexConfig = model.vertices_registry[vertexName];
		logger.info(`create vertex ${vertexName}`);

		const count = vertexConfig.tdg.count_all;

		const vertex = {
			"name": vertexName,
			"min_id": currentId,
			"count": count,
			"max_id": currentId + count - 1,
			"type": 'vertex',
			"config": vertexConfig
		};

		// store the created vertex in the registry
		registry.vertices[vertexName] = vertex;

		// set the new max ID
		currentId = vertex.max_id + 1;
	});

	return currentId;
};
