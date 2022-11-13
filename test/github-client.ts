export {};
import assert from "power-assert";
import nock from "nock";

import GithubClient from "../src/github-client";

describe("GithubClient", function () {
  before(function () {
    this.client = new GithubClient({
      owner: "uiureo",
      repo: "awesome-app",
      token: "token",
      head: "master",
      base: "production",
    });
  });

  it("works", function () {
    assert(this.client.token === "token");
  });

  describe("#prepareReleasePR()", function () {
    describe("when pr doesn't exist", function () {
      nock("https://api.github.com/")
        .post("/repos/uiureo/awesome-app/pulls")
        .reply(201, {
          number: 42,
        });

      it("creates pr", function (done) {
        this.client
          .prepareReleasePR()
          .then(function (pr) {
            assert(pr.number === 42);
            done();
          })
          .catch(done);
      });
    });

    describe("when pr already exists", function () {
      nock("https://api.github.com/")
        .post("/repos/uiureo/awesome-app/pulls")
        .reply(422, {
          message: "Validation Failed",
          errors: [
            {
              resource: "PullRequest",
              code: "custom",
              message: "A pull request already exists for uiureo:master.",
            },
          ],
          documentation_url:
            "https://developer.github.com/v3/pulls/#create-a-pull-request",
        });

      nock("https://api.github.com/")
        .get("/repos/uiureo/awesome-app/pulls")
        .query(true)
        .reply(200, [{ number: 3, title: "super big release" }]);

      it("returns the pr", function (done) {
        this.client
          .prepareReleasePR()
          .then(function (pr) {
            assert(pr.number === 3);
            done();
          })
          .catch(done);
      });
    });

    describe("when no changes between head and base", function () {
      nock("https://api.github.com/")
        .post("/repos/uiureo/awesome-app/pulls")
        .reply(422, {
          message: "Validation Failed",
          errors: [
            {
              resource: "PullRequest",
              code: "custom",
              message: "No commits between production and master",
            },
          ],
          documentation_url:
            "https://developer.github.com/v3/pulls/#create-a-pull-request",
        });

      it("rejects with error message", function (done) {
        this.client.prepareReleasePR().catch(function (error) {
          assert(error.message === "No commits between production and master");
          done();
        });
      });
    });

    describe("when repository is not found", function () {
      nock("https://api.github.com/")
        .post("/repos/uiureo/awesome-app/pulls")
        .reply(404, {
          message: "Not Found",
        });

      it("returns an error", function (done) {
        this.client.prepareReleasePR().catch(function (error) {
          assert(error.message === "Not Found");
          done();
        });
      });
    });
  });

  describe("#getPRCommits()", function () {
    var commitsEndpoint =
      "/repos/uiureo/awesome-app/pulls/42/commits?per_page=100";

    nock("https://api.github.com")
      .get(commitsEndpoint + "&page=1")
      .reply(200, [{ sha: "sha0" }, { sha: "sha1" }], {
        Link: '<https://api.github.com/resource?page=2>; rel="next", <https://api.github.com/resource?page=2>; rel="last"',
      })
      .get(commitsEndpoint + "&page=2")
      .reply(200, [{ sha: "sha2" }, { sha: "sha3" }]);

    it("returns pr", function (done) {
      this.client
        .getPRCommits({ number: 42 })
        .then(function (commits) {
          assert(commits.length === 4);
          assert(commits[0].sha === "sha0");

          done();
        })
        .catch(done);
    });
  });

  describe("#collectReleasePRs()", function () {
    nock("https://api.github.com")
      .get("/repos/uiureo/awesome-app/pulls/42/commits")
      .query(true)
      .reply(200, [{ sha: "0" }, { sha: "1" }, { sha: "2" }, { sha: "3" }])
      .get(
        "/repos/uiureo/awesome-app/pulls?state=closed&base=master&per_page=100&sort=updated&direction=desc"
      )
      .reply(200, [
        { number: 10, head: { sha: "0" }, merged_at: null },
        {
          number: 3,
          head: { sha: "_3" },
          merged_at: "2015-12-27T00:00:00Z",
          merge_commit_sha: "3",
        },
        { number: 2, head: { sha: "2" }, merged_at: "2015-12-26T00:00:00Z" },
        { number: 1, head: { sha: "1" }, merged_at: "2015-12-25T00:00:00Z" },
        {
          number: 100,
          head: { sha: "100" },
          merged_at: "2015-12-27T00:00:00Z",
        },
      ]);

    it("returns prs that is going to be released", function (done) {
      this.client
        .collectReleasePRs({ number: 42 })
        .then(function (prs) {
          assert(prs.length === 3);

          var numbers = prs.map(function (pr) {
            return pr.number;
          });
          assert.deepEqual(numbers, [1, 2, 3], "sorted by merged_at asc");

          done();
        })
        .catch(done);
    });
  });

  describe("#assignReviewers()", function () {
    const USER1 = "pr1-owner";
    const USER2 = "pr2-owner";
    const BOT = "bot";
    nock("https://api.github.com")
      .post("/repos/uiureo/awesome-app/pulls/42/requested_reviewers")
      .query(true)
      .reply(200, (_, requestBody) => ({
        requested_reviewers: requestBody.reviewers.map((login) => ({ login })),
      }));

    it("returns pr that has reviewers", function (done) {
      const prs = [
        { assignee: { login: USER1, type: "User" } },
        { user: { login: USER2, type: "User" } },
        { user: { login: BOT, type: "Bot" } },
      ];
      this.client
        .assignReviewers({ number: 42 }, prs)
        .then(function (pr) {
          assert(pr.requested_reviewers.length === 2);
          assert(pr.requested_reviewers[0].login === USER1);
          assert(pr.requested_reviewers[1].login === USER2);

          done();
        })
        .catch(done);
    });
  });

  describe("#updatePR()", function () {
    nock("https://api.github.com/")
      .patch("/repos/uiureo/awesome-app/pulls/42")
      .reply(200, {
        title: "updated",
        number: 42,
      });

    it("updates a PR", function (done) {
      var pr = { number: 42 };
      this.client.updatePR(pr, { title: "updated" }).then(function (pr) {
        assert(pr.title === "updated");
        done();
      });
    });
  });
});

describe("Github Enterprise support", function () {
  before(function () {
    this.client = new GithubClient({
      owner: "uiureo",
      repo: "awesome-app",
      token: "token",
      endpoint: "https://ghe.big.company/api/v2",
    });
  });

  describe("#prepareReleasePR()", function () {
    nock("https://ghe.big.company")
      .post("/api/v2/repos/uiureo/awesome-app/pulls")
      .reply(201, {
        number: 42,
      });

    it("creates pr", function (done) {
      this.client
        .prepareReleasePR()
        .then(function (pr) {
          assert(pr.number === 42);
          done();
        })
        .catch(done);
    });
  });
});
