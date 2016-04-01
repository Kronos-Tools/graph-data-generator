/* jslint node: true, esnext: true */

"use strict";

const tdg = require('graph-data-generator').tdg;

class ExporterAccount extends tdg.TdgExporterDefault {

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
		let writerList;


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
				if (row.__NEW_FILE__) {
					// close the old writer
					if (writerList) {
						writerList.forEach(writer => {
							writer.close();
						});
					}

					const fileName = row.file_name;
					const app = row.app;

					// prepare the writer for the next file
					config.file_name = fileName;
					writerList = self._prepareWriter(config);
				} else {
					writerList.forEach(writer => {
						writer.write(row);
					});
				}

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
			writerConfig.file_name = config.file_name;
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
			// edges
			const appHasAccount = self.exporter_config.registry.application_has_account.objects;
			const accountHasEntitlement = self.exporter_config.registry.account_has_entitlement.objects;
			const accountHasIdentity = self.exporter_config.registry.account_identity.objects;

			// vertices
			const entitlement = self.exporter_config.registry.entitlement.objects;
			const application = self.exporter_config.registry.application.objects;
			const account = self.exporter_config.registry.account.objects;
			const identity = self.exporter_config.registry.identity.objects;

			// ----------------------------
			// iterate the applications
			// ----------------------------
			const applicationKeys = Object.keys(appHasAccount);
			for (let i = 0; i < applicationKeys.length; i++) {
				const __applicationId = applicationKeys[i];
				const appId = application[__applicationId].app_id;

				// first return a command to create a new file
				const row = {
					"__NEW_FILE__": true,
					"app": appId,
					"file_name": `${appId}_20160315.csv`
				};
				yield row;

				// ----------------------------
				// now iterate the accounts
				// ----------------------------
				const __accountIdList = appHasAccount[__applicationId];
				for (let j = 0; j < __accountIdList.length; j++) {
					const __accountId = __accountIdList[j];
					const __identityId = accountHasIdentity[__accountId];

					// build the entitlement string
					const ents = [];
					accountHasEntitlement[__accountId].forEach(__entId => {
						ents.push(entitlement[__entId].name);
					});

					const row = {
						"app": appId,
						"account": account[__accountId].account_id,
						"owner": identity[__identityId].mail,
						"owner_type": "mail",
						"first_name": identity[__identityId].fn,
						"last_name": identity[__identityId].ln,
						"full_name": `${identity[__identityId].fn} ${identity[__identityId].ln}`,
						"entitlements": ents.join('|')
					};


					// create the other column values with the generator
					Object.keys(columns).forEach(columName => {
						const fieldConfig = columns[columName];

						// now generate the data for the rest of the columns
						const val = self.exporter_config.data_generator.createData(fieldConfig);

						row[columName] = val;
					});
					yield row;
				}

			}
			return;
		};

	}
}

/**
 * Initializes the custom writer
 * @param exporter (object) The exporter object
 * @param config (object) The exporter configuration
 * @return writer (object) New created custom writer
 */
module.exports.factory = function (exporter, options) {
	return new ExporterAccount(exporter, options);
};

module.exports.ExporterAccount = ExporterAccount;
