/* jslint node: true, esnext: true */
"use strict";

const fs = require('fs');
const path = require("path");


class TdgExporterDefault {
	/**
	 * Initializes this exporter
	 *
	 * @param exporterDispatcher (object) The calling dispatcher
	 * @param exporterConfig (object) The configuration for this exporter
	 * @param entityConfig (object) The configuration of how to export the current identity
	 */
	run(exporterDispatcher, exporterConfig, entityConfig) {
		this.dispatcher = exporterDispatcher;

		this.exporter_config = exporterConfig;
		this.entity_config = entityConfig;

		this._exportEntity(entityConfig);

		// clean up
		this.dispatcher = undefined;
		this.exporter_config = undefined;
		this.entity_config = undefined;
	}


	/**
	 * Exports one entity of the export definition model
	 * @param config (object) The config for this identity
	 */
	_exportEntity(config) {
		const self = this;

		// -------------------------------------
		// create the data generator function
		// -------------------------------------
		self.dispatcher.debug(`Prepare generator`);
		const rowGen = self.createGenerator(config.data);
		const iter = rowGen();

		// -------------------------------------
		// create the writer
		// -------------------------------------
		const writerList = self._prepareWriter(config);

		// -------------------------------------
		// write the data chunks
		// -------------------------------------
		self.dispatcher.debug(`Write the data`);
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

		self.dispatcher.debug(`Finished the entity`);

	}


	/**
	 * Create the list of writer objects for this config part
	 * @param config (object) The configuration part for all the writer
	 * @return writerList (array) An array with all the created writer
	 */
	_prepareWriter(config) {
		this.dispatcher.debug(`Prepare writer`);
		const writerList = [];

		// Iterate over the export parts
		config.exporter_writer.forEach(writerConfig => {
			writerConfig.target_dir = this.exporter_config.target_dir;
			writerList.push(this.createWriter(writerConfig));
		});

		if (!writerList || writerList.length === 0) {
			const err = {
				"message": `No writer defined`,
				"object": config
			};
			this.dispatcher.error(err);
			throw new Error(err);
		}

		return writerList;
	}


	/**
	 * Creates the custom writer and initilize them
	 * @param config (object) The writer configuration
	 * @return writer (object) The created and initialized writer
	 */
	createWriter(config) {
		if (!config.type) {
			const err = {
				"message": `No exporter type given`,
				"object": config
			};
			this.dispatcher.error(err);
			throw new Error(err);
		}

		// check that the given exporter exists
		if (!this.exporter_config.exporter_writer[config.type]) {
			const err = {
				"message": `The exporter '${config.type} does not exists'`,
				"object": config
			};
			this.dispatcher.error(err);
			throw new Error(err);
		}

		// take the write factory and creates a writer instance
		const exporterFactory = this.exporter_config.exporter_writer[config.type];
		return exporterFactory(this, config);
	}



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
		self.exporter_config.data_generator.startDataContext();

		const sourceObjects = [];
		sources.forEach(sourceName => {
			if (!self.exporter_config.registry[sourceName]) {
				const err = {
					"message": `The source vertex '${sourceName}' does not exists`,
					"config": config
				};
				self.dispatcher.error(err);
				throw new Error(err);
			} else {
				sourceObjects.push(self.exporter_config.registry[sourceName]);
			}
		});

		return function* () {
			// the first source object is the master to get the object keys
			const keys = Object.keys(sourceObjects[0].objects);
			for (let i = 0; i < keys.length; i++) {
				// reset the row context
				self.exporter_config.data_generator.startContext();

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
					const val = self.exporter_config.data_generator.createData(fieldConfig);

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
	return new TdgExporterDefault(options);
};

module.exports.TdgExporterDefault = TdgExporterDefault;
