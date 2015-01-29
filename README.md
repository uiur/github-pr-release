# github-pr-release
[![Gyazo](http://i.gyazo.com/7484a59ade4e96ce9a015f1aa817cab8.png)](http://gyazo.com/7484a59ade4e96ce9a015f1aa817cab8)

Create a Pull Request release by using Github API. In fact, this is a Node.js port of [git-pr-release]( https://github.com/motemen/git-pr-release).

* No dependency on git. You can easily deploy it to Heroku etc.
* Fast because it uses only Github API.
* Written in ES6 using 6to5.

## Usage
### release(config = {})
Create a release pull request and return Promise.

``` javascript
var release = require('git-pr-release');

release().then(function () {
  // success
}).catch(function () {
  // nice catch!
});
```

## Configuration

Prepare a config file in your working directory:  `.github-pr-release.json`
``` javascript
{
  "repo": "your/repository",
  "token": "github token",
  "branch": {
    "production": "production",
    "staging": "master"
  }
}
```

or pass a config object to `release()`.

``` javascript
release({
  repo: 'your/repository',
  token: 'github token'
})
```

## Example

### hubot
![](http://i.gyazo.com/018755d09bbc857aeafdf48372912d79.png)

``` coffee
release = require('github-pr-release')
module.exports = (robot) ->
  robot.respond /release/i, (msg) ->
    msg.send '(salute)'
    release()
```


## Hack

Edit `index.es6` and run

```
npm run build
```

## License
MIT
