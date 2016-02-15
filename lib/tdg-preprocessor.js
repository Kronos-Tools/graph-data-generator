/* jslint node: true, esnext: true */
"use strict";

const tdgUtil = require('./tdg-util');
const tdgParameterValidator = require('./tdg-parameter-validator');
const Logger = require('./tdg-logger');

const path = require('path');


/*
 * The preprocessor loads the config and validates the parameter.
 * Also it enriches the config with smore detail values needed for the data creation
 */
const TdgPreprocessor = {

	// This object stores the amount of data to be created per object
	// <vertex-name> : <count_all>
	statistic: {},

	/**
	 * Process the graph definition and validate its parameter
	 * @param graphDefinition (Object) The JSON defines the graph
	 * @param destinationPath (String) A path where to store the updated definition file
	 */
	loadStructure(graphDefinition, destinationPath) {
		const tdgFlow = graphDefinition.tdg_flow;
		this.handleFlow(tdgFlow, Logger);

		if (Logger.hasErrors() > 0) {
			console.log("----------------------------------");
			console.log("-- Errors: You can not proceed until this is solved");
			console.log("----------------------------------");
			return false;
		} else {
			tdgUtil.writeJsonToFile(path.join(destinationPath, "prePrcessedGraphDefinition.json"), graphDefinition);
			return true;
		}

	},

	/*
	 * The flow is a list of elements
	 * @param tdgFlow (Array) An array of definitions
	 * @param logger (Object) Logger to use for info messages and errors
	 * @param parent () ?????
	 */
	handleFlow(tdgFlow, logger, parent) {
		tdgFlow.forEach(definition => {
			logger.info(`Preprocess Element '${definition.name}' of type '${definition.type}'`);
			this.handleElement(definition, logger, parent);
		});
	},

	/*
	 * Handles a single definition
	 * @param definition (Object) One single definition
	 * @param logger (Object) Logger to use for info messages and errors
	 * @param parent () ?????
	 */
	handleElement(definition, logger, parent) {
		if (definition.type === "VERTEX") {
			tdgParameterValidator.validateVertexParameter(definition, this.statistic, logger, parent);
			if (definition.tdg_flow) {
				// This object contains subflows

				let newParent = [];
				if (parent) {
					newParent = parent;
				} else {
					newParent.push(definition);
				}
				this.handleFlow(definition.tdg_flow, logger, newParent);
			}
		} else if (definition.type === "EDGE") {
			tdgParameterValidator.validateEdgeParameter(definition, this.statistic, logger, parent);
		} else if (definition.type === "ACTION") {

		} else {
			logger.error({
				"type": "Invalid type",
				"name": 'type',
				"object": definition
			});
		}
	},


};

module.exports = TdgPreprocessor;
