/* global describe it */
var assert = require('power-assert')
var proxyquire = require('proxyquire')
var Promise = require('es6-promise').Promise

function MockGithubClient () {
  return {
    prepareReleasePR: function () {
      return Promise.resolve({ number: 42 })
    },
    collectReleasePRs: function () {
      return Promise.resolve([
        { number: 42, title: 'foo', user: { login: 'uiureo' } },
        { number: 43, title: 'bar', user: { login: 'hiroshi' } }
      ])
    },
    updatePR: function (releasePR, message) {
      return Promise.resolve({ pr: releasePR, message: message })
    },
    assignReviewers: function (releasePR, prs) {
      return Promise.resolve({ requested_reviewers: [] })
    }
  }
}
proxyquire('../', {
  './lib/github-client.js': MockGithubClient
})
var release = require('../')

describe('release()', function () {
  it('generates a default PR message', function (done) {
    release({}).then(function (result) {
      assert((/^Release/).test(result.message.title))
      assert((/#42 foo @uiureo/).test(result.message.body))
      assert((/#43 bar @hiroshi/).test(result.message.body))
    }).then(done, done)
  })

  it('uses the specified template in config', function (done) {
    release({
      template: './test/fixtures/test.mustache'
    }).then(function (result) {
      assert(result.message.title === 'party party')
    }).then(done, done)
  })
})
