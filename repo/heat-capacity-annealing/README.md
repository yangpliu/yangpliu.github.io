# Heat-capacity annealing for cold-start logconcave sampling

Final repository artifacts:

- `paper.tex`
- `references.bib`
- `paper.bbl`
- `paper.pdf`

Build from a clean directory with:

```text
pdflatex paper.tex
bibtex paper
pdflatex paper.tex
pdflatex paper.tex
```

The manuscript proves a heat-capacity-parameterized Gaussian-annealing
bound and $\widetilde O(d^{2.5})$ cold-start consequences for centered
isotropic convex bodies and evaluation-oracle logconcave densities.  The
evaluation-oracle proof shows that Kook and Vempala's fixed exponential-
lift truncation retains constant mass uniformly along the Gaussian path.
The headline exponent follows from Klartag's established Poincare bound;
Letwin's recent quadratic-form estimate is used only as an optional
polylogarithmic sharpening.
