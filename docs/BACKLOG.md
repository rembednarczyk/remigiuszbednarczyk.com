# Backlog

Work that is understood but not done, with enough detail that picking it up
costs nothing. An item leaves this file when it is finished or when it is
decided against — not when it is forgotten.

---

## Merged branches delete themselves

The `claude/*` and `dependabot/*` branches piled up — thirty-odd — because
nothing removed them once their pull request merged. GitHub has a setting for
exactly this ("Automatically delete head branches"), but it is a setting and
not something the repository states about itself: easy to leave off, invisible
when it is, and unreachable from the tools that do the merging here. So the
behaviour is a workflow instead — `.github/workflows/delete-merged-branch.yml`
— where it is reviewed and holds whether or not the box is ticked. It deletes a
PR's head branch when the PR merges (a fork's branch and an unmerged close are
left alone), and carries a manual `workflow_dispatch` that sweeps the branches
of every already-merged PR, to clear the pile the setting's absence left. The
delete runs on GitHub's runner as an ordinary authenticated push, so it is not
subject to the local push restriction that returns 403 here.
`tests/workflowPins.test.ts` holds it to the same pin-and-permissions rule as
the CI workflow.

---

## The Dependabot batch, and the three majors that are not ready

Dependabot's open PRs were taken together on one lockfile rather than merged
one at a time — they all touch the lockfile or the one workflow file and would
conflict pairwise. Applied: the minor-and-patch group (Storybook 10.5 → 10.6,
testing-library, the type packages, lucide-react, motion, globals — the icon
registry test holds lucide, the reduced-motion test holds motion) and the four
SHA-pinned action bumps (checkout v7, setup-node v7, upload-pages-artifact v5,
deploy-pages v5).

Three majors were held, each measured rather than guessed:

- **TypeScript 7.** `tsc --noEmit` passes clean on 7, but typescript-eslint 8
  refuses to load under it ("does not support TS 7.0", peer `<6.1.0`; TS ≥7.1
  support still open upstream). Adopting 7 means dropping type-aware lint, which
  is the wrong trade. Waits for a typescript-eslint release that accepts 7.
- **ESLint 10 (and `@eslint/js` 10).** Three of this repository's ESLint plugins
  — import, jsx-a11y and react — still peer-cap at ESLint 9, and the dependency
  gate forbids the `--legacy-peer-deps` that would paper over it. ESLint 10 waits
  for those three to publish a release that accepts it. (The editor took ESLint 10
  in the same batch because it carries none of those three plugins.)
- **@typescript-eslint 8.68 → 8.69.** Trivial, and held only here: this
  environment's npm would not resolve the meta package to 8.69 (it fell back to
  8.68 and conflicted), and a bump that cannot be built locally is not one to
  claim. All three are published at 8.69, so Dependabot's own group resolves it —
  its PR is left to carry that one patch once the rest of its group has landed.

---

## A provenance mark on the printed CV, and why it is not hidden

The CV is the one artifact this site hands a stranger to keep, and the theft
worth guarding against is not of the file but of the career in it: a lifted
copy with the name at the top swapped for someone else's. The obvious answer
was a mark placed where a name-swapper would not look — white, out-of-flow
text riding the print's text layer, invisible on the sheet but extractable
when the PDF's text is read. It was built and measured: a clip-rect box and a
zero-width steganographic weave were both stripped by Chrome's print pipeline,
an absolutely positioned box collapsed to nothing across the CV's six pages,
and a clipped white line in the ordinary flow was what survived — proven,
against the real document rather than a one-page fixture that lied about it.

**Then it was pulled out, because the whole idea was wrong for this artifact.**
Near-invisible body text — white on white, a one-pixel font, anything
positioned off the page — is exactly the signature an applicant tracking
system flags as keyword stuffing, and an ATS that finds it can drop the CV or
blacklist the sender. A safeguard that gets the document auto-rejected is
worse than none. So nothing here hides text in the page's body; the origin is
carried on two channels that are safe to submit:

