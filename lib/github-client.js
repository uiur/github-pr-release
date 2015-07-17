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

GithubClient.prototype.get = function (url, query) {
  var self = this
  query = query || {}

  return new Promise(function (resolve, reject) {
    request.get({
      url: url,
      qs: query,
      headers: self.headers(),
      json: true
    }, function (err, res) {
      if (err) return reject(err)
      resolve(res)
    })
  })
}

GithubClient.prototype.post = function (url, body) {
  var self = this
  body = body || {}

  return new Promise(function (resolve, reject) {
    request.post({
      url: url,
      body: body,
      json: true,
      headers: self.headers()
    }, function (err, res, body) {
      if (err) return reject(err)

      resolve(res)
    })
  })
}

GithubClient.prototype.patch = function (url, body) {
  var self = this
  body = body || {}

  return new Promise(function (resolve, reject) {
    request.patch({
      url: url,
      body: body,
      json: true,
      headers: self.headers()
    }, function (err, res, body) {
      if (err) return reject(err)

      resolve(res)
    })
  })
}

GithubClient.prototype.createReleasePR = function () {
  var self = this

  return self.post(self.pullRequestEndpoint(), {
    title: 'Preparing release pull request...',
    head: self.head,
    base: self.base
  }).then(function (res) {
    if (res.statusCode === 201) {
      return res.body
    } else if (res.statusCode === 422) {
      return self.get(self.pullRequestEndpoint(), {
        base: self.base,
        head: self.head,
        state: 'open'
      }).then(function (res) {
        return res.body[0]
      })
    }
  })
}

GithubClient.prototype.getPRCommits = function (pr) {
  var self = this
  var result = []

  function getCommits (page) {
    page = page || 1

    return self.get(
      self.pullRequestEndpoint() + '/' + pr.number + '/commits',
      {
        per_page: 100,
        page: page
      }
    ).then(function (res) {
      var commits = res.body
      result = result.concat(commits)

      var link = parseLinkHeader(res.headers.link)

      if (link && link.next) {
        return getCommits(page + 1)
      } else {
        return result
      }
    })
  }

  return getCommits().catch(console.error.bind(console))
}

GithubClient.prototype.collectReleasePRs = function (releasePR) {
  var self = this

  return self.getPRCommits(releasePR).then(function (commits) {
    var shas = commits.map(function (commit) {
      return commit.sha
    })

    return self.get(self.pullRequestEndpoint(), {
      state: 'closed',
      base: self.head,
      per_page: 100
    }).then(function (res) {
      var prs = res.body

      var mergedPRs = prs.filter(function (pr) {
        return pr.merged_at !== null
      })

      var prsToRelease = mergedPRs.reduce(function (result, pr) {
        if (shas.indexOf(pr.head.sha) !== -1) {
          result.push(pr)
        }

        return result
      }, [])

      return prsToRelease
    })
  })
}

GithubClient.prototype.updatePR = function (pr, data) {
  var self = this
  return self.patch(self.pullRequestEndpoint() + '/' + pr.number, data).then(function (res) {
    return res.body
  })
}

module.exports = GithubClient
