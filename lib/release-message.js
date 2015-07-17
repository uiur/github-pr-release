var render = require('mustache').render
var moment = require('moment')

module.exports = function releaseMessage (template, prs) {
  var text = render(template, { now: moment().format('YYYY-MM-DD HH:mm:ss'), prs: prs })
  var lines = text.split('\n')
  var title = lines[0]
  var body = lines.slice(1)

  return {
    title: title,
    body: body.join('\n')
  }
}
