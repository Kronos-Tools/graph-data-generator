/* jslint node: true, esnext: true */
"use strict";

const fs = require('fs');
const path = require("path");


class TdgWriter {

	constructor(opts) {
		if (!opts) {
			opts = {};
		}

		this.targetDir = opts.targetDir ? opts.targetDir : '.';
	}

	writeEdge(edge) {
		this.writeObject('Edge', edge);
	}

	writeObject(type, object) {
		const fileName = path.join(this.targetDir, `${type}_${object.name}.json`);
		fs.writeFileSync(fileName, JSON.stringify(object, null, 2));
	}

}

module.exports.factory = function (options) {
	return new TdgWriter(options);
};
module.exports.executer = TdgWriter;
