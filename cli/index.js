#!/usr/bin/env node

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 [repo]")
  .example("$0 uiur/github-pr-release --head master --base production", "")
  .demandCommand(1)
  .default("head", "master")
  .default("base", "production").argv;

const createReleasePR = require("../");

async function main() {
  const repoInput = argv._[0];
  const [owner, repo] = repoInput.split("/");
  const config = {
    owner,
    repo,
    head: argv.head,
    base: argv.base,
  };

  const pullRequest = await createReleasePR(config);

  console.log(pullRequest.html_url);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
