/* jslint node: true, esnext: true */
"use strict";

const fs = require('fs');
const path = require("path");
const Readable = require('stream').Readable;


/**
 * This class is used to break the data json in small pieces
 * to write it as a stream
 */
class MyReader extends Readable {

	/*
	 * @param data (object) The data to be written
	 */
	constructor(data) {
		super();
		this.data = data;
	}

	* dataprovider() {
		const obj = this.data;

		if (obj.objects) {
			const newObj = {};
			Object.keys(obj).forEach(key => {
				if (key !== 'objects') {
					newObj[key] = obj[key];
				}
			});

			let objString = JSON.stringify(newObj, null, 2);
			objString = objString.replace(/\}$/, ',"objects": {');
			yield objString;

			let first = true;
			const keys = Object.keys(obj.objects);
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				const str = `"${key}" :` + JSON.stringify(obj.objects[key], null, 2);
				if (!first) {
					yield ',' + str;
				} else {
					first = false;
					yield str;
				}
			}
			yield '}}';
			return;
		} else {
			yield JSON.stringify(obj, null, 2);
			return;
		}

	}

	_read() {
		if (!this.it) {
			// create the iterator
			this.it = this.dataprovider();
		}
		const val = this.it.next();
		if (val.done) {
			this.push(null);
		} else {
			this.push(val.value);
		}
	}
}

class TdgWriter {

	constructor(opts) {
		if (!opts) {
			opts = {};
		}
		this.targetDir = opts.target_dir ? opts.target_dir : '.';
	}

	writeVertex(vertex) {
		return this.writeObject('Vertex', vertex);
	}

	writeEdge(edge) {
		return this.writeObject('Edge', edge);
	}

	writeObject(type, object) {
		const fileName = path.join(this.targetDir, `${type}_${object.name}.json`);
		const stream = fs.createWriteStream(fileName, {
			flags: 'w',
			defaultEncoding: 'utf8',
			autoClose: true
		});
		this.writeObjectStream(object, stream);
		// return fs.writeFileSync(fileName, JSON.stringify(object, null, 2));
	}

	/**
	 * Writes an object to the given writeableSstream
	 * @param obj (obj) The object to write
	 * @param writeableStream (obj) A writeableStream used to write the data
	 */
	writeObjectStream(obj, writeableStream) {
		return new Promise((resolve, reject) => {
			const myReader = new MyReader(obj);
			myReader.pipe(writeableStream);
			writeableStream.on('close', () => {
				resolve();
			});
			writeableStream.on('error', (err) => {
				reject(err);
			});
		});
	}

	// writeObjectStream(obj, stream) {
	// 	if (obj.objects) {
	// 		const newObj = {};
	// 		Object.keys(obj).forEach(key => {
	// 			if (key !== 'objects') {
	// 				newObj[key] = obj[key];
	// 			}
	// 		});
	//
	// 		let objString = JSON.stringify(newObj, null, 2);
	// 		objString = objString.replace(/\}$/, ',"objects": {');
	// 		stream.write(objString);
	//
	// 		let first = true;
	// 		Object.keys(obj.objects).forEach(key => {
	//
	// 			if (!first) {
	// 				stream.write(',');
	// 			} else {
	// 				first = false;
	// 			}
	// 			const str = `"${key}" :` + JSON.stringify(obj.objects[key], null, 2);
	// 			stream.write(str);
	// 		});
	//
	// 		const objStringEnd = '}}';
	// 		stream.write(objStringEnd);
	// 		stream.end();
	// 		//stream.close();
	// 	} else {
	// 		stream.write(JSON.stringify(obj, null, 2));
	// 		stream.end();
	// 		//stream.close();
	// 	}
	// }

}

module.exports.factory = function (options) {
	return new TdgWriter(options);
};
module.exports.executer = TdgWriter;
