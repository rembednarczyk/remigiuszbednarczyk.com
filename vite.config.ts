import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ResolvedConfig } from "vite";
import { lastContentChange, resolveContentDate } from "./scripts/contentDate";
import { PRINT_QR_CARD_FILE, printQrCard } from "./scripts/printQrCard";
import { countLastmod, stampSitemap } from "./scripts/sitemap";
import { injectPersonSchema } from "./scripts/structuredData";
import { VOCABULARY } from "./src/data/vocabulary";

/**
 * The day the content last changed — the last commit touching src/content,
 * or today when git cannot say (scripts/contentDate.ts). One value, read
 * once, and given to everything that dates the site: the sitemap's lastmod,
 * the footer, the printed CV. A build that dated those three from three
 * clocks would be a page disagreeing with itself.
 */
const CONTENT_UPDATED = resolveContentDate(lastContentChange(__dirname), new Date());
const CONTENT_UPDATED_DAY = CONTENT_UPDATED.toISOString().slice(0, 10);

/**
 * Where the site's own build writes, for the plugins that write beside the
 * page — or null when this is not the site's build.
 *
 * Three plugins wrote into the repository's `dist/` by name, whatever the
 * build was. Storybook builds through this same config, and the tests that
 * build (`tests/sourceMaps.test.ts`) build into a temporary directory with
 * `--outDir`; the bughunt measured `dist/sitemap.xml`, `cv-qr-code.png` and
 * `vocabulary.json` freshly stamped by a test run under an `index.html`
 * from the night before, and two tests comparing against that mixed build.
 * The directory is the resolved config's, and the build is the site's when
 * its input is Vite's default — the page's index.html — rather than the
 * iframe Storybook names.
 */
function siteBuild(): { configResolved: (config: ResolvedConfig) => void; dir: () => string | null } {
  let dir: string | null = null;
  return {
    configResolved(config) {
      const input = config.build.rollupOptions.input;
      dir = input === undefined ? path.resolve(config.root, config.build.outDir) : null;
    },
    dir: () => dir,
  };
}

/** Dates the sitemap from the content's last change, so it cannot fall behind
 *  the content — and does not run ahead of it on a code-only deploy. */
function stampSitemapPlugin(): Plugin {
  const built = siteBuild();
  return {
    name: "stamp-sitemap",
    apply: "build",
    configResolved: built.configResolved,
    closeBundle() {
      const dist = built.dir();
      if (dist === null) return;
      const file = path.resolve(dist, "sitemap.xml");
      if (!fs.existsSync(file)) return;

      const xml = fs.readFileSync(file, "utf8");
      if (countLastmod(xml) === 0) {
        this.warn("sitemap.xml has no <lastmod> to stamp");
        return;
      }

      fs.writeFileSync(file, stampSitemap(xml, CONTENT_UPDATED));
    },
  };
}


/**
 * Draws the card served at /cv-qr-code.png.
 *
 * That address is on material this site does not control and cannot recall,
 * and it answered 404 from the day the two files behind it — a PNG and an
 * SVG, for a QR the print template had stopped rendering — were taken out
 * as assets nothing pointed at.
 *
 * It comes back drawn rather than committed. A generated artifact checked
 * into the repository is free to drift from what generated it; this one is
 * made at build time from PRINT_URL, so the address it shows and the code
 * it draws cannot disagree. Written straight into dist/ and never into
 * public/, which is also why it needs no exemption from the ratchet that
 * removed its predecessors: nothing in public/ is what that check reads.
 *
 * The build fails rather than shipping a deploy where this address is
 * broken again. It came back once; it should not go quiet twice.
 */
function printQrCardPlugin(): Plugin {
  const built = siteBuild();
  return {
    name: "draw-print-qr-card",
    apply: "build",
    configResolved: built.configResolved,
    closeBundle() {
      // Storybook builds through this same config and has no dist/ of the
      // site's shape to write into; siteBuild says so.
      const dist = built.dir();
      if (dist === null) return;

      fs.writeFileSync(path.resolve(dist, PRINT_QR_CARD_FILE), printQrCard());
    },
  };
}

/**
 * Serves the names an editor is allowed to choose from, at /vocabulary.json.
 *
 * The content editor is a separate program in a separate repository. It has
 * to offer an icon for a new card and a shape for a new section, and the
 * lists live in TypeScript, which it never compiles. Its alternatives were
 * a second copy of every list — the failure this repository has a ratchet
 * for, `declaredDomain`, because one address once lived in eight places —
 * or nothing, and a free-text field that lets an owner type a name the site
 * will throw on.
 *
 * Emitted rather than committed, like the print QR card and for the same
 * reason: a generated file checked in is free to drift from what generated
 * it. This one is written from src/data/vocabulary.ts on every deploy, and
 * the three registries are held to that module by the compiler, so what
 * the editor is told and what the site accepts cannot disagree.
 */
export const VOCABULARY_FILE = "vocabulary.json";

function vocabularyPlugin(): Plugin {
  const built = siteBuild();
  return {
    name: "serve-vocabulary",
    apply: "build",
    configResolved: built.configResolved,
    closeBundle() {
      // Storybook builds through this same config and has no dist/ of the
      // site's shape to write into; siteBuild says so.
      const dist = built.dir();
      if (dist === null) return;

      fs.writeFileSync(
        path.resolve(dist, VOCABULARY_FILE),
        `${JSON.stringify(VOCABULARY, null, 2)}\n`,
      );
    },
  };
}

/**
 * Writes the schema.org Person from the data the page renders.
 *
 * It was typed out by hand beside the same facts in the data module, with
 * nothing holding the two together, and structured data is the one surface
 * whose drift nobody would notice: it is written for crawlers and read by
 * no one who could report it.
 */
const APP_INDEX = path.resolve(__dirname, "index.html");

function structuredDataPlugin(): Plugin {
  return {
    name: "structured-data",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        // Storybook builds through this same config and its own HTML entry
        // has no such tag, so the transform is scoped to the site's page.
        // Anything else is left alone rather than rejected.
        if (path.resolve(ctx.filename) !== APP_INDEX) return html;

        return injectPersonSchema(html);
      },
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      structuredDataPlugin(),
      stampSitemapPlugin(),
      printQrCardPlugin(),
      vocabularyPlugin(),
    ],
    // The same day the sitemap is stamped with, for the page to show. Defined
    // rather than put in the environment so it cannot be set to one thing
    // here and another in CI.
    define: {
      "import.meta.env.VITE_CONTENT_UPDATED": JSON.stringify(CONTENT_UPDATED_DAY),
    },
    build: {
      /**
       * Published, deliberately.
       *
       * Without maps every frame of a production stack reads
       * `at bl (index-DeyIveWb.js:17:72594)`, which locates nothing: the
       * error report says what broke and never where. The usual argument
       * against publishing them is that they expose the source, and this
       * source is already public in the repository the site is built from.
       *
       * They cost visitors nothing. A browser fetches a .map only when
       * devtools are open, so the download is paid by whoever is debugging.
       */
      sourcemap: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      hmr: process.env["DISABLE_HMR"] !== "true",
    },
  };
});
