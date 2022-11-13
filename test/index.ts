export {};

import assert from "power-assert";
import release from "../src";
import GithubClient from "../src/github-client";

class MockGithubClient extends GithubClient {
  async prepareReleasePR() {
    return { number: 42 };
  }

  async collectReleasePRs() {
    return [
      { number: 42, title: "foo", user: { login: "uiureo" } },
      { number: 43, title: "bar", user: { login: "hiroshi" } },
    ];
  }

  async updatePR(releasePR, message) {
    return message;
  }

  async assignReviewers(releasePR, prs) {
    return { requested_reviewers: [] };
  }
}

describe("release()", function () {
  it("generates a default PR message", function (done) {
    release({ githubClient: new MockGithubClient({}) })
      .then(function (result) {
        assert(/^Release/.test(result.title));
        assert(/#42 foo @uiureo/.test(result.body));
        assert(/#43 bar @hiroshi/.test(result.body));
      })
      .then(done, done);
  });

  it("uses the specified template in config", function (done) {
    release({
      githubClient: new MockGithubClient({}),
      template: "./test/fixtures/test.mustache",
    })
      .then(function (result) {
        assert(result.title === "party party");
      })
      .then(done, done);
  });
});
