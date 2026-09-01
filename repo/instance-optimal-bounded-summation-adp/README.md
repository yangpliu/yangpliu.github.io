# Build

From this directory, build the paper from a clean state with:

```text
pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error paper.tex
bibtex paper
pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error paper.tex
pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error paper.tex
pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error paper.tex
```

The final pass stabilizes cross-reference page numbers after the bibliography is inserted.
