#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var hardwareResolve = require('./')
var fsutil = require('./fsutil');

var arg = process.argv[2];

console.log(hardwareResolve.bundle(arg))