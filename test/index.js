/* global describe before it */
var assert = require('power-assert')
var nock = require('nock')

var GithubClient = require('../lib/github-client.js')

describe('GithubClient', function () {
  before(function () {
    this.client = new GithubClient({
      owner: 'uiureo',
      repo: 'awesome-app',
      token: 'token',
      head: 'master',
      base: 'production'
    })
  })

  it('works', function () {
    assert(this.client.token === 'token')
  })

  describe('#createReleasePR()', function () {
    describe('when pr doesn\'t exist', function () {
      nock('https://api.github.com/')
        .post('/repos/uiureo/awesome-app/pulls')
        .reply(200, {
          number: 42
        })

      it('creates pr', function (done) {
        this.client.createReleasePR().then(function (pr) {
          assert(pr.number === 42)
          done()
        }).catch(done)
      })
    })

    describe('when pr already exists', function () {
      nock('https://api.github.com/')
        .post('/repos/uiureo/awesome-app/pulls')
        .reply(422)

      nock('https://api.github.com/')
        .get('/repos/uiureo/awesome-app/pulls')
        .query(true)
        .reply(200, [
          { number: 3, title: 'super big release' }
        ])

      it('returns the pr', function (done) {
        this.client.createReleasePR().then(function (pr) {
          assert(pr.number === 3)
          done()
        }).catch(done)
      })
    })
  })

  describe('#getPRCommits()', function () {
    var commitsEndpoint = '/repos/uiureo/awesome-app/pulls/42/commits?per_page=100'

    nock('https://api.github.com')
      .get(commitsEndpoint + '&page=1')
      .reply(200, [
        { sha: 'sha0' },
        { sha: 'sha1'}
      ], {
        Link: '<https://api.github.com/resource?page=2>; rel="next", <https://api.github.com/resource?page=2>; rel="last"'
      })
      .get(commitsEndpoint + '&page=2')
      .reply(200, [
        { sha: 'sha2' },
        { sha: 'sha3'}
      ])

    it('returns pr', function (done) {
      this.client.getPRCommits({ number: 42 }).then(function (commits) {
        assert(commits.length === 4)
        assert(commits[0].sha === 'sha0')

        done()
      }).catch(done)
    })
  })
})
