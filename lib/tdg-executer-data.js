/* jslint node: true, esnext: true */
"use strict";

const TdgExecuter = require('./tdg-executer').executer;

const RandExp = require('randexp');
const faker = require('faker');

class TdgExecuterData extends TdgExecuter {

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

			this.afterKeyDataEdge(edge);

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

				if (vertexObj.objects) {
					self.writer.writeObject('vertex_key_data', vertexObj);
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
				fieldConfig.name = fieldName;

				let ids;
				if (edgeData && fieldConfig.elements_per_source) {
					Object.keys(edgeData.objects).forEach(parentId => {
						ids = edgeData.objects[parentId];
						createKeyFieldValues(ids, fieldConfig);
					});
				} else {
					// Ok, this vertex has ID-Fields defined
					ids = this.createArrayFromRange(vertexData.min_id, vertexData.max_id);
					createKeyFieldValues(ids, fieldConfig);
				}
			});
		}
	}

	/**
	 * @param fieldConfig (object) The configuration how the value should be created for this field
	 * @param generatorMap (map) A map to store a generator in. Used if the creation of the generator is expensive
	 * @param uniqueSet (set) A set to ensure that the data is unique
	 * @return val (string,number) The generated data
	 */
	createFieldValue(fieldConfig, generatorMap, uniqueSet) {
		if (fieldConfig.regex) {
			return this.createFieldValueRegEx(fieldConfig, generatorMap, uniqueSet);
		} else if (fieldConfig.faker) {
			return this.createFieldValueFaker(fieldConfig, generatorMap, uniqueSet);
		} else {
			const err = {
				"message": `Could not get a valid data generator for the given configuration`,
				"object": fieldConfig
			};
			this.error(err);
			throw new Error(err);
		}
	}

	createFieldValueFaker(fieldConfig, generatorMap, uniqueSet) {
		const funcName = fieldConfig.faker;
		const funcNameParts = funcName.split('.');
		const fakerFunc = faker[funcNameParts[0]][funcNameParts[1]];

		let val;
		let tryCount = 50;
		do {
			val = fakerFunc();
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

	}

	createFieldValueRegEx(fieldConfig, generatorMap, uniqueSet) {
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

	}

}

module.exports.factory = function (options) {
	return new TdgExecuterData(options);
};

module.exports.executerData = TdgExecuterData;
