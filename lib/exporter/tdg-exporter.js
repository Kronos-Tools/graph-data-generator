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

class TdgExporter extends llm.LogLevelMixin(_TdgFileExporter, llm.defaultLogLevels, llm.defaultLogLevels.info) {

	log(level, arg) {
		this._validationErrorCount++;
		console.log(`${getTime()} ${level.toUpperCase()}: ${JSON.stringify(arg, null, 2)}`);
	}

	constructor(opts) {
		super();

		if (!opts) {
			throw 'No options given';
		}

		if (!opts.dataGenerator) {
			throw 'No dataGenerator given';
		}

		if (!opts.model) {
			throw 'No model given';
		}
		if (!opts.target_dir) {
			throw 'No target_dir given';
		}

		if (!opts.exporter) {
			throw 'No exporter given';
		}

		// The data generator
		this.dataGenerator = opts.dataGenerator;

		// The export configuration
		this.model = opts.model;

		// The target dir
		this.target_dir = opts.target_dir;

		// An hash with the provided exporter functions
		this.exporter = opts.exporter;
	}

	run() {
		const self = this;


		// iterate the export objects
		Object.keys(this.model).forEach(key => {

			// this is one export entity. This entity could be exported in many files and flavors
			const config = this.model[key];
			config.name = key;

			self.exportEntity(config);
		});

	}

	/**
	 * Exports one entity of the export definition model
	 * @param config (object) The config for this identity
	 */
	exportEntity(config) {
		const self = this;

		// check the mandatory elements
		if (!config.exporter) {
			const err = {
				"message": `There is no 'exporter' given in the config`,
				"object": config
			};
			this.error(err);
			throw new Error(err);
		}
		// check the mandatory elements
		if (!config.data) {
			const err = {
				"message": `There is no 'data' section given in the config`,
				"object": config
			};
			this.error(err);
			throw new Error(err);
		}

		// -------------------------------------
		// create the data generator function
		// -------------------------------------
		const rowGen = self.createGenerator(config.data);
		const iter = rowGen();


		// -------------------------------------
		// create the writer
		// -------------------------------------
		const writerList = [];

		// Iterate over the export parts
		config.exporter.forEach(exporterConfig => {
			writerList.push(self.createWriter(exporterConfig));
		});

		// -------------------------------------
		// write the data chunks
		// -------------------------------------
		let done = false;
		do {
			const next = iter.next();
			if (next.done) {
				done = true;
			} else {
				const row = next.value;
				writerList.forEach(writer => {
					writer.write(row);
				});
			}
		} while (!done);

		// -------------------------------------
		// close the writer
		// -------------------------------------
		writerList.forEach(writer => {
			writer.close();
		});

	}


	/**
	 * Creates the custom writer and initilize them
	 * @param config (object) The writer configuration
	 * @return writer (object) The created and initialized writer
	 */
	createWriter(config) {
		if (!config.type) {
			throw new Error("No exporter type given");
		}

		// check that the given exporter exists
		if (!this.exporter[config.type]) {
			throw new Error(`The exporter '${config.type} does not exists'`);
		}

		const customWriter = this.exporter[config.type];
		return customWriter.init(this, config);
	}


	// writeFiles(config, row) {
	// 	const self = this;
	//
	// 	// iterate over the single exports
	// 	Object.keys(config.exports).forEach(exportName => {
	// 		const detailExportConfig = config.exports[exportName];
	// 		detailExportConfig.name = exportName;
	//
	// 		const exportFunction = detailExportConfig.exporter;
	//
	// 		if (self[exportFunction]) {
	// 			self[exportFunction](config, detailExportConfig, row);
	// 		} else {
	// 			self.error({
	// 				"message": `The exporter function '${exportFunction}' does not exists`,
	// 				"config": detailExportConfig
	// 			});
	// 		}
	// 	});
	//
	// }
	//
	// exporterCsv(config, detailExportConfig, row) {
	// 	if (row) {
	// 		// Write the row
	// 		const r = [];
	// 		const fields = detailExportConfig.fields;
	//
	// 		fields.forEach(fieldName => {
	// 			r.push(row[fieldName]);
	// 		});
	//
	// 		this.exporter[detailExportConfig.name].write(r);
	// 	} else if (this.exporter[detailExportConfig.name]) {
	// 		// The exporter is existing and no row given, then end the writer
	// 		this.exporter[detailExportConfig.name].end();
	// 	} else {
	// 		// This is the start of a new file
	// 		const fileName = detailExportConfig.file_name;
	// 		const header = detailExportConfig.header;
	//
	// 		const writer = csvWriter({
	// 			"headers": header
	// 		});
	//
	// 		const ws = fs.createWriteStream(path.join(this.target_dir, fileName));
	// 		writer.pipe(ws);
	//
	// 		this.exporter[detailExportConfig.name] = writer;
	// 	}
	// }

	/**
	 * Creates a generator which delivers the single rows
	 * @param config (object) The configuration
	 * @return gen (generator) A generator delivering the a row object with all the genereted column values
	 */
	createGenerator(config) {
		const self = this;

		// the definitions how to generate the data for each field
		const columns = config.columns;

		// an array with all the source vertices
		// The key value data will mixed into the column data
		const sources = config.sources;

		// reset the data generator
		self.dataGenerator.startDataContext();

		const sourceObjects = [];
		sources.forEach(sourceName => {
			if (!self.registry[sourceName]) {
				self.error({
					"message": `The source vertex '${sourceName}' does not exists`,
					"config": config
				});
			} else {
				sourceObjects.push(self.registry[sourceName]);
			}
		});

		return function* () {
			// the first source object is the master to get the object keys
			const keys = Object.keys(sourceObjects[0].objects);
			for (let i = 0; i < keys.length; i++) {
				// reset the row context
				self.dataGenerator.startContext();

				const currentKey = keys[i];
				const row = {};

				// get the key data from all the source vertices
				sourceObjects.forEach(srcObj => {
					Object.keys(srcObj.objects[currentKey]).forEach(valKey => {
						const val = srcObj.objects[currentKey][valKey];
						row[valKey] = val;
					});
				});

				Object.keys(config.columns).forEach(columName => {
					const fieldConfig = config.columns[columName];

					// now generate the data for the rest of the columns
					const val = self.dataGenerator.createData(fieldConfig);

					row[columName] = val;
				});

				// returns the row
				yield row;
			}

			return;
		};

	}
}



module.exports.factory = function (options) {
	return new TdgExporter(options);
};

module.exports.fileExporter = TdgExporter;
