/* jslint node: true, esnext: true */
"use strict";

const RandExp = require('randexp');

class TdgKeyDataCreator {
	error(message) {
		this._validationErrorCount++;
		console.log(message);
	}
	info(message) {
		console.log(message);
	}
	debug(message) {
		//console.log(message);
	}

	constructor(opts) {
		if (!opts) {
			opts = {};
		}
		this.model = undefined;
		this.writer = undefined;
		this.registry = undefined;
	}

	/**
	 * Called before the edge will be created
	 * @param config (object) The configuration of this edge
	 */
	beforeKeyDataEdge(config) {}

	/**
	 * Called after the edge was created
	 * @param config (object) The configuration of this edge
	 */
	afterKeyDataEdge(config) {}


	/**
	 * Create all the edges defined in the model
	 */
	createKeyDataEdges() {
		this.model.edges.forEach(edge => {
			this.info(`create key data for edge ${edge.name}`);
			this.beforeKeyDataEdge(edge);

			this.createKeyDataEdge(edge);
			console.log(this.registry[edge.src.name]);
			console.log(this.registry[edge.target.name]);
			this.afterKeyDataEdge(edge);
			throw 'end';

		});
	}


	createKeyDataEdge(edge) {
		const self = this;
		const edgeName = edge.name;
		const edgeObj = this.registry[edgeName];

		// Source
		execute(edge.src.name);

		// Target
		execute(edge.target.name);

		function execute(vertexName) {
			const vertexObj = self.registry[vertexName];
			if (vertexObj.type === 'vertex') {
				if (!vertexObj.objects) {
					self.info(`Create key data for vertex '${vertexName}'`);
					self.createKeyDataVertex(vertexObj, edgeObj);
				}
			}
		}

	}

	/**
	 *
	 * @param vertexData (object) The vertex data created by the tdg-executer
	 * @param edgeData (object, optional) The edge data created by the tdg-executer
	 */
	createKeyDataVertex(vertexData, edgeData) {
		const self = this;

		function createKeyFieldValues(ids, fieldConfig) {
			const uniqueSet = new Set();
			const generatorMap = new Map();
			ids.forEach(id => {
				const val = self.createFieldValue(fieldConfig, generatorMap, uniqueSet);
				if (!vertexData.objects) {
					vertexData.objects = {};
				}
				if (!vertexData.objects[id]) {
					vertexData.objects[id] = {};
				}
				vertexData.objects[id][fieldConfig.name] = val;
			});

		}

		// ok, the data was not yet created
		if (vertexData.tdg.id_fields) {
			// iterate the key fields
			Object.keys(vertexData.tdg.id_fields).forEach(fieldName => {
				const fieldConfig = vertexData.tdg.id_fields[fieldName];

				let ids;
				if (edgeData && fieldConfig.elements_per_source) {
					Object.keys(edgeData.objects).forEach(parentId => {
						ids = edgeData.objects[parentId];
						createKeyFieldValues(ids, fieldConfig);
					});
				} else {
					// Ok, this vertex has ID-Fields defined
					ids = this.createArrayFromRange(vertexData.tdg.min_id, vertexData.tdg.max_id);
					createKeyFieldValues(ids, fieldConfig);
				}
			});
		}
	}



	/**
	 * Create an array of available IDs out of a range
	 * @param minId (number) The minimum ID
	 * @param maxId (number) The maximum ID
	 * @return ret (array) An array with all the ids
	 */
	createArrayFromRange(minId, maxId) {
		const ret = new Array(maxId - minId + 1);
		let idx = 0;
		for (let i = minId; i <= maxId; i++) {
			ret[idx] = i;
			idx++;
		}
		return ret;
	}


	createFieldValue(fieldConfig, generatorMap, uniqueSet) {
		if (fieldConfig.regex) {
			// Regex generator

			let generator = generatorMap.get(fieldConfig.name);
			if (!generator) {
				if (fieldConfig.regex_case_sensitive) {
					generator = new RandExp(fieldConfig.regex, 'i');
				} else {
					generator = new RandExp(fieldConfig.regex);
				}
				generatorMap.set(fieldConfig.name, generator);
			}

			// now generate the value
			let val;
			let tryCount = 50;
			do {
				val = generator.gen();
				if (uniqueSet.has(val)) {
					val = undefined;
				} else {
					uniqueSet.add(val);
				}
				tryCount--;
				if (tryCount < 0) {
					throw new Error({
						"message": `Could not get a unique value for the given regex`,
						"object": fieldConfig
					});
				}
			} while (!val);

			return val;
		} else {
			const err = {
				"message": `Could not get a valid data generator for the given configuration`,
				"object": fieldConfig
			};
			this.error(err);
			throw new Error(err);
		}

	}

}

module.exports.factory = function (options) {
	return new TdgKeyDataCreator(options);
};

module.exports.dataCreatorKey = TdgKeyDataCreator;
