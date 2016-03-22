/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */
"use strict";


const iterationCount = 20;
const vertex = {
	"name": "application",
	"tdg": {
		"count_all": 10
	},
	"min_id": 9,
	"max_id": 167,
	"type": "vertex"
};

const elementConfig = {
	"name": "application",
	"start": 5,
	"while": {
		"add": 154,
		"remove": 4
	}
};

gugu(iterationCount, vertex, elementConfig);



function gugu(iterationCount, vertex, elementConfig) {
	let timeShiftResult;

	for (let currentIteration = 0; currentIteration < iterationCount; currentIteration++) {
		console.log(`Iteration ${currentIteration}`);

		// ----------------------------------
		// -- Initial phase iteration '0'
		// ----------------------------------
		if (currentIteration === 0) {
			timeShiftResult = startIteration(vertex, elementConfig);
			vertex.timeshift_status = timeShiftResult.status;
			vertex.timeshift_store = timeShiftResult.store;
		}

		// ----------------------------------
		// -- Iterations
		// ----------------------------------
		iterAdd(vertex, timeShiftResult, currentIteration, iterationCount);
	}


	logme(vertex, iterationCount, timeShiftResult);
}

// for (let currentIteration = 0; currentIteration < iterationCount; currentIteration++) {
//
//
// 	// On each iteration the element count will be computed from the available elements
// 	const elemCount = (avail.available.max - avail.available.min) + 1;
// 	const remain = iterationCount - currentIteration;
//
// 	if (remain === 1) {
// 		const thisDay = {
// 			"a": []
// 		};
// 		console.log("   " + `# Last iteration: add ${elemCount}`);
// 		// add just the remaining elements
// 		if (elemCount > 0) {
// 			addElements(elemCount, avail, thisDay.a);
// 		}
// 		console.log("   " + `a:${thisDay.a.length}`);
// 	} else {
// 		if (elemCount / remain > 1) {
// 			// there are more than '1' elements to add per day
// 			const thisDay = {
// 				"a": []
// 			};
// 			const elemToAdd = Math.floor(elemCount / remain);
// 			addElements(elemToAdd, avail, thisDay.a);
// 			console.log("   " + `a:${thisDay.a.length}`);
// 		} else {
// 			// Only add elements on a few days
// 		}
// 	}
//
// }

function iterAdd(vertex, timeShiftResult, currentIteration, iterationCount) {
	const status = timeShiftResult.status;
	const remainingIterations = iterationCount - currentIteration;
	const remainingElements = (status.available.max - status.available.min) + 1;

	if (remainingElements > 0) {
		let addedElements;
		if (remainingIterations === 1) {
			// This is the last iteration, add all not already added
			addedElements = addElements(remainingElements, status);
		} else {

			hier weiter
			was wenn die menge kleiner als eins ist

			const elemToAdd = Math.floor(remainingElements / remainingIterations);
			addedElements = addElements(elemToAdd, status);
		}

		// store the added values
		console.log("   " + `a:${addedElements.length}`);
		let thisIterChange;
		if (timeShiftResult.store.iter[currentIteration]) {
			thisIterChange = timeShiftResult.store.iter[currentIteration];
		} else {
			thisIterChange = {};
			timeShiftResult.store.iter[currentIteration] = thisIterChange;
		}
		thisIterChange.a = addedElements;
	}
}

/**
 * Initializes the first iteration
 * @param vertex (object) The vertex object to distribute the elements for
 * @param elementConfig (object) The element configuration
 * @return result (object) An object with an hash used for this vertex
 */
function startIteration(vertex, elementConfig) {
	const result = {
		// The store part will be saved later on
		"store": {
			"start": [],
			"iter": []
		},
		// The status shows which elements currently active or still available
		// this information will not be stored after all iterations are processed
		"status": {
			"available": {
				"min": vertex.min_id,
				"max": vertex.max_id
			},
			"active": [],
			"removed": []
		}
	};

	// set the initial values
	const start = elementConfig.start;
	if (start) {
		// there are start values to add
		const addedElements = addElements(start, result.status);
		result.store.start = addedElements;
	}
	return result;
}

/**
 * Add the given amount of elements to the result array. Also updates the
 * current available elements
 * @param elemCount (number) The number of elements to add
 * @param status (object) This objects trakc which elements are currently active and which still available
 * @return result (array) The new added elements
 */
function addElements(elemCount, status) {
	const result = [];
	for (let i = 0; i < elemCount; i++) {
		result.push(status.available.min);
		status.active.push(status.available.min);
		status.available.min++;
	}
	return result;
}

function logme(vertex, iterationCount, timeShiftResult) {
	console.log("---------------------------------------");
	console.log(`Iterations:       ${iterationCount}`);
	console.log(`Elements to do:   ${vertex.max_id-vertex.min_id+1}`);
	console.log(`End Elements:     ${timeShiftResult.status.active.length}`);
	console.log(`Avail min:        ${timeShiftResult.status.available.min}`);
	console.log(`Avail max:        ${timeShiftResult.status.available.max}`);
	console.log(``);
	console.log(``);
	console.log(``);
	console.log(``);
	console.log(``);
	console.log(vertex.timeshift_store);
}
