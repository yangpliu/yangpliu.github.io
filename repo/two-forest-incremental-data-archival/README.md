# Build

From this directory, run:

```text
pdflatex -no-shell-escape paper.tex
bibtex paper
pdflatex -no-shell-escape paper.tex
pdflatex -no-shell-escape paper.tex
```
