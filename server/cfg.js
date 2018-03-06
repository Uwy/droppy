"use strict";

const cfg    = module.exports = {};
const fs     = require("graceful-fs");
const mkdirp = require("mkdirp");
const path   = require("path");

const configFile = require("./paths.js").get().cfgFile;

const defaults = {
  listeners : [
    {
      host     : ["0.0.0.0", "::"],
      port     : 8989,
      protocol : "http"
    }
  ],
  public            : false,
  timestamps        : true,
  linkLength        : 5,
  logLevel          : 2,
  maxFileSize       : 0,
  updateInterval    : 1000,
  pollingInterval   : 0,
  keepAlive         : 20000,
  allowFrame        : false,
  readOnly          : false,
  compression       : true,
  ignorePatterns    : [],
  watch             : true,
  keepFileExtension : false,
};

const hiddenOpts = ["dev", "demo"];

cfg.init = function(config, callback) {
  if (typeof config === "object" && config !== null) {
    config = migrate(config);
    config = Object.assign({}, defaults, config);
    callback(null, config);
  } else {
    fs.stat(configFile, function(err) {
      if (err) {
        if (err.code === "ENOENT") {
          config = defaults;
          mkdirp(path.dirname(configFile), function() {
            write(config, function(err) {
              callback(err || null, config);
            });
          });
        } else {
          callback(err);
        }
      } else {
        fs.readFile(configFile, function(err, data) {
          if (err) return callback(err);

          try {
            config = JSON.parse(String(data));
          } catch (err2) {
            return callback(err2);
          }

          if (!config) config = {};

          config = migrate(config);
          config = Object.assign({}, defaults, config);

          // TODO: validate more options
          if (typeof config.pollingInterval !== "number") {
            return callback(new TypeError("Expected a number for the 'pollingInterval' option"));
          }

          // Remove options no longer present
          Object.keys(config).forEach(function(key) {
            if (defaults[key] === undefined && hiddenOpts.indexOf(key) === -1) {
              delete config[key];
            }
          });

          write(config, function(err) {
            callback(err || null, config);
          });
        });
      }
    });
  }
};

function write(config, callback) {
  fs.writeFile(configFile, JSON.stringify(config, null, 2), callback);
}

function migrate(config) {
  const oldProps = [
    "host",
    "port",
    "useTLS",
    "useSPDY",
    "useHSTS",
    "readInterval",
    "maxOpen"
  ];

  const needToMigrate = oldProps.every(function(prop) {
    return config.hasOwnProperty(prop);
  });

  if (needToMigrate && !config.listeners) {
    config.listeners = [{
      host     : config.host,
      port     : config.port,
      protocol : config.useSPDY || config.useTLS ? "https" : "http",
      hsts     : config.useHSTS ? 31536000 : 0
    }];
  }
  oldProps.forEach(function(prop) {
    delete config[prop];
  });
  return config;
}
