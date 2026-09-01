# Build

From this directory, run:

```text
pdflatex paper.tex
bibtex paper
pdflatex paper.tex
pdflatex paper.tex
```

The retained release artifacts are `paper.tex`, `paper.pdf`, `paper.bbl`, and
`references.bib`.
