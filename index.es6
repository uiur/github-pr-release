require('6to5/polyfill')

var Github = require('github')
  , co = require('co')
  , fs = require('mz/fs')
  , render = require('mustache').render
  , moment = require('moment')
  , thenifyAll = require('thenify-all')
  , parseLinkHeader = require('parse-link-header')

var github = new Github({
  version: '3.0.0'
})
var pullRequests = thenifyAll(github.pullRequests)

const defaultConfig = {
  branch: {
    production: 'master',
    staging: 'staging'
  }
}

var config = null

function getRepo() {
  return {
    user: config.repo.split('/')[0],
    repo: config.repo.split('/')[1]
  }
}

function readConfigFile() {
  return fs.readFile('.github-pr-release.json', 'utf8')
           .then(JSON.parse)
           .catch(function () { return {} })
}

var readConfig = co.wrap(function* (runtimeConfig = {}) {
  var fileConfig = yield readConfigFile()

  return Object.assign({}, defaultConfig, fileConfig, runtimeConfig)
})

var createReleaseMessage = co.wrap(function* (prs) {
  var template = yield fs.readFile(__dirname + '/release.mustache', 'utf8')

  var text = render(template, { now: moment().format('YYYY-MM-DD HH:mm:ss'), prs: prs })
  var [title, ...body] = text.split('\n')

  return {
    title: title,
    body: body.join('\n')
  }
})

function getPRCommits(repo, targetPR) {
  var result = []

  function getCommits(page = 1) {
    return pullRequests.getCommits(Object.assign({}, repo, {
      number: targetPR.number,
      per_page: 100,
      page: page
    })).then(function(commits) {
      var hasNext = !!parseLinkHeader(commits.meta.link).next

      result = result.concat(commits)

      if (hasNext) {
        return getCommits(page + 1)
      } else {
        return result
      }
    })
  }

  return getCommits()
}

var getReleasePRs = co.wrap(function* (targetPR) {
  var repo = getRepo()

  var commits = yield getPRCommits(repo, targetPR)

  var shas = commits.map(commit => commit.sha)

  var prs = yield pullRequests.getAll(Object.assign({}, repo, {
    state: 'closed',
    per_page: 100
  }))

  var mergedPRs = prs.filter(pr => pr.merged_at !== null)

  var releasePRs = mergedPRs.reduce((ret, pr) => {
    var matched =  pr.number !== targetPR.number && pr.base.ref === targetPR.head.ref

    if (shas.indexOf(pr.head.sha) !== -1 && matched) {
      ret.push(pr)
    }
    return ret
  }, [])

  return releasePRs
})

module.exports = co.wrap(function* (runtimeConfig = {}) {
  config = yield readConfig(runtimeConfig)

  var repo = getRepo()

  github.authenticate({
    type: 'oauth',
    token: config.token
  })

  var targetPR = yield pullRequests.create(Object.assign({}, repo, {
    title: 'Preparing release pull request...',
    base: config.branch.production,
    head: config.branch.staging
  }))

  var releasePRs = yield getReleasePRs(targetPR)

  var release = yield createReleaseMessage(releasePRs)

  yield pullRequests.update(Object.assign({}, repo, {
    number: targetPR.number,
    title: release.title,
    body: release.body
  }))
})
