var request = require('request')
var Promise = require('es6-promise').Promise
var parseLinkHeader = require('parse-link-header')

function GithubClient (config) {
  this.owner = config.owner
  this.repo = config.repo
  this.token = config.token
  this.head = config.head || 'master'
  this.base = config.base || 'production'
}

GithubClient.prototype.pullRequestEndpoint = function () {
  return 'https://api.github.com/repos/' + this.owner + '/' + this.repo + '/pulls'
}

GithubClient.prototype.headers = function () {
  return {
    'Authorization': 'token ' + this.token,
    'User-Agent': 'uiureo/github-pr-release'
  }
}

GithubClient.prototype.createReleasePR = function () {
  var self = this

  return new Promise(function (resolve, reject) {
    request.post({
      url: self.pullRequestEndpoint(),
      body: {
        title: 'Preparing release pull request...',
        head: self.head,
        base: self.base
      },
      json: true,
      headers: self.headers()
    }, function (err, res, body) {
      if (err) return reject(err)

      if (res.statusCode === 200) {
        resolve(body)
      } else if (res.statusCode === 422) {
        request.get({
          url: self.pullRequestEndpoint(),
          qs: {
            base: self.base,
            head: self.head,
            state: 'open'
          },
          headers: self.headers()
        }, function (err, res) {
          if (err) return reject(err)
          resolve(JSON.parse(res.body)[0])
        })
      } else {
        reject(res)
      }
    })
  })
}

GithubClient.prototype.getPRCommits = function (pr) {
  var self = this
  var result = []

  function getCommits (page) {
    page = page || 1

    return new Promise(function (resolve, reject) {
      request.get({
        url: self.pullRequestEndpoint() + '/' + pr.number + '/commits',
        qs: {
          per_page: 100,
          page: page
        },
        headers: self.headers()
      }, function (err, res) {
        if (err) return reject(err)
        resolve(res)
      })
    }).then(function (res) {
      var commits = JSON.parse(res.body)
      result = result.concat(commits)

      var link = parseLinkHeader(res.headers.link)

      if (link && link.next) {
        return getCommits(page + 1)
      } else {
        return result
      }
    })
  }

  return getCommits()
}

module.exports = GithubClient
