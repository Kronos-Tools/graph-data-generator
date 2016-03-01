/* jslint node: true, esnext: true */
"use strict";

const llm = require('loglevel-mixin');
class _Exporter {}
llm.defineLoggerMethods(_Exporter.prototype, llm.defaultLogLevels);

class Exporter extends llm.LogLevelMixin(_Exporter, llm.defaultLogLevels, llm.defaultLogLevels.info) {

	log(level, arg) {
		this._validationErrorCount++;
		console.log(`${level}: ${arg}`);
	}

	constructor(opts) {
		super();

		if (!opts) {
			opts = {};
		}

		this.targetDir = opts.target_dir ? opts.target_dir : '.';
		this.sourceDir = opts.source_dir ? opts.source_dir : '.';

		// The amount of elements after an info message will be printed
		this.dataModel = undefined;
	}

	buildModel(type, elements) {
		elements.forEach(elem => {
			const fileName = this.buildFileName(elem);
		});
	}

	buildFileName(type, elementName) {
		if (type === 'vertex') {
			return `vertex_key_data_${elementName}.json`;
		} else if (type === 'edge') {
			return `Edge_${elementName}.json`;
		}
	}

	export () {
		const applications = this.tdgModel.application;
		const applications = this.tdgModel.application;
	}
}