- **The PDF's Title metadata.** A browser printing to PDF copies the page
  title into the file's Title and — measured — drops the `<meta>` author,
  subject and keywords it is also given, so Title is the one channel. It is
  not body text, so an ATS reading the content never meets it, and editing the
  visible page does not touch it. `usePrintProvenanceTitle` tags the title on
  `beforeprint` and restores it on `afterprint`, so only the printed document
  carries it and the live page keeps the title search engines index.
  `page.pdf()` fires `beforeprint` the same way the browser's print command
  does, so `scripts/runPrintCheck.ts` reads the tagged Title back and fails if
  it stops naming the origin (`titleMissingProvenance`). Overlookable, and
  survives a name-swap; a determined thief can strip it with a metadata editor.

- **A plain visible footer.** Ordinary dark text at an ordinary size that
  `CVTemplate` renders and an ATS reads as the professional detail it looks
  like. A name-swapper can see and delete it — the price of a mark that is
  safe to submit — but a careless one may leave it.

`src/lib/provenance.ts` derives both from the CV's own facts, and
`tests/provenance.test.tsx` also guards the reason the white version went: it
fails if anything the CV renders is white, sub-visible, or clipped to nothing,
so the hidden mark cannot creep back.

**What this does not claim.** It survives a name-swap and a reformat, not a
retype: a thief who re-keys every word carries nothing across, and no
in-document mark can change that.

---

## The fourth pass — a security review of both surfaces

Run on 6 September 2026 as a security-focused pass, two lanes: this site's
client surface, and the editor's write path (recorded in the editor's own
docs/BACKLOG.md). Neither found an exploitable vulnerability. The bundle
carries no secret, there is no raw-HTML escape hatch or other injection
sink anywhere in the source, React 19 neutralises a `javascript:` URL (proven
against the real renderer), the preview seam pins its origin and only ever
renders received content as React text and props, and the analytics tag
reaches the network only after consent on every path. Two low-severity site
items came out of it, both fixed.

**The address in the sourcemap.** The contact address is fragmented so a
harvester reading the page's text nodes cannot join it — but ContactParts'
own comment spelled the assembled address out in prose, and `sourcemap:
true` ships that comment in a `.js.map` served beside the bundle, a plain URL
a harvester can fetch. Measured: the built `.js.map` carried the whole
address once, from that comment; the `.js` did not. The two rationales never
met — the sourcemap was justified on "the source is already public in the
repo", while the fragmentation's threat model is a harvester fetching
deployed URLs, which the map is one of. The comment describes the shape
without writing the address now, and the shipping test scans the `.js.map`
as well as the `.js`.

**The JSON-LD escape.** `injectPersonSchema` dropped `JSON.stringify` output
straight between `<script>` tags, and `JSON.stringify` escapes neither `<`
nor `/`, so a value holding `</script>` would close the tag. Every value is
build-time data from portfolioFacts today, so nothing reaches it — but the
escape (`<`, `>`, `&` to their `\u` forms) closes the class rather than
trusting that.

**What it teaches.** Both site findings are the same shape as the crashes
the earlier rounds found: an output channel — a sourcemap served to the
public, a `<script>` body — carrying data whose escaping or exposure nobody
had checked at the point it leaves. The proof was the built artifact grepped
and the hostile value driven through the escaper, not a reading that it
looked contained.

## The second adversarial bughunt — the areas the first did not reach

Run on 6 September 2026, the same way as the first and over the ground it
left: five read-only passes, none touching the repositories, each proving or
disproving and rejecting its own false positives. The first round took the
preview seam, the editor's app and server surface, the editor's form, and
the tests; this one took the site's real render path and its data and CV, the
build plugins and the measurement scripts, the site's hooks and routing and
consent and the always-on UI, the editor's pure library functions, and the
editor's server internals and auth crypto. The editor's half is recorded in
its own docs/BACKLOG.md.

**Two that would have been felt.** A stray `%` in the address hash — the kind
of thing a shared link or a crawler carries — made the decode throw in the
page's mount effect, and the throw reached the boundary around the whole app
whose only way out is a reload of the same address: a loop that replaced the
page with its fallback for good. And the editor's server computed its route
with a parser that rejects targets Node's own HTTP parser accepts — a double
slash, a backslash — so one such request threw, uncaught, in the listener and
the process exited: an unauthenticated caller could keep it down by
re-sending. Both were measured, not read: the hash crash in a jsdom render,
the server crash against the running bundle, twice.

