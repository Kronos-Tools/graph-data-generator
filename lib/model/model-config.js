/* jslint node: true, esnext: true */
"use strict";

const fs = require('fs');
const Logger = require('../util/logger');

const validateVertex = require('./model-validate-vertex');
const validateEdge = require('./model-validate-edge');
const defaultExport = require('./model-validate-export');
const defaultValuesEdge = require('./model-default-edge');

/**
 * Stores all the configurations of how to create the data
 */

class ModelConfig extends Logger {
	constructor(opts) {
		super();

		this.vertices = {}; // this stores the vertices in there origin (hierarchy) format
		this.vertices_registry = {}; // Links all the vertices by there name
		this.edges = {};
		this.edge_custom_functions = {}; // Stores custom functions needed when creating the edges
		this.edgeOrder = [];
		this.key_data = {};
		this.time_shift = {};

		// the export configuration
		this.export_config = {};

		// the available custom exporter
		this.exporter = {};

		// the available writer for the exporter
		this.exporter_writer_factory = {};

		// The registry will store the created objects
		this.registry = {};

		// The dataGenerator
		this.data_generator = undefined;
	}

	/**
	 * Validate the model.
	 * @return res (boolean) True if the model is without errors
	 */
	validate() {
		let isOk = validateVertex(this, this);
		if (!validateEdge(this, this)) {
			isOk = false;
		}
		if (!defaultExport(this, this)) {
			isOk = false;
		}

		defaultValuesEdge(this, this);

		return isOk;
	}

	/**
	 * Initialize a new model
	 * @data (string) Filename of a json config file
	 */
	init(fileName) {
		this.info(`Load the config file '${fileName}'`);

		const content = fs.readFileSync(fileName);
		const data = JSON.parse(content);

		// defines which vertex exists
		if (data.vertices) {
			this._addConfigElements(this.vertices, data.vertices);
			this._buildVertexRegistry(data.vertices);
		}

		// defines the connection between the vertices
		if (data.edges) {
			this._addConfigElementEdges(data.edges);
		}

		// defines how to create the key data for each vertex
		if (data.key_data) {
			this._addConfigElements(this.key_data, data.key_data);
		}

		// defines how to distrubute the generated data over a given time
		if (data.time_shift) {
			this.time_shift = data.time_shift;
		}

		// defines how to generate and export the data
		if (data.export) {
			this.export_config = data.export;
		}

	}

	/**
	 * Build the vertex_registry where all the vertices are stored with the name without
	 * a hierarchy
	 * @param vertices (object) The object containing the vertices in hierarchy format
	 */
	_buildVertexRegistry(vertices) {
		Object.keys(vertices).forEach(vertexName => {
			const vertex = vertices[vertexName];
			vertex.name = vertexName;
			this.vertices_registry[vertexName] = vertex;
			if (vertex.vertices) {
				// check that each element has a 'tdg' element
				this._buildVertexRegistry(vertex.vertices);
			}
		});
	}

	/**
	 * Add custom functions used for creating the edges
	 * @param functions (object) The functions to add
	 */
	addCustomEdgeFunctions(functions) {
		this.info(`Add custom egde functions`);

		Object.keys(functions).forEach((funcName) => {
			this.edge_custom_functions[funcName] = functions[funcName];
		});
	}

	/**
	 * Add custom exporter
	 * @param exporter (object) The exporters to add
	 */
	addCustomExporter(exporter) {
		this.info(`Add custom exporter`);
		Object.keys(exporter).forEach((name) => {
			this.exporter[name] = exporter[name];
		});
	}

	/**
	 * Add custom exporter_writer
	 * @param exporter (object) The exporters to add
	 */
	addCustomExporterWriterFactory(writer) {
		this.info(`Add custom exporter`);
		Object.keys(writer).forEach((name) => {
			this.exporter_writer_factory[name] = writer[name];
		});
	}


	/**
	 * Adds new edge configuration elements to the model.
	 * @param edges (object) The new config elements of the edges
	 */
	_addConfigElementEdges(edges) {
		edges.forEach((configEdge) => {
			const name = configEdge.name;

			if (this.edges[name]) {
				const msg = {
					"message": `The edge '${name}' was already in the model.`,
					"config": configEdge
				};
				this.error(msg);
				throw new Error(msg);
			}

			this.edges[name] = configEdge;

			this.edgeOrder.push(name);
		});
	}

	/**
	 * Adds new configuration elements to the model. New elements will be added.
	 * Already exiting elements will be replaced
	 * @param store (object) The reference where to store the config elements
	 * @param data (object) The new config elements
	 */
	_addConfigElements(store, data) {
		Object.keys(data).forEach((name) => {
			data[name].name = name;
			store[name] = data[name];
		});
	}

	/**
	 * Returns the vertex with the given name
	 * @param name (object) The name of the requested vertex
	 * @param failOnError (boolean, optional) Default is true. Throws an error if the requested vertex does not exists
	 */
	getVertex(name, failOnError) {
		return this._getConfigElement(this.vertices_registry, 'Vertex', name, failOnError);
	}

	/**
	 * Returns the edge with the given name
	 * @param name (object) The name of the requested vertex
	 * @param failOnError (boolean, optional) Default is true. Throws an error if the requested vertex does not exists
	 */
	getEdge(name, failOnError) {
		return this._getConfigElement(this.edges, 'Edge', name, failOnError);
	}


	/**
	 * Returns the config element with the given name
	 * @param store (object) The store of the config element
	 * @param typeName (string) The name of the type ('Vertex', 'Edge', ...)
	 * @param name (object) The name of the requested vertex
	 * @param failOnError (boolean, optional) Default is true. Throws an error if the requested vertex does not exists
	 */
	_getConfigElement(store, typeName, name, failOnError) {
		if (store[name]) {
			return store[name];
		}

		const msg = {
			"msg": `The ${typeName} with the name '${name}' does not exists`
		};

		this.error(msg);

		if (failOnError === 'undefined') {
			failOnError = true;
		}

		if (failOnError) {
			throw new Error(msg);
		}
	}

}


module.exports.modelConfigFactory = function (options) {
	return new ModelConfig(options);
};
module.exports.ModelConfig = ModelConfig;
