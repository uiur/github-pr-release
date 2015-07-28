var render = require('mustache').render
var moment = require('moment')

module.exports = function releaseMessage (template, prs) {
  var version = moment().format('YYYY-MM-DD HH:mm:ss')
  for (var pr of prs) {
    const m = pr.title.match(/Bump to (.*)/)
    if (m) {
      version = m[1]
      break
    }
  }

  var text = render(template, { version: version, prs: prs })
  var lines = text.split('\n')
  var title = lines[0]
  var body = lines.slice(1)

  return {
    title: title,
    body: body.join('\n')
  }
}