**Three quieter ones.** The scroll-to-top button, mounted only once the
consent banner is answered, decided its visibility from the next scroll
alone, so it was absent exactly when a reader who had scrolled deep accepted
the banner — it reads the scroll position at the first render now. The
contact teaser wore a hand-typed number, the one section number the rest of
the page had been freed of, drifting the moment a band was added or removed.
A project card that mixed a labelled link with a bare one dropped the label
it had, deciding all-or-nothing where it should decide per link. And the
target-size gate held its count with a floor where the focus gate had learnt
to hold it exact — a truncated sweep could pass by growing elsewhere.

**Raised and kept.** The hero metric tiles carry a press cursor and press
feedback with no handler behind them — the false affordance the portrait
image documents removing. The owner keeps it as intentional decoration on
the tiles; it is written here so the next reader knows it was seen and
decided, not missed.

**What the passes rejected, so a third round need not re-hunt it.** The
content-date ISO slicing (correct against the committer's own day, measured
off the built sitemap); the sitemap and JSON-LD generation (well-formed, no
regex carryover); the comment-stripper's still-open cases (no regex literal
or nested template in the scanned tree to trip them); the print-QR card and
the print/motion/reveal/lighthouse verdict functions (each guards its own
blind spot); the plugins' bundle ordering. In the runtime UI: the auto-print
latch, the scroll-lock nesting, the modal focus return, the consent state
machine and the idempotent tag load, the particle canvas cleanup and
reduced-motion. In the editor's libs: the path operations' immutability and
special-character round-trip, the fold renumber arithmetic (all 36 move
pairs on a six-entry list, against a splice ground truth), the history
coalescing, the diff aliasing, the search ranking, the line boundary. In the
server: the HMAC session (no length-extension, key genuinely changes with
the password, constant-time compare, expiry boundaries), the CSP on every
error path, the traversal defences, the throttle counters (the `*`-caller
amplifier disproven by measurement), the body cap.

**What it teaches, for Part 0.** The two crashes were both a parser or a
decoder handed input from outside — a URL hash, a request target — with no
guard, in a place a throw does not stay local: a mount effect under the app
boundary, a request listener with no catch. The lesson the checks lane taught
last round has a runtime twin: an input the code does not control needs a
guard at the point it enters, and the proof is the malformed input driven
through the real thing, not a reading that it looks handled.

## The first adversarial bughunt — what it found, what it rejected, what was left

Run on 6 September 2026 the way *Ways of Working* Part 5 describes: four
read-only passes over separate slices, each trying to prove the code wrong
and rejecting its own false positives before reporting, and none of them
fixing anything — every fix came back through the ordinary loop, red first,
with a mutation table in its pull request. The lanes were the site's preview
seam, the editor's app wiring and server, the editor's form, and the checks
themselves in both repositories. Thirty-four findings; thirty-one fixed in
four pull requests — the site's #119 (preview) and #120 (checks), the
editor's #54 (app) and #55 (form, and the editor's two checks) — and three
accepted with their reasons written down, below. The editor's own
`docs/BACKLOG.md` holds the editor's half of this record.

**The preview seam, six.** Certification cards said they were edited in
`certifications.json` while the page draws `certificationsSummary.json` —
green in the suite only because both files happened to hold three groups.
Content that threw at render rather than in `buildContent` unmounted the
whole preview, silently, until a reload; the page layout is validated now
and a boundary inside the preview keeps the last good page and reports the
error. A scheme-less editor origin in `VITE_PREVIEW_EDITOR_ORIGIN` parsed to
the opaque origin `"null"`, which is exactly what a sandboxed or `file://`
page sends. The about band could not be highlighted. The preview ran the
site's analytics, banner and auto-print. Two bands of one shape collided on
React keys.

