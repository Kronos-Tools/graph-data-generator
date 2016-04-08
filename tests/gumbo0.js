/* jslint node: true, esnext: true */
"use strict";

const writerFactory = require('../lib/util/csv-writer-sync').csvWriterSyncFactory;


const writer = writerFactory({
	"headers": ['a', 'b', 'c']
});


writer.open("gum.csv");


writer.write(['z1', 'c2', 'c3']);
writer.write(['z2', 'c2', 'c3']);
writer.write(['z3', 'c2', 'c3']);

writer.close();
