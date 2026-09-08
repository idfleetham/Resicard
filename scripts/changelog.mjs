/**
 * Regenerates docs/CHANGELOG.md from the commit history.
 *
 * The Replit brief used to carry a version number in its title, and it went
 * stale twice because a find-and-replace missed it. So the brief no longer
 * mentions versions at all and this file carries them instead, generated rather
 * than typed, because a hand-maintained changelog goes stale the same way.
 *
 *   npm run docs:changelog
 */
import { execSync } from "child_process";
import { writeFileSync } from "fs";

const RAW = execSync("git log --pretty=format:'%s%x09%b%x1e' -n 60").toString();

const header = [
  "# Changelog",
  "",
  "Newest first, generated from the commit history with `npm run docs:changelog`.",
  "The Replit brief in `docs/REPLIT-BRIEF.md` describes how the codebase works and",
  "does not change between archives; this file is where the version-specific detail",
  "lives.",
  "",
];

const sections = RAW.split("\x1e")
  .map((entry) => entry.trim().replace(/^'|'$/g, ""))
  .filter(Boolean)
  .flatMap((entry) => {
    const [subject, body = ""] = entry.split("\t");
    if (!subject) return [];
    const text = body
      .split("\n")
      .filter((l) => !/^(Co-Authored-By:|Claude-Session:|🤖)/.test(l))
      .join("\n")
      .trim();
    return [`## ${subject.trim()}`, "", ...(text ? [text, ""] : [])];
  });

writeFileSync("docs/CHANGELOG.md", [...header, ...sections].join("\n") + "\n");
console.log("docs/CHANGELOG.md written");
