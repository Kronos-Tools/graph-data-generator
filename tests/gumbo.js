/* jslint node: true, esnext: true */
"use strict";



const res = [];

let printer = 0;
let counter = 0;
let sources = 0;
while (counter < 1000000000) {
	if (printer === 100000) {
		printer = 0;
		console.log(counter);
	}
	printer++;


	const targets = Math.floor((Math.random() * (100)));
	const target = [];
	for (let i = 0; i <= targets; i++) {
		target.push(100000000);
		counter++;
	}
	res.push({
		"s": sources,
		"t": target
	});
	sources++;
}

//696 893 174


// for (let i = 0; i < 100; i++) {
// 	console.log(Math.floor((Math.random() * (11))));
//878 744 019
// }
