/* jslint node: true, esnext: true */
"use strict";


// Normaly you should only need this module
const main = require('./lib/main');
module.exports.main = main;

// ------------------------------------------------
// -- tdg
// ------------------------------------------------
const TdgExecuterData = require('./lib/tdg/tdg-executer-data').executerData;
const TdgExecuter = require('./lib/tdg/tdg-executer').executer;
const TdgModel = require('./lib/tdg/tdg-model').model;
const TdgWriter = require('./lib/tdg/tdg-writer').writer;

module.exports.TdgExecuterData = TdgExecuterData;
module.exports.TdgExecuter = TdgExecuter;
module.exports.TdgModel = TdgModel;
module.exports.TdgWriter = TdgWriter;

const tdgExecuterDataFactory = require('./lib/tdg/tdg-executer-data').factory;
const tdgExecuterFactory = require('./lib/tdg/tdg-executer').factory;
const tdgModelFactory = require('./lib/tdg/tdg-model').factory;
const tdgWriterFactory = require('./lib/tdg/tdg-writer').factory;

module.exports.tdgExecuterDataFactory = tdgExecuterDataFactory;
module.exports.tdgExecuterFactory = tdgExecuterFactory;
module.exports.tdgModelFactory = tdgModelFactory;
module.exports.tdgWriterFactory = tdgWriterFactory;

// ------------------------------------------------
// -- generator
// ------------------------------------------------
const TdgDataGeneratorDispatcher = require('./lib/generator/tdg-data-generator-dispatcher').dataGeneratorDispatcher;
const tdgDataGeneratorDispatcherFactory = require('./lib/generator/tdg-data-generator-dispatcher').factory;

const TdgDataGeneratorEntitlement = require('./lib/generator/tdg-data-generator-entitlement').dataGeneratorEntitlement;
const tdgDataGeneratorEntitlementFactory = require('./lib/generator/tdg-data-generator-entitlement').factory;

const TdgDataGeneratorFaker = require('./lib/generator/tdg-data-generator-faker').tdgDataGeneratorFaker;
const tdgDataGeneratorFakerFactory = require('./lib/generator/tdg-data-generator-faker').factory;

const TdgDataGeneratorRegex = require('./lib/generator/tdg-data-generator-regiex').tdgDataGeneratorRegex;
const tdgDataGeneratorRegexFactory = require('./lib/generator/tdg-data-generator-regex').factory;

const TdgDataGeneratorTdg = require('./lib/generator/tdg-data-generator-tdg').tdgDataGeneratorTdg;
const tdgDataGeneratorTdgFactory = require('./lib/generator/tdg-data-generator-tdg').factory;

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
// -- exporter
// ------------------------------------------------
const TdgExporterCsv = require('./lib/exporter/tdg-exporter-csv').tdgExporterCsv;
const tdgExporterCsvFactory = require('./lib/exporter/tdg-exporter-csv').factory;

const TdgExporter = require('./lib/exporter/tdg-exporter').tdgExporterCsv;
const tdgExporterFactory = require('./lib/exporter/tdg-exporter').factory;

module.exports.TdgExporterCsv = TdgExporterCsv;
module.exports.tdgExporterCsvFactory = tdgExporterCsvFactory;

module.exports.TdgExporter = TdgExporter;
module.exports.tdgExporterFactory = tdgExporterFactory;
