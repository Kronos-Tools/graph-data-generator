/* jslint node: true, esnext: true */
"use strict";

let a = [];

console.log("Start");

let j = 0;
for (let i = 0; i < 1000000000; i++) {

	if (j === 1000000) {
		console.log(i);
		j = 0;
	}

	a.push({
		i: `A=${i}`
	});

	j++;
}
