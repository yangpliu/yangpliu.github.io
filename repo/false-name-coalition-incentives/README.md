# Build

Compile the paper from a clean directory with:

```text
pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error paper.tex
bibtex paper
pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error paper.tex
pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error paper.tex
```
