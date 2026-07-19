# Building the paper

From this directory, run the following commands in order:

    pdflatex paper.tex
    bibtex paper
    pdflatex paper.tex
    pdflatex paper.tex

The final manuscript is `paper.pdf`; bibliography data is in
`references.bib`, and the generated bibliography retained for reproducibility
is `paper.bbl`.
