/* jslint node: true, esnext: true */
"use strict";

const TdgExecuter = require('./tdg-executer').TdgExecuter;

class TdgExecuterData extends TdgExecuter {
	constructor(opts) {
		super(opts);

		if (!opts.dataGenerator) {
			throw new Error(`No 'dataGenerator' given in config.`);
		}

		this.dataGenerator = opts.dataGenerator;
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
		if (!this.model.configs) {
			const err = {
				"message": `There is no data generation section defined in the config file`
			};
			this.error(err);
			throw new Error(err);
		}

		const promises = [];

		this.model.edges.forEach(edge => {
			this.info(`create key data for edge ${edge.name}`);
			this.beforeKeyDataEdge(edge);

			promises.push(this.createKeyDataEdge(edge));

			this.afterKeyDataEdge(edge);

		});

		return Promise.all(promises);
	}


	createKeyDataEdge(edge) {
		const self = this;
		const edgeName = edge.name;
		const edgeObj = this.registry[edgeName];

		const promises = [];

		// Source
		promises.push(execute(edge.src.name));

		// Target
		promises.push(execute(edge.target.name));

		function execute(vertexName) {
			const vertexObj = self.registry[vertexName];
			if (vertexObj.type === 'vertex') {
				if (!vertexObj.objects) {
					self.info(`Create key data for vertex '${vertexName}'`);
					self.createKeyDataVertex(vertexObj, edgeObj);
				}

				if (vertexObj.objects) {
					self.info(`Write data for vertex '${vertexName}'`);
					return self.writer.writeObject('vertex_key_data', vertexObj, `${vertexObj.type}_${vertexObj.name}_key_data.json`);
				}
			}
			return Promise.resolve();
		}

		return Promise.all(promises);
	}


	/**
	 *
	 * @param vertexData (object) The vertex data created by the tdg-executer
	 * @param edgeData (object, optional) The edge data created by the tdg-executer
	 */
	createKeyDataVertex(vertexData, edgeData) {
		const self = this;
		// Start a new 'unique' context
		self.dataGenerator.startDataContext();

		function createKeyFieldValues(ids) {
			ids.forEach(id => {
				self.dataGenerator.startContext();

				// iterate the key fields
				Object.keys(self.model.configs[vertexData.name].tdg.id_fields).forEach(fieldName => {
					const fieldConfig = self.model.configs[vertexData.name].tdg.id_fields[fieldName];
					fieldConfig.fiel_name = fieldName;

					const val = self.dataGenerator.createData(fieldConfig);
					if (!vertexData.objects) {
						vertexData.objects = {};
					}
					if (!vertexData.objects[id]) {
						vertexData.objects[id] = {};
					}
					vertexData.objects[id][fieldConfig.fiel_name] = val;
				});
			});
		}

		// ok, the data was not yet created
		if (self.model.configs[vertexData.name] && self.model.configs[vertexData.name].tdg.id_fields) {
			// Start a new 'row' context
			self.dataGenerator.startDataContext();

			const ids = this.createArrayFromRange(vertexData.min_id, vertexData.max_id);
			createKeyFieldValues(ids);

			// // first iterate the ids
			// let ids;
			// if (edgeData) {
			// 	Object.keys(edgeData.objects).forEach(parentId => {
			// 		ids = edgeData.objects[parentId];
			// 		createKeyFieldValues(ids);
			// 	});
			// } else {
			// 	// Ok, this vertex has ID-Fields defined
			// 	ids = this.createArrayFromRange(vertexData.min_id, vertexData.max_id);
			// 	createKeyFieldValues(ids);
			// }

		}
	}
}

module.exports.factory = function (options) {
	return new TdgExecuterData(options);
};

module.exports.TdgExecuterData = TdgExecuterData;
