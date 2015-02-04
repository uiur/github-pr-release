"use strict";

var _toArray = function (arr) {
  return Array.isArray(arr) ? arr : Array.from(arr);
};

require("6to5/polyfill");

var Github = require("github"),
    co = require("co"),
    fs = require("mz/fs"),
    render = require("mustache").render,
    moment = require("moment"),
    thenifyAll = require("thenify-all");

var github = new Github({
  version: "3.0.0"
});
var pullRequests = thenifyAll(github.pullRequests);

var defaultConfig = {
  branch: {
    production: "master",
    staging: "staging"
  }
};

var config = null;

function getRepo() {
  return {
    user: config.repo.split("/")[0],
    repo: config.repo.split("/")[1]
  };
}

function readConfigFile() {
  return fs.readFile(".github-pr-release.json", "utf8").then(JSON.parse)["catch"](function () {
    return {};
  });
}

var readConfig = co.wrap(regeneratorRuntime.mark(function callee$0$0() {
  var runtimeConfig, fileConfig, args$1$0 = arguments;
  return regeneratorRuntime.wrap(function callee$0$0$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        runtimeConfig = args$1$0[0] === undefined ? {} : args$1$0[0];
        context$1$0.next = 3;
        return readConfigFile();
      case 3:
        fileConfig = context$1$0.sent;
        return context$1$0.abrupt("return", Object.assign({}, defaultConfig, fileConfig, runtimeConfig));
      case 5:
      case "end":
        return context$1$0.stop();
    }
  }, callee$0$0, this);
}));

var createReleaseMessage = co.wrap(regeneratorRuntime.mark(function callee$0$1(prs) {
  var template, text, _text$split, _text$split2, title, body;
  return regeneratorRuntime.wrap(function callee$0$1$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        context$1$0.next = 2;
        return fs.readFile(__dirname + "/release.mustache", "utf8");
      case 2:
        template = context$1$0.sent;
        text = render(template, { now: moment().format("YYYY-MM-DD HH:mm:ss"), prs: prs });
        _text$split = text.split("\n");
        _text$split2 = _toArray(_text$split);
        title = _text$split2[0];
        body = _toArray(_text$split2).slice(1);
        return context$1$0.abrupt("return", {
          title: title,
          body: body.join("\n")
        });
      case 9:
      case "end":
        return context$1$0.stop();
    }
  }, callee$0$1, this);
}));

var getReleasePRs = co.wrap(regeneratorRuntime.mark(function callee$0$2(targetPR) {
  var repo, commits, shas, prs, mergedPRs, releasePRs;
  return regeneratorRuntime.wrap(function callee$0$2$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        repo = getRepo();
        context$1$0.next = 3;
        return pullRequests.getCommits(Object.assign({}, repo, {
          number: targetPR.number,
          per_page: 100
        }));
      case 3:
        commits = context$1$0.sent;
        shas = commits.map(function (commit) {
          return commit.sha;
        });
        context$1$0.next = 7;
        return pullRequests.getAll(Object.assign({}, repo, {
          state: "closed",
          per_page: 100
        }));
      case 7:
        prs = context$1$0.sent;
        mergedPRs = prs.filter(function (pr) {
          return pr.merged_at !== null;
        });
        releasePRs = mergedPRs.reduce(function (ret, pr) {
          var matched = pr.number !== targetPR.number && pr.base.ref === targetPR.head.ref;

          if (shas.indexOf(pr.head.sha) !== -1 && matched) {
            ret.push(pr);
          }
          return ret;
        }, []);
        return context$1$0.abrupt("return", releasePRs);
      case 11:
      case "end":
        return context$1$0.stop();
    }
  }, callee$0$2, this);
}));

module.exports = co.wrap(regeneratorRuntime.mark(function callee$0$3() {
  var runtimeConfig, repo, targetPR, releasePRs, release, args$1$0 = arguments;
  return regeneratorRuntime.wrap(function callee$0$3$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        runtimeConfig = args$1$0[0] === undefined ? {} : args$1$0[0];
        context$1$0.next = 3;
        return readConfig(runtimeConfig);
      case 3:
        config = context$1$0.sent;
        repo = getRepo();


        github.authenticate({
          type: "oauth",
          token: config.token
        });

        context$1$0.next = 8;
        return pullRequests.create(Object.assign({}, repo, {
          title: "Preparing release pull request...",
          base: config.branch.production,
          head: config.branch.staging
        }));
      case 8:
        targetPR = context$1$0.sent;
        context$1$0.next = 11;
        return getReleasePRs(targetPR);
      case 11:
        releasePRs = context$1$0.sent;
        context$1$0.next = 14;
        return createReleaseMessage(releasePRs);
      case 14:
        release = context$1$0.sent;
        context$1$0.next = 17;
        return pullRequests.update(Object.assign({}, repo, {
          number: targetPR.number,
          title: release.title,
          body: release.body
        }));
      case 17:
      case "end":
        return context$1$0.stop();
    }
  }, callee$0$3, this);
}));
