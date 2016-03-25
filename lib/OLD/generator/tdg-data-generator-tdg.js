/* jslint node: true, esnext: true */
"use strict";

const faker = require('faker');

/**
 * This data generator is an adapter to the faker data creator
 */

class TdgDataGeneratorTdg {
	constructor(config) {
		this.config = config;
	}

	/**
	 * @param fieldConfig (object) The generator configuration
	 * @param dataContext (object) This context is active for the whole generation process. This could be used to make data unique
	 * @param chunkContext (object) This context is is active for one chunk (row) of data
	 * @param dispatcher (object) This calling generator dispatcher
	 * @return val (string, number) The generated data
	 */
	createValue(fieldConfig, dataContext, chunkContext, dispatcher) {

		if (!fieldConfig.function) {
			const err = {
				"message": `No 'function' property given in the configuration`,
				"object": fieldConfig
			};
			dispatcher.error(err);
			throw new Error(err);
		}

		const functionName = fieldConfig.function;

		if (functionName === "email") {
			return this.createEmail(fieldConfig, dataContext, chunkContext, dispatcher);
		} else if (functionName === "first_name") {
			return this.createFirstName(fieldConfig, dataContext, chunkContext, dispatcher);
		} else if (functionName === "last_name") {
			return this.createLastName(fieldConfig, dataContext, chunkContext, dispatcher);
		} else if (functionName === "fix_value") {
			return this.createFixValue(fieldConfig, dataContext, chunkContext, dispatcher);
		}

	}

	/**
	 * Just takes the fix value from the config
	 * @param fieldConfig (object) The generator configuration
	 * @param dataContext (object) This context is active for the whole generation process. This could be used to make data unique
	 * @param chunkContext (object) This context is is active for one chunk (row) of data
	 * @param dispatcher (object) This calling generator dispatcher
	 * @return val (string, number) The generated value
	 */
	createFixValue(fieldConfig, dataContext, chunkContext, dispatcher) {
		if (fieldConfig.option === undefined) {
			const err = {
				"message": `For the function 'fix_value' a 'option' attribute is needed`,
				"object": fieldConfig
			};
			dispatcher.error(err);
			throw new Error(err);
		}
		return fieldConfig.option;
	}

	/**
	 * Creates the first name from the context
	 * @param fieldConfig (object) The generator configuration
	 * @param dataContext (object) This context is active for the whole generation process. This could be used to make data unique
	 * @param chunkContext (object) This context is is active for one chunk (row) of data
	 * @param dispatcher (object) This calling generator dispatcher
	 * @return val (string, number) The generated value
	 */
	createFirstName(fieldConfig, dataContext, chunkContext, dispatcher) {
		if (!chunkContext.first_name) {
			chunkContext.first_name = faker.name.firstName();
		}
		return chunkContext.first_name;
	}

	/**
	 * Creates the last name from the context
	 * @param fieldConfig (object) The generator configuration
	 * @param dataContext (object) This context is active for the whole generation process. This could be used to make data unique
	 * @param chunkContext (object) This context is is active for one chunk (row) of data
	 * @param dispatcher (object) This calling generator dispatcher
	 * @return val (string, number) The generated value
	 */
	createLastName(fieldConfig, dataContext, chunkContext, dispatcher) {
		if (!chunkContext.last_name) {
			chunkContext.last_name = faker.name.lastName();
		}
		return chunkContext.last_name;
	}


	/**
	 * Build an email out of a first name and a last name. If the both are already exists in the the row context
	 * these value will be taken. If not it will call faker to generate a first and last name
	 * @param fieldConfig (object) The generator configuration
	 * @param dataContext (object) This context is active for the whole generation process. This could be used to make data unique
	 * @param chunkContext (object) This context is is active for one chunk (row) of data
	 * @param dispatcher (object) This calling generator dispatcher
	 * @return val (string, number) The generated value
	 */
	createEmail(fieldConfig, dataContext, chunkContext, dispatcher) {
		let domainName = fieldConfig.domainName;

		if (!chunkContext.first_name) {
			chunkContext.first_name = faker.name.firstName();
		}
		if (!chunkContext.last_name) {
			chunkContext.last_name = faker.name.lastName();
		}

		const firstName = chunkContext.first_name;
		const lastName = chunkContext.last_name;

		if (!domainName) {
			domainName = faker.internet.domainName();
		}

		let val;
		let tryCount = -1;
		const suffix = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"];
		let lastSuffix;


		let uniqueSet;
		if (fieldConfig.unique) {
			uniqueSet = dispatcher.getUniqueSet(fieldConfig);
		}


		do {
			if (tryCount >= 0) {
				val = `${firstName}-${suffix[tryCount]}.${lastName}@${domainName}`;
			} else if (tryCount > 13) {
				val = `${firstName}-${tryCount}.${lastName}@${domainName}`;
			} else {
				val = `${firstName}.${lastName}@${domainName}`;
			}

			if (fieldConfig.unique) {
				if (uniqueSet.has(val)) {
					val = undefined;
				} else {
					uniqueSet.add(val);
				}
			}

			tryCount++;
			if (tryCount > 50) {
				const err = {
					"message": `Could not get a unique value for the given regex`,
					"object": fieldConfig
				};
				dispatcher.error(err);
				throw new Error(err);
			}
		} while (!val);

		return val;
	}


}

/**
 * Initializes the custom writer
 * @param config (object) The exporter configuration
 * @return dataGenerator (object) New created custom data generator
 */
module.exports.factory = function (config) {
	return new TdgDataGeneratorTdg(config);
};

module.exports.TdgDataGeneratorTdg = TdgDataGeneratorTdg;
