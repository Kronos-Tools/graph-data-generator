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
	 * @param targetDir (object) The target directory to write the files to
	 */
	run(model, logger, targetDir) {
		Object.keys(model.export_config).forEach((objectName) => {
			const config = model.export_config[objectName];
			const exporterName = config.exporter;
			const exporter = model.exporter[exporterName];

			logger.info(`Export element='${objectName}'`);
			exporter.run(model, logger, targetDir, config);
		});
	}

}

module.exports.exporterDispatcherFactory = function (options) {
	return new ExporterDispatcher(options);
};
module.exports.ExporterDispatcher = ExporterDispatcher;
