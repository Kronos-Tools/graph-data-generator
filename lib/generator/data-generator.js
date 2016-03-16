/* jslint node: true, esnext: true */
"use strict";


const RandExp = require('randexp');
const faker = require('faker');
//const entitlementGenerator = require('./tdg-gen-entitlement').factory();



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

class DataGenerator extends llm.LogLevelMixin(_DataGenerator, llm.defaultLogLevels, llm.defaultLogLevels.info) {

	log(level, arg) {
		this._validationErrorCount++;
		console.log(`${getTime()} ${level.toUpperCase()}: ${JSON.stringify(arg, null, 2)}`);
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
		let val;
		if (fieldConfig.regex) {
			val = this.createFieldValueRegEx(fieldConfig);
		} else if (fieldConfig.faker) {
			val = this.createFieldValueFaker(fieldConfig);
		} else if (fieldConfig.tdg) {
			let functionName;
			if (typeof fieldConfig.tdg === "string") {
				functionName = fieldConfig.tdg;
			} else {
				functionName = fieldConfig.tdg.function;
			}
			if (functionName === "email") {
				val = this.createEmail(fieldConfig);
			} else if (functionName === "first_name") {
				val = this.createFirstName(fieldConfig);
			} else if (functionName === "last_name") {
				val = this.createLastName(fieldConfig);
			} else if (functionName === "entitlement") {
				val = this.createEntitlement(fieldConfig);
			}



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
			this.context.last_name = faker.name.lastName();
		}
		return this.context.last_name;
	}

	_getUniqueSet(fieldConfig) {
		let uniqueSet;
		if (fieldConfig.unique) {
			if (this.dataContext[fieldConfig.name]) {
				if (this.dataContext[fieldConfig.name] && this.dataContext[fieldConfig.name].uniqueSet) {
					uniqueSet = this.dataContext[fieldConfig.name].uniqueSet;
				}
			} else {
				this.dataContext[fieldConfig.name] = {};
			}
			if (!uniqueSet) {
				uniqueSet = new Set();
				this.dataContext[fieldConfig.name].uniqueSet = uniqueSet;
			}
		}
		return uniqueSet;
	}

	/**
	 * Build an email out of a first name and a last name. If the both are already exists in the the row context
	 * these value will be taken. If not it will call faker to generate a first and last name
	 * @fieldConfig (object) The configuration to create the value
	 * @return val (string, number) The generated value
	 */
	createEmail(fieldConfig) {
		let domainName;
		if (typeof fieldConfig.tdg === 'object') {
			domainName = fieldConfig.tdg.domainName;
		}

		if (!this.context.first_name) {
			this.context.first_name = faker.name.firstName();
		}
		if (!this.context.last_name) {
			this.context.last_name = faker.name.lastName();
		}

		const firstName = this.context.first_name;
		const lastName = this.context.last_name;

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

			let uniqueSet = this._getUniqueSet(fieldConfig);

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
	createEntitlement(fieldConfig) {
		let val;
		let tryCount = 50;
		do {
			val = entitlementGenerator.createEntitlement();

			let uniqueSet = this._getUniqueSet(fieldConfig);

			if (fieldConfig.unique) {
				if (this.dataContext[fieldConfig.name]) {
					if (this.dataContext[fieldConfig.name] && this.dataContext[fieldConfig.name].uniqueSet) {
						uniqueSet = this.dataContext[fieldConfig.name].uniqueSet;
					}
				} else {
					this.dataContext[fieldConfig.name] = {};
				}
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
	 * Creates data by using the faker module
	 * @fieldConfig (object) The configuration to create the value
	 * @return val (string, number) The generated value
	 */
	createFieldValueFaker(fieldConfig) {
		let funcName;
		let option;
		if (typeof fieldConfig.faker === 'string') {
			funcName = fieldConfig.faker;
		} else {
			funcName = fieldConfig.faker.function;
			option = fieldConfig.faker.option;
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

			let uniqueSet = this._getUniqueSet(fieldConfig);

			if (fieldConfig.unique) {
				if (this.dataContext[fieldConfig.name]) {
					if (this.dataContext[fieldConfig.name] && this.dataContext[fieldConfig.name].uniqueSet) {
						uniqueSet = this.dataContext[fieldConfig.name].uniqueSet;
					}
				} else {
					this.dataContext[fieldConfig.name] = {};
				}
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

		let regExString;
		let caseSensitive = false;
		if (typeof fieldConfig.regex === 'string') {
			regExString = fieldConfig.regex;
		} else if (typeof fieldConfig.regex === 'object') {
			regExString = fieldConfig.regex.exp;

			if (fieldConfig.regex.case_sensitive) {
				caseSensitive = true;
			}
		}

		// Regex generator
		let generator = this.dataContext[fieldConfig.name].generator;
		if (!generator) {
			if (caseSensitive) {
				generator = new RandExp(regExString, 'i');
			} else {
				generator = new RandExp(regExString);
			}
			this.dataContext[fieldConfig.name].generator = generator;
		}

		let uniqueSet = this._getUniqueSet(fieldConfig);

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

module.exports.factory = function (options) {
	return new DataGenerator(options);
};

module.exports.dataGenerator = DataGenerator;