**The checks, twelve — ten the site's.** Every one was a test green on
something other than its claim: a resource hint and a script tag held while
an inline loader for the same host passed; a scan that never read the one
file its own comment named; two years held anywhere in a file; comments
read as imports; a "not registered" accepted from anywhere in a document; a
hook held by its doc comment; three literal counts under a comment promising
nobody would have to remember them; two assertions that had never once run
in CI because `test` precedes `build`; three plugins writing into the
repository's own dist directory whatever the build; and five numbers in prose that the
code had moved past. The two that were the editor's — a vocabulary parser
reading half of every list, and throttle numbers held by no test — are in
the editor's file.

**Rejected by the passes, so not to be re-hunted.** The honeypot cannot be
autofilled (a checkbox). `originAllowed` on a trailing path, an uppercase
host or a default port: `new URL().origin` normalises all three the way
`event.origin` does. The editing outline is not clipped by the card's own
`overflow-hidden`. `pickAt` on the navigation, the modal, the hero buttons
and the skip link. A stale highlight after a redraw. Every typo the facts
builder can be handed throws inside `buildContent` and is reported.
`tests/exportUse.test.ts` counts a same-named identifier in another file as
a consumer — a scratch program found zero such coincidences today, so the
mechanism is weak and there is no defect. `it.each` over a possibly empty
list: every one asserts the length first. The preview path with a trailing
slash shows the 404 view, by exact match — noted, not a defect.

**Accepted, not fixed, and why.** The editor skips its walk to a band for a
second after a click in the preview, which also skips a walk the owner asks
for by clicking the sidebar in that second: the owner is already looking at
the right place, and recording which anchor the pick opened is the fix if it
ever bites. The editor's login throttle keys on the first `x-forwarded-for`
entry, on the strength of Render prepending; if the platform appends, the
per-caller limit is the attacker's to choose and only the global one holds.
Not measured on Render yet — one request from a known address would settle
it, and the last entry or the socket's own address is the change if it
appends. The
editor names the site's origin twice, in its content policy and in its
preview module, so a build pointed anywhere else is framed by nothing and
says so nowhere; production points at the live site, and one source is a
small change the next time either is touched.

**What the checks lane teaches, for Part 0.** A test that reads source is
green on whatever the source says, and this repository writes comments that
say exactly what the code does — which is the same string. The mutation the
PR template asks for has to be a mutation of the *defect the check names*,
not of the check: put the loader back, delete the import, remove the call,
and watch. Ten of twelve had never been shown their defect. And a number in
prose is a claim nothing holds: the count comes from the constant or the
sentence does not count.

## Tell the owner whether a save in the editor reached the page

Written on 4 September 2026, the day of the first real edit made through
the content editor, because what happened is the shape of every edit to
come and nothing in either repository says so.

The editor commits straight to `main`. That commit — a second edition added
to the TestingLab card — turned `main` red twice, and neither time was the
content wrong. First, axe: the "Recurring programme · N editions" line
renders only from two editions on, so its 3.98:1 colour had never been on a
page that any check looked at; the owner's edit was the first render that
could fail it. Second, the recorded control count in
`scripts/runFocusIndicator.ts`: one more link is one more control, and the
count is recorded rather than bounded so that growth is a decision — which
means a save from the editor can need a change to the code before it
deploys. Both are as designed. What is not designed is what the owner saw:
"Saved.", then nothing. The deploy was skipped, the words sat on `main` and
not on the page, and the owner found out by asking an hour later.

Four ways to close the gap, cheapest first, none decided:

1. **No code.** GitHub mails whoever pushed when a workflow run fails, and
   the editor's commits are made with the owner's own token, so that mail
   may already be going out. Check the notification setting before building
   anything; if it is on, this item may be finished already.
2. **The editor says what happened next.** After a save, ask the Actions API
   for the run on that commit (`GET /repos/{owner}/{repo}/actions/runs?head_sha=`)
   through the server, which needs `actions: read` on the fine-grained token
   it already holds, and show one line: deploying, live, or failed with a
   link to the log. One endpoint, one status; the same shape as the sha check
   the save already does.
