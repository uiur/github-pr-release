export {};

import assert from "power-assert";
import release from "../src";
import GithubClient from "../src/github-client";

class MockGithubClient extends GithubClient {
  prepareReleasePR() {
    return Promise.resolve({ number: 42 });
  }
  collectReleasePRs() {
    return Promise.resolve([
      { number: 42, title: "foo", user: { login: "uiureo" } },
      { number: 43, title: "bar", user: { login: "hiroshi" } },
    ]);
  }
  updatePR(releasePR, message) {
    return Promise.resolve({ pr: releasePR, message: message });
  }
  assignReviewers(releasePR, prs) {
    return Promise.resolve({ requested_reviewers: [] });
  }
}

describe("release()", function () {
  it("generates a default PR message", function (done) {
    release({ githubClient: new MockGithubClient({}) })
      .then(function (result) {
        assert(/^Release/.test(result.message.title));
        assert(/#42 foo @uiureo/.test(result.message.body));
        assert(/#43 bar @hiroshi/.test(result.message.body));
      })
      .then(done, done);
  });

  it("uses the specified template in config", function (done) {
    release({
      githubClient: new MockGithubClient({}),
      template: "./test/fixtures/test.mustache",
    })
      .then(function (result) {
        assert(result.message.title === "party party");
      })
      .then(done, done);
  });
});
