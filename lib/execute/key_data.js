/* jslint node: true, esnext: true */
"use strict";

/*
 * Generates the key data for the vertices
 */

module.exports = function (model, logger, dataGenerator) {
	Object.keys(model.registry.vertices).forEach((vertexName) => {
		const vertex = model.registry.vertices[vertexName];
		logger.info(`Create key_data for vertex '${vertexName}'`);
		createKeyDataVertex(logger, dataGenerator, vertex);
	});
};


/**
 * Creates the key_data for one given vertex
 * @param logger (object) The Logger
 * @param dataGenerator (object) The data generator to be used for creating the data.
 * @param vertex (object) The vertex to create the data for
 */
function createKeyDataVertex(logger, dataGenerator, vertex) {
	// Start a new 'unique' context
	dataGenerator.startDataContext();
	const vertexConfig = vertex.config;

	if (!vertexConfig.tdg.id_fields) {
		logger.warn(`${vertex.name}: No id fields defined`);
	} else {
		// iterate over the vertex ids
		vertex.key_data = {};
		for (let id = vertex.min_id; id <= vertex.max_id; id++) {
			dataGenerator.startContext();

			Object.keys(vertexConfig.tdg.id_fields).forEach((fieldName) => {
				const fieldConfig = vertexConfig.tdg.id_fields[fieldName];
				fieldConfig.field_name = fieldName;

				const val = dataGenerator.createData(fieldConfig);

				if (!vertex.key_data[id]) {
					vertex.key_data[id] = {};
				}
				vertex.key_data[id][fieldName] = val;
			});

		}
	}


}
