/* jslint node: true, esnext: true */
"use strict";


/**
 * The dispatcher calls for each export entry the appropriate exporter
 *
 */

class ExporterDispatcher {

	/**
	 * Exports the data using the defined exporter
	 * @param model (object) The model
	 * @param logger (object) The logger object
	 */
	run(model, logger) {
		Object.keys(model.export_config).forEach((objectName) => {
			const config = model.export_config[objectName];
			const exporterName = config.exporter;
			const writerNames = config.exporter_writer;

			const exporter = model.exporter[exporterName];
			const writer = [];
			writerNames.forEach((name) => {
				writer.push(model.exporter_writer[name]);
			});

			logger.info(`Export element='${objectName}'`);
			exporter.run(model, logger, config, writer);
		});
	}

}

module.exports.exporterDispatcherFactory = function (options) {
	return new ExporterDispatcher(options);
};
module.exports.ExporterDispatcher = ExporterDispatcher;