3. **Count content's controls apart from the code's.** A link the owner adds
   through the editor and a button a developer adds in a component are
   counted by the same number today. Counting the links the content produces
   separately — or bounding that part and recording only the chrome — would
   let a content save deploy without a code decision while a new control in
   the code still needs one. Weigh it against the entry below on guards on
   the page versus guards on the process: this one guards the page.
4. **Lint for the contrast class of failure before saving.** Probably not:
   that failure was the code's — a class on a line — not the content's, and
   the editor cannot see classes. Axe in Storybook is the right place for it;
   it caught it, one edit late.

The first is a five-minute check and should come before the second; the
third is a design question for the ratchet, not for the editor.

---

## Weigh a guard on the work against a guard on the page

Written after the shell-edit hook was registered, because the honest reading
of that episode is not flattering and is worth keeping.

That hook is 525 lines of script and tests, seven mentions across three
documents, two adversarial audits and a rewrite of its deciding into Python.
The whole target-size gate — which found 58 controls a visitor cannot
comfortably tap and fixed every one — is 397. The hook guards against a
class whose worst recorded outcome is redoing an edit that git still has.

The doctrine it was built on is sound: *a rule you cannot enforce
automatically is a wish*. What was missed is that the sentence has a second
branch. When enforcement is expensive and the violation is cheap, the honest
move is not a cleverer guard — it is to demote the rule to a preference and
stop writing it in three documents as though it were more.

So, before the next guard: ask whether it holds the page or the process. A
guard on the page earns its keep against what a visitor gets. A guard on the
process is paid for out of the same budget and returns less, so it has to be
cheap or it should not exist.

---

## Register the shell-edit hook — tried, and switched off again

Registered, on the owner's say-so, as a `PreToolUse` entry on `Bash`. The
permission classifier had refused this before and was right to: an agent
that decides for itself what it may intercept has nobody above it. Asked
for directly, it went through.

This paragraph said "tested twenty-one ways" until a later sweep counted
them: 43 that day, 28 the day the sentence was written, never 21. The number
was invented and then repeated in three places. It says no number now,
because a count in prose is the thing Part 2 tells you not to write down —
and `npx vitest run tests/shellEditGuard.test.ts` prints the current one.

What running it taught in its first two commands, which reading it had not
taught in two audits:

Its git rule read every token after the first `git` anywhere in a compound
command, so any path named later read as a path handed to `git checkout`. It
refused the command that was registering it. Every branch here is
`claude/<name>` and every session starts by making one, so the guard would
have blocked the first thing anyone did.

Then it refused the commit. A heredoc's body is data the shell never parses
as shell, but `shlex` parses it, and one apostrophe in a message is an
unbalanced quote — at which point a guard that fails closed refuses. Nearly
every commit message here has one.

Then a scratchpad path held in a shell variable, which it could not expand
and so refused — defensibly, since a guard that cannot resolve a path should
not guess. Then a `grep` whose pattern contained a `>` inside quotes: an
ordinary read, refused as a redirection, because the shell never parses that
`>` and the hook does.

Four refusals of ordinary work in about two hours, three of them fixed. At
the fourth the owner switched it off, and that was the right call rather
than a fifth patch. Every one was the same defect wearing a different
sleeve: the script parses shell text with regular expressions where a shell
parses it with a shell. Two adversarial audits had read that file and found
none of them.

The rule it enforces still stands in `CLAUDE.md`, held by attention, and
all three documents say so rather than implying otherwise. The file and its
65 tests stay unregistered: what it cost and what it caught is the record,
and the entry above this one is the lesson.

The sharpest part of that lesson is the sequence. Reading the file twice,
adversarially, found nothing. Running it found four in two hours. And what
running it found was not that the rule was wrong — it was that the reach was
wrong every single time, which is a thing you cannot see by reading a guard
and can only see by living under it.

Also measured that day, and written into `CLAUDE.md` rather than glossed:
it refuses redirection, `sed -i`, `tee`, `truncate` and a path given to
`git checkout` or `git restore`, and it does **not** see a file written from
inside `python3 -c`, a `python3` heredoc or `node -e`. That was the form
nearly every violation in that session actually took. Telling a script that
computes from one that writes means reading the script, and refusing on
doubt would block the measuring this repository runs on — so the rule is
enforced for one family and held by attention for the other. Not worth
closing at the price; see the entry above this one.

