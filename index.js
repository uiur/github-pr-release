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

const defaultConfig = {
  branch: {
    production: 'master',
    staging: 'staging'
  }
}

var readConfig = co.wrap(function* () {
  var userConfig = yield fs.readFile('.github-pr-release.json', 'utf8').then(JSON.parse)

  return Object.assign({}, defaultConfig, userConfig)
})

module.exports = co.wrap(function* () {
  var config = yield readConfig()

  github.authenticate({
    type: 'oauth',
    token: config.token
  })

  var pullRequests = thenifyAll(github.pullRequests)

  var repo = {
    user: config.repo.split('/')[0],
    repo: config.repo.split('/')[1]
  }

  var targetPR = yield pullRequests.create(Object.assign({}, repo, {
    title: 'Preparing release pull request...',
    base: config.branch.production,
    head: config.branch.staging
  }))

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
    if (shas.indexOf(pr.head.sha) !== -1 && pr.number !== targetPR.number) {
      ret.push(pr)
    }
    return ret
  }, [])

  var template = yield fs.readFile(__dirname + '/release.mustache', 'utf8')

  var text = render(template, { now: moment().format('YYYY-MM-DD HH:mm:ss'), prs: releasePRs })
  var [title, ...body] = text.split('\n')

  yield pullRequests.update(Object.assign({}, repo, {
    number: targetPR.number,
    title: title,
    body: body.join('\n')
  }))
})
