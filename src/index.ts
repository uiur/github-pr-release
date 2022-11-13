import GithubClient, { PullRequest } from "./github-client";
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

export default async function createReleasePR(
  config: ReleaseConfig
): Promise<PullRequest> {
  const client = config.githubClient || new GithubClient(config);

  const releasePR = await client.prepareReleasePR();
  const prs = await client.collectReleasePRs(releasePR);
  const templatePath =
    config.template || path.join(__dirname, "release.mustache");
  const template = fs.readFileSync(templatePath, "utf8");
  const message = releaseMessage(template, prs);

  client.assignReviewers(releasePR, prs);
  return client.updatePR(releasePR, message);
}

module.exports = createReleasePR;
