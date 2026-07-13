---
name: repository-paper-writing
description: Write, revise, audit, typeset, and integrate rigorous AI-generated mathematical papers for this homepage repository. Use for any TeX/PDF manuscript under repo/, especially when establishing theorem correctness, writing an arXiv-style introduction and related-work discussion, verifying citations and prior state of the art, compiling the final PDF, or adding a paper to repository.html.
---

# Repository Paper Writing

Follow the repository's `AGENTS.md` first. Treat correctness, source accuracy,
and honest limitations as release blockers.

## Workflow

1. State the intended theorem, input assumptions, output type, quantitative
   guarantee, and runtime before drafting.
2. Read every primary source whose proof or reduction is adapted. Reconstruct
   the dependency chain and record any changed hypotheses or losses.
3. Research the prior-work landscape before writing the introduction.
4. Draft the manuscript in restrained, math-first prose.
5. Run independent hostile proof audits and repair every substantive issue.
6. Build from a clean state, inspect the PDF, and retain only final artifacts.
7. Publish and list the paper with truthful immutable provenance as required by
   `AGENTS.md`. For direct pushes, first commit and push the final paper files,
   record that commit's full SHA/date, then add `repository.html` in a second
   commit whose `Added ...` link points to the first commit. Never amend or
   squash away the linked commit.

## Introduction and prior work

Write a substantive, source-verified account of prior work, not a token citation
paragraph. For an established problem, cover the following when relevant:

- the problem and the approximation convention used in the paper;
- classical exact algorithms and the best relevant exact runtime;
- conditional or unconditional barriers that motivate approximation;
- the elementary or previously best approximation baseline;
- the strongest prior result for the precise input regime under study;
- adjacent results that the reader might otherwise confuse with the theorem,
  such as equal versus unequal lengths, value estimation versus an explicit
  witness, randomized versus deterministic algorithms, or existential versus
  algorithmic conclusions;
- the specific structural or algorithmic results imported by the proof.

For every cited algorithm, make its alphabet, input restrictions,
approximation guarantee, runtime, randomization, and output strength visible
to the extent relevant. For every cited lower bound, state the assumption and
the conclusion it actually supports. Prefer primary papers and official
versions; use surveys only for orientation. Verify titles, authors, venue,
year, theorem locations, and arXiv-version-dependent numbering.

Tie citations to concrete claims. Avoid citation dumps, vague phrases such as
"many works," and unverified novelty or priority claims. Breadth should match
the maturity of the topic; a well-studied problem will normally require a
substantial bibliography rather than only the papers used directly in the
proof.

Organize the introduction in this order unless the mathematics calls for a
clearer variant:

1. problem and motivation;
2. prior work and precise pre-existing state of the art;
3. main theorem and its relation to prior guarantees;
4. proof ideas and technical obstacles;
5. limitations and organization.

## Proof and algorithm audit

- Check zero and small-instance cases, normalization, endpoints, constants,
  hidden additive losses, and all changes of approximation convention.
- When deleting from both inputs, charge the two deletion sets separately.
- Distinguish an observable algorithmic branch from a branch used only in the
  analysis; compute every needed candidate if the witness is unknown.
- Verify that imported black boxes have exactly the required hypotheses,
  runtime regularity, determinism, and explicit-output guarantees.
- Trace witness reconstruction through trimming, reductions, and dynamic
  programs. Do not infer an explicit algorithm from a value-only theorem.
- If a cited proof contains a repairable error, give the corrected argument;
  if the repair is not complete, weaken or withdraw the claim.

## Manuscript and release requirements

- Put the setup and main guarantee in the abstract and introduction.
- Include principal applications and only a high-level proof sketch in the
  abstract.
- Use no named author unless requested. Use a Month Day, Year date.
- Put an accurate bold `Note.` disclosure immediately below the abstract,
  naming every model/harness materially responsible for the manuscript.
- Use primary-source BibTeX records and ensure every bibliography item is used.
- Compile until there are no warnings, undefined references, or box errors.
- Inspect the first page, main theorem, proof modules, reductions/applications,
  and bibliography; for substantial papers, inspect every page.
- Preserve `paper.tex`, `paper.pdf`, `paper.bbl`, `references.bib`, and a short
  build file when useful. Remove all review and LaTeX artifacts.
- When authorized to publish directly, use the two-push provenance workflow:
  publish immutable paper assets first; integrate the homepage second, linking
  to the first full-SHA commit and its date.
