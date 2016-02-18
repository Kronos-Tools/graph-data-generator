/* jslint node: true, esnext: true */
"use strict";


const tdgEdge = require('./tdg-graph-edge');


/*
 * This module only produces objects/nodes of a graph
 *
 */

const TdgGraphObject = {
	registry: undefined,

	comand: {
		registry_start() {
				TdgGraphObject.registry = {};
			},
			registry_clear() {
				TdgGraphObject.registry = undefined;
			}
	},



	/*
	 * The flow is a list of elements
	 * @param tdgFlow (Array) An array of definitions
	 * @param logger (Object) Logger to use for info messages and errors
	 * @param parent (Array) An array with the parent definitions
	 * @param parentIds (Array) An array with the direct parent Ids
	 */
	handleFlow(tdgFlow, registry, resultWriter, logger, parent, parentId, parentCounter) {
		logger.info("----------------------------------");
		logger.info("Start creating objects");
		logger.info("----------------------------------");

		tdgFlow.forEach(definition => {
			logger.info(`Create Element '${definition.name}' of type '${definition.type}'`);
			this.handleElement(definition, TdgGraphObject.registry, resultWriter, logger, parent, parentId, parentCounter);
		});
	},

	/*
	 * Handles a single definition
	 * @param definition (Object) One single definition
	 * @param logger (Object) Logger to use for info messages and errors
	 * @param parent (Array) An array with the parent definitions
	 * @param parentIds (Array) An array with the direct parent Ids
	 */
	handleElement(definition, registry, resultWriter, logger, parent, parentId, parentCounter) {
		if (definition.type === "VERTEX") {
			this.createVertex(definition, registry, resultWriter, logger, parent, parentId, parentCounter);

		} else if (definition.type === "EDGE") {
			tdgEdge.createEdge(definition, registry, resultWriter, logger, parent, parentId, parentCounter);
			//tdgParameterValidator.validateEdgeParameter(definition, this.statistic, logger, parent);
		} else
		if (definition.type === "ACTION") {
			const cmd = definition.name;
			TdgGraphObject.comand[cmd]();
		} else {
			logger.error({
				"type": "Invalid type",
				"name": 'type',
				"object": definition
			});
		}
	},


	createVertex(definition, registry, resultCallback, logger, parent, parentId, parentCounter) {
		let count;
		if (parentCounter !== undefined) {
			count = definition.sub_element_count_per_parent[parentCounter];
		} else {
			count = definition.count_all;
		}


		logger.info(`Create '${count}' Vertices of the type '${definition.name}'`);


		let parentIdPath;
		if (parentId) {
			parentIdPath = parentId.join("/");
		}

		const newVertices = [];
		const newEdges = [];

		for (let i = 0; i < count; i++) {
			const obj = {};
			if (parentIdPath) {
				obj.id = `${parentIdPath}-${i}`;
			} else {
				obj.id = i;
			}
			newVertices.push(obj);

			//-------------------------------
			// handle sub flows
			//-------------------------------
			if (definition.tdg_flow) {
				if (!parentId) {
					parentId = [];
				}
				parentId.push(i);

				if (!parent) {
					parent = [];
				}
				parent.push(definition);
				this.handleFlow(definition.tdg_flow, registry, resultCallback, logger, parent, parentId, i);
				parent.pop();
				parentId.pop();
			}

			//-------------------------------
			// handle implicite edges
			//-------------------------------
			if (parent && parent.length > 0) {
				const edge = {
					"src": parentId[parentId.length - 1],
					"target": obj.id
				};
				newEdges.push(edge);
			}
		}

		let registryName = definition.name;
		if (parentId && parentId.length > 0) {
			const parentPath = parentId.join("-");
			registryName = `${registryName}-${parentPath}`;
		}
		if (registry) {
			registry[registryName] = newVertices;
		}

		const returnElement = {
			"type": definition.type,
			"name": definition.name,
			"elements": newVertices
		};

		// return the current result
		resultCallback(returnElement, parentId);

		if (newEdges && newEdges.length > 0) {
			const returnElementEdges = {
				"type": "EGDE",
				"name": definition.edge_name,
				"src_type": parent[parent.length - 1].name,
				"target_type": definition.name,
				"elements": newEdges
			};
			resultCallback(returnElementEdges, parentId);
		}
	},

	// /*
	//  * Create an array of objects of one type
	//  * @param name (string) The type of the object to create
	//  * @param count (number) The amaount of objects to create
	//  * @param parentId (string) If this is a sub object the parent id will be added
	//  */
	// _createVertexSub(name, count, parentId) {
	// 	const objects = [];
	//
	// 	for (let i = 0; i < count; i++) {
	//
	// 		const obj = {};
	// 		if (parentId && parentId.length > 0) {
	// 			for (let i = parentId.length - 1; i >= 0; i++) {
	// 				obj.id = `${obj.id}_${parentId[i]}`;
	// 			}
	// 			obj.id = `${obj.id}_${i}`;
	// 		} else {
	// 			obj.id = i;
	// 		}
	// 		objects.push(obj);
	// 	}
	// 	return objects;
	// },
	//

	// /**
	//  * Creates the object defined by the object definition
	//  * @param objectDefinition
	//  * @return objects (Array) An array of the created objects
	//  */
	// createObject(objectDefinition, resultCallback) {
	// 	//tdgParameterValidator.checkParameter(objectDefinition, ["count_all", "name"]);
	//
	// 	console.info(`Create '${objectDefinition.count_all}' objects of the type '${objectDefinition.name}'`);
	//
	// 	const createdObjects = this._subCreateObject(objectDefinition.name, objectDefinition.count_all, undefined);
	//
	// 	const returnObject = {
	// 		"name": objectDefinition.name,
	// 		"objects": createdObjects
	// 	};
	//
	// 	// return the current result
	// 	resultCallback(returnObject);
	//
	// 	// The object may have sub objects
	// 	this._subCreateSubObjects(objectDefinition, resultCallback, returnObject);
	//
	// },
	//
	// /*
	//  * @param parentObjectDefinition (object) The object definition of the parent object
	//  * @param resultCallback (function(result)) The callback to return the result
	//  * @param createdParentObjects (object) This object contains all the objects created by the parent
	//  * @param parentPath (array) An array with the path to the parent
	//  *
	//  */
	// _subCreateSubObjects(parentObjectDefinition, resultCallback, createdParentObjects, parentPath) {
	// 	if (parentObjectDefinition.objects) {
	//
	// 		if (!parentPath) {
	// 			parentPath = [];
	// 		}
	//
	// 		const parentObjectName = createdParentObjects.name;
	// 		const parentObjects = createdParentObjects.objects;
	// 		const parentObjectKeys = Object.keys(parentObjects);
	//
	// 		//iterates over the objects created by the parent
	// 		for (let i = 0; i < parentObjectKeys.length; i++) {
	// 			const parentObjectKey = parentObjectKeys[i];
	// 			const parentObject = parentObjects[parentObjectKey];
	//
	//
	// 			// Stores all the objects created unter this parent
	// 			// objectName -> objects
	// 			const objectStore = {};
	//
	// 			parentObjectDefinition.objects.forEach(subObjectDefinition => {
	// 				const createdObjects = this._subCreateObject(subObjectDefinition.name,
	// 					subObjectDefinition.sub_element_count_per_parent[i], parentObject.id);
	//
	// 				const returnObject = {
	// 					"name": subObjectDefinition.name,
	// 					"objects": createdObjects,
	// 					"path": parentPath,
	// 					"parent": parentObjectName
	// 				};
	// 				resultCallback(returnObject);
	//
	// 				objectStore[subObjectDefinition.name] = createdObjects;
	//
	// 				// create the implicit realtions
	// 				const relations = this._subCreateRelationForObjects(subObjectDefinition.relation_name, parentObject,
	// 					parentObjectName,
	// 					createdObjects, subObjectDefinition.name);
	//
	// 				const createdRelations = {
	// 					"name": subObjectDefinition.relation_name,
	// 					"relations": relations
	// 				};
	// 				resultCallback(createdRelations);
	//
	// 				// The object may have sub objects
	// 				this._subCreateSubObjects(subObjectDefinition, resultCallback, returnObject);
	// 			});
	//
	//
	// 			// Sub relations make only sence if there also sub objects
	// 			if (parentObjectDefinition.relations) {
	// 				parentObjectDefinition.relations.forEach(subRelationDefinition => {
	//
	// 					//				hier gehts weiter
	//
	// 				});
	// 			}
	//
	//
	// 		}
	// 	}
	// },
	//
	//
	//
	// /*
	//  * Create relations for one parant and the given children
	//  * @param name (string) The type of the relation to create
	//  * @param parent (object) The parent object
	//  * @param objects (object) The child objects
	//  */
	// _subCreateRelationForObjects(name, parent, parentType, objects, childrenType) {
	// 	const resultRelations = [];
	//
	// 	const targetKeys = Object.keys(objects);
	//
	// 	for (let i = 0; i < targetKeys.length; i++) {
	// 		const targetObject = objects[targetKeys[i]];
	// 		const obj = {
	// 			"src": {
	// 				"id": parent.id
	// 			},
	// 			"target": {
	// 				"id": targetObject.id
	//
	// 			}
	// 		};
	//
	// 		resultRelations.push(obj);
	// 	}
	// 	return resultRelations;
	// },
	//


};


module.exports = TdgGraphObject;
