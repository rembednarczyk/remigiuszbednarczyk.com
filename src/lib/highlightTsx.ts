export interface Token {
  text: string;
  /** A `tk-*` class, or undefined for plain text. */
  cls?: string;
}

/**
 * A small, display-only highlighter for the source the view-source glitch
 * shows — the hero's content file (src/content/hero.json) and the TSX
 * fragments the component stories exercise.
 *
 * It is not a parser and does not try to be one: it colours comments, strings,
 * JSON keys, JSX tag and attribute names, the `{{placeholder}}` the page fills
 * in, and the identifiers inside a `{…}` expression — enough to read like an
 * editor. Real highlighting of a whole program is Shiki's job and a far
 * heavier dependency than a peek panel earns, so this stays a few hundred
 * bytes and is tested on the shapes the hero actually shows.
 *
 * The easter egg the peek prepends is a line comment; it takes its own warm
 * colour (`tk-egg`) so a reader's eye lands on it rather than on grey prose.
 */

const KEYWORDS = new Set([
  "import", "from", "export", "const", "let", "var", "return", "function",
  "if", "else", "for", "while", "new", "await", "async", "as", "satisfies",
  "interface", "type", "default", "typeof", "in", "of",
]);

/** A line comment that reads as the planted greeting, not ordinary scaffolding. */
const EGG = /source\?|portfolio/i;
/** A `{{name}}` the content carries and the page substitutes at render. */
const PLACEHOLDER = /\{\{[^}]*\}\}/g;

export function highlightTsx(code: string): Token[] {
  const tokens: Token[] = [];
  const push = (text: string, cls?: string) => {
    if (text) tokens.push(cls ? { text, cls } : { text });
  };

  let i = 0;
  let brace = 0; // depth of `{…}`, so identifiers inside an expression colour
  const n = code.length;

  while (i < n) {
    const rest = code.slice(i);
    const c = code[i];

    // Comments: JSX `{/* … */}`, block `/* … */`, line `// …`.
    if (rest.startsWith("{/*")) {
      const end = code.indexOf("*/}", i);
      const to = end === -1 ? n : end + 3;
      push(code.slice(i, to), "tk-cm");
      i = to;
      continue;
    }
    if (rest.startsWith("/*")) {
      const end = code.indexOf("*/", i + 2);
      const to = end === -1 ? n : end + 2;
      push(code.slice(i, to), "tk-cm");
      i = to;
      continue;
    }
    if (rest.startsWith("//")) {
      const end = code.indexOf("\n", i);
      const to = end === -1 ? n : end;
      const text = code.slice(i, to);
      push(text, EGG.test(text) ? "tk-egg" : "tk-cm");
      i = to;
      continue;
    }

    // Strings, including template literals (whole span, no interpolation).
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < n && code[j] !== c) {
        if (code[j] === "\\") j += 1;
        j += 1;
      }
      const end = Math.min(j + 1, n);
      const str = code.slice(i, end);
      // A `:` right after a string makes it a JSON key — a field name, not a
      // value — so it takes the tag colour, the way a JSX attribute does.
      if (/^\s*:/.test(code.slice(end))) {
        push(str, "tk-tag");
      } else {
        // A value: pull any `{{placeholder}}` out as an expression, the way
        // the page treats it; the rest of the span is a plain string.
        let k = 0;
        PLACEHOLDER.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = PLACEHOLDER.exec(str))) {
          push(str.slice(k, match.index), "tk-str");
          push(match[0], "tk-expr");
          k = match.index + match[0].length;
        }
        push(str.slice(k), "tk-str");
      }
      i = end;
      continue;
    }

    // JSX tag: `<name`, `</name`, colouring the punctuation and the name.
    if (c === "<" && /[A-Za-z/]/.test(code[i + 1] ?? "")) {
      push("<", "tk-punct");
      i += 1;
      if (code[i] === "/") {
        push("/", "tk-punct");
        i += 1;
      }
      const name = /^[A-Za-z][\w.]*/.exec(code.slice(i));
      if (name) {
        push(name[0], "tk-tag");
        i += name[0].length;
      }
      continue;
    }

    if (c === "{") {
      brace += 1;
      push(c, "tk-punct");
      i += 1;
      continue;
    }
    if (c === "}") {
      brace = Math.max(0, brace - 1);
      push(c, "tk-punct");
      i += 1;
      continue;
    }
    if (c === ">" || c === "/" || c === "(" || c === ")") {
      push(c, "tk-punct");
      i += 1;
      continue;
    }

    // Words: keyword, attribute name (`word=`), an identifier inside an
    // expression, or plain JSX text.
    if (/[A-Za-z_$]/.test(c)) {
      const word = /^[\w$]+/.exec(rest)![0];
      const gap = /^\s*/.exec(code.slice(i + word.length))![0];
      const next = code[i + word.length + gap.length];
      let cls: string | undefined;
      if (KEYWORDS.has(word)) cls = "tk-kw";
      else if (next === "=") cls = "tk-attr";
      else if (brace > 0) cls = "tk-expr";
      // A capitalised word outside `<…>` is JSX text, not a component — the
      // component case is the tag branch above, which fires only after `<`.
      push(word, cls);
      i += word.length;
      continue;
    }

    if (/[0-9]/.test(c)) {
      const num = /^[\d.]+/.exec(rest)![0];
      push(num, "tk-expr");
      i += num.length;
      continue;
    }

    // Whitespace and the rest of the punctuation, uncoloured.
    const run = /^[^\w<>{}()"'`/]+/.exec(rest);
    if (run) {
      push(run[0]);
      i += run[0].length;
    } else {
      push(c);
      i += 1;
    }
  }

  return tokens;
}
