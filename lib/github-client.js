var request = require('request')
var Promise = require('es6-promise').Promise
var parseLinkHeader = require('parse-link-header')

function GithubClient (config) {
  this.owner = config.owner
  this.repo = config.repo
  this.token = config.token
  this.head = config.head || 'master'
  this.base = config.base || 'production'
  this.endpoint = config.endpoint || 'https://api.github.com'
}

GithubClient.prototype.pullRequestEndpoint = function () {
  return this.endpoint + '/repos/' + this.owner + '/' + this.repo + '/pulls'
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

GithubClient.prototype.prepareReleasePR = function () {
  var self = this

  return self.post(self.pullRequestEndpoint(), {
    title: 'Preparing release pull request...',
    head: self.head,
    base: self.base
  }).then(function (res) {
    if (res.statusCode === 201) {
      return res.body
    } else if (res.statusCode === 422) {
      var errMessage = res.body.errors[0].message
      if (!errMessage.match(/pull request already exists/)) {
        return Promise.reject(new Error(errMessage))
      }
      return self.get(self.pullRequestEndpoint(), {
        base: self.base,
        head: self.head,
        state: 'open'
      }).then(function (res) {
        return res.body[0]
      })
    } else {
      return Promise.reject(new Error(res.body.message))
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
      per_page: 100,
      sort: 'updated',
      direction: 'desc'
    }).then(function (res) {
      var prs = res.body

      var mergedPRs = prs.filter(function (pr) {
        return pr.merged_at !== null
      })

      var prsToRelease = mergedPRs.reduce(function (result, pr) {
        if (shas.indexOf(pr.head.sha) > -1 ||
            shas.indexOf(pr.merge_commit_sha) > -1) {
          result.push(pr)
        }

        return result
      }, [])

      prsToRelease.sort(function (a, b) {
        return new Date(a.merged_at) - new Date(b.merged_at)
      })

      return prsToRelease
    })
  })
}

GithubClient.prototype.assignReviewers = function (pr, prs) {
  var reviewers = prs.map(pr => pr.assignee ? pr.assignee.login : pr.user.login)

  return this.post(this.pullRequestEndpoint() + '/' + pr.number + '/requested_reviewers', { reviewers }).then(function (res) {
    return res.body
  })
}

GithubClient.prototype.updatePR = function (pr, data) {
  return this.patch(this.pullRequestEndpoint() + '/' + pr.number, data).then(function (res) {
    return res.body
  })
}

module.exports = GithubClient
