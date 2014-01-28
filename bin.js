#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var hardwareResolve = require('./')
var fsutil = require('./fsutil');

var arg = process.argv[2];

function duparg (arr) {
  var obj = {};
  arr.forEach(function (arg) {
    obj[arg] = arg;
  })
  return obj;
}

hardwareResolve.root(arg, function (err, pushdir, relpath) {
  var list;
  if (!pushdir) {
    if (fs.lstatSync(arg).isDirectory()) {
      pushdir = fs.realpathSync(arg);
      relpath = fs.lstatSync(path.join(arg, 'index.js')) && 'index.js';
      list = duparg(fsutil.readdirRecursiveSync(arg, {
        inflateSymlinks: true,
        excludeHiddenUnix: true
      }))
    } else {
      pushdir = path.dirname(fs.realpathSync(arg));
      relpath = path.basename(arg);
      list = duparg([path.basename(arg)]);
    }
  } else {
    list = hardwareResolve.list(pushdir)
  }

  console.log(pushdir, relpath, list);
})