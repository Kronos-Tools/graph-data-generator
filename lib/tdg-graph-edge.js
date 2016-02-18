/* jslint node: true, esnext: true */
"use strict";

const tdgUtil = require('./tdg-util');


const TdgGraphObject = {

  createEdeShortCut(parentObjectId, children) {
      const createdEdges = [];
      Object.keys(children).forEach(elemId => {
        createdEdges.push({
          "src": parentObjectId,
          "target": elemId
        });
      });
      return createdEdges;
    },



    /**
     * Returns the objects to be taken in a relation.
     * If the count id greater than the count of objects the
     * objects will be returned as they are
     */
    _getObjectsForRelation(count, objects) {
      const objectCount = Object.keys(objects).length;
      if (objectCount > count) {
        const retObjects = [];
        const keys = Object.keys(objects);
        for (let i = 0; i < count; i++) {
          const obj = objects[this._getRandomKey(keys)];
          retObjects.push(obj);
        }
        return retObjects;
      } else {
        return objects;
      }

    },


    /**
     * Returns objects found by a given query path erray
     * @param currentObject (Object,String) The current object or the object id from where the traversal starts
     * @param path (Array) An array pathes to traversal
     * @param pathIndex An index to the current query in the array. Start with 0
     * @param objectTree The object tree containing all the objects and relations
     * @return res (Array) An array with all the queried objects.
     *
     * In this example the current object needs to be an account. It says take the current account object
     * and found all relation from the type 'application_has_account' where the target is the current object.
     *
     * Then for each found object the next path element will be queried. The found (current element) is now an application.
     * Found all the reations from the type 'application_has_entitlement' where the 'src' object matches the current one.
     *
     * Returns an array of entitlements
     * [
     *			["application_has_account", "target"],
     *			["application_has_entitlement", "src"]
     * ]
     */
    queryForObjects(currentObject, path, pathIndex, objectTree) {
      const res = [];
      if (pathIndex < path.length) {
        const currentPath = path[pathIndex];

        const DEBUG_RES = objectTree.relations[currentPath[0]].relations.forEach(obj => {
          let currentObjectId;
          if (typeof currentObject === 'string' || typeof currentObject === 'number') {
            currentObjectId = currentObject;
          } else if (currentObject.id !== undefined) {
            currentObjectId = currentObject.id;
          } else if (currentObject.src && currentObject.src.id !== undefined) {
            currentObjectId = currentObject.src.id;
          } else {
            throw new Error("Weis auch nett");
          }

          if (obj[currentPath[1]].id == currentObjectId) {
            this.queryForObjects(obj, path, pathIndex + 1, objectTree).forEach(r => res.push(r));
          }
        });
      } else {
        let objType;
        let objectId;
        if (path[pathIndex - 1][1] === 'src') {
          objType = currentObject.target.type;
          objectId = currentObject.target.id;
        } else {
          objType = currentObject.src.type;
          objectId = currentObject.src.id;
        }

        const resObj = objectTree.objects[objType][objectId];
        if (!resObj) {
          throw new Error("Sollte nicht sein");
        }
        res.push(resObj);
      }
      return res;
    },


    createEdge(definition, registry, resultWriter, logger, parent, parentId, parentCounter) {
      if (!registry) {
        throw "The registry is not defined";
      }


      // The type of the source object
      const sourceType = tdgUtil.getObjectTypeFromRelation(definition, 'src', logger);

      // the type of the target object
      const targetType = tdgUtil.getObjectTypeFromRelation(definition, 'target', logger);

      // the counts for the data creation
      //const countParameter = this._createObjectRelation_prepareParameter(definition, objects, withType);

      logger.info(`Create  Edges of the type '${definition.name}'`);


      let sourceRegsitryName = sourceType;
      if (parentId && parentId.length > 0) {
        const parentPath = parentId.join("-");
        sourceRegsitryName = `${sourceType}-${parentPath}`;
      }

      let targetRegsitryName = targetType;
      if (parentId && parentId.length > 0) {
        const parentPath = parentId.join("-");
        targetRegsitryName = `${targetType}-${parentPath}`;
      }

      // Check that the obejcts exists
      if (!registry[sourceRegsitryName]) {
        throw new Error({
          "type": "Objects for type not existing",
          "name": sourceRegsitryName,
          "object": definition
        });
      }
      if (!registry[targetRegsitryName]) {
        throw new Error({
          "type": "Objects for type not existing",
          "name": targetRegsitryName,
          "object": definition
        });
      }


      if (definition.counts.edges_per_source) {
        // in this case we are in a sub flow an the data amaount to be created is predefined

        // The edges created for this subFlow loop
        const createdEdges = [];

        const counterArray = definition.counts.edges_per_source[parentCounter];
        // Iterate over the source objects
        for (let i = 0; i < counterArray.length; i++) {
          const sourceId = registry[sourceRegsitryName][i];

          // get the possible target keys
          const targetKeys = Object.keys(registry[targetRegsitryName]);

          const edgeCount = counterArray[i];
          const targets = tdgUtil.getRandomElements(targetKeys, edgeCount);

          //create the edges
          targets.forEach(targetId => {
            createdEdges.push({
              "src": sourceId.id,
              "target": targetId
            });
          });

        }

        let edgeName = definition.name;
        if (parentId && parentId.length > 0) {
          const parentPath = parentId.join("-");
          edgeName = `${edgeName}-${parentPath}`;
        }
        if (registry) {
          registry[edgeName] = createdEdges;
        }

        const returnElement = {
          "type": "EGDE",
          "name": definition.name,
          "src_type": sourceType,
          "target_type": targetType,
          "elements": createdEdges
        };

        // return the current result
        resultWriter(returnElement, parentId);
      }

    },


    /**
 		 * Creates the relation between two objects
 		 * @param relationDefinition
 		 {
 		  "name": "account_has_entitlement",		// The type name of this relation. Must be unique
 		 	"src": "account",					// The source 1
 		 	"target": "entitlement",	// The target n
 		 	"constraint": {					// constraint for this relation
 		 		"min": 5,								// The minimum amount
 		 		"max": 11000						// The maximum amaount
 		 	}
 		 },
 		 "count_all": 20000000,			// the amaount of realations to be created
 		 "count_current": 9000000
 		 }
 		 * @param objects (object) The json with all the objects
 		 * @param withType (boolean) Should the type of the object be stored in the object?
 		 */
    createObjectRelation(relationDefinition, objectTree, withType, logger) {
      const objects = objectTree.objects;

      // The type of the source object
      const sourceType = tdgUtil.getObjectTypeFromRelation(relationDefinition, 'src', logger);

      // the type of the target object
      const targetType = tdgUtil.getObjectTypeFromRelation(relationDefinition, 'target', logger);

      // the counts for the data creation
      const countParameter = this._createObjectRelation_prepareParameter(relationDefinition, objects, withType);

      if (!objects[sourceType]) {
        throw new Error({
          "type": "Objects for type not existing",
          "name": sourceType,
          "object": relationDefinition
        });
      }
      if (!objects[targetType]) {
        throw new Error({
          "type": "Objects for type not existing",
          "name": targetType,
          "object": relationDefinition
        });
      }

      const sourceObjects = this._getObjectsForRelation(countParameter.source_count, objects[sourceType]);
      let targetObjects = this._getObjectsForRelation(countParameter.target_count, objects[targetType]);

      // Iterate the source objects and add the targets
      let sourceId;

      let availableTargetKeys = Object.keys(targetObjects);


      console.info(`Create '${countParameter.count_all}' relations of the type '${relationDefinition.rel.name}'`);

      const createdRelations = new Array(countParameter.count_all);


      // // ####################################################################################################
      // // Experiment
      // // ####################################################################################################
      // if (relationDefinition.rel.name === "account_has_entitlement") {
      // 	const myPath = [
      // 		["application_has_account", "target"],
      // 		["application_has_entitlement", "src"]
      // 	];
      // 	for (sourceId in sourceObjects) {
      // 		console.log("############## res ###########");
      // 		const ergebniss = getGumbo(sourceObjects[sourceId], myPath, 0, objectTree);
      // 		console.log(ergebniss);
      // 		// 	console.log(`Get sourceId = ${sourceId}`);
      // 		//
      // 		// 	const DEBUG_RES = objectsTree.relations.application_has_account.relations.forEach(obj => {
      // 		//
      // 		// 		console.log(`compare against target id ${obj.target.id}`);
      // 		// 		if (obj.target.id == sourceId) {
      // 		// 			console.log("Matched");
      // 		// 			//ret.push(obj.src);
      // 		// 		}
      // 		//
      // 		// 	});
      // 		// 	//console.log(ret);
      // 		// 	return;
      // 	}
      // }
      // // ####################################################################################################
      // // Experiment ENDE
      // // ####################################################################################################


      //--------------------------------------------------------------
      // the first step is to create the min amount for each object
      //--------------------------------------------------------------
      let resultIdx = 0;
      for (sourceId in sourceObjects) {
        // check if there are a special query for the target object
        if (relationDefinition.rel.target.type && relationDefinition.rel.target.type.query) {
          const query = relationDefinition.rel.target.type.query;
          targetObjects = this.queryForObjects(sourceId, query, 0, objectTree);
          availableTargetKeys = Object.keys(targetObjects);
        }

        for (let i = 0; i < countParameter.constraint.min; i++) {
          const targetKey = this._getRandomKey(availableTargetKeys);
          const obj = targetObjects[targetKey];
          createdRelations[resultIdx] = {
            "src": sourceObjects[sourceId],
            "target": obj
          };
          resultIdx++;
        }

        // // If the availabe targets are too less add them again
        // if (availableTargetKeys.length < countParameter.constraint.min) {
        // 	Object.keys(targetObjects).forEach(val => {
        // 		availableTargetKeys.push(val);
        // 	});
        // }
      }

      //--------------------------------------------------------------
      // the second step is to create as many as ordered
      //--------------------------------------------------------------
      while (resultIdx < countParameter.count_all) {
        for (sourceId in sourceObjects) {
          const additionalCount = Math.floor((Math.random() * (countParameter.constraint.max - countParameter.constraint
            .min)));
          //console.log(`Create ${additionalCount} additional rels`);
          for (let i = 0; i < additionalCount; i++) {
            if (resultIdx === countParameter.count_all) {
              // Reach the max amaount
              break;
            }
            const targetKey = this._getRandomKey(availableTargetKeys);
            const obj = targetObjects[targetKey];
            createdRelations[resultIdx] = {
              "src": sourceObjects[sourceId],
              "target": obj
            };

            resultIdx++;
          }

        }
      }

      return {
        "source_type": sourceType,
        "target_type": targetType,
        "relations": createdRelations
      };
    },



};

module.exports = TdgGraphObject;
