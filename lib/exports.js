/* jslint node: true, esnext: true */
"use strict";

doExport('execute', 'executer-default');
doExport('model', 'model-config');
doExport('writer', 'writer-json');

// util
doExport('util', 'csv-writer-sync');

// generators
doExport('generator', 'generator-dispatcher');
doExport('generator', 'generator-entitlement');
doExport('generator', 'generator-faker');
doExport('generator', 'generator-regex');
doExport('generator', 'generator-tdg');

// exporter
doExport('export', 'exporter-dispatcher');
doExport('export', 'exporter-default');

// ------------------------------------------------
// -- helper
// ------------------------------------------------

function doExport(dirName, fileName) {
	const path = `./${dirName}/${fileName}`;

	const className = upperCamelCase(fileName);
	const factoryName = camelCase(fileName + "Factory");

	const myClass = require(path)[className];
	if (!myClass) {
		console.error(`Could not require the class '${className}' from the file ${path}`);
	}

	const myClassFactory = require(path)[factoryName];
	if (!myClassFactory) {
		console.error(`Could not require the factory '${factoryName}' from the file ${path}`);
	}

	module.exports[className] = myClass;
	module.exports[factoryName] = myClassFactory;
}



function preserveCamelCase(str) {
	var isLastCharLower = false;

	for (var i = 0; i < str.length; i++) {
		var c = str.charAt(i);

		if (isLastCharLower && (/[a-zA-Z]/).test(c) && c.toUpperCase() === c) {
			str = str.substr(0, i) + '-' + str.substr(i);
			isLastCharLower = false;
			i++;
		} else {
			isLastCharLower = (c.toLowerCase() === c);
		}
	}

	return str;
}

function camelCase() {
	var str = [].map.call(arguments, function (str) {
		return str.trim();
	}).filter(function (str) {
		return str.length;
	}).join('-');

	if (!str.length) {
		return '';
	}

	if (str.length === 1) {
		return str;
	}

	if (!(/[_.\- ]+/).test(str)) {
		if (str === str.toUpperCase()) {
			return str.toLowerCase();
		}

		if (str[0] !== str[0].toLowerCase()) {
			return str[0].toLowerCase() + str.slice(1);
		}

		return str;
	}

	str = preserveCamelCase(str);

	return str
		.replace(/^[_.\- ]+/, '')
		.toLowerCase()
		.replace(/[_.\- ]+(\w|$)/g, function (m, p1) {
			return p1.toUpperCase();
		});
}

function upperCamelCase() {
	var cased = camelCase.apply(camelCase, arguments);
	return cased.charAt(0).toUpperCase() + cased.slice(1);
}
