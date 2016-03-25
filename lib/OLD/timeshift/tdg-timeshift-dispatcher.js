/* jslint node: true, esnext: true */
"use strict";

//const TdgExecuterData = require('../.tdg/tdg-executer-data').executerData;

class TdgTimeshiftDispatcher {
	constructor(opts) {
		if (opts) {

			if (opts.model) {
				this.model = opts.model;
			}

			if (opts.registry) {
				this.registry = opts.registry;
			}
		}
	}

	error(msg) {
		console.log(msg);
	}
	info(msg) {
		console.log(msg);
	}
	debug(msg) {
		console.log(msg);
	}

	/**
	 * Shifting the data over the iterations
	 */
	createTimeshift() {
		if (!this.model.timeshift) {
			const err = {
				"message": `There is no 'timeshift' section defined in the config model`
			};
			this.error(err);
			throw new Error(err);
		}

		if (this._validateModel()) {
			// ok we can start with the process
			this._timeshiftProcess(this.model.timeshift);
		}
	}


	/**
	 * Handles the timeshift of an config element. Also call this function
	 * recursive until all config elements are done
	 * @param rootConfig (object) The rootConfig of all the config elements
	 */
	_timeshiftProcess(timeshiftConfig) {
		const iterationCount = timeshiftConfig.config.iterations;
		if (iterationCount) {
			// if iterations undefined or "= 0" Then nothing there is nothing to do.

			// loop the iterations of time shifting
			for (let i = 0; i < iterationCount; i++) {
				this.debug(`Work on iteration ${i}`);
				this._timeshiftElementHandler(timeshiftConfig.data, iterationCount, i);
			}
		} else {
			const msg = {
				"message": `For the configuration is NO iteration defined.`,
				"config": timeshiftConfig
			};
			this.info(msg);
		}
	}

	/**
	 * Handles the timeshift of an config element. Also call this function
	 * recursive until all config elements are done
	 * @param rootConfig (object) The rootConfig of all the config elements
	 * @param iterationCount (number) The count of iterations to execute
	 * @param currentIteration (number) The current iteration
	 */
	_timeshiftElementHandler(rootConfig, iterationCount, currentIteration) {
		const self = this;

		//	hier gehts weiter
		Object.keys(rootConfig).forEach(elementName => {
			const elementConfig = rootConfig[elementName];
			elementConfig.name = elementName;

			self._timeshiftElement(elementConfig);
		});


		// check if this module has sub vertices
		if (rootConfig.sub_vertex) {
			self._timeshiftElementHandler(rootConfig.sub_vertex, iterationCount, currentIteration);
		}
	}

	/**
	 * Do the time shift for one single config element
	 * @param elementConfig (object) The configuration of this element
	 * @param iterationCount (number) The count of iterations to execute
	 * @param currentIteration (number) The current iteration
	 */
	_timeshiftElement(elementConfig, iterationCount, currentIteration) {
		const elementName = elementConfig.name;

		// get the current vertex element
		const vertex = this.registry[elementName];



		// ----------------------------------
		// -- Initial phase iteration '0'
		// ----------------------------------
		const storage = {};
		if (iterationCount === 0) {
			// create the empty store
			storage.start = [];
			storage.iter = [];

			vertex.time_shift_current = {
				"available": {
					"min": vertex.min_id,
					"max": vertex.max_id
				},
				"active": [],
				"removed": []
			};

			// set the initial values
			const start = elementConfig.start;
			if (start) {
				let min = vertex.time_shift_current.available.min;
				const startElements = [];
				for (min; min < start; min++) {
					startElements.push(min);
				}

				vertex.time_shift_current.available.min = min + 1;
				vertex.time_shift_current.available.active = startElements;
				storage.start = startElements;
			}
			vertex.time_shift = storage;
		}

		// ----------------------------------
		// -- day iterator
		// ----------------------------------
		const elemCount = vertex.time_shift_current.available.max - vertex.time_shift_current.available.min + 1;

		if (elemCount / iterationCount > 0) {
			// there are more than '0' elements to add per day
		} else {
			// Only add elements on a few days
		}
		console.log(Math.floor(elemCont / iter));
		console.log(Math.floor(1 / (elemCont / iter)));


	}

	/**
	 * validates the timeshift configuration
	 */
	_validateModel() {
		const data = this.model.timeshift.data;
		let isError = false;

		if (data) {
			if (!this._validateElementHandler(data)) {
				isError = true;
			}
		} else {
			const err = {
				"message": `There is no 'timeshift.data' section defined in the config model`
			};
			this.error(err);
			isError = true;
		}

		if (this.model.timeshift.config) {
			const commonConfig = this.model.timeshift.config;
		} else {
			const err = {
				"message": `There is no 'timeshift.data' section defined in the config model`
			};
			this.error(err);
			isError = true;
		}

		return isError;
	}


	/**
	 * Handles the validation of an config element. Also call this function
	 * recursive until all config elements are validated
	 * @param rootConfig (object) The rootConfig of all the config elements
	 */
	_validateElementHandler(rootConfig) {
		const self = this;
		let isError = false;

		Object.keys(rootConfig).forEach(elementName => {
			const elementConfig = rootConfig[elementName];
			elementConfig.name = elementName;

			// validate this single config element
			if (!self._validateElementValues(elementConfig)) {
				isError = true;
			}

			// check if this module has sub vertices
			if (rootConfig.sub_vertex) {
				if (!self._validateElementHandler(rootConfig.sub_vertex)) {
					isError = true;
				}
			}

		});

		return isError;
	}

	/**
	 * Validates one single element of the configuration
	 * @param elementConfig (object) The configuration of this element
	 */
	_validateElementValues(elementConfig) {
		const elementName = elementConfig.name;
		const vertex = this.registry[elementName];
		if (!vertex) {
			elementConfig.name = elementName;
			const err = {
				"message": `The vertex '${elementName}' could not be found`,
				"config": elementConfig
			};
			this.error(err);
			throw new Error(err);
		}

		const countAll = vertex.tdg.count_all;

		let sum = 0;
		if (elementConfig.start) {
			sum += elementConfig.start;
		}

		if (elementConfig.while) {
			if (elementConfig.while.add) {
				sum += elementConfig.while.add;
			}
		}


		if (sum !== countAll) {
			const err = {
				"message": `The sum of the changes is ${sum} but the overall amount of data is ${countAll}. Both values should be the same size`,
				"config": elementConfig
			};
			this.error(err);
			return false;
		}

		return true;
	}

}

module.exports.factory = function (options) {
	return new TdgTimeshiftDispatcher(options);
};

module.exports.TdgTimeshiftDispatcher = TdgTimeshiftDispatcher;
