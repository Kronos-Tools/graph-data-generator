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

}


module.exports.factory = function (options) {
	return new Model(options);
};

module.exports.model = Model;
