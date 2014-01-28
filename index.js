// var wrench = require('./wrench');

// wrench.copyDirSyncRecursive(pushdir, path.join(dirpath, 'app'), {
//   forceDelete: false,
//   exclude: /^\./,
//   inflateSymlinks: true
// });

var assert = require('assert');
var minimatch = require("minimatch")
var fsutil = require('./fsutil')
var fs = require('fs');
var path = require('path');

function isObject (a) {
	return typeof a == 'object';
}

function isGlob (glob) {
	return new minimatch.Minimatch(glob).set.some(function (arr) {
		return arr.some(isObject);
	});
}

function list (dir, filesOut, modulesOut) {
	filesOut = filesOut || {};
	modulesOut = modulesOut || {};

	var pkg = require((dir[0] == '/' || dir[0] == '.' ? '' : './') + path.join(dir, 'package.json'), 'utf-8');

	// Patterns and replacements.
	var
	  moduleGlob = [], modules = {},
	  pathGlob = [], paths = {};

	function update (hash) {
		Object.keys(hash).forEach(function (key) {
			if (key[0] != '/' && key[0] != '.') {
				if (isGlob(key)) {
					moduleGlob.push([new minimatch.Minimatch(key), hash[key]]);
				} else {
					modules[key] = pkg.hardware[key];
				}
			} else {
				if (isGlob(key)) {
					pathGlob.push([new minimatch.Minimatch(key.substr(2)), hash[key]])
				} else {
					try {
						if (typeof hash[key] != 'string' && fs.lstatSync(path.join('./test/a', key)).isDirectory()) {
							pathGlob.push([new minimatch.Minimatch(path.join(key, '**')), hash[key]])
						} else {
							paths[key.substr(2)] = typeof hash[key] == 'string' ? path.join('/', hash[key]).substr(1) : hash[key];
						}
					} catch (e) {
						paths[key.substr(2)] = typeof hash[key] == 'string' ? path.join('/', hash[key]).substr(1) : hash[key];
					}
				}
			}
		});
	}

	// update({'./**': true, '*': true})
	update(pkg.hardware || {});
	update({'./package.json': true})

	fsutil.readdirRecursiveSync(dir, {
		inflateSymlinks: false,
		excludeHiddenUnix: true,
		filter: function (file, subdir) {
			// Exclude node_modules
			return !(path.normalize(subdir) == path.normalize(dir) && file == 'node_modules');
		}
	}).filter(function (file) {
		file = path.relative(dir, file);
		var ret = true;
		pathGlob.forEach(function (mod) {
			if (mod[0].match(file)) {
				ret = mod[1];
			}
		})
		Object.keys(paths).forEach(function (mod) {
			if (file == mod) {
				ret = paths[mod];
			}
		})
		if (ret) {
			filesOut[file] = ret === true ? file : ret;
		}
	})

	// Check modules.
	Object.keys(pkg.dependencies || {}).filter(function (file) {
		var ret = true;
		moduleGlob.forEach(function (mod) {
			if (mod[0].match(file)) {
				ret = mod[1];
			}
		})
		Object.keys(modules).forEach(function (mod) {
			if (file == mod) {
				ret = modules[mod];
			}
		})
		if (ret) {
			modulesOut[file] = ret === true ? file : ret;
		}
	})
	
	Object.keys(modulesOut).forEach(function (key) {
		var moduleFilesOut = list(path.join(dir, 'node_modules', modulesOut[key]))
		Object.keys(moduleFilesOut).forEach(function (file) {
			filesOut[path.join('node_modules', modulesOut[key], file)] = path.join('node_modules', modulesOut[key], moduleFilesOut[file]);
		})
	});

	return filesOut;
}

exports.list = list;