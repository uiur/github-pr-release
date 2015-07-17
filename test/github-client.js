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
        .reply(201, {
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
        { sha: 'sha1' }
      ], {
        Link: '<https://api.github.com/resource?page=2>; rel="next", <https://api.github.com/resource?page=2>; rel="last"'
      })
      .get(commitsEndpoint + '&page=2')
      .reply(200, [
        { sha: 'sha2' },
        { sha: 'sha3' }
      ])

    it('returns pr', function (done) {
      this.client.getPRCommits({ number: 42 }).then(function (commits) {
        assert(commits.length === 4)
        assert(commits[0].sha === 'sha0')

        done()
      }).catch(done)
    })
  })

  describe('#collectReleasePRs()', function () {
    nock('https://api.github.com')
      .get('/repos/uiureo/awesome-app/pulls/42/commits')
      .query(true)
      .reply(200, [
        { sha: '0' },
        { sha: '1' },
        { sha: '2' }
      ])
      .get('/repos/uiureo/awesome-app/pulls?state=closed&base=master&per_page=100')
      .reply(200, [
        { number: 10, head: { sha: '0' }, merged_at: null },
        { number: 1, head: { sha: '1' }, merged_at: 'a' },
        { number: 2, head: { sha: '2' }, merged_at: 'b' },
        { number: 100, head: { sha: '100' }, merged_at: 'c' }
      ])

    it('returns prs that is going to be released', function (done) {
      this.client.collectReleasePRs({ number: 42 })
        .then(function (prs) {
          assert(prs.length === 2)

          done()
        }).catch(done)
    })
  })
})
