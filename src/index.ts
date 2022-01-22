const fs = require("fs");
const releaseMessage = require("./release-message");
const GithubClient = require("./github-client");
const path = require("path");

module.exports = function createReleasePR(config) {
  const client = new GithubClient(config);

  return client.prepareReleasePR().then(function (releasePR) {
    return client.collectReleasePRs(releasePR).then(function (prs) {
      const templatePath =
        config.template || path.join(__dirname, "release.mustache");
      const template = fs.readFileSync(templatePath, "utf8");
      const message = releaseMessage(template, prs);

      client.assignReviewers(releasePR, prs);
      return client.updatePR(releasePR, message);
    });
  });
};
