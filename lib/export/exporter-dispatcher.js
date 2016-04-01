/* jslint node: true, esnext: true */
"use strict";

const Logger = require('../util/logger');


class ExporterDispatcher extends Logger {



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

}

module.exports.exporterDispatcherFactory = function (options) {
	return new ExporterDispatcher(options);
};
module.exports.ExporterDispatcher = ExporterDispatcher;
