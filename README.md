**[UNMAINTAINED] This library does not have a maintainer. The source code and repository will be kept at this URL indefinitely. If you'd like to help maintain this codebase, create an issue on this repo explaining why you'd like to become a maintainer and tag @tessel/maintainers in the body.**

# hardware-resolve

Resolver for a `hardware` key in your `package.json`. Using this, you can can whitelist, blacklist, or substitute files from your directory when pushing to an embedded device.

This is similar to the "browser" field package.json spec: <https://gist.github.com/defunctzombie/4339901>

For example,

```
{
  "name": ...,
  "hardware": {
    "grunt": false,
    "./test": false
  }
}
```

This would prevent the "grunt" module from being pushed, as well as the nested folder "test" (with a leading './') and all files underneath it.

Because the "hardware" key whitelists all packages by default, you can switch to a "blacklist" mode simply by unincluding all modules/files first:

```
{
  "name": ...,
  "hardware": {
    "*": false,
    "./": false,
    "async": true,
    "./src": true
  }
}
```

This would *only* push the "async" module and the "src" directory.

In addition, you can alias files to other files.

```
{
  "name": ...,
  "hardware": {
    "./index.js": "./hardware-shim/index.js",
    "./hardware-shim": false
  }
}
```

This would replace the "index.js" root file with the "hardware-shim/index.js" file, but not include the "hardware-shim" directory in the upload.

## license

MIT
