/* jslint node: true, esnext: true */
"use strict";



class ExporterDefault {

	/**
	 * Exports the data using the defined exporter
	 * @param model (object) The model
	 * @param logger (object) The logger object
	 * @param config (object) The configuration of this element
	 * @param writer (array) An array of writer
	 */
	run(model, logger, config, writer) {
		const interationCount = model.time_shift.iterations;

		this.config = config;
		this.writer = writer;


		for (let i = 0; i < interationCount; i++) {

		}
	}

	/**
	 * Exports one entity of the export definition model
	 * @param config (object) The config for this identity
	 */
	_exportEntity(model, logger, currentIteration) {
		const self = this;

		// -------------------------------------
		// create the data generator function
		// -------------------------------------
		logger.debug(`Prepare generator`);
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


}

module.exports.exporterDefaultFactory = function (options) {
	return new ExporterDefault(options);
};
module.exports.ExporterDefault = ExporterDefault;
