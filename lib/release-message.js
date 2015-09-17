var render = require('mustache').render
var moment = require('moment')

module.exports = function releaseMessage (template, prs, preferAuthor) {
  var version = moment().format('YYYY-MM-DD HH:mm:ss')

  prs.some(function (pr) {
    var m = pr.title.match(/Bump to (.*)/i)

    if (m) {
      version = m[1]
      return true
    }
  })

  var text = render(template, { version: version, prs: prs, preferAuthor: preferAuthor })
  var lines = text.split('\n')
  var title = lines[0]
  var body = lines.slice(1)

  return {
    title: title,
    body: body.join('\n')
  }
}
