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

	writeVertex(vertex) {
		this.writeObject('Vertex', vertex);
	}

	writeEdge(edge) {
		this.writeObject('Edge', edge);
	}

	writeObject(type, object) {
		const fileName = path.join(this.targetDir, `${type}_${object.name}.json`);
		fs.writeFileSync(fileName, JSON.stringify(object, null, 2));
	}

	writeObjectStream(obj, stream) {
		const newObj = {};
		Object.keys(obj).forEach(key => {
			if (key !== 'objects') {
				newObj[key] = obj[key];
			}
		});

		if (obj.objects) {
			let objString = JSON.stringify(newObj, null, 2);
			objString = objString.replace(/}$/, ',"objects": {');
			stream.write(objString);

			let first = true;
			Object.keys(obj.objects).forEach(key => {

				if (!first) {
					stream.write(',');
				} else {
					first = false;
				}
				const str = `"${key}" :` + JSON.stringify(obj.objects[key], null, 2);
				stream.write(str);
			});

			const objStringEnd = '}}';
			stream.write(objString);
			stream.end();
		} else {
			stream.write(JSON.stringify(obj, null, 2));
			stream.end();
		}
	}

}

module.exports.factory = function (options) {
	return new TdgWriter(options);
};
module.exports.executer = TdgWriter;
