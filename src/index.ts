import GithubClient from "./github-client";
import path from "path";

import fs from "fs";
import releaseMessage from "./release-message";

interface ReleaseConfig {
  token?: string;
  owner?: string;
  repo?: string;
  head?: string;
  base?: string;
  template?: string;
  githubClient?: GithubClient;
}

export default function createReleasePR(config: ReleaseConfig): Promise<any> {
  const client = config.githubClient || new GithubClient(config);

  return client.prepareReleasePR().then(function (releasePR) {
    return client.collectReleasePRs(releasePR).then(function (prs) {
      const templatePath =
        config.template || path.join(__dirname, "release.mustache");
      const template = fs.readFileSync(templatePath, "utf8");
      const message = releaseMessage(template, prs);

      client.assignReviewers(releasePR, prs);
      return client.updatePR(releasePR, message);
    });
  });
}
