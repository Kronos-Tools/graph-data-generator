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
		return this.writeObject('vertex', vertex);
	}

	writeEdge(edge) {
		return this.writeObject('edge', edge);
	}

	writeObject(type, object, fileName) {
		if (!fileName) {
			fileName = `${type}_${object.name}.json`;
		}
		const fqfn = path.join(this.targetDir, fileName);
		const stream = fs.createWriteStream(fqfn, {
			flags: 'w',
			defaultEncoding: 'utf8',
			autoClose: true
		});

		return this.writeObjectStream(object, stream);
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
				console.log("Writeable stream 'close'");
				resolve();
			});
			writeableStream.on('end', () => {
				console.log("Writeable stream 'end'");
				resolve();
			});
			writeableStream.on('error', (err) => {
				console.log("Writeable stream 'error'");
				reject(err);
			});
		});
	}
}

module.exports.factory = function (options) {
	return new TdgWriter(options);
};
module.exports.executer = TdgWriter;
