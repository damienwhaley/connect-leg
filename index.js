var deepmerge = require("deepmerge"),
    parstack = require("parstack"),
    randomId = require("proquint-random-id");

var connectLeg = module.exports = function connectLeg(log, toMerge) {
  if (typeof toMerge !== "object" && typeof toMerge !== "function") {
    toMerge = {};
  }

  if (typeof toMerge === "object") {
    var _toMerge = toMerge;

    toMerge = function toMerge(req, res) {
      return _toMerge;
    };
  }

  return function connectLeg(req, res, next) {
    req._leg_requestId = randomId();
    req._leg_requestTime = Date.now();

    log.info("request", deepmerge(toMerge(req, res), {
      http: {
        request: {
          id: req._leg_requestId,
          method: req.method,
          host: req.host,
          path: req.url,
          origin: req.headers.origin,
          referer: req.headers.referer,
        },
      },
    }));

    var onEnd = function onEnd() {
      var level;

      if (res.statusCode >= 400 && res.statusCode <= 499) {
        level = "warn";
      } else if (res.statusCode >= 500) {
        level = "error";
      } else {
        level = "info";
      }

      log[level]("response", deepmerge(toMerge(req, res), {
        http: {
          request: {
            id: req._leg_requestId,
            method: req.method,
            host: req.host,
            path: req.url,
          },
          response: {
            status: res.statusCode,
          },
        },
        timing: {
          duration: Date.now() - req._leg_requestTime,
        },
      }));

      res.removeListener("finish", onEnd);
      res.removeListener("close", onEnd);
    };

    res.on("finish", onEnd);
    res.on("close", onEnd);

    return next();
  };
};

connectLeg.logger = connectLeg;

connectLeg.errorHandler = function errorHandler(log, toMerge) {
  if (typeof toMerge !== "object" && typeof toMerge !== "function") {
    toMerge = {};
  }

  if (typeof toMerge === "object") {
    var _toMerge = toMerge;

    toMerge = function toMerge(req, res) {
      return _toMerge;
    };
  }

  return function errorHandler(err, req, res, next) {
    if (typeof err.status === "number") {
      res.status(err.status);
    } else if (typeof err.code === "number") {
      res.status(err.code);
    } else if (typeof err.statusCode === "number") {
      res.status(err.statusCode);
    } else {
      res.status(500);
    }

    log.error("error", deepmerge(toMerge(req, res), {
      http: {
        request: {
          id: req._leg_requestId,
        },
      },
      error: parstack(err),
    }));

    return res.send(err.toString());
  };
};
