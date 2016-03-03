/* jslint node: true, esnext: true */
"use strict";

/**
 * generates random entitlement like strings
 */

const TEMPLATES = [
	["__action__ -> Resource __resource__ in __app__", ["action", "resource", "app"]],
	["Resource with __action__ permission", ["action"]],
	["Resource __some__ with __action__ permission", ["some", "action"]],
	["[__number__] : __app__ on __action__ limit", ["number", "app", "action"]],
	["__action__: __some__ on __app__", ["action", "some", "app"]],
	["__role__ in __app__", ["role", "app"]],
	["__action__ __resource__ with __role__", ["action", "resource", "role"]],
];

class TdgGeneratorEntitlement {
	constructor(opts) {
		this.templates = TEMPLATES;
	}

	/**
	 * Loads the base strings which will combined to the entitlement string
	 */
	loadData() {
		if (!this.data) {
			const fs = require('fs');
			const path = require("path");

			const fixturesDir = path.join(__dirname, '../tests/fixtures');
			const volatileDir = path.join(__dirname, '../tests/volatile');

			const structureContent = fs.readFileSync(path.join(__dirname, 'fixtures/entitlement_data.json'));
			const structureJson = JSON.parse(structureContent);

			this.data = structureJson;
		}
	}

	createEntitlement(maxLength) {
		this.loadData();

		const self = this;
		const template = this.getArrayElement(this.templates);
		let resStr = template[0];

		template[1].forEach(dataName => {
			let val;
			if (dataName === 'some') {
				val = self.getSome();
			} else if (dataName === 'number') {
				val = self.getNumber();
			} else {
				val = self.getValue(dataName);
			}
			resStr = resStr.replace("__" + dataName + "__", val);
		});

		if (maxLength && resStr.length > maxLength) {
			resStr = resStr.substring(0, maxLength);
		}

		return resStr;
	}

	getNumber() {
		return Math.floor(Math.random() * 999999);
	}

	getSome() {
		const arr = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U",
			"V", "W", "X", "Y", "Z"
		];
		let counter = Math.floor(Math.random() * 6);
		if (counter < 2) {
			counter = 2;
		}

		let resStr = "";
		for (let i = 0; i < counter; i++) {
			const val = this.getArrayElement(arr);
			resStr += val;
		}

		return resStr;
	}


	getValue(arrayName) {
		if (!this.data[arrayName]) {
			throw new Error(`The array ${arrayName} does not exists.`);
		}
		return this.getArrayElement(this.data[arrayName]);
	}

	getArrayElement(array) {
		const idx = Math.floor(Math.random() * array.length);
		return array[idx];
	}
}


module.exports.factory = function (options) {
	return new TdgGeneratorEntitlement(options);
};

module.exports.generator = TdgGeneratorEntitlement;
