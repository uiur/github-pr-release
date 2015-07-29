# github-pr-release
[![Build Status](https://travis-ci.org/uiureo/github-pr-release.svg)](https://travis-ci.org/uiureo/github-pr-release)
[![](https://img.shields.io/npm/v/github-pr-release.svg)](https://www.npmjs.com/package/github-pr-release)

Create a release pull request by using Github API. Inspired by [git-pr-release]( https://github.com/motemen/git-pr-release).

* No dependency on git. You can easily deploy it to Heroku etc.
* Fast because it uses only Github API.

[![Gyazo](http://i.gyazo.com/7484a59ade4e96ce9a015f1aa817cab8.png)](http://gyazo.com/7484a59ade4e96ce9a015f1aa817cab8)


## Usage
### release(config)
Create a release pull request and return Promise.

You must pass a config as an argument.

``` javascript
var release = require('github-pr-release')

var config = {
  token: 'your github token',
  owner: 'uiureo',
  repo:  'awesome-web-app',
  head:  'master',
  base:  'production'
}

release(config).then(function (pullRequest) {
  // success
})
```

`pullRequest` is an object that github api returns.

See: https://developer.github.com/v3/pulls/#get-a-single-pull-request

### Pull request titles

If one of pull requests of which consist a release pull request has a title like "Bump to v1.0", the title of the release pull request becomes "Release v1.0". Otherwise, it uses timestamps like "Release 2000-01-01 00:00:00" in local timezone.

## Install
```
npm install github-pr-release
```

## Example

### hubot
![](http://i.gyazo.com/018755d09bbc857aeafdf48372912d79.png)

``` coffee
release = require('github-pr-release')
module.exports = (robot) ->
  robot.respond /release/i, (msg) ->
    release(config).then((pullRequest) ->
      msg.send pullRequest.html_url
    )
```

## License
MIT
