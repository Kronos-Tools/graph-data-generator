/* jslint node: true, esnext: true */
"use strict";

const tdgUtil = require('./tdg-util');
const tdgVertex = require('./tdg-graph-vertex');
const tdgEdge = require('./tdg-graph-edge');
const Logger = require('./tdg-logger');

const path = require('path');

/*
 * Orchestrate the execution of the TDG
 */

const TdgExecuter = {


	getResultWriter(archivePath) {
			return function (retElem, parentIds) {
				const type = retElem.type;
				const name = retElem.name;
				const elements = retElem.elements;

				let fileName;
				if (parentIds && parentIds.length > 0) {
					const parentPath = parentIds.join("-");
					fileName = `${type}_${name}-${parentPath}.json`;
				} else {
					fileName = `${type}_${name}.json`;
				}

				tdgUtil.writeJsonToFile(path.join(archivePath, fileName), retElem);
			};
		},

		/**
		 * Process the graph definition to generate
		 * @param graphDefinition (Object) The JSON defines the graph
		 * @param destinationPath (String) A path where to store the json files
		 */
		loadStructure(graphDefinition, destinationPath) {
			this.archivePath = destinationPath;
			const tdgFlow = graphDefinition.tdg_flow;

			//tdgVertex.handleFlow(tdgFlow, this.registry, this.getResultWriter(destinationPath), Logger);
			tdgVertex.handleFlow(tdgFlow, undefined, this.getResultWriter(destinationPath), Logger);

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

		// /*
		//  * The flow is a list of elements
		//  * @param tdgFlow (Array) An array of definitions
		//  * @param logger (Object) Logger to use for info messages and errors
		//  * @param parent (Array) An array with the parent definitions
		//  * @param parentIds (Array) An array with the direct parent Ids
		//  */
		// handleFlow(tdgFlow, registry, resultWriter, logger, parent, parentId) {
		// 	logger.info("----------------------------------");
		// 	logger.info("Start creating objects");
		// 	logger.info("----------------------------------");
		//
		// 	tdgFlow.forEach(definition => {
		// 		logger.info(`Create Element '${definition.name}' of type '${definition.type}'`);
		// 		this.handleElement(definition, registry, resultWriter, logger);
		// 	});
		// },
		//
		// /*
		//  * Handles a single definition
		//  * @param definition (Object) One single definition
		//  * @param logger (Object) Logger to use for info messages and errors
		//  * @param parent (Array) An array with the parent definitions
		//  * @param parentIds (Array) An array with the direct parent Ids
		//  */
		// handleElement(definition, registry, resultWriter, logger, parent, parentId) {
		// 	if (definition.type === "VERTEX") {
		// 		tdgVertex.createVertex(definition, undefined, registry, resultWriter, logger, parent, parentId);
		//
		// 		// if (definition.tdg_flow) {
		// 		// 	// This object contains subflows
		// 		//
		// 		// 	let newParent = [];
		// 		// 	if (parent && parent.length > 0) {
		// 		// 		newParent = parent;
		// 		// 	} else {
		// 		// 		newParent.push(definition);
		// 		// 	}
		// 		// 	parent = newParent;
		// 		//
		// 		// 	if (!parentIds) {
		// 		// 		parentIds = [];
		// 		// 	}
		// 		//
		// 		// 	parentIds.push("DUMMY");
		// 		//
		// 		// 	this.handleFlow(definition.tdg_flow, registry, resultWriter, logger, parent);
		// 		//
		// 		// }
		// 		//
		// 		// if (definition.edge_name) {
		// 		// 	if (parentIds.length > 0) {
		// 		// 		// 	const parentId = parentIds[parentIds.length - 1];
		// 		// 		// 	const parentConfig = parent[parent.length - 1];
		// 		// 		//
		// 		// 		// 	// This object contains an edge shortcut to its parent
		// 		// 		// 	const edgeElements = tdgEdge.createEdeShortCut(parentId, createdVertices.elements);
		// 		// 		//
		// 		// 		// 	const returnElement = {
		// 		// 		// 		"type": "EDGE",
		// 		// 		// 		"name": definition.edge_name,
		// 		// 		// 		"source_type": parentConfig.name,
		// 		// 		// 		"target_type": createdVertices.type,
		// 		// 		// 		"elements": createdVertices
		// 		// 		// 	};
		// 		// 		//
		// 		// 	} else {
		// 		// 		logger.warning({
		// 		// 			"type": "Invalid property. Only allowed in child vertices",
		// 		// 			"name": 'edge_name',
		// 		// 			"object": definition
		// 		// 		});
		// 		//	}
		// 		//}
		// 	} else if (definition.type === "EDGE") {
		// 		//tdgParameterValidator.validateEdgeParameter(definition, this.statistic, logger, parent);
		// 	} else
		// 	if (definition.type === "ACTION") {
		//
		// 	} else {
		// 		logger.error({
		// 			"type": "Invalid type",
		// 			"name": 'type',
		// 			"object": definition
		// 		});
		// 	}
		// },

};

module.exports = TdgExecuter;


// const objectDefinitions = graphDefinition.objects;
// if (!objectDefinitions) {
// 	throw new Error("The structure deifines no objects");
// }
//
// // --------------------------------------------
// // First validate and the object definition and compute the element count
// // --------------------------------------------
// tdgParameterValidator.validateObjectParameter(objectDefinitions);
// tdgUtil.writeJsonToFile("testmich.json", objectDefinitions);
//
// // --------------------------------------------
// // First create all the objects
// // --------------------------------------------
// for (let i = 0; i < objectDefinitions.length; i++) {
// 	const objectDefinition = objectDefinitions[i];
// 	const objectType = objectDefinition.name;
// 	tdgGraphObject.createObject(objectDefinition, withType, (gum) => {
// 		console.log(gum);
// 	});
//
// 	//this.writeFile(destinationPath, createdObjects, objectType, 'objects');
//
// }
//
// // --------------------------------------------
// // Then create all the relations
// // --------------------------------------------
// const relations = graphDefinition.relations;
// if (relations) {
// 	for (let i = 0; i < relations.length; i++) {
// 		const relation = relations[i];
// 		const relationType = relation.rel.name;
//
// 		const createdRelations = this.createObjectRelation(relation, res, withType);
//
// 		this.writeFile(destinationPath, createdRelations, relationType, 'relations');
//
// 	}
// }


// --------------------------------------------
// Write the result to a json
// --------------------------------------------
