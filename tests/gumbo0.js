/* jslint node: true, esnext: true */
"use strict";

const arr1 = ['a', 'c', 'd', 'e'];
const arr2 = ['a', 'f', 'd', 'g'];

arrayConcatUnique(arr1, arr2);

console.log(arr1);

function arrayConcatUnique(array1, array2) {
	array2.forEach((val) => {
		if (array1.indexOf(val) < 0) {
			array1.push(val);
		}
	});
}
