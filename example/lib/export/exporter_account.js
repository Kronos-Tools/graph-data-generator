/* jslint node: true, esnext: true */

"use strict";

// in real life use this require
// const gdg = require('graph-data-generator').tdg;
const gdg = require('../../../lib/exports');


class ExporterAccount extends gdg.ExporterDefault {

	/**
	 * Iterates the iterations and the sources
	 */
	_run() {
		const self = this;
		const interationCount = this.model.time_shift.iterations;
		// const config = this.config;
		const vertices = this.model.registry.vertices;
		const applicationVertex = vertices.application;



		// ------------------------------------------------
		// First iterate the applications, then the time
		// ------------------------------------------------
		Object.keys(applicationVertex.key_data).forEach((appKey) => {
			let appStatus;


			// ------------------------------------------------
			// Store definition
			// ------------------------------------------------
			self.store.acc = {};
			self.store.acc.active = {};
			self.store.acc.removed = {};

			// stores the owner information for an active account
			self.store.owner = {};

			// stores the entitlement information for an active account
			self.store.entitlement = {};


			self.store.current_app_key = appKey;

			self.logger.debug(`Export application id='${appKey}'`);

			// ------------------------------------------------
			// Iterate the time
			// ------------------------------------------------
			for (let currentIteration = 0; currentIteration < interationCount; currentIteration++) {
				self.logger.debug(`Export application id='${appKey}' in iteration=${currentIteration}`);

				const addedApps = applicationVertex.time_shift_store.iter[currentIteration].a;
				if (addedApps && addedApps.indexOf(appKey)) {
					// if an application was added the status will be set to active. This status remains
					// until the application will be removed
					appStatus = true;
				}

				const removedApps = applicationVertex.time_shift_store.iter[currentIteration].r;
				if (removedApps && removedApps.indexOf(appKey)) {
					// if an application will be removed the status will be set to true
					appStatus = false;
				}


				if (appStatus) {
					// if the application status is active. Write the file!
					self._exportAccounts(appKey, currentIteration);
				}
			}

		});


	}

	_exportAccounts(appKey, currentIteration) {
		const self = this;
		self.logger.debug(`Export accounts for application id='${appKey}'`);

		// update the accounts of this application for this iterations
		this._addRemoveAccountForApplication(appKey, currentIteration);
		this._addRemoveIdentityForActiveAccounts(currentIteration);
		this._addRemoveEntitlementForActiveAccounts(currentIteration);


		// --------------------------
		// init the writer
		// --------------------------

		// are there active accounts for this appliction?
		if (this.store.acc.active && Object.keys(this.store.acc.active).length > 0) {
			self.logger.debug(`Export accounts for application id='${appKey}' Init the writer`);

			const exporterWriterConfigs = this.config.exporter_writer;
			exporterWriterConfigs.forEach((writerConfig) => {
				let writerConfigNew = {};
				writerConfigNew = Object.assign(writerConfigNew, writerConfig);
				writerConfigNew.target_dir = self._getTargetDir(currentIteration, self.config);
				writerConfigNew.file_name = self._createFileName(appKey, currentIteration);
				writerConfigNew.logger = self.logger;

				const writerFactory = self.model.exporter_writer_factory[writerConfigNew.type];
				const writer = writerFactory(writerConfigNew);

				writer.open();
				self._writeRows(currentIteration, writer, writerConfigNew);
				writer.close();
			});
		} else {
			self.logger.debug(`No active accoiunts for application id='${appKey}' Nothing will be written`);
		}


	}

	/**
	 * Write one account to the file
	 *
	 */
	_writeRows(currentIteration, writer, writerConfigNew) {
		const self = this;
		// now export the data

		const entitlement = this.model.registry.vertices.entitlement.key_data;
		const appKey = this.store.current_app_key;

		Object.keys(this.store.acc.active).forEach((accKey) => {
			const row = self.store.acc.active[accKey];

			// add the identity fields to the account
			Object.assign(row, self.store.owner[accKey]);

			const entitlementIds = this.store.entitlement[accKey];
			if (entitlementIds) {
				const entStrings = [];
				entitlementIds.forEach((id) => {
					entStrings.push(entitlement[id].name);
				});

				row.entitlement = entStrings.join('|');
			} else {
				self.logger.warn(`No entitlements for account '${accKey}' in application id='${appKey}'`);
			}
			writer.write(row);

		});
	}

	/**
	 * Creates a file name
	 */
	_createFileName(appKey, currentIteration) {
		const appId = this.model.registry.vertices.application.key_data[appKey].app_id;
		const fileName = `${appId}_${this._pad(currentIteration, 8)}.csv`;
		return fileName;
	}

	/**
	 * fill a number with a padding char
	 * @param number (number) The number to be padded
	 * @param width (number) The width of the new string
	 */
	_pad(number, width, z) {
		z = z || '0';
		number = number + '';
		return number.length >= width ? number : new Array(width - number.length + 1).join(z) + number;
	}


