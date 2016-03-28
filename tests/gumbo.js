/* jslint node: true, esnext: true */
"use strict";

const path = require('path');

const tdg = require('../lib/exports');

const model = tdg.modelConfigFactory();
const executer = tdg.executerDefaultFactory({
	"model": model
});

const targetDir = path.join(__dirname, './result');
const writerJson = tdg.writerJsonFactory({
	"target_dir": targetDir
});

const customTdgFunctions = require('./fixtures/custom_functions_edge').functions;
model.addCustomEdgeFunctions(customTdgFunctions);

model.init(path.join(__dirname, 'fixtures/config.json'));
//model.init(path.join(__dirname, 'fixtures/time-shift.json'));
const isOk = model.validate();



if (isOk) {
	executer.run();

	const promisses = [];
	Object.keys(model.registry.vertices).forEach((vertexName) => {
		const vertex = model.registry.vertices[vertexName];
		promisses.push(writerJson.writeVertex(vertex));
	});


	Object.keys(model.registry.edges).forEach((edgeName) => {
		const edge = model.registry.edges[edgeName];
		promisses.push(writerJson.writeEdge(edge));
	});


	Promise.all(promisses).then(() => {
		console.log("--------------------------");
		console.log("-- Finished");
		console.log("--------------------------");
	});


} else {
	console.log("--------------------------");
	console.log("-- Finished with ERROR");
	console.log("--------------------------");
}