---

# What the second bughunt found

Four read-only passes over the ten commits that came out of the first one,
run the way *Ways of Working* Part 5 describes. Every line below was
measured, and re-measured by hand before it was written here.

The short version: the audit that fixed defects produced defects of the same
classes, including one regression a visitor can hit and two gates that state
something about themselves which is not true. That is not a reason to stop
auditing. It is the reason the ritual says to audit finished work rather
than trusting it.

## 1 and 2. Closed

The mobile menu showed zero of its seven items below 640px wide, where the
reservation added by the first audit ran to the whole height of a banner
that takes most of a short screen. It has a floor now, measured against the
banner's policy link rather than its Accept button — the first attempt used
Accept and the gate refused it — and the sweep runs at 568x320, 480x320 and
320x320, asserting the menu keeps rows as well as asking whether the
banner's buttons are covered.

The focus gate did not measure the scroll-to-top button, which exists only
past 300px of scrolling. An earlier fix for an unstable sweep had reloaded
to a state where it is absent, which steadied the sweep by leaving a control
out of it. It has its own pass now, and the gate refuses if it cannot find
it. 29 stops.

## 3 and 4. Closed

The hook failed open when `jq` was missing, and eight more commands walked
past it. Both are fixed: the deciding is done in Python, which reads the
payload with `json` and splits the command with `shlex`, and every path that
cannot see refuses. The one case that turned out not to be a bypass is
recorded in the tests — `git checkout "src/My File.tsx"` names a path this
repository does not have, and git refuses it on its own; what it really
showed was that splitting on spaces cannot see a quoted path with a space
in it, which is now covered against a file that exists.

Registering the hook is still the owner's, at the top of this file.

## 5 and 6. Closed

`scripts/withoutComments.ts` scans rather than substitutes now, so a doubled slash
inside a regex literal or a string no longer deletes the rest of the line.
`tests/storyCoverage.test.ts` uses it, which was the point of extracting it;
it was the one consumer that did not. `tests/documentedStructure.test.ts`
tracks the enclosing path at every depth, so a third level is placed under
what actually encloses it.

The last part is done too, and re-measuring it was worth the trouble: this
entry said four false positives and the number is six, of which only four
belong on a list.

`SessionStart` was one of the two that did not. It lives solely in
`.claude/settings.json`, which is JSON — every key and value there is a
string — so stripping strings from that file removes it from the haystack
entirely. It keeps its strings, because the reason it is in the haystack at
all is the hook names, and hook names are strings by nature.

`portfolioData` was the other. It is a real module that no line of code
names outside an import path, and an import path is a string. The haystack
carries the repository's own filenames now, which closes that class rather
than that one entry.

What is left is `domMax`, `PreToolUse`, `Bash` and `Edit` — four names the
documents use legitimately and no identifier defines — each with its reason,
and the list fails on an entry that has stopped appearing anywhere or that
the code turns out to define after all. `PreToolUse` retires itself: the day
the hook is registered it becomes a real key in `.claude/settings.json`, and
the entry then fails as unnecessary.

## 7. Closed

The print gate measured text and not ink. It compares both now, per sheet,
in both directions, counted rather than as a set, with the same emptiness
guard on each document. The mutation it was written for — `print:hidden`
moved from the dialog's shell to its panel — takes every word of the dialog
off paper and leaves its backdrop on: measured at 61% of all six sheets,
with not one string changed, which is why nothing saw it before.

The rasteriser reads the number back through `PLAUSIBLE_INK`, because a
comparison between two prints cannot report an instrument that has stopped
reading the page: the same wrong number on both sides is agreement, and the
log prints it as a passing figure.

## 8. Closed

The claim that the README lists every ratchet was made by two documents and
checked by none. Counted by file rather than by subject it was thirteen of
the twenty-eight in `tests/`, not the seven this entry first said — seven was
a count of missing *subjects*, and four of the thirteen were the fast halves
of browser gates whose story was told under the runner's name and whose file
was not.

