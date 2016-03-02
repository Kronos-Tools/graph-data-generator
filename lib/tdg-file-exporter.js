/* jslint node: true, esnext: true */
"use strict";

const dataGeneratorFactory = require('./data-generator').factory;

const fs = require('fs');
const path = require("path");


const csvWriter = require('csv-write-stream');

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

class TdgFileExporter extends llm.LogLevelMixin(_TdgFileExporter, llm.defaultLogLevels, llm.defaultLogLevels.info) {

	log(level, arg) {
		this._validationErrorCount++;
		console.log(`${getTime()} ${level.toUpperCase()}: ${JSON.stringify(arg, null, 2)}`);
	}

	constructor(opts) {
		super();

		if (!opts) {
			opts = {};
		}

		this.dataGenerator = dataGeneratorFactory();
		this.model = opts.model;
		this.target_dir = opts.target_dir;
		this.exporter = {};
	}

	run() {
		const self = this;
		// Iterate over the export parts
		Object.keys(this.model).forEach(key => {
			const config = this.model[key];

			const rowGenerator = self.createGenerator(config);
			rowGenerator();

			// returns an array of writer objects
			self.writeFiles(config);

			let done = false;
			do {
				const next = rowGenerator.next();
				if (next.done) {
					done = true;
				} else {
					self.writeFiles(config, next.value);
				}
			} while (!done);

			self.writeFiles(config);
		});
	}

	writeFiles(config, row) {
		const self = this;

		// iterate over the single exports
		Object.keys(config.exports).forEach(exportName => {
			const detailExportConfig = config.exports[exportName];
			detailExportConfig.name = exportName;

			const exportFunction = detailExportConfig.exporter;

			if (self[exportFunction]) {
				self[exportFunction](config, detailExportConfig, row);
			} else {
				self.error({
					"message": `The exporter function '${exportFunction}' does not exists`,
					"config": detailExportConfig
				});
			}
		});

	}

	exporterCsv(config, detailExportConfig, row) {
		if (row) {
			// Write the row
			const r = [];
			const fields = this.exporter[detailExportConfig.name].fields;

			fields.forEach(fieldName => {
				r.push(row[fieldName]);
			});

			this.exporter[detailExportConfig.name].write(r);
		} else if (this.exporter[detailExportConfig.name]) {
			// The exporter is existing and no row given, then end the writer
			this.exporter[detailExportConfig.name].end();
		} else {
			// This is the start of a new file
			const fileName = detailExportConfig.file_name;
			const header = detailExportConfig.header;

			const writer = csvWriter({
				"headers": header
			});

			const ws = fs.createWriteStream(path.join(this.target_dir, fileName));
			writer.pipe(ws);

			this.exporter[detailExportConfig.name] = writer;
		}
	}

	/**
	 * Creates a generator which delivers the single rows
	 * config (object) The configuration
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
					Object.keys(srcObj[currentKey]).forEach(valKey => {
						const val = srcObj[currentKey][valKey];
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
	return new TdgFileExporter(options);
};

module.exports.fileExporter = TdgFileExporter;
