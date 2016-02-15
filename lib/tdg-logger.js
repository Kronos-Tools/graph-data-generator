/* jslint node: true, esnext: true */
"use strict";

let errorCount = 0;

const Logger = {
	error(message, indent) {
			errorCount++;
			this.logMessage('ERROR', message, indent);
		},
		info(message, indent) {
			this.logMessage('INFO', message, indent);
		},
		debug(message, indent) {
			this.logMessage('DEBUG', message, indent);
		},
		warning(message, indent) {
			this.logMessage('WARNING', message, indent);
		},
		reset() {
			errorCount = 0;
		},
		hasErrors() {
			return errorCount;
		},

		logMessage(type, message, indent) {
			if (!indent) {
				indent = 0;
			}

			let indentString = "";
			for (let i = 0; i < indent; i++) {
				indentString = indentString + "  ";
			}
			if (typeof message === 'object') {
				message = "\n" + JSON.stringify(message, null, 2);
			}

			console.log(`${indentString}${type}: ${message}`);
		}
};


module.exports = Logger;
