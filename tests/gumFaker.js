/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */

"use strict";

const faker = require('faker');


faker.locale = "de";
console.log(faker.random.objectElement());