	/**
	 * Adds or removes accounts from the internal store.
	 * this.store.acc.active  = {}
	 *           .acc.removed = {}
	 * @param appKey (number) The internal id of this application_has_account
	 * @param currentIteration (number) The number of the current iteration
	 */
	_addRemoveAccountForApplication(appKey, currentIteration) {
		this.logger.debug(`Export accounts for application id='${appKey}' _addRemoveAccountForApplication`);

		const self = this;
		const edgeStore = self.model.registry.edges.application_has_account.time_shift_store;
		const appHasAccountAdd = edgeStore.iter[currentIteration].a;
		const appHasAccountRemove = edgeStore.iter[currentIteration].r;

		// ------------------------------
		// add the accounts
		// ------------------------------
		if (appHasAccountAdd && appHasAccountAdd[appKey]) {
			appHasAccountAdd[appKey].forEach((accKey) => {
				if (self.store.acc.removed[accKey]) {
					// the account exists before. Takes these values
					self.store.acc.active[accKey] = self.store.acc.removed[accKey];
					delete(self.store.acc.removed[accKey]);
				} else {
					self.store.acc.active[accKey] = self._createAccountData(appKey, accKey, currentIteration);
				}
			});
		}

		// ------------------------------
		// remove the accounts
		// ------------------------------
		if (appHasAccountRemove && appHasAccountRemove[appKey]) {
			appHasAccountRemove[appKey].forEach((accKey) => {
				self.store.acc.removed[accKey] = self.store.acc.active[accKey];
				delete(self.store.acc.active[accKey]);
			});
		}
	}

	/**
	 * Adds or removes accounts from the internal store.
	 * this.store.owner = {}
	 * @param appKey (number) The internal id of this application_has_account
	 * @param currentIteration (number) The number of the current iteration
	 */
	_addRemoveIdentityForActiveAccounts(currentIteration) {
		this.logger.debug(`Export accounts for application _addRemoveIdentityForActiveAccounts`);

		const self = this;
		const ownerAdd = self.model.registry.edges.account_identity.time_shift_store.iter[currentIteration].a;
		const ownerRemove = self.model.registry.edges.account_identity.time_shift_store.iter[currentIteration].r;
		const identity = self.model.registry.vertices.identity.key_data;

		// ------------------------------
		// add the owner
		// ------------------------------
		if (ownerAdd) {
			Object.keys(ownerAdd).forEach((accKey) => {
				const ownerKey = ownerAdd[accKey][0];
				if (self.store.acc.active[accKey]) {
					// the account is active, so we store the owner
					self.store.owner[accKey] = identity[ownerKey];
				}
			});
		}

		// ------------------------------
		// remove the owner
		// ------------------------------
		if (ownerRemove) {
			Object.keys(ownerRemove).forEach((accKey) => {
				if (self.store.owner[accKey]) {
					delete(self.store.owner[accKey]);
				}
			});
		}
	}

	/**
	 * Adds or removes accounts from the internal store.
	 * this.store.entitlement  = {}
	 * @param appKey (number) The internal id of this application_has_account
	 * @param currentIteration (number) The number of the current iteration
	 */
	_addRemoveEntitlementForActiveAccounts(currentIteration) {
		this.logger.debug(`Export accounts for application _addRemoveEntitlementForActiveAccounts`);

		const self = this;
		const entAdd = self.model.registry.edges.account_has_entitlement.time_shift_store.iter[currentIteration].a;
		const entRemove = self.model.registry.edges.account_has_entitlement.time_shift_store.iter[currentIteration].r;

		// ------------------------------
		// add the owner
		// ------------------------------
		if (entAdd) {
			Object.keys(entAdd).forEach((accKey) => {
				if (self.store.acc.active[accKey]) {
					// array of entitlement ids
					const idsToAdd = entAdd[accKey];
					if (self.store.entitlement[accKey]) {
						idsToAdd.forEach((id) => {
							self.store.entitlement[accKey].push(id);
						});
					} else {
						self.store.entitlement[accKey] = idsToAdd;
					}
				}
			});
		}

		// ------------------------------
		// remove the owner
		// ------------------------------
		if (entRemove) {
			Object.keys(entRemove).forEach((accKey) => {
				if (self.store.entitlement[accKey]) {
					// array of entitlement ids
					const idsToRemove = new Set();
					entRemove[accKey].forEach((id) => {
						idsToRemove.add(id);
					});

					const newIds = [];
					const currentIds = self.store.entitlement[accKey];
					currentIds.forEach((id) => {
						if (!idsToRemove.has(id)) {
							newIds.push(id);
						}
					});

					if (newIds.length > 0) {
						self.store.entitlement[accKey] = newIds;
					} else {
						delete(self.store.entitlement[accKey]);
					}

				}
			});
		}
	}

	/**
	 * For new accounts the data has to be created
	 * @param appKey (number) The internal id of this application
	 * @param accKey (number) The internal id of this account
	 * @param currentIteration (number) The number of the current iteration
	 * @return data (object) The created account data
	 */
	_createAccountData(appKey, accKey, currentIteration) {
		const data = this._createAccountColumnData();

		// adds the key data to the existing data
		this._createAccountKeyData(data, appKey, accKey);

		return data;
	}

	/**
	 * Creeate the account column data. This is the data without external
	 * references.
	 */
	_createAccountColumnData() {
		const self = this;
		const record = {};
		Object.keys(this.config.data.columns).forEach((colName) => {
			const colConfig = self.config.data.columns[colName];
			const val = self.model.data_generator.createData(colConfig);
			record[colName] = val;
		});
		return record;
	}

	/**
	 * Creates the account key data and stores it in the given data object
	 * @param data (object) The data object to be updated with the key data
	 * @param appKey (number) The internal id of this application
	 * @param accKey (number) The internal id of this account
	 */
	_createAccountKeyData(data, appKey, accKey) {
		const appHasAccount = this.model.registry.edges.application_has_account.objects;

		// vertices
		const application = this.model.registry.vertices.application.key_data;
		const account = this.model.registry.vertices.account.key_data;


		// get the application key data
		data.app = application[appKey].app_id;
		data.account = account[accKey].account_id;
	}



}

module.exports.exporterAccountFactory = function (options) {
	return new ExporterAccount(options);
};
module.exports.ExporterAccount = ExporterAccount;
