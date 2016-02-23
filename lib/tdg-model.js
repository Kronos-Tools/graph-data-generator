/* jslint node: true, esnext: true */
"use strict";

const Model = require('./model').model;

/**
 * Do some basic validations on the tdg-model
 */

const DEFAULT_TDG_VERTEX = {

};

const DEFAULT_TDG_EDGE = {
	"reuse": false,
	"unique": true,
	"min": 1
};

class ModelTdg extends Model {
	verifyModel() {
		super.verifyModel();

		// check that each element has a 'tdg' element
		this.vertices.forEach(vertex => {
			if (!vertex.tdg) {
				this.warning({
					"message": "The vertex object does not contain a 'tdg' property",
					"object": vertex
				});
			}

			const merged = {};
			Object.assign(merged, DEFAULT_TDG_VERTEX, vertex.tdg);
			vertex.tdg = merged;

		});

		this.edges.forEach(edge => {
			if (!edge.tdg) {
				this.warning({
					"message": "The edge object does not contain a 'tdg' property",
					"object": edge
				});
			} else {
				this.verifyVertexTdg(edge);
			}

			const merged = {};
			Object.assign(merged, DEFAULT_TDG_EDGE, edge.tdg);
			edge.tdg = merged;
		});
	}

	/**
	 * verify the vertices for TDG.
	 *
	 */
	verifyVertexTdg(edge) {
		if (!edge.tdg.count_all) {
			this.error({
				"message": "The vertex 'tdg' element does not contain a 'count_all' property",
				"object": edge
			});
		}
	}

}


module.exports.factory = function (options) {
	return new ModelTdg(options);
};

module.exports.model = ModelTdg;
