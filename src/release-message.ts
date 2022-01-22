const render = require('mustache').render
const moment = require('moment')

module.exports = function releaseMessage (template, prs) {
  let version = moment().format('YYYY-MM-DD HH:mm:ss')

  prs.some(function (pr) {
    const m = pr.title.match(/Bump to (.*)/i)

    if (m) {
      version = m[1]
      return true
    }
  })

  const text = render(template, { version: version, prs: prs })
  const lines = text.split('\n')
  const title = lines[0]
  const body = lines.slice(1)

  return {
    title: title,
    body: body.join('\n')
  }
}