All thirteen are written down now, and the claim is enforced in both
directions: a check in `tests/` that no document names fails the build, and
so does deleting an entry for one that still runs.

## 9. Closed

Numbers in prose that did not re-derive.

- [x] `README.md` said a section moves through "thirty-two" positions
      without reduced motion, in two places, in the present tense. Four runs
      of one build measured the same section at 24, 26, 23 and 26, and no
      section on any run reached 32. The figure for reduced motion, two,
      held everywhere, because the transform is gone rather than shortened
      — an exact number and a spread, in one sentence, and only one of them
      belonged in prose. Both sentences
      name `SLIDING` and `ARRIVING_AT_ONCE` now — the constants the gate
      actually holds the page to — and say why there is no figure between
      them. Naming a constant instead of quoting a number is only an
      improvement if the name is checked, so the README's symbol gate reads
      capitals as well as camelCase now; it did not, and all three of the
      capitalised names in that file were unverified.
- [x] One README bullet said the compression defect made the page "measure
      86 on mobile emulation where it actually scores 98", then said the
      same page "scores in the low eighties under Lighthouse's mobile
      emulation" — the second being the defect the first sentence diagnoses.
      The trailing sentence is gone; the badges are labelled as the desktop
      preset, which is what `scripts/runLighthouse.ts` measures.
- [x] The item below quoted a bolded count of exports with no method
      recorded. Rebuilding a plausible method landed near the figure and not
      on it, so neither is checkable; the number is gone and the argument it
      was carrying — that a text scan is the wrong instrument here — is
      stated without one.

Two commit messages in the arc state test totals that were wrong when
written. Commit bodies cannot be corrected, and both are contradicted by
their own successors, which is how they were caught. Noted, not actionable.

---

## Catch an export nobody calls

A walk-termination helper lived in `scripts/focusIndicator.ts` with four
tests under the heading "walking the tab order", and the sweep that actually
runs never called it. Keying the real walk on a label — the historical
defect — left all four green. It has been deleted, which is why it is not
named here: this file is held to naming only things the code still has.

Both reachability ratchets work at the level of a module, and that module is
reached, by the runner and by its own tests. An export inside a reached
module that nobody calls is invisible to them.

- [x] A check exists, and it answers a narrower question than this entry
      asked — deliberately, and the numbers are why. Of 231 exports, 85 have
      no consumer outside the file that declares them, and almost every one
      is legitimate: 37 are types, 32 are units a module split out so a test
      could reach them and then calls two lines down, and 9 are gate logic or
      test infrastructure whose consumers are gates and tests by
      construction. Gating that would mean an exemption list of 78 nobody
      would maintain, which this entry predicted.
      `tests/exportUse.test.ts` reports the remainder: a value carrying
      `export` that no other file ever names. Seven, and each was a keyword
      that could go.
      The compiler rather than a regex, exactly as this entry asked, and it
      paid for itself on the first measurement: `grep -rl PLAUSIBLE_INK`
      named `scripts/runPrintCheck.ts` as a consumer of a constant it
      mentions only in a comment.
- [x] The exemption list is empty, which is the part worth noting. This
      entry assumed one would be needed and it is not, because the narrowing
      above removed the false positives structurally instead of listing
      them. A list of 78 reasons and a list of none are the two honest
      answers; the middle would have been a list nobody reads.

- [ ] What is still held by reading, and will stay that way: the helper this
      entry opens with had four tests, so something referred to it and the
      check above would not have reported it. Telling "tested and used by
      the gate" from "tested and used by nothing" needs to know whether a
      runner calls it — and `scripts/focusIndicator.ts` exports three
      constants that no runner calls and that are entirely legitimate. There
      is no structural line there. Ways of Working Part 5 asks for honesty
      where only discipline holds, and this is one of those places.

---

## Verify the page on a real iPhone and in Safari

**Why this and nothing else.** Five gates run on every push and between them
they cover accessibility, performance, the printed CV, reduced motion and
keyboard focus to AAA. Every one of them measures in Chromium, on a desktop
viewport, over a synthetic network. Safari on a real handset is the only
remaining surface where a visitor can hit something none of them can see, so
it is the last thing standing between this page and "done".

