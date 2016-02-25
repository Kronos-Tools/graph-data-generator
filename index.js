/* jslint node: true, esnext: true */
"use strict";

const TdgModel = require('./lib/tdg-model').factory;
const TdgExecuter = require('./lib/tdg-executer').factory;
const TdgExecuterData = require('./lib/tdg-executer-data').factory;
const TdgWriter = require('./lib/tdg-writer').factory;

module.exports.TdgModel = TdgModel;
module.exports.TdgExecuter = TdgExecuter;
module.exports.TdgExecuterData = TdgExecuterData;
module.exports.TdgWriter = TdgWriter;
