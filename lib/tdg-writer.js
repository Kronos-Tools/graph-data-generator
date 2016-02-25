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
		// const stream = fs.createWriteStream(fileName, {
		// 	flags: 'w',
		// 	defaultEncoding: 'utf8',
		// 	autoClose: true
		// });
		// this.writeObjectStream(object, stream);
		fs.writeFileSync(fileName, JSON.stringify(object, null, 2));
	}

	writeObjectStream(obj, stream) {
		if (obj.objects) {
			const newObj = {};
			Object.keys(obj).forEach(key => {
				if (key !== 'objects') {
					newObj[key] = obj[key];
				}
			});

			let objString = JSON.stringify(newObj, null, 2);
			objString = objString.replace(/\}$/, ',"objects": {');
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
			stream.write(objStringEnd);
			stream.end();
			//stream.close();
		} else {
			stream.write(JSON.stringify(obj, null, 2));
			stream.end();
			//stream.close();
		}
	}

}

module.exports.factory = function (options) {
	return new TdgWriter(options);
};
module.exports.executer = TdgWriter;
