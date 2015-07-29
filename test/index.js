/* global describe it */
var assert = require('power-assert')
var release = require('../')

describe('release()', function () {
  it('is a func', function () {
    assert(typeof release === 'function')
  })
})
