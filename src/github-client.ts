export {};

import request, { RequestResponse } from "request";
import parseLinkHeader from "parse-link-header";

interface Config {
  owner?: string;
  repo?: string;
  token?: string;
  head?: string;
  base?: string;
  endpoint?: string;
}

export interface PullRequest {
  title: string;
  body: string;
}

export default class GithubClient {
  private owner: string;
  private repo: string;
  private token: string;
  private head: string;
  private base: string;
  private endpoint: string;

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

  private pullRequestEndpoint() {
    return this.endpoint + "/repos/" + this.owner + "/" + this.repo + "/pulls";
  }

  private headers() {
    return {
      Authorization: "token " + this.token,
      "User-Agent": "uiur/github-pr-release",
    };
  }

  private get(url: string, query: object) {
    query = query || {};

    return new Promise((resolve, reject) => {
      request.get(
        {
          url: url,
          qs: query,
          headers: this.headers(),
          json: true,
        },
        (err, res) => {
          if (err) return reject(err);
          resolve(res);
        }
      );
    });
  }

  private post(url: string, body: object) {
    body = body || {};

    return new Promise((resolve, reject) => {
      request.post(
        {
          url: url,
          body: body,
          json: true,
          headers: this.headers(),
        },
        function (err, res, body) {
          if (err) return reject(err);

          resolve(res);
        }
      );
    });
  }

  private patch(url: string, body: object) {
    body = body || {};

    return new Promise((resolve, reject) => {
      request.patch(
        {
          url: url,
          body: body,
          json: true,
          headers: this.headers(),
        },
        function (err, res, body) {
          if (err) return reject(err);

          resolve(res);
        }
      );
    });
  }

  async prepareReleasePR() {
    const res: any = await this.post(this.pullRequestEndpoint(), {
      title: "Preparing release pull request...",
      head: this.head,
      base: this.base,
    });

    if (res.statusCode === 201) {
      return res.body;
    } else if (res.statusCode === 422) {
      const errMessage = res.body.errors[0].message;
      if (!errMessage.match(/pull request already exists/)) {
        return Promise.reject(new Error(errMessage));
      }
      const res2: any = await this.get(this.pullRequestEndpoint(), {
        base: this.base,
        head: this.head,
        state: "open",
      });

      return res2.body[0];
    } else {
      return Promise.reject(new Error(res.body.message));
    }
  }

  getPRCommits(pr) {
    let result = [];

    const getCommits = (page) => {
      page = page || 1;

      return this.get(
        this.pullRequestEndpoint() + "/" + pr.number + "/commits",
        {
          per_page: 100,
          page: page,
        }
      ).then(function (res: any) {
        const commits = res.body;
        result = result.concat(commits);

        const link = parseLinkHeader(res.headers.link);

        if (link && link.next) {
          return getCommits(page + 1);
        } else {
          return result;
        }
      });
    };

    return getCommits(null).catch(console.error.bind(console));
  }

  async collectReleasePRs(releasePR) {
    const commits = await this.getPRCommits(releasePR);
    const shas = commits.map((commit) => commit.sha);

    return await this.get(this.pullRequestEndpoint(), {
      state: "closed",
      base: this.head,
      per_page: 100,
      sort: "updated",
      direction: "desc",
    }).then(function (res: any) {
      const prs = res.body;

      const mergedPRs = prs.filter(function (pr) {
        return pr.merged_at !== null;
      });

      const prsToRelease = mergedPRs.reduce(function (result, pr) {
        if (
          shas.indexOf(pr.head.sha) > -1 ||
          shas.indexOf(pr.merge_commit_sha) > -1
        ) {
          result.push(pr);
        }

        return result;
      }, []);

      prsToRelease.sort(function (a, b) {
        return Number(new Date(a.merged_at)) - Number(new Date(b.merged_at));
      });

      return prsToRelease;
    });
  }

  assignReviewers(pr, prs) {
    const reviewers = prs
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

  updatePR(pr, data): Promise<PullRequest> {
    return this.patch(this.pullRequestEndpoint() + "/" + pr.number, data).then(
      (res: any) => res.body
    );
  }
}
