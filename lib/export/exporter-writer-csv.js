/* jslint node: true, esnext: true */
"use strict";

const fs = require('fs');
const path = require("path");
const csvWriter = require('csv-write-stream');


class ExporterWriterCsv {
	constructor(config) {
		if (!config.target_dir) {
			const err = {
				"message": `No 'target_dir' defined`,
				"object": config
			};
			console.error(err);
			throw new Error(err);
		}

		if (!config.file_name) {
			const err = {
				"message": `No 'file_name' defined in export config.`,
				"object": config
			};
			console.error(err);
			throw new Error(err);
		}

		if (!config.fields) {
			const err = {
				"message": `No 'fields' defined in export config.`,
				"object": config
			};
			console.error(err);
			throw new Error(err);
		}

		this.target_dir = config.target_dir;

		this.config = config;
		this.writer = this.init(config);
	}

	/**
	 * Initializes the writer
	 */
	init(config) {
		const writerConfig = {};

		if (config.header) {
			writerConfig.headers = config.header;
		}
		if (config.seperator) {
			writerConfig.seperator = config.seperator;
		}
		if (config.newline) {
			writerConfig.newline = config.newline;
		}

		const writer = csvWriter(writerConfig);

		const targetFileName = path.join(config.target_dir, config.file_name);

		config.logger.info(`Write the file: '${targetFileName}'`);

		const ws = fs.createWriteStream(targetFileName);
		writer.pipe(ws);

		return writer;
	}


	/**
	 * writes the chunk data or parts of it
	 * @param chunk (object) The chunk data
	 */
	write(chunk) {
		// Write the row
		const r = [];
		const fields = this.config.fields;

		fields.forEach(fieldName => {
			r.push(chunk[fieldName]);
		});
		this.writer.write(r);
	}

	/**
	 * Closes the writer
	 */
	close() {
		this.writer.end();
	}
}

/**
 * Initializes the custom writer
 * @param exporter (object) The exporter object
 * @param config (object) The exporter configuration
 * @return writer (object) New created custom writer
 */
module.exports.exporterWriterCsvFactory = function (exporter, options) {
	return new ExporterWriterCsv(exporter, options);
};

module.exports.ExporterWriterCsv = ExporterWriterCsv;
