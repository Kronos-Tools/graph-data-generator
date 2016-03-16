/* jslint node: true, esnext: true */
"use strict";

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

const llm = require('loglevel-mixin');
class _Model {}
llm.defineLoggerMethods(_Model.prototype, llm.defaultLogLevels);


function getTime() {
	function fill(val) {
		if (val < 10) {
			return "0" + val;
		}
		return val;
	}

	const date = new Date(Date.now());
	const dateStr = `${date.getFullYear()}-${fill(date.getMonth() + 1)}-${fill(date.getDate())}`;
	const timeStr = `${fill(date.getHours())}:${fill(date.getMinutes())}:${fill(date.getSeconds())}`;
	return dateStr + " " + timeStr;
}

class ModelTdg extends llm.LogLevelMixin(_Model, llm.defaultLogLevels, llm.defaultLogLevels.info) {

	log(level, arg) {
		this._validationErrorCount++;
		console.log(`${getTime()} ${level.toUpperCase()}: ${JSON.stringify(arg, null, 2)}`);
	}

	constructor() {
		super();

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
		if (data.vertices) {
			this.vertices = data.vertices;
		}

		if (data.edges) {
			this.edges = data.edges;
		}

		if (data.configs) {
			this.configs = data.configs;
		}

		if (!this._validationErrorCount) {
			this._validationErrorCount = 0;
		}

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

		if (this.edges) {
			this.edges.forEach(edge => {
				if (!edge.name) {
					this.error({
						"message": "The edge object does not contain a 'name' property",
						"object": edge
					});
				}
			});
		}


		// check that each element has a 'tdg' element
		this.vertices.forEach(vertex => {
			if (!vertex.tdg) {
				this.warning({
					"message": "The vertex object does not contain a 'tdg' property",
					"object": vertex
				});
			}

			// stores each vertex by its name
			if (!this.registry) {
				this.registry = {};
			}
			this.registry[vertex.name] = vertex;

			const merged = {};
			Object.assign(merged, DEFAULT_TDG_VERTEX, vertex.tdg);
			vertex.tdg = merged;

		});

		if (this.edges) {

			this.edges.forEach(edge => {
				if (!edge.tdg) {
					this.warning({
						"message": "The edge object does not contain a 'tdg' property",
						"object": edge
					});
				} else {
					this.verifyVertexTdg(edge);
				}

				this.registry[edge.name] = edge;

				const srcVertex = edge.src.name;
				if (!this.registry[srcVertex]) {
					this.error({
						"message": `The source '${srcVertex}' does not exists`,
						"object": edge
					});
				}

				const targetVertex = edge.target.name;
				if (this.registry[targetVertex] === undefined) {
					this.error({
						"message": `The target '${targetVertex}' does not exists`,
						"object": edge
					});
				}

				const merged = {};
				Object.assign(merged, DEFAULT_TDG_EDGE, edge.tdg);
				edge.tdg = merged;
			});


			if (this._validationErrorCount > 0) {
				throw new Error("To many errors");
			}
		}

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
