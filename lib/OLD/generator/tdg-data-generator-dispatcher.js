/* jslint node: true, esnext: true */
"use strict";

/**
 * This object dispatches the data creation to the defined special data generators.
 * It also provides a context to store values while the data is generated.
 */


const llm = require('loglevel-mixin');
class _DataGenerator {}
llm.defineLoggerMethods(_DataGenerator.prototype, llm.defaultLogLevels);

function getTime() {
	function fill(val) {
		if (val < 10) {
			return "0" + val;
		}
		return val;
	}

	const date = new Date(Date.now());
	const dateStr = `${date.getFullYear()}-${fill(date.getMonth() + 1)}-${fill(date.getDate())}`;
	const timeStr = `${fill(date.getHours())}:${fill(date.getMinutes())}:${fill(date.getSeconds())}`;
	return dateStr + " " + timeStr;
}

class TdgDataGeneratorDispatcher extends llm.LogLevelMixin(_DataGenerator, llm.defaultLogLevels, llm.defaultLogLevels.info) {

	log(level, arg) {
		this._validationErrorCount++;
		console.log(`${getTime()} ${level.toUpperCase()}: ${JSON.stringify(arg, null, 2)}`);
	}

	constructor(opts) {
		super();

		if (!opts || !opts.custom_generators) {
			const err = `No generators given. Without generator no data creation is possible`;
			this.error(err);
			throw new Error(err);
		}

		// Stores custom generator functions
		this.custom_generators = opts.custom_generators;
	}



	/**
	 * Starts a new complete context.
	 * This context will be used if data should be unique
	 */
	startDataContext() {
		this.dataContext = {};
		this.context = {};
	}

	/**
	 * Sets a new context. A context is used to generate data which depends on each other.
	 * For example when generating an email the first and last name should match the email in some way.
	 * This context would be used for one record.
	 * @context (object, optional) The context to set. If no context is given an empty object will ne generated
	 */
	startContext(context) {
		if (context) {
			this.context = context;
		} else {
			this.context = {};
		}
	}

	/**
	 * Creates data for a given configuration
	 */
	createData(fieldConfig) {

		// this is the name of the generator to load
		const generatorName = fieldConfig.type;

		if (!this.custom_generators[generatorName]) {
			const err = {
				"message": `The custom generator '${generatorName}' does not exists`,
				"object": fieldConfig
			};
			this.error(err);
			throw new Error(err);
		}

		const custGenerator = this.custom_generators[generatorName];
		return custGenerator.createValue(fieldConfig, this.dataContext, this.context, this);
	}

	/**
	 * Returns a unique set for a given field name. This set is stored in the dataContext.
	 * If there is no set for the given name an empty one will be created
	 */
	getUniqueSet(fieldName) {
		let uniqueSet;
		if (this.dataContext[fieldName]) {
			if (this.dataContext[fieldName] && this.dataContext[fieldName].uniqueSet) {
				uniqueSet = this.dataContext[fieldName].uniqueSet;
			}
		} else {
			this.dataContext[fieldName] = {};
		}
		if (!uniqueSet) {
			uniqueSet = new Set();
			this.dataContext[fieldName].uniqueSet = uniqueSet;
		}
		return uniqueSet;
	}

}

module.exports.factory = function (options) {
	return new TdgDataGeneratorDispatcher(options);
};

module.exports.TdgDataGeneratorDispatcher = TdgDataGeneratorDispatcher;
