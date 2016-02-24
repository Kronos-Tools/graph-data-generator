/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */

"use strict";

const RandExp = require('randexp');


const appId = new RandExp('[1-9]{1,3}-[a-z]{3,8}');

console.log(appId.gen());
console.log(appId.gen());
console.log(appId.gen());
console.log(appId.gen());
console.log(appId.gen());
console.log(appId.gen());
console.log(appId.gen());
console.log(appId.gen());
console.log(appId.gen());
