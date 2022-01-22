import { render } from "mustache";
import moment from "moment";

interface ReleaseMessage {
  title: string;
  body: string;
}

export default function releaseMessage(
  template: string,
  prs: any[]
): ReleaseMessage {
  let version = moment().format("YYYY-MM-DD HH:mm:ss");

  prs.some(function (pr) {
    const m = pr.title.match(/Bump to (.*)/i);

    if (m) {
      version = m[1];
      return true;
    }
  });

  const text: string = render(template, { version: version, prs: prs });
  const lines = text.split("\n");
  const title = lines[0];
  const body = lines.slice(1);

  return {
    title: title,
    body: body.join("\n"),
  };
}
