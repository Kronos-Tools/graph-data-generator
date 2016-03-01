/* jslint node: true, esnext: true */
"use strict";


const RandExp = require('randexp');
const faker = require('faker');


const llm = require('loglevel-mixin');
class _DataGenerator {}
llm.defineLoggerMethods(_DataGenerator.prototype, llm.defaultLogLevels);

class DataGenerator extends llm.LogLevelMixin(_DataGenerator, llm.defaultLogLevels, llm.defaultLogLevels.info) {

	/**
	 * Starts a new complete context.
	 * This context will be used if data should be unique
	 */
	startDataContext() {
		this.dataContext = {};
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
		let val;
		if (fieldConfig.regex) {
			val = this.createFieldValueRegEx(fieldConfig);
		} else if (fieldConfig.faker) {
			val = this.createFieldValueFaker(fieldConfig);
		} else if (fieldConfig.tdg.email) {
			val = this.createEmail(fieldConfig);
		} else {
			const err = {
				"message": `Could not get a valid data generator for the given configuration`,
				"object": fieldConfig
			};
			this.error(err);
			throw new Error(err);
		}
		return val;
	}

	/**
	 * Creates the first name from the context
	 * @fieldConfig (object) The configuration to create the value
	 * @return val (string, number) The generated value
	 */
	createFirstName(fieldConfig) {
		if (!this.context.first_name) {
			this.context.first_name = faker.name.firstName();
		}
		return this.context.first_name;
	}

	/**
	 * Creates the last name from the context
	 * @fieldConfig (object) The configuration to create the value
	 * @return val (string, number) The generated value
	 */
	createLastName(fieldConfig) {
		if (!this.context.last_name) {
			this.context.last_name = faker.name.LastName();
		}
		return this.context.last_name;
	}

	/**
	 * Build an email out of a first name and a last name. If the both are already exists in the the row context
	 * these value will be taken. If not it will call faker to generate a first and last name
	 * @fieldConfig (object) The configuration to create the value
	 * @return val (string, number) The generated value
	 */
	createEmail(fieldConfig) {
		if (!this.context.first_name) {
			this.context.first_name = faker.name.firstName();
		}
		if (!this.context.last_name) {
			this.context.last_name = faker.name.lastName();
		}

		const firstName = this.context.first_name;
		const lastName = this.context.last_name;

		let domainName = fieldConfig.tdg.email.domainName;
		if (!domainName) {
			domainName = faker.internet.domainName();
		}

		let val;
		let tryCount = -1;
		const suffix = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"];
		let lastSuffix;
		do {
			if (tryCount >= 0) {
				val = `${firstName}-${suffix[tryCount]}.${lastName}@${domainName}`;
			} else if (tryCount > 13) {
				val = `${firstName}-${tryCount}.${lastName}@${domainName}`;
			} else {
				val = `${firstName}.${lastName}@${domainName}`;
			}

			let uniqueSet;
			if (fieldConfig.unique) {
				uniqueSet = this.dataContext[fieldConfig.name].uniqueSet;
				if (!uniqueSet) {
					uniqueSet = new Set();
					this.dataContext[fieldConfig.name].uniqueSet = uniqueSet;
				}
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
				throw new Error({
					"message": `Could not get a unique value for the given regex`,
					"object": fieldConfig
				});
			}
		} while (!val);

		return val;
	}

	/**
	 * Creates data by using the faker module
	 * @fieldConfig (object) The configuration to create the value
	 * @return val (string, number) The generated value
	 */
	createFieldValueFaker(fieldConfig) {
		let funcName;
		let option;
		if (typeof fieldConfig === 'string') {
			funcName = fieldConfig.faker;
		} else {
			funcName = fieldConfig.function;
			option = fieldConfig.option;
		}

		const funcNameParts = funcName.split('.');
		const fakerFunc = faker[funcNameParts[0]][funcNameParts[1]];

		let val;
		let tryCount = 50;
		do {
			if (option) {
				val = fakerFunc(option);
			} else {
				val = fakerFunc();
			}

			let uniqueSet;
			if (fieldConfig.unique) {
				uniqueSet = this.dataContext[fieldConfig.name].uniqueSet;
				if (!uniqueSet) {
					uniqueSet = new Set();
					this.dataContext[fieldConfig.name].uniqueSet = uniqueSet;
				}
			}

			if (fieldConfig.unique) {
				if (uniqueSet.has(val)) {
					val = undefined;
				} else {
					uniqueSet.add(val);
				}
			}

			tryCount--;
			if (tryCount < 0) {
				throw new Error({
					"message": `Could not get a unique value for the given regex`,
					"object": fieldConfig
				});
			}
		} while (!val);

		return val;
	}


	/**
	 * Creates data by using a regular expression
	 * @fieldConfig (object) The configuration to create the value
	 * @return val (string, number) The generated value
	 */
	createFieldValueRegEx(fieldConfig) {
		if (!this.dataContext[fieldConfig.name]) {
			this.dataContext[fieldConfig.name] = {};
		}

		// Regex generator
		let generator = this.dataContext[fieldConfig.name].generator;
		if (!generator) {
			if (fieldConfig.regex_case_sensitive) {
				generator = new RandExp(fieldConfig.regex, 'i');
			} else {
				generator = new RandExp(fieldConfig.regex);
			}
			this.dataContext[fieldConfig.name].generator = generator;
		}

		let uniqueSet;
		if (fieldConfig.unique) {
			uniqueSet = this.dataContext[fieldConfig.name].uniqueSet;
			if (!uniqueSet) {
				uniqueSet = new Set();
				this.dataContext[fieldConfig.name].uniqueSet = uniqueSet;
			}
		}

		// now generate the value
		let val;
		let tryCount = 50;
		do {
			val = generator.gen();
			if (fieldConfig.unique) {
				if (uniqueSet.has(val)) {
					val = undefined;
				} else {
					uniqueSet.add(val);
				}
			}

			tryCount--;
			if (tryCount < 0) {
				throw new Error({
					"message": `Could not get a unique value for the given regex`,
					"object": fieldConfig
				});
			}
		} while (!val);
		return val;
	}

}
