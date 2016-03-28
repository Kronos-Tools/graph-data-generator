/* jslint node: true, esnext: true */
"use strict";



/**
 * Validates the edges of the given model
 * @param model (object) The config model
 * @param logger (object) The logger to logg the errors
 * @return isOk (boolean) False if an error was found
 */
module.exports = function (model, logger) {
	logger.info(`Validate the edges`);
	const edges = model.edges;
	let isOk = true;

	if (!edges) {
		logger.error(`The model does not contain any edge`);
		isOk = false;
	}


	// check that each element has a 'tdg' element
	Object.keys(edges).forEach(edgeName => {
		const edge = edges[edgeName];

		if (!edge.name) {
			logger.error({
				"message": "The edge object does not contain a 'name' property",
				"object": edge
			});
			isOk = false;
		}

		if (!edge.src) {
			logger.error({
				"message": "The edge object does not contain a 'src' property",
				"object": edge
			});
			isOk = false;
		}

		if (!model.vertices_registry[edge.src]) {
			logger.error({
				"message": `The source object '${edge.src}' of the edge '${edge.name}' does not exists`,
				"object": edge
			});
			isOk = false;
		}

		if (!edge.target) {
			logger.error({
				"message": "The edge object does not contain a 'target' property",
				"object": edge
			});
			isOk = false;
		}

		if (!model.vertices_registry[edge.target]) {
			logger.error({
				"message": `The target object '${edge.target}' of the edge '${edge.name}' does not exists`,
				"object": edge
			});
			isOk = false;
		}


		if (!edge.tdg) {
			logger.error({
				"message": "The edge object does not contain a 'tdg' property",
				"object": edge
			});
			isOk = false;
		} else {
			if (!edge.tdg.count_all) {
				logger.error({
					"message": "The edge object does not contain a 'tdg.count_all' property",
					"object": edge
				});
				isOk = false;
			}
			if (edge.tdg.target && edge.tdg.target.function) {
				if (typeof edge.tdg.target.function === 'string') {
					if (!validateCustomFunctionName(model, logger, edge, edge.tdg.target.function)) {
						isOk = false;
					}
				} else {
					if (!edge.tdg.target.function.elements) {
						const err = {
							"message": `There is no function to get the target elements defined`,
							"object": edge
						};
						logger.error(err);
						isOk = false;
					} else {
						if (!validateCustomFunctionName(model, logger, edge, edge.tdg.target.function.elements)) {
							isOk = false;
						}
					}

					if (!edge.tdg.target.function.amount) {
						const err = {
							"message": `There is no function for amaount defined`,
							"object": edge
						};
						this.error(err);
						isOk = false;
					} else {
						if (!validateCustomFunctionName(model, logger, edge, edge.tdg.target.function.amount)) {
							isOk = false;
						}
					}
				}
			}

			// validate the src function name
			if (edge.tdg.src && edge.tdg.src.function) {
				if (!validateCustomFunctionName(model, logger, edge, edge.tdg.src.function)) {
					isOk = false;
				}
			}
		}
	});

	return isOk;

};



function validateCustomFunctionName(model, logger, config, functionName) {
	if (!model.edge_custom_functions[functionName]) {
		logger.error({
			"message": `The custom function '${functionName}' from the config is not registered at the model`,
			"object": config
		});
		return false;
	}
	return true;
}
