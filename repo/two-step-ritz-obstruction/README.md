# A diagonalizable obstruction for random two-step Ritz compressions

- `paper.pdf` is the version linked from the Repository page.
- `paper.tex` and `references.bib` are the manuscript source files.
- `paper.bbl` is retained so the source can be compiled once before rerunning
  BibTeX.

To rebuild from a clean state:

```text
pdflatex paper.tex
bibtex paper
pdflatex paper.tex
pdflatex paper.tex
```
