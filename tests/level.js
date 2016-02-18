/* jslint node: true, esnext: true */
"use strict";



const level = require("level-browserify");
const levelgraph = require("levelgraph");
const db = levelgraph(level("yourdb"));

var triple = {
	subject: "a",
	predicate: "b",
	object: "c"
};
db.put(triple, function (err) {
	// do something after the triple is inserted
});
