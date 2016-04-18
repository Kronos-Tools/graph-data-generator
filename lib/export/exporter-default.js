/* jslint node: true, esnext: true */
"use strict";

const mkdirp = require('mkdirp');
const path = require("path");

class ExporterDefault {

	/**
	 * Exports the data using the defined exporter
	 * @param model (object) The model
	 * @param logger (object) The logger object
	 * @param targetDir (string) The target directory
	 * @param config (object) The configuration of this element
	 */
	run(model, logger, targetDir, config) {
		const self = this;

		this.model = model;
		this.logger = logger;
		this.config = config;
		this.target_dir = targetDir;

		// store the current created objects
		this.store = {};

		this._run();
		this._reset();
	}

	/**
	 * Cleans up all the used memory
	 */
	_reset() {
		this.model = undefined;
		this.logger = undefined;
		this.config = undefined;
		this.target_dir = undefined;
		this.store = undefined;
	}

	/**
	 * Iterates the iterations and the sources
	 */
	_run() {
		const interationCount = this.model.time_shift.iterations;
		const config = this.config;
		const vertices = this.model.registry.vertices;

		for (let i = 0; i < interationCount; i++) {
			if (i === 0) {
				// Start
				this._createSourceData(i);
				this._createColumnData(i);
			} else {
				// normal
				this._createSourceData(i);
				this._createColumnData(i);
				this._removeColumnData(i);

				this._changeColumnData(i);
			}
			this._exportCurrentIteration(i);
		}
	}


	/**
	 * Exports the complete data of the current iteration
	 * @param currentIteration (number) The current iteration number
	 */
	_exportCurrentIteration(currentIteration) {
		const self = this;
		const exporterWriterConfigs = this.config.exporter_writer;

		exporterWriterConfigs.forEach((writerConfig) => {
			let writerConfigNew = {};
			writerConfigNew = Object.assign(writerConfigNew, writerConfig);
			writerConfigNew.target_dir = self._getTargetDir(currentIteration, self.config);
			writerConfigNew.file_name = self._getTargetFileName(currentIteration, writerConfig);
			writerConfigNew.logger = self.logger;

			const writerFactory = self.model.exporter_writer_factory[writerConfigNew.type];
			const writer = writerFactory(writerConfigNew);
			writer.open();

			self._writeRows(currentIteration, writer, writerConfigNew);

			writer.close();
		});
	}

	_writeRows(currentIteration, writer, writerConfig) {
		const self = this;

		Object.keys(self.store).forEach((id) => {
			writer.write(self.store[id]);
		});
	}

	/**
	 * Returns the file name
	 * @param currentIteration (number) The current iteration number
	 * @param config (object) The configuration of this element
	 */
	_getTargetFileName(currentIteration, config) {
		return config.file_name;
	}

	/**
	 * Create a target directory depeding on the current iteration
	 * @param currentIteration (number) The current iteration number
	 * @param config (object) The configuration of this element
	 */
	_getTargetDir(currentIteration, config) {
		const newTargetDir = path.join(this.target_dir, `_day_${currentIteration}`);
		mkdirp.sync(newTargetDir);
		return newTargetDir;
	}

	/**
	 * gets the key data from all the sources
	 * @param currentIteration (number) The current iteration number
	 */
	_createSourceData(currentIteration) {
		const sources = this.config.data.sources;
		const self = this;
		const vertices = this.model.registry.vertices;

		sources.forEach((sourceName) => {
			const vertex = vertices[sourceName];
			const ids = vertex.time_shift_store.iter[currentIteration].a;

			if (ids) {
				ids.forEach((id) => {
					if (!self.store[id]) {
						self.store[id] = {};
					}
					Object.keys(vertex.key_data[id]).forEach((keyName) => {
						self.store[id][keyName] = vertex.key_data[id][keyName];
					});
				});
			}
		});
	}

	/**
	 * Changes the column data as defined in the exporter
	 * @param currentIteration (number) The current iteration number
	 * @param vertex (object) The vertex to get the IDs from. For each ID the column data will be created
	 */
	_changeColumnData(currentIteration, vertex) {
		const self = this;
		const config = this.config;

		const ids = Object.keys(self.store);

		if (config.data.tdg && config.data.tdg.change_per_iteration) {

			// get the amaount of changes in this iteration
			let changeCount = config.data.tdg.change_per_iteration;
			if (typeof changeCount === 'string') {
				// it is a percentage
				if (changeCount.endsWith("%")) {
					changeCount = changeCount.replace("%", "");
				}
				changeCount = Math.floor(ids.length * changeCount / 100);
			}

			// get all the IDs which should be changed in this iteration
			const changeSet = new Set();
			let maxNotChanged = 30;
			while (changeSet.size < changeCount && maxNotChanged > 0) {
				const idx = Math.floor(Math.random() * ids.length);
				if (changeSet.has(ids[idx])) {
					maxNotChanged--;
				} else {
					changeSet.add(ids[idx]);
				}
			}

			// iterate over the IDs which should be changed
			changeSet.forEach((id) => {
				const colIds = Object.keys(config.data.columns);
				// get the amount of columns to be changed
				let colChangeCount = Math.floor(Math.random() * colIds.length);

				const columnChangeSet = new Set();
				let maxNotChanged = 5;
				// get the columns which should be changed
				while (columnChangeSet.size < colChangeCount && maxNotChanged > 0) {
					const idx = Math.floor(Math.random() * colIds.length);

					if (columnChangeSet.has(colIds[idx])) {
						maxNotChanged--;
					} else {
						columnChangeSet.add(colIds[idx]);
					}
				}
				// now compute these columns with a new values
				columnChangeSet.forEach((colName) => {
					const colConfig = config.data.columns[colName];
					const val = self.model.data_generator.createData(colConfig);
					self.store[id][colName] = val;
				});

			});
		}
	}

	/**
	 * Creates the data from the confguration. The data will be generated for each ID of the first source
	 * @param currentIteration (number) The current iteration number
	 * @param vertex (object) The vertex to get the IDs from. For each ID the column data will be created
	 */
	_createColumnData(currentIteration, vertex) {
		const self = this;
		const config = this.config;

		if (!vertex) {
			const sources = config.data.sources;
			const vertices = this.model.registry.vertices;
			const sourceName = sources[0];
			vertex = vertices[sourceName];
		}

		const ids = vertex.time_shift_store.iter[currentIteration].a;

		if (ids) {
			ids.forEach((id) => {

				// only generate the data if it was not done yet
				if (!self.store[id]) {
					self.store[id] = {};
				}
				Object.keys(config.data.columns).forEach((colName) => {
					const colConfig = config.data.columns[colName];
					const val = self.model.data_generator.createData(colConfig);
					self.store[id][colName] = val;
				});

			});
		}
	}

	/**
	 * Removes IDs for the current iteration.
	 * @param currentIteration (number) The current iteration number
	 */
	_removeColumnData(currentIteration) {
		const sources = this.config.data.sources;
		const self = this;
		const vertices = this.model.registry.vertices;
		const sourceName = sources[0];
		const vertex = vertices[sourceName];

		if (currentIteration !== 0) {
			const ids = vertex.time_shift_store.iter[currentIteration].r;
			if (ids) {
				ids.forEach((id) => {
					delete(self.store[id]);
				});
			}
		}
	}
}

module.exports.exporterDefaultFactory = function (options) {
	return new ExporterDefault(options);
};
module.exports.ExporterDefault = ExporterDefault;
