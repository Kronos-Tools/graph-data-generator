/* jslint node: true, esnext: true */
"use strict";

// ------------------------------------------------
// -- tdg
// ------------------------------------------------
const TdgExecuterData = require('./tdg/tdg-executer-data').executerData;
const TdgExecuter = require('./tdg/tdg-executer').executer;
const TdgModel = require('./tdg/tdg-model').model;
const TdgWriter = require('./tdg/tdg-writer').writer;

module.exports.TdgExecuterData = TdgExecuterData;
module.exports.TdgExecuter = TdgExecuter;
module.exports.TdgModel = TdgModel;
module.exports.TdgWriter = TdgWriter;

const tdgExecuterDataFactory = require('./tdg/tdg-executer-data').factory;
const tdgExecuterFactory = require('./tdg/tdg-executer').factory;
const tdgModelFactory = require('./tdg/tdg-model').factory;
const tdgWriterFactory = require('./tdg/tdg-writer').factory;

module.exports.tdgExecuterDataFactory = tdgExecuterDataFactory;
module.exports.tdgExecuterFactory = tdgExecuterFactory;
module.exports.tdgModelFactory = tdgModelFactory;
module.exports.tdgWriterFactory = tdgWriterFactory;

// ------------------------------------------------
// -- generator
// ------------------------------------------------
const TdgDataGeneratorDispatcher = require('./generator/tdg-data-generator-dispatcher').dataGeneratorDispatcher;
const tdgDataGeneratorDispatcherFactory = require('./generator/tdg-data-generator-dispatcher').factory;

const TdgDataGeneratorEntitlement = require('./generator/tdg-data-generator-entitlement').dataGeneratorEntitlement;
const tdgDataGeneratorEntitlementFactory = require('./generator/tdg-data-generator-entitlement').factory;

const TdgDataGeneratorFaker = require('./generator/tdg-data-generator-faker').tdgDataGeneratorFaker;
const tdgDataGeneratorFakerFactory = require('./generator/tdg-data-generator-faker').factory;

const TdgDataGeneratorRegex = require('./generator/tdg-data-generator-regex').tdgDataGeneratorRegex;
const tdgDataGeneratorRegexFactory = require('./generator/tdg-data-generator-regex').factory;

const TdgDataGeneratorTdg = require('./generator/tdg-data-generator-tdg').tdgDataGeneratorTdg;
const tdgDataGeneratorTdgFactory = require('./generator/tdg-data-generator-tdg').factory;

module.exports.TdgDataGeneratorDispatcher = TdgDataGeneratorDispatcher;
module.exports.tdgDataGeneratorDispatcherFactory = tdgDataGeneratorDispatcherFactory;

module.exports.TdgDataGeneratorEntitlement = TdgDataGeneratorEntitlement;
module.exports.tdgDataGeneratorEntitlementFactory = tdgDataGeneratorEntitlementFactory;

module.exports.TdgDataGeneratorFaker = TdgDataGeneratorFaker;
module.exports.tdgDataGeneratorFakerFactory = tdgDataGeneratorFakerFactory;

module.exports.TdgDataGeneratorRegex = TdgDataGeneratorRegex;
module.exports.tdgDataGeneratorRegexFactory = tdgDataGeneratorRegexFactory;

module.exports.TdgDataGeneratorTdg = TdgDataGeneratorTdg;
module.exports.tdgDataGeneratorTdgFactory = tdgDataGeneratorTdgFactory;

// ------------------------------------------------
// -- exporter dispatcher
// ------------------------------------------------
const TdgExporterDispatcher = require('./exporter/tdg-exporter-dispatcher').tdgExporterDispatcher;
const tdgExporterDispatcherFactory = require('./exporter/tdg-exporter-dispatcher').factory;

module.exports.TdgExporterDispatcher = TdgExporterDispatcher;
module.exports.tdgExporterDispatcherFactory = tdgExporterDispatcherFactory;

// ------------------------------------------------
// -- exporter
// ------------------------------------------------
const TdgExporterDefault = require('./exporter/tdg-exporter-default').tdgExporterDefault;
const tdgExporterDefaultFactory = require('./exporter/tdg-exporter-default').factory;

module.exports.TdgExporterDefault = TdgExporterDefault;
module.exports.tdgExporterDefaultFactory = tdgExporterDefaultFactory;

// ------------------------------------------------
// -- exporter Writer
// ------------------------------------------------
const TdgExporterWriterCsv = require('./exporter/tdg-exporter-writer-csv').tdgExporterWriterCsv;
const tdgExporterWriterCsvFactory = require('./exporter/tdg-exporter-writer-csv').factory;

module.exports.TdgExporterWriterCsv = TdgExporterWriterCsv;
module.exports.tdgExporterWriterCsvFactory = tdgExporterWriterCsvFactory;
