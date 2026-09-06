import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CAREER_START, cvData, experienceData, fullCertificationsList, recognitionData } from "../src/data/portfolioFacts";

/**
 * public/llm.txt is written for language models rather than people, and it
 * restates facts that live in portfolioFacts. It is a plain text file, so
 * unlike the JSON-LD beside it, nothing generates it: these hold it to the
 * data instead.
 *
 * The asymmetry is the point. A person notices when the page is wrong.
 * Nobody reads their own machine-readable profile, so a stale employer or a
 * dropped credential is what every crawling model is told, for as long as
 * it takes somebody to think of checking.
 */

const root = resolve(__dirname, "..");
const llm = readFileSync(resolve(root, "public/llm.txt"), "utf8");

describe("the profile language models fetch", () => {
  it("gives the same links as the page", () => {
    expect(llm).toContain(`https://${cvData.header.linkedin}`);
    expect(llm).toContain(`https://${cvData.header.website}`);
  });

  it("covers every job, with the period the page shows", () => {
    // The dash differs between the two surfaces: the page renders "2021 -
    // Present" and prose reads better as "2021-Present". Only the years are
    // compared, since that is the fact rather than the punctuation — but on
    // the line that names the role. Held anywhere in the file, a year is
    // nearly always there: the bughunt deleted the whole Application Tester
    // line and 2014 was still in the credentials, 2017 in the next job.
    // The page's role can carry a second half after " / " (an assignment)
    // that the profile leaves out, so the first half is what the line has
    // to name.
    const lines = llm.split("\n");
    const missing = experienceData
      .map((job) => ({
        role: job.role.split(" / ")[0],
        years: job.period.split(/\s*[-–]\s*/).map((p) => p.trim()),
      }))
      .filter(
        ({ role, years: [from, to] }) =>
          !lines.some((line) => line.includes(role) && line.includes(from) && line.includes(to)),
      );

    expect(experienceData.length).toBeGreaterThan(3);
    expect(
      missing,
      `these periods appear on the page and not in llm.txt: ${JSON.stringify(missing)}`,
    ).toEqual([]);
  });

  it("names every award the page shows", () => {
    recognitionData.forEach((award) => {
      expect(llm, `llm.txt does not mention "${award.title}"`).toContain(award.title);
      expect(llm).toContain(award.issued);
    });
  });

  /**
   * Credentials are the most checkable thing about a testing career and the
   * one a model summarising this profile would most want. They were missing
   * from llm.txt entirely.
   */
  it("lists every certification the page lists", () => {
    const named = fullCertificationsList.flatMap((group) =>
      group.items.map((item) => item.name),
    );

    expect(named.length).toBeGreaterThan(5);
    named.forEach((name) =>
      expect(llm, `llm.txt does not mention "${name}"`).toContain(name),
    );
  });
});

describe("the years of experience the hero states", () => {
  /**
   * getYearsOfExperience counts from CAREER_START, and the existing test for
   * it asserts the year is 2014, which restates the constant rather than
   * checking it. Add a job that began earlier, or edit the oldest period,
   * and the figure quietly under-reports with nothing to say so.
   */
  it("counts from the year the oldest job began", () => {
    const earliest = Math.min(
      ...experienceData.map((job) => Number(/(\d{4})/.exec(job.period)![1])),
    );

    expect(CAREER_START.getUTCFullYear()).toBe(earliest);
  });

  it("reads a real year out of every period, so the check above has data", () => {
    experienceData.forEach((job) =>
      expect(job.period, `no year in "${job.period}"`).toMatch(/\d{4}/),
    );
  });
});