**How to know it is finished.** Every box below is either ticked or has turned
into its own ratchet. Anything found here follows the repository's usual rule:
the fix comes with a gate, so the same defect cannot come back.

### The two things pinned to the bottom of the screen

Nothing in this repository mentions `env(safe-area-inset-bottom)`, and two
controls sit in the region an iPhone reserves for the home indicator.

- [ ] **Consent banner** — `src/components/ui/CookieConsent.tsx` pins the band
      with `fixed bottom-0`. On a handset with a home indicator, does the
      Accept/Decline row sit above the gesture bar, or under it? Tap both at
      their lowest few pixels, not at their centres.
- [ ] **Scroll-to-top button** — `src/components/ui/ScrollToTop.tsx` sits at
      `bottom-4` (16px) below 640px. The home indicator is taller than that.
      Is the button fully tappable?
- [ ] **The space it reserves** — `useSpaceForFixedBar` measures the band and
      spends it as `--fixed-bar-space`. On iOS the visual viewport changes
      height as the URL bar collapses. Scroll to the foot of the page with the
      banner up and confirm the last of the footer is still reachable.

### The viewport unit

- [ ] **Mobile menu height** — `src/components/layout/Navbar.tsx` caps the open
      menu with a `calc` on `100vh`, minus whatever a fixed bar has reserved.
      On iOS Safari `100vh` is the *large* viewport, measured with the URL bar
      collapsed, so the menu can be taller than what is actually on screen.
      Open it with the URL bar showing and check the last item is reachable.
      If it is not, `100dvh` is the fix. (This item quoted the whole class
      until a sweep noticed the first commit of the audit had changed it and
      left the quote behind. It names the shape now, not the string, because
      no gate can check a Tailwind class against the code.)

### The modals

- [ ] **Background scroll** — `src/hooks/useScrollLock.ts` holds the page still
      with `body { overflow: hidden }`, which iOS Safari has never honoured the
      way other browsers do. Open the contact modal, drag on the backdrop, and
      see whether the page behind it moves. Check the scroll position is where
      it was after closing.
- [ ] **Both of them** — `ContactModal` and `PrivacyPolicyModal` share the same
      shell, so whatever is true of one is true of the other. Confirm rather
      than assume.

### Colour and blur

- [ ] **`oklch`** — Tailwind 4 emits colours in `oklch`, which Safari has
      supported since 15.4. On anything older the palette has no fallback.
      Confirm the page is not monochrome on the oldest iOS worth supporting.
- [x] **`backdrop-blur`** — the prefix question is answered from the build
      and needed no device: Tailwind 4 emits `-webkit-backdrop-filter` five
      times alongside `backdrop-filter` five times in the built CSS. What
      remains is only the visual confirmation that the navbar is readable
      rather than transparent over moving particles, which is a matter of
      taste on a real screen rather than a suspected defect.

### Touch, motion and print

- [x] **Target sizes** — closed, and it never needed the handset: a tap area
      is geometry after layout, which Chromium reports as well as Safari
      does. `scripts/runTargetSize.ts` measures all 79 targets against SC
      2.5.5 and `check:targets` runs it in CI. The icon links were indeed
      among the failures, at 28×28 — but so were 50 others, including the
      control that opens the navigation on a phone and both consent
      buttons. All fixed with padding, so nothing on screen changed size.
- [ ] **Reduce Motion** — turn it on in iOS Settings and confirm
      `MotionProvider`'s `reducedMotion="user"` reaches the reveals and the
      particle canvas. `check:motion` proves this in Chromium only.
- [ ] **Particles** — `ParticleBackground` runs an animation loop for the whole
      visit. Watch for heat and for scroll jank on an older handset; there is
      no gate for either and no way to write one that does not need a device.
- [ ] **The CV** — `useAutoPrint` drives the print path. iOS printing goes
      through the share sheet rather than a print dialog. Confirm the six-sheet
      layout `check:print` guards actually survives it.

### If it is all clean

Say so in the README, and the audit is closed: the page is as finished as
measurement can show it to be.
