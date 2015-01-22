require('6to5/polyfill')

var Github = require('github')
  , co = require('co')
  , fs = require('mz/fs')
  , render = require('mustache').render
  , moment = require('moment')
  , thenifyAll = require('thenify-all')

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

var getReleasePRs = co.wrap(function* (targetPR) {
  var repo = getRepo()

  var commits = yield pullRequests.getCommits(Object.assign({}, repo, {
    number: targetPR.number,
    per_page: 100
  }))

  var shas = commits.map(commit => commit.sha)

  var prs = yield pullRequests.getAll(Object.assign({}, repo, {
    state: 'closed',
    per_page: 100
  }))

  var releasePRs = prs.reduce((ret, pr) => {
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

  // TODO: debug
  // var targetPR = {
  //   number: 1089,
  //   base: {
  //     ref: config.branch.production
  //   },
  //   head: {
  //     ref: config.branch.staging
  //   }
  // }

  var releasePRs = yield getReleasePRs(targetPR)

  var release = yield createReleaseMessage(releasePRs)

  yield pullRequests.update(Object.assign({}, repo, {
    number: targetPR.number,
    title: release.title,
    body: release.body
  }))
})
