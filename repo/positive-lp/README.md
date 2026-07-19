# Build

From this directory, build the paper with:

```text
pdflatex paper.tex
bibtex paper
pdflatex paper.tex
pdflatex paper.tex
```

The retained release artifacts are `paper.tex`, `references.bib`,
`paper.bbl`, and `paper.pdf`.
