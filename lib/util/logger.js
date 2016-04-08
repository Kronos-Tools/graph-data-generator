/* jslint node: true, esnext: true */
"use strict";


const llm = require('loglevel-mixin');
class _Logger {}
llm.defineLoggerMethods(_Logger.prototype, llm.defaultLogLevels);


function getTime() {
	function fill(val) {
		if (val < 10) {
			return "0" + val;
		}
		return val;
	}
	const date = new Date(Date.now());
	const dateStr = `${date.getFullYear()}-${fill(date.getMonth() + 1)}-${fill(date.getDate())}`;
	const timeStr = `${fill(date.getHours())}:${fill(date.getMinutes())}:${fill(date.getSeconds())}`;
	return dateStr + " " + timeStr;
}

class Logger extends llm.LogLevelMixin(_Logger, llm.defaultLogLevels, llm.defaultLogLevels.debug) {

	log(level, arg) {
		this._validationErrorCount++;
		console.log(`${getTime()} ${level.toUpperCase()}: ${JSON.stringify(arg, null, 2)}`);
	}


}

module.exports = Logger;
