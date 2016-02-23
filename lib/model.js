/* jslint node: true, esnext: true */
"use strict";


class Model {

	error(message) {
		this._validationErrorCount++;
		console.log(message);
	}

	warning(message) {
		this._validationErrorCount++;
		console.log(message);
	}

	constructor(opt) {
		// lookup for all the vertices
		this.vertices = {};
		// lookup for all the edges
		this.edges = {};

		this._validationErrorCount = 0;
	}


	/**
	 * Initialize a new model
	 * @data (Object) A json object represents the model
	 */
	init(data) {
		this.vertices = data.vertices;
		this.edges = data.edges;
		this._validationErrorCount = 0;
		this.verifyModel();
	}

	verifyModel() {
		// do some basic verifications
		this.vertices.forEach(vertex => {
			if (!vertex.name) {
				this.error({
					"message": "The vertex object does not contain a 'name' property",
					"object": vertex
				});
			}
		});

		this.edges.forEach(edge => {
			if (!edge.name) {
				this.error({
					"message": "The edge object does not contain a 'name' property",
					"object": edge
				});
			}
		});
	}


	/**
	 * Extracts the object type from an edge configuration.
	 * It could be a string or and object containing the type
	 * @param relationDefinition (Object) The original relation definition
	 * @param key (string) The name of the key
	 */
	validateObjectTypesOfEdge(edge, key) {

		// Check that the source and target type are defined
		['src', 'target'].forEach(key => {
			if (typeof edge[key] === 'string') {
				const val = edge[key];
				edge[key] = {
					"type": val
				};
			}
			if (!edge[key].type) {
				this.error({
					"message": `The object type '${key}' does not exists in edge`,
					"name": key,
					"object": edge
				});
			}

			// Check that the given objects exists
			const obj = edge[key].type;
			if (!this.vertices[obj]) {
				this.error({
					"message": `The referenced ${key} object '${obj}' in the edge does not exists in the vertices`,
					"object": edge
				});
			}

		});
	}
}


module.exports.factory = function (options) {
	return new Model(options);
};

module.exports.model = Model;
