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

var defaultConfig = {
  branch: {
    production: "master",
    staging: "staging"
  }
};

var readConfig = co.wrap(regeneratorRuntime.mark(function callee$0$0() {
  var userConfig;
  return regeneratorRuntime.wrap(function callee$0$0$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        context$1$0.next = 2;
        return fs.readFile(".github-pr-release.json", "utf8").then(JSON.parse);
      case 2:
        userConfig = context$1$0.sent;
        return context$1$0.abrupt("return", Object.assign({}, defaultConfig, userConfig));
      case 4:
      case "end":
        return context$1$0.stop();
    }
  }, callee$0$0, this);
}));

module.exports = co.wrap(regeneratorRuntime.mark(function callee$0$1() {
  var config, pullRequests, repo, targetPR, commits, shas, prs, releasePRs, template, text, _text$split, _text$split2, title, body;
  return regeneratorRuntime.wrap(function callee$0$1$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        context$1$0.next = 2;
        return readConfig();
      case 2:
        config = context$1$0.sent;


        github.authenticate({
          type: "oauth",
          token: config.token
        });

        pullRequests = thenifyAll(github.pullRequests);
        repo = {
          user: config.repo.split("/")[0],
          repo: config.repo.split("/")[1]
        };
        context$1$0.next = 8;
        return pullRequests.create(Object.assign({}, repo, {
          title: "Preparing release pull request...",
          base: config.branch.production,
          head: config.branch.staging
        }));
      case 8:
        targetPR = context$1$0.sent;
        context$1$0.next = 11;
        return pullRequests.getCommits(Object.assign({}, repo, {
          number: targetPR.number,
          per_page: 100
        }));
      case 11:
        commits = context$1$0.sent;
        shas = commits.map(function (commit) {
          return commit.sha;
        });
        context$1$0.next = 15;
        return pullRequests.getAll(Object.assign({}, repo, {
          state: "closed",
          per_page: 100
        }));
      case 15:
        prs = context$1$0.sent;
        releasePRs = prs.reduce(function (ret, pr) {
          if (shas.indexOf(pr.head.sha) !== -1 && pr.number !== targetPR.number) {
            ret.push(pr);
          }
          return ret;
        }, []);
        context$1$0.next = 19;
        return fs.readFile("release.mustache", "utf8");
      case 19:
        template = context$1$0.sent;
        text = render(template, { now: moment().format("YYYY-MM-DD HH:mm:ss"), prs: releasePRs });
        _text$split = text.split("\n");
        _text$split2 = _toArray(_text$split);
        title = _text$split2[0];
        body = _toArray(_text$split2).slice(1);
        context$1$0.next = 27;
        return pullRequests.update(Object.assign({}, repo, {
          number: targetPR.number,
          title: title,
          body: body.join("\n")
        }));
      case 27:
      case "end":
        return context$1$0.stop();
    }
  }, callee$0$1, this);
}));
