// var wrench = require('./wrench');

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var minimatch = require("minimatch")
var osenv = require('osenv')

var fsutil = require('./fsutil')

function isObject (a) {
  return typeof a == 'object';
}

function isGlob (glob) {
  return new minimatch.Minimatch(glob).set.some(function (arr) {
    return arr.some(isObject);
  });
}

function list (dir, filesOut, modulesOut)
{
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
            if (typeof hash[key] != 'string' && fs.lstatSync(path.join(dir, key)).isDirectory()) {
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

  update(pkg.hardware || {});
  update({'./package.json': true})

  fsutil.readdirRecursiveSync(dir, {
    inflateSymlinks: true,
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
  
  // Merge in module output.
  Object.keys(modulesOut).forEach(function (key) {
    var moduleFilesOut = list(path.join(dir, 'node_modules', modulesOut[key]))
    Object.keys(moduleFilesOut).forEach(function (file) {
      filesOut[path.join('node_modules', modulesOut[key], file)] = path.join('node_modules', modulesOut[key], moduleFilesOut[file]);
    })
  });

  return filesOut;
}

function root (file, next)
{
  if (fs.lstatSync(file).isDirectory()) {
    file = path.join(file, 'index.js');
  }
  fs.lstatSync(file);

  var pushdir = fs.realpathSync(path.dirname(file));

  // Find node_modules dir
  var pushdirbkp = pushdir;
  var relpath = '';
  while (path.dirname(pushdir) != '/' && !fs.existsSync(path.join(pushdir, 'package.json'))) {
    relpath = path.join(path.basename(pushdir), relpath);
    pushdir = path.dirname(pushdir);
  }

  // If we never find a package.json or it is the home directory, we've failed.
  if (path.dirname(pushdir) == '/') {
    return next(new Error('No root directory found.'))
  }
  if (fs.realpathSync(osenv.home()) == fs.realpathSync(pushdir)) {
    return next(new Error('No root directory found. (Cowardly refusing to use the home directory, even though ~/package.json or ~/node_modules exists.)'));
  }

  next(null, pushdir, path.join(relpath, path.basename(file)));
}

function bundle (arg)
{
  function duparg (arr) {
    var obj = {};
    arr.forEach(function (arg) {
      obj[arg] = arg;
    })
    return obj;
  }

  var ret = {};

  root(arg, function (err, pushdir, relpath) {
    var files;
    if (!pushdir) {
      ret.warning = String(err);

      if (fs.lstatSync(arg).isDirectory()) {
        pushdir = fs.realpathSync(arg);
        relpath = fs.lstatSync(path.join(arg, 'index.js')) && 'index.js';
        files = duparg(fsutil.readdirRecursiveSync(arg, {
          inflateSymlinks: true,
          excludeHiddenUnix: true
        }))
      } else {
        pushdir = path.dirname(fs.realpathSync(arg));
        relpath = path.basename(arg);
        files = duparg([path.basename(arg)]);
      }
    } else {
      files = list(pushdir)
    }

    ret.pushdir = pushdir;
    ret.relpath = relpath;
    ret.files = files;
  })

  return ret;
}

exports.list = list;
exports.root = root;
exports.bundle = bundle;