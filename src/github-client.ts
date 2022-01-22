export {};

const request = require("request");
const parseLinkHeader = require("parse-link-header");

interface Config {
  owner?: string;
  repo?: string;
  token?: string;
  head?: string;
  base?: string;
  endpoint?: string;
}

class GithubClient {
  owner: string;
  repo: string;
  token: string;
  head: string;
  base: string;
  endpoint: string;

  constructor(config: Config) {
    this.owner = config.owner || process.env.GITHUB_PR_RELEASE_OWNER;
    this.repo = config.repo || process.env.GITHUB_PR_RELEASE_REPO;
    this.token = config.token || process.env.GITHUB_PR_RELEASE_TOKEN;
    this.head = config.head || process.env.GITHUB_PR_RELEASE_HEAD || "master";
    this.base =
      config.base || process.env.GITHUB_PR_RELEASE_BASE || "production";
    this.endpoint =
      config.endpoint ||
      process.env.GITHUB_PR_RELEASE_ENDPOINT ||
      "https://api.github.com";
  }

  pullRequestEndpoint() {
    return this.endpoint + "/repos/" + this.owner + "/" + this.repo + "/pulls";
  }

  headers() {
    return {
      Authorization: "token " + this.token,
      "User-Agent": "uiur/github-pr-release",
    };
  }

  get(url, query) {
    var self = this;
    query = query || {};

    return new Promise(function (resolve, reject) {
      request.get(
        {
          url: url,
          qs: query,
          headers: self.headers(),
          json: true,
        },
        function (err, res) {
          if (err) return reject(err);
          resolve(res);
        }
      );
    });
  }

  post(url, body) {
    var self = this;
    body = body || {};

    return new Promise(function (resolve, reject) {
      request.post(
        {
          url: url,
          body: body,
          json: true,
          headers: self.headers(),
        },
        function (err, res, body) {
          if (err) return reject(err);

          resolve(res);
        }
      );
    });
  }

  patch(url, body) {
    var self = this;
    body = body || {};

    return new Promise(function (resolve, reject) {
      request.patch(
        {
          url: url,
          body: body,
          json: true,
          headers: self.headers(),
        },
        function (err, res, body) {
          if (err) return reject(err);

          resolve(res);
        }
      );
    });
  }

  prepareReleasePR() {
    var self = this;

    return self
      .post(self.pullRequestEndpoint(), {
        title: "Preparing release pull request...",
        head: self.head,
        base: self.base,
      })
      .then(function (res: any) {
        if (res.statusCode === 201) {
          return res.body;
        } else if (res.statusCode === 422) {
          var errMessage = res.body.errors[0].message;
          if (!errMessage.match(/pull request already exists/)) {
            return Promise.reject(new Error(errMessage));
          }
          return self
            .get(self.pullRequestEndpoint(), {
              base: self.base,
              head: self.head,
              state: "open",
            })
            .then(function (res: any) {
              return res.body[0];
            });
        } else {
          return Promise.reject(new Error(res.body.message));
        }
      });
  }

  getPRCommits(pr) {
    var self = this;
    var result = [];

    function getCommits(page) {
      page = page || 1;

      return self
        .get(self.pullRequestEndpoint() + "/" + pr.number + "/commits", {
          per_page: 100,
          page: page,
        })
        .then(function (res: any) {
          var commits = res.body;
          result = result.concat(commits);

          var link = parseLinkHeader(res.headers.link);

          if (link && link.next) {
            return getCommits(page + 1);
          } else {
            return result;
          }
        });
    }

    return getCommits(null).catch(console.error.bind(console));
  }

  collectReleasePRs(releasePR) {
    var self = this;

    return self.getPRCommits(releasePR).then(function (commits) {
      var shas = commits.map(function (commit) {
        return commit.sha;
      });

      return self
        .get(self.pullRequestEndpoint(), {
          state: "closed",
          base: self.head,
          per_page: 100,
          sort: "updated",
          direction: "desc",
        })
        .then(function (res: any) {
          var prs = res.body;

          var mergedPRs = prs.filter(function (pr) {
            return pr.merged_at !== null;
          });

          var prsToRelease = mergedPRs.reduce(function (result, pr) {
            if (
              shas.indexOf(pr.head.sha) > -1 ||
              shas.indexOf(pr.merge_commit_sha) > -1
            ) {
              result.push(pr);
            }

            return result;
          }, []);

          prsToRelease.sort(function (a, b) {
            return (
              Number(new Date(a.merged_at)) - Number(new Date(b.merged_at))
            );
          });

          return prsToRelease;
        });
    });
  }

  assignReviewers(pr, prs) {
    var reviewers = prs
      .map((pr) => (pr.assignee ? pr.assignee : pr.user))
      .filter((user) => user.type === "User")
      .map((user) => user.login);

    return this.post(
      this.pullRequestEndpoint() + "/" + pr.number + "/requested_reviewers",
      { reviewers }
    ).then(function (res: any) {
      return res.body;
    });
  }

  updatePR(pr, data) {
    return this.patch(this.pullRequestEndpoint() + "/" + pr.number, data).then(
      function (res: any) {
        return res.body;
      }
    );
  }
}

module.exports = GithubClient;
