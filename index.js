var fs = require('fs')

var releaseMessage = require('./lib/release-message.js')
var GithubClient = require('./lib/github-client.js')
var path = require('path')

module.exports = function createReleasePR (config) {
  var client = new GithubClient(config)

  return client.prepareReleasePR().then(function (releasePR) {
    return client.collectReleasePRs(releasePR).then(function (prs) {
      var templatePath = config.template || path.join(__dirname, 'release.mustache')
      var template = fs.readFileSync(templatePath, 'utf8')
      var message = releaseMessage(template, prs)

      client.assignReviewers(releasePR, prs)
      return client.updatePR(releasePR, message)
    })
  })
}
