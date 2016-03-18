/* jslint node: true, esnext: true */
"use strict";

const fs = require('fs');
const path = require("path");


const llm = require('loglevel-mixin');
class _TdgFileExporter {}
llm.defineLoggerMethods(_TdgFileExporter.prototype, llm.defaultLogLevels);

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

class TdgExporterDispatcher extends llm.LogLevelMixin(_TdgFileExporter, llm.defaultLogLevels, llm.defaultLogLevels.debug) {

	log(level, arg) {
		this._validationErrorCount++;
		console.log(`${getTime()} ${level.toUpperCase()}: ${JSON.stringify(arg, null, 2)}`);
	}

	constructor(opts) {
		super();

		if (!opts) {
			throw 'No options given';
		}

		if (!opts.data_generator) {
			const err = {
				"message": `No 'data_generator' given in config`,
				"object": opts
			};
			this.error(err);
			throw new Error(err);
		}

		if (!opts.model) {
			const err = {
				"message": `No 'model' given in config`,
				"object": opts
			};
			this.error(err);
			throw new Error(err);
		}

		if (!opts.target_dir) {
			const err = {
				"message": `No 'target_dir' given in config`,
				"object": opts
			};
			this.error(err);
			throw new Error(err);
		}

		if (!opts.exporter_writer) {
			const err = {
				"message": `No 'exporter' given in config`,
				"object": opts
			};
			this.error(err);
			throw new Error(err);
		}

		// The data generator
		this.data_generator = opts.data_generator;

		// The export configuration
		this.model = opts.model;

		// The target dir
		this.target_dir = opts.target_dir;

		// A hash with the provided exporter
		this.exporter = opts.exporter;

		// A hash with all the export writer
		this.exporter_writer = opts.exporter_writer;
	}

	run() {
		const self = this;

		const exporterConfig = {
			"data_generator": this.data_generator,
			"target_dir": this.target_dir,
			"exporter_writer": this.exporter_writer,
			"registry": this.registry,
		};

		// validates the whole configuration file
		self.validateConfig();

		// iterate the export objects
		Object.keys(self.model).forEach(key => {
			self.info(`Export entity '${key}'`);

			// this is one export entity. This entity could be exported in many files and flavors
			const config = self.model[key];
			config.name = key;

			let exporter;
			if (config.exporter) {
				exporter = config.exporter;
			} else {
				exporter = "tdg-exporter-default";
			}

			const expModule = self.exporter[exporter];

			expModule.run(self, exporterConfig, config);
		});

	}

	validateConfig() {
		// iterate the export objects
		Object.keys(this.model).forEach(key => {
			const config = this.model[key];
			this.validateEntityConfig(config);
		});
	}

	/**
	 * Validates the config part of one entity
	 * @param config (object) The configuration part of one entity to export
	 */
	validateEntityConfig(config) {
		const self = this;
		let isError = false;

		// validate the exporter
		let exporter;
		if (config.exporter) {
			exporter = config.exporter;
		} else {
			exporter = "exporter-default";
		}

		if (!this.exporter[exporter]) {
			const err = {
				"message": `The exporter '${exporter}' is not defined`,
				"object": config
			};
			this.error(err);
			isError = true;
		}

		// check the mandatory elements
		if (!config.exporter_writer) {
			const err = {
				"message": `There is no 'exporter_writer' given in the config`,
				"object": config
			};
			this.error(err);
			isError = true;
		}
		// check the mandatory elements
		if (!config.data) {
			const err = {
				"message": `There is no 'data' section given in the config`,
				"object": config
			};
			this.error(err);
			isError = true;
		}

		// check that all the writer exists
		config.exporter_writer.forEach(writerConfig => {
			const writerName = writerConfig.type;

			if (!self.exporter_writer[writerName]) {
				const err = {
					"message": `The writer '${writerName}' does not exists.`,
					"object": config
				};
				this.error(err);
				isError = true;
			}
		});

		// validate the sources
		config.data.sources.forEach(sourceName => {
			if (!self.registry[sourceName]) {
				const err = {
					"message": `The source vertex '${sourceName}' does not exists`,
					"config": config
				};
				self.error(err);
				isError = true;
			}
		});

		if (isError) {
			throw new Error("Too many errors");
		}
	}
}

module.exports.factory = function (options) {
	return new TdgExporterDispatcher(options);
};
module.exports.tdgExporterDispatcher = TdgExporterDispatcher;
