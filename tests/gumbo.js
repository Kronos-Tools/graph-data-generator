/* jslint node: true, esnext: true */
"use strict";

const counter = "100%";
const objectCount = 50;

let resultCount;
if (/^\d{1,3}\%$/.test(counter)) {
	console.log("JA");
	let val = counter;
	val.replace("%");
	val = parseInt(val);
	if (val <= 100) {
		// we got a value
		if (val === 100) {
			resultCount = val;
		} else {
			resultCount = Math.round(objectCount - objectCount * val / 100);
		}

	}
} else {
	console.log("NEIN");
}
