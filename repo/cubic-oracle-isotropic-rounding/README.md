# Approaching Cubic Oracle Calls for Isotropic Rounding

[Paper PDF](paper.pdf) | [LaTeX source](paper.tex)

This is the October 4, 2026 revision prepared at the owner's request.
The PDF has 74 pages. Theorem 3 is on page 8, its application is Lemma 5.2
on page 39, and the corrected rounding-primitive proof is on pages 10-12.

## Status and scope

**Approved by the repository owner on October 4, 2026.** The final mathematical
review found no unresolved serious correctness concern. This is a mathematical
audit with independent readers, not formal verification.

Manuscript content changed: **yes**. The owner first authorized correction of
Theorem 3, then explicitly authorized fixing the remaining issues and preparing
the homepage publication. The revision preserves the main theorem statements
and asymptotic query guarantees, while repairing their supporting statements,
arguments, and implementation details.

At the owner's direction, the original project/model/contributor details are
retained without adding a separate revision credit. The original opening
project paragraph is now the bold-label, roman-text `Note.` immediately below
the abstract; the other original project details remain in the abstract.
The document has an explicit October 4, 2026 date and no author byline.

The original download `volume_obsolete_20261004.tex` remains unmodified.
The exact source diff is recorded below.

## Mathematical corrections

- **Theorem 3:** use only the Gaussian-source case actually needed:
  `d gamma = pi^(-n/2) exp(-||x||^2) dx`, `Hess V >= 2I`, and a unique
  almost-everywhere Brenier transport with a 1-Lipschitz representative.
  This is [Caffarelli's Theorem 11](https://www.ceremade.dauphine.fr/~carlier/Caffarelli-Contraction).
  The original arbitrary-source comparison is false, as witnessed by
  `W(x)=x^4+x^2`, `V(x)=W(x)+x`.
- **Preliminaries and toolkit:** correct the variance expansion and Fradelizi
  potential inequality; require positive definiteness where ordinary inverses
  are used; give the projection-density normalization and zero-direction case;
  state the L1 reverse Holder inequality actually used; and correct the
  support-ball/density references to
  [Lovasz-Vempala](https://faculty.cc.gatech.edu/~vempala/papers/logcon.pdf).
- **Rounding and sampling:** give an explicit proof of the grounded rounding
  primitive, with independent starts from the original grounded input,
  rescaling of the spatial coordinates in the exponential lift, known
  deterministic mixing/sample bounds, and an explicit final positive-definiteness
  check. Use the lifted target's Poincare constant and direct 2-warm domination
  of chain-path events. Couple rejection cutoffs to ideal chains and charge
  aborts separately, without conditioning warmness on success.
- **Source-proof repairs:** the general event multiplier in
  [Kook-Zhang, Lemma 29](https://arxiv.org/pdf/2410.17147v1) is not used.
  Its Lemma 17, also used in
  [Kook-Vempala, Lemma 4.10](https://arxiv.org/pdf/2411.13462v1), confuses an
  ellipsoid projection with a section. The new proof uses support functions of
  full ellipsoids. Tighter additive covariance accuracy and a modified stopping
  radius change only logarithmic factors, preserving cubic query complexity.
  Both source papers were read in full for this repair; their incorrect steps
  are replaced, not accepted verbatim.
- **General algorithm:** correct inverse-covariance factors, the majority
  threshold in robust selection, failure/nonpositive-definite candidate
  handling, the explicit Renyi-transfer constant, the zero-stage bound,
  the raw-moment comparison explanation, and the query-cap logarithms.
- **Symmetric algorithm and Appendix C:** state positive finite normalizers,
  use Jensen's inequality instead of unrestricted boundary differentiation,
  correct the square-root constant, use the intersection's section radius in
  the tail bound, and state the proved upper endpoint `delta <= 1`.
- **Exposition and references:** describe the actual Brascamp-Lieb, Paouris,
  and even-sector Poincare dependencies instead of an unused thin-shell
  dependence. Correct Kook-Zhang's coauthor and citation label; identify the
  exact arXiv versions used for theorem numbering; remove the now-unused survey
  entry after replacing its reverse Holder citation.

Independent audits covered the general and symmetric algorithms, sampling
interfaces, all three appendices, and the new rounding-primitive proof.
They checked kernel/singular cases, small dimensions and zero stages,
normalization, constants, conditioning, failure budgets, deterministic outer
query caps, and the volume reduction. The principal output guarantees and
oracle exponents are unchanged.

## Build and validation

The bibliography is inline; this source does not use BibTeX, `references.bib`,
or an external `paper.bbl`. Copy `paper.tex` to an empty directory outside
the repository, then run:

```text
pdflatex -interaction=nonstopmode -halt-on-error -file-line-error paper.tex
pdflatex -interaction=nonstopmode -halt-on-error -file-line-error paper.tex
pdflatex -interaction=nonstopmode -halt-on-error -file-line-error paper.tex
```

Use the normal restricted-shell configuration of TeX Live. No external
graphics or shell commands are required by the manuscript.

The final PDF was compiled from a clean directory. The final pass has no
LaTeX/pdfTeX/package warnings, overfull or underfull boxes, unresolved
references/citations, or missing internal link destinations.
The figure destinations are unique and point to the algorithm pages.
All 74 pages received a layout inspection, with higher-resolution checks of
the first page, Theorem 3, the added proof, its later application, the volume
reduction, and bibliography. PDF text confirms the date and disclosure and
empty author metadata.

Build fixes consist of placing the float package before hyperref, removing
an unused explicit graphics import, defining an empty author and fixed date,
and breaking the three overlong passages into displays/aligned lines.
Only final source, PDF, and this build/audit record are retained here.

## Homepage publication

The `repository.html` entry has the title, working PDF link, native
expansion arrow, and an abstract-only expansion. Its layout was checked at
1400-pixel desktop and 390-pixel mobile widths; it has no horizontal overflow.
HTML tags and all local links pass checks. The existing introductory text and
other entries are preserved. `git diff --check` passes.

The owner approved publication of the exact source/PDF hashes below on
October 4, 2026. Publication follows the two-commit workflow in `AGENTS.md`:

1. Commit and push only the final paper assets and this record.
2. Read that immutable commit's full SHA and date.
3. Add the standard `paper-history` link to that commit beside the PDF link,
   labelled `Added Month Day, Year` using the first commit's date.
4. Commit and push only the intended page-entry change, preserving unrelated
   working-tree changes and the first content commit.

The paper's `Added` link on the Repository page identifies its immutable
original-addition commit. Source and PDF bytes are unchanged from the
approved candidate; this record now includes the owner's approval.

## Candidate hashes

| Artifact | SHA-256 |
| --- | --- |
| Original submitted source | `7CE8169BCD08FE173089FD49DAEC45D31FA7BB40DB24AE94A4B3FBEE32B8BFD8` |
| Theorem-3-only source reviewed earlier | `753A33B50873DF7325F9BBA812D6C37E1E25D2B88B67DFB1E95B78E91830C095` |
| paper.tex | `80529920ED7D27FF5229CB63F89D2EC938F3A8D871ED42C1179FBC5E3B4828FB` |
| paper.pdf | `025BD6D972EA5117C26B544097EBB935A70E548EF2A583C85C1AC0AB1247ABB3` |

## Exact authorized source diff

<details>
<summary>Original submission to the reviewed publication candidate</summary>

```diff
--- volume_obsolete_20261004.tex
+++ paper.tex
@@ -4 +4 @@
-% Build: pdflatex twice; no bibtex, no external dependency.
+% Build: pdflatex three times; no bibtex, no external dependency.
@@ -12,0 +13 @@
+\usepackage{float}
@@ -24,3 +24,0 @@
-\usepackage{graphicx}
-
-\usepackage{float}
@@ -121,0 +120,2 @@
+\author{}
+\date{October 4, 2026}
@@ -127,7 +126,0 @@
-This document contains intermediate results of a project that started
-around February 2025
-involving first Yang P. Liu and Colin Tang,
-then September 2025 Alicia Stepin, and July 2026 Richard Peng.
-These results were obtained using a combination of GPT 5.6 Sol,
-FizzyProver (a heavy harness written by Junzhao Yang) running GPT 5.6 Sol,
-and Kimi K3 / Kimi Code.
@@ -158,0 +152,8 @@
+\noindent\textbf{Note.}
+This document contains intermediate results of a project that started
+around February 2025
+involving first Yang P. Liu and Colin Tang,
+then September 2025 Alicia Stepin, and July 2026 Richard Peng.
+These results were obtained using a combination of GPT 5.6 Sol,
+FizzyProver (a heavy harness written by Junzhao Yang) running GPT 5.6 Sol,
+and Kimi K3 / Kimi Code.
@@ -369,2 +370,3 @@
-We remark that our proof not only uses the KLS conjecture for fast sampling, but
-also uses the thin-shell bound as a tool to design our faster algorithms.
+Our sampling bounds use proved estimates toward the KLS conjecture.
+The cooling analysis uses Brascamp--Lieb and Paouris inequalities in the
+general case, and an even-sector Poincar\'e inequality in the symmetric case.
@@ -380,3 +382,2 @@
-We critically use the thin-shell bound to bound the Frobenius norm of the change
-to the covariance matrix during iterations of our algorithm (see
-\cref{sec:overview} for more discussion on this).
+These analytic inputs are developed in
+\cref{sec:overview,sec:asymmetric,sec:symmetric}.
@@ -470 +471 @@
-= \E{x \sim p}{f\left(x\right)^2}^2 - \E{x \sim p}{f\left(x\right)}.
+= \E{x \sim p}{f\left(x\right)^2} - \E{x \sim p}{f\left(x\right)}^2.
@@ -615 +616 @@
-Equivalently, $\phi(x^*) \le n + \phi(0)$.
+Equivalently, $\phi(0) \le n + \phi(x^*)$.
@@ -639 +640 @@
-$M$-strongly log-concave for some PSD matrix
+$M$-strongly log-concave for some positive definite matrix
@@ -669 +670 @@
-Let $p$ be a log-concave function on
+Let $p$ be a log-concave probability density on
@@ -674 +675 @@
-$x \sim p$) is log-concave.
+$x \sim p$) is a log-concave probability measure.
@@ -676,3 +677,7 @@
-Here the distribution $\l x, v\r$ is over
-$\R$, with density given by
-$\phat(t) = \int_{x \in \R^{n}, \l x, v\r = t} p(x) \, dx$.
+For $v\ne0$, this measure has density
+\[
+\phat(t)=\frac1{\|v\|_2}
+\int_{\{x\in\R^n:\langle x,v\rangle=t\}}p(x)\,d\mathcal H^{n-1}(x),
+\]
+where $\mathcal H^{n-1}$ is the induced Euclidean surface measure.
+For $v=0$, it is the point mass at zero.
@@ -700 +705 @@
-\cite[Lemma 33]{LV18:arxiv}.
+\cite[Theorem~5.22]{LV07:journal}.
@@ -706,5 +711,6 @@
-Given a log-concave density $p \in \R^n$ and any positive integer
-$k$:
-
-\[
-\E{p}{\|x\|_2^k} \leq (2k)^k (\E{p}{\|x\|_2^2})^{k/2}
+Let $p$ be a log-concave probability density on $\R^n$.
+For every positive integer $k$,
+\[
+\bigl(\E{p}{\|x\|_2^k}\bigr)^{1/k}
+\leq 2k\,\E{p}{\|x\|_2}
+\leq 2k\bigl(\E{p}{\|x\|_2^2}\bigr)^{1/2}.
@@ -714,4 +720,2 @@
-We will also use Caffarelli's contraction theorem \cite{C00:journal} in the
-smooth, strongly log-concave setting.
-
-The next theorem concerns Caffarelli's contraction theorem.
+We use the following Gaussian-source form of Caffarelli's contraction theorem
+\cite[Theorem~11]{C00:journal}.
@@ -721,30 +725,12 @@
-Let $V,W:\R^n\to\R$ be twice continuously differentiable, strongly convex
-functions.
-Define their normalizing constants by
-\[
-Z_V=\int_{\R^n}e^{-V(x)}\,dx,
-\qquad
-Z_W=\int_{\R^n}e^{-W(x)}\,dx,
-\]
-and let $\mu$ and
-$\nu$ be the probability measures
-\[
-d\mu(x)=Z_V^{-1}e^{-V(x)}\,dx,
-\qquad
-d\nu(x)=Z_W^{-1}e^{-W(x)}\,dx.
-\]
-Suppose that $\nabla^2 V(x)\succeq \nabla^2 W(x)$ for every
-$x\in\R^n$.
-Let $T=\nabla\varphi$ be the quadratic-cost Brenier map from
-$\nu$ to
-$\mu$, where
-$\varphi$ is convex.
-The identity $T_\#\nu=\mu$ means that
-$\mu(A)=\nu(T^{-1}(A))$ for every Borel set
-$A\subseteq\R^n$.
-The map is unique up to a $\nu$-null set: any two such optimal maps agree
-outside a set of
-$\nu$-measure zero.
-Writing $DT(x)$ for the Jacobian matrix of
-$T$ at
-$x$, we have
+Let $V:\R^n\to\R$ be twice continuously differentiable with
+$\nabla^2V(x)\succeq2I$ for every $x\in\R^n$, and define
+\[
+d\gamma(x)=\pi^{-n/2}e^{-\|x\|_2^2}\,dx,
+\qquad
+d\mu(x)=Z^{-1}e^{-V(x)}\,dx,
+\qquad
+Z=\int_{\R^n}e^{-V(x)}\,dx.
+\]
+The quadratic-cost Brenier map $T=\nabla\varphi$ satisfying $T_\#\gamma=\mu$
+is unique up to a $\gamma$-null set and has a $1$-Lipschitz representative.
+In particular,
@@ -753 +739 @@
-\qquad\text{for $\nu$-almost every $x$.}
+\qquad\text{for $\gamma$-almost every $x$.}
@@ -841,4 +827,4 @@
-The following is Lemma 4.11 of \cite{KV25} (the guarantee of the procedure
-$\mathsf{Isotropize}$, Algorithm~4 there), stated under their
-Assumption~4.4; we record the output through the affine map that the procedure
-returns, and we keep the success probability exactly as proved there.
+The following adapts the well-rounded isotropizer of
+\cite[Algorithm~4 and Lemma~4.11]{KV25} under their Assumption~4.4.
+We record its output through an affine map and give the implementation
+and proof below.
@@ -868 +854 @@
-$A_Cn^3\log^{a_C}n$.
+$A_Cn^3\log^{a_C}(2n)$.
@@ -878,0 +865,193 @@
+\begin{proof}[Implementation and proof of \cref{prelim:thm:wellr_iso}]
+We specify the rounding primitive using the sampling and stationary
+covariance-estimation results of \cite{KV25,KZ24:arxiv}.
+Translate the original input by its known point $z$, so its potential is
+$W_0(x)=W(x+z)$ and $\E{\pi_0}{\|X\|^2}\leq C^2n$.
+All affine maps below are recorded and composed with this translation.
+Set
+\[
+ L=\max\{4,\log(2n)\},\qquad q=L^{-1},\qquad
+ d_0=\frac{nq^2}{100},\qquad r_*=\frac{q^2\sqrt n}{100}.
+\]
+Start with $\pi_0$ and $r_0=1$.
+At stage $i$, write $m_i,C_i$ for the true mean and covariance of the current
+law $\pi_i$.
+While $r_i<r_*$, estimate its covariance by a positive semidefinite empirical
+matrix $S_i$ satisfying
+\begin{equation}
+\label{eq:primitive-covariance-accuracy}
+ -\tfrac1{10}C_i-d_0I\preceq S_i-C_i
+ \preceq\tfrac1{10}C_i+d_0I.
+\end{equation}
+Let $P_i$ be the spectral projection of $S_i$ onto eigenvalues at most $n$,
+put $M_i=I+P_i$, and update
+\[
+ \pi_{i+1}=(M_i)_\#\pi_i,\qquad
+ r_{i+1}=2(1-q)r_i.
+\]
+The estimates, their probability of success, and their query cost are
+justified below. Their required accuracy differs from a constant additive
+multiple of $n$ only by a logarithmic factor.
+
+We first give the deterministic geometric argument on the event that
+\eqref{eq:primitive-covariance-accuracy} holds at every completed stage.
+The covariance obeys $C_{i+1}=M_iC_iM_i$, whence
+$\operatorname{tr}C_{i+1}\leq4\operatorname{tr}C_i$.
+The lower estimate in \eqref{eq:primitive-covariance-accuracy} gives
+$P_iC_iP_i\preceq2nP_i$. Consequently,
+\[
+ \|C_{i+1}\|_{\op}
+ =\|C_i^{1/2}(I+3P_i)C_i^{1/2}\|_{\op}
+ \leq\|C_i\|_{\op}+6n.
+\]
+There are $O(L)$ stages, because $2(1-q)\geq3/2$ and $r_*\leq\sqrt n$.
+Since $(1-q)^{-O(L)}=O(1)$, these observations imply
+\begin{equation}
+\label{eq:primitive-covariance-growth}
+ \operatorname{tr}C_i=O_C(r_i^2n),
+ \qquad
+ \|C_i\|_{\op}=O_C(nL).
+\end{equation}
+
+We next prove that the support of $\pi_i$ contains a ball $B(c_i,r_i)$
+for some center $c_i$; the algorithm need not know this center.
+The assertion holds initially.
+The support also contains
+$m_i+e^{-1}C_i^{1/2}B(0,1)$ by the log-concave support-ball bound
+\cite[Lemma~A.10]{KV25}.
+Suppress the index $i$ and put $M=I+P$.
+After applying $M$, the support contains the two ellipsoids
+\[
+ A=M B(c_i,r_i),\qquad
+ B=M\bigl(m_i+e^{-1}C_i^{1/2}B(0,1)\bigr),
+\]
+and hence their weighted Minkowski sum $(1-q/2)A+(q/2)B$.
+Center this sum at
+$c'=(1-q/2)Mc_i+(q/2)Mm_i$.
+For a unit vector $u$, write $a=\|(I-P)u\|$.
+The centered support function of $A$ is
+$r_i\|Mu\|=r_i\sqrt{4-3a^2}\geq r_i(2-\tfrac32a^2)$.
+Since $S_i\succeq n(I-P)$, the upper estimate in
+\eqref{eq:primitive-covariance-accuracy} gives
+\[
+ u^\top MC_iMu\geq\frac{na^2-4d_0}{1.1}.
+\]
+If $a^2\leq8d_0/n$, the contribution of $A$ alone is at least
+$2r_i-qr_i-0.12q^2r_i\geq2(1-q)r_i$.
+Otherwise the centered support function of $B$ is at least
+$\sqrt n\,a/(e\sqrt{2.2})$.
+Its weight $q/2$ compensates the term $\tfrac32r_i a^2$, because
+\[
+ r_i<r_*=\frac{q^2\sqrt n}{100}
+ \leq\frac{q\sqrt n}{3e\sqrt{2.2}}.
+\]
+The support function of the sum is therefore at least
+$2(1-q)r_i$ in every unit direction.
+Thus the sum contains $B(c',2(1-q)r_i)$, proving the induction.
+This argument uses support functions of the full ellipsoids and does not
+require their principal sections to be large.
+
+Here is the sampling implementation.
+Before each covariance-estimation stage, including the final one, independently
+apply \cite[Theorem~3.16]{KV25} to the original input $W_0$, with accuracy
+$\log2$.
+Its hypotheses hold with known center $0$ and $R^2=C^2n$.
+The construction uses evaluations of $W_0$, including $W_0(0)$, and does
+not require the value of $\inf W_0$.
+It generates a fresh ideal sample from a law bounded by twice the original
+exponential lift.
+Push this sample forward by the current recorded linear map, leaving the
+lift coordinate $t$ unchanged.
+Conditioned on the preceding stages, the resulting ideal starting law is
+bounded by twice the lift of $\pi_i$.
+
+For sampling at stage $i$, rescale only the $x$-coordinates by $r_i^{-1}$.
+The ground set then has unit inradius.
+By \cite[Lemma~2.5]{KV25}, the lifted covariance has operator norm at most
+\[
+ 2\bigl(\|C_i\|_{\op}/r_i^2+160\bigr).
+\]
+The exact proximal kernel is reversible.
+Its $\chi^2$ contraction, the Poincare bound, and
+\cite[Lemma~2.14]{KV25} provide a thinned chain with spectral gap at least
+$0.99$, using
+\[
+ \widetilde O\!\left(n^2\left(\|C_i\|_{\op}/r_i^2+1\right)\right)
+\]
+queries per retained sample, with logarithmic dependence on its abort budget.
+The mixing lengths and sample counts use deterministic upper bounds from
+\eqref{eq:primitive-covariance-growth}, computed from the known $C,n,r_i$
+and stage index; they do not require the unknown covariance $C_i$.
+Undoing the known coordinate rescaling preserves this spectral gap.
+The resulting stationary law is the unscaled exponential lift, whose
+covariance has trace at most $\operatorname{tr}C_i+160$ and operator norm
+at most $2(\|C_i\|_{\op}+160)$.
+Apply \cite[Theorem~8]{KZ24:arxiv} to this lifted chain with multiplicative
+accuracy $1/10$ and additive accuracy $d_0$.
+Using \eqref{eq:primitive-covariance-growth}, its sample requirement is
+$k_i=\widetilde O_C(r_i^2)$.
+Compressing the empirical covariance to the $x$-coordinates gives
+\eqref{eq:primitive-covariance-accuracy} with stationary-start failure
+probability $O(1/n)$.
+Since $r_i^2\leq n$ at every updating stage, the total sampling cost of
+that stage is $\widetilde O_C(n^3)$.
+
+At termination, $r_i\geq\max\{1,r_*\}$.
+The per-sample bound above is now $\widetilde O_C(n^2)$.
+Use $\widetilde O(n)$ retained samples for the final empirical mean
+$\bar m$ and covariance $S$.
+If $S$ is not positive definite, declare failure.
+For their analysis, whiten the $x$-coordinates by $C_i^{-1/2}$ and leave
+$t$ unchanged; this is an invertible change of variables of the stationary
+chain and preserves its spectral gap.
+The resulting lifted covariance has operator norm at most $322$.
+The stationary covariance and mean estimates
+\cite[Corollaries~10 and~33]{KZ24:arxiv}, with sufficiently small fixed
+accuracy, therefore give
+\[
+ (1-\varepsilon)C_i\preceq S\preceq(1+\varepsilon)C_i,
+ \qquad
+ \|C_i^{-1/2}(\bar m-m_i)\|\leq\varepsilon,
+ \qquad \varepsilon=10^{-3},
+\]
+except with probability $O(1/n)$.
+Whitening here is used only in the analysis: the algorithm computes the
+ordinary empirical statistics in its current coordinates.
+The final map $x\mapsto S^{-1/2}(x-\bar m)$ has covariance between
+$(1+\varepsilon)^{-1}I$ and $(1-\varepsilon)^{-1}I$, and its mean has norm
+at most $\varepsilon/\sqrt{1-\varepsilon}<0.01$.
+Compose it with all recorded maps to obtain the required $F$.
+
+Finally, we account for failure and queries without conditioning a sampler
+on successful rejection steps.
+Fix a deterministic bound $J=\lceil4L\rceil$ on the number of
+covariance-estimation stages.
+Assign every warm-start run and every sampling run an abort budget
+$n^{-2}/(2J)$.
+Ideal processes use rejection sampling without a cutoff.
+Couple each implemented run to its ideal run using the same proposals until
+a cutoff is exceeded.
+The per-step estimates in \cite[Lemmas~2.14 and~3.10]{KV25}, summed along
+the ideal processes on accurate preceding stages, bound the probability of
+an abort before any earlier statistical failure by $n^{-2}$.
+For any event $E$ of a stage's ideal chain, its conditional probability,
+given the preceding stages, is at most twice the corresponding
+stationary-start probability: if $\nu_i\leq2\widehat\pi_i$, then
+\[
+ \mathbb P_{\nu_i}(E)
+ =\int\mathbb P_x(E)\,\nu_i(dx)
+ \leq2\int\mathbb P_x(E)\,\widehat\pi_i(dx).
+\]
+Thus each first statistical failure, conditional on accurate preceding
+estimates, has probability $O(1/n)$.
+A union bound gives overall failure probability
+$O(J/n)+n^{-2}=O(n^{-1/2})$.
+Each fresh start costs $\widetilde O_C(n^3)$, as does each updating stage
+and the final stage.
+The same per-step estimates bound the expected capped query cost along
+accurate prefixes; summing over $J=O(L)$ stages gives the stated expected
+$\widetilde O_C(n^3)$ query bound on the success event.
+As usual, fixed small dimensions are absorbed into the universal constants;
+the later application explicitly pads to a sufficiently large dimension.
+\end{proof}
+
@@ -883 +1062 @@
-of \cite[Corollaries~10 and~33]{KV24:arxiv}, as recorded in
+of \cite[Corollaries~10 and~33]{KZ24:arxiv}, as recorded in
@@ -916 +1095 @@
-$A\,(n^2R^2+n^3)\log^{a}(n/\eta)$.
+$A\,(n^2R^2+n^3)\log^{a}(2n/\eta)$.
@@ -931,62 +1110,65 @@
-First, \cite[Theorem~3.16]{KV25} with accuracy $\log2$ and failure probability
-$\eta$ returns a point of
-$\mathcal K$ whose law
-$\nu$ satisfies
-$\mathcal R_\infty(\nu\Vert\widehat\pi)\leq\log2$, using
-$\O(n^2(R^2\vee n)\log^8(1/\eta))$ queries in expectation.
-Second, from this $2$-warm start, run the proximal sampler
-$\mathsf{PS}_{\exp}$ of \cite[Section~2]{KV25} for
-$kN$ iterations, with the step size
-$h$ and rejection threshold of \cite[Lemma~2.14]{KV25} for
-$M=2$,
-$kN$ iterations, and failure probability
-$\eta$.
-By that lemma all $kN$ iterations succeed except with probability
-$\eta$, using
-$\O(kN\log^2(kN/\eta))$ queries in expectation, and the law of every iterate
-remains
-$2$-warm because
-$\mathcal R_\infty$ does not increase under a Markov kernel with stationary law
-$\widehat\pi$.
-By \cite[Lemma~2.9]{KV25} one iteration contracts
-$\chi^2(\cdot\Vert\widehat\pi)$ by the factor
-$(1+h/C_{\rm PI}(\pi))^{-2}$, where
-$C_{\rm PI}(\pi)=O(c_+\log^{1/2}n)$ by \cref{thm:klsbound,lemma:poincare};
-hence the $N$-step kernel is reversible with respect to
-$\widehat\pi$ and has spectral gap at least
-$0.99$ once
-$N\asymp C_{\rm PI}(\pi)/h\asymp c_+n^2\log^{O(1)}(n/\eta)$.
-This is \cite[Proposition~4.7]{KV25}, that is \cite[Lemma~14]{KV24:arxiv},
-specialized to inradius
-$1$ and bounded covariance.
-Third, with $k\asymp\xi^{-2}n\log^2(n/\xi)\log^2n$, let
-$Z_1,\dots,Z_k$ be every
-$N$-th iterate.
-They are $k$ consecutive outputs of a reversible chain with spectral gap at
-least
-$0.99$ and log-concave stationary law
-$\widehat\pi$, started from
-$\nu$ with
-$\chi^2(\nu\Vert\widehat\pi)\leq e^{\mathcal R_\infty(\nu\Vert\widehat\pi)}-1\leq1$, so
-\cite[Lemma~4.6]{KV25}, applied with accuracy
-$\xi'=\xi\,(2c_++320)^{-1/2}$, together with the remark following it
-(\cite[Lemma~29]{KV24:arxiv}, which multiplies the failure probability by
-$1+\chi^2(\nu\Vert\widehat\pi)\leq2$) gives, except with probability
-$c_{\rm est}/n$, an empirical mean
-$\overline m$ and covariance
-$\overline\Sigma$ of
-$Z_1,\dots,Z_k$ with
-$|\overline\Sigma-\widehat\Sigma|\preceq\xi'\widehat\Sigma$ and
-$\|\overline m-m_{\widehat\pi}\|^2\leq\xi'^2\|\widehat\Sigma\|_{\op}\leq\xi^2$.
-The $x$-blocks $\widehat m$ and
-$\widehat C$ of
-$\overline m$ and
-$\overline\Sigma$ are the empirical mean and covariance of the
-$x$-coordinates of
-$Z_1,\dots,Z_k$, and compressing the Loewner inequalities to the
-$x$-block gives
-$(1-\xi')C_\pi\preceq\widehat C\preceq(1+\xi')C_\pi$ with
-$\xi'\leq\xi$.
-The total expected number of queries on the success event is
-$\O(n^2(R^2\vee n)\log^8(1/\eta)+kN\log^2(kN/\eta))$, which is of the stated
-form.
+First, use \cite[Theorem~3.16]{KV25} with accuracy $\log2$ and abort budget
+$\eta$ to generate a warm start. Its ideal process uses rejection sampling
+without a cutoff and has output law $\nu\leq2\widehat\pi$; the implemented
+algorithm agrees with that output except on an abort event of probability
+at most $\eta$. The expected query bound is
+$\O(n^2(R^2\vee n)\log^8(1/\eta))$.
+
+Let $P$ be the exact proximal-sampler kernel for $\widehat\pi$.
+It is reversible, and \cite[Lemma~2.9]{KV25}, applied in dimension $n+1$, gives
+\[
+ \chi^2(\lambda P\Vert\widehat\pi)
+ \leq(1+h/C_{\rm PI}(\widehat\pi))^{-2}
+       \chi^2(\lambda\Vert\widehat\pi).
+\]
+The covariance bound above and \cref{thm:klsbound,lemma:poincare} imply
+\[
+ C_{\rm PI}(\widehat\pi)
+ =O((c_++1)\log^{1/2}(n+2)).
+\]
+Choose $N$ so that $P^N$ has spectral gap at least $0.99$, using this known
+upper bound in place of the unknown Poincar\'e constant. Set
+\[
+ \xi'=\frac{\xi}{\sqrt{2c_++320}},\qquad
+ k\asymp(\xi')^{-2}(n+1)
+ \log^2\!\frac{n+2}{\xi'}\,\log^2(n+2).
+\]
+Choose the step size and rejection cutoff by \cite[Lemma~2.14]{KV25} for
+$kN$ steps, warmness $M=2$, and total abort budget $\eta$.
+These choices can be made with
+$N=O((c_++1)n^2\log^{O(1)}((n+2)/\eta))$, where constants may depend on
+$\xi$ and $c_+$.
+
+For the ideal chain started from $\nu$, every marginal is $2$-warm because
+$\nu P^j\leq2\widehat\pi P^j=2\widehat\pi$.
+The per-step estimates in that lemma, summed along the ideal chain, bound
+the probability that any rejection cutoff is exceeded by $\eta$ and the
+expected implemented query count by $\O(kN\log^2(kN/\eta))$.
+Couple the implemented and ideal chains using the same proposals until the
+first abort. This argument does not condition the chain on successful
+rejection steps.
+
+Let $Z_1,\ldots,Z_k$ be every $N$-th ideal iterate.
+Under a stationary start, \cite[Lemma~4.6]{KV25} gives empirical mean
+$\overline m$ and covariance $\overline\Sigma$ satisfying
+\[
+ \begin{gathered}
+ -\xi'\widehat\Sigma\preceq\overline\Sigma-\widehat\Sigma
+ \preceq\xi'\widehat\Sigma,\\
+ \|\overline m-m_{\widehat\pi}\|^2
+ \leq(\xi')^2\|\widehat\Sigma\|_{\op}\leq\xi^2,
+ \end{gathered}
+\]
+except with probability $O(1/n)$.
+The same conclusion holds from $\nu$ with at most twice this failure
+probability: for every path event $A$,
+\[
+ \mathbb P_\nu(A)=\int\mathbb P_z(A)\,\nu(dz)
+ \leq2\int\mathbb P_z(A)\,\widehat\pi(dz)
+ =2\mathbb P_{\widehat\pi}(A).
+\]
+Taking the $x$-blocks of $\overline m$ and $\overline\Sigma$ gives
+$\widehat m$ and $\widehat C$ with the claimed bounds, since $\xi'\leq\xi$.
+Outside the two abort events, these are exactly the implemented outputs.
+A union bound gives total failure probability at most $2\eta+c_{\rm est}/n$.
+Adding the warm-start and chain costs gives the stated query bound.
@@ -1834,0 +2017,2 @@
+If $\ell$ is constant, the moment claims are immediate; otherwise its law
+is a one-dimensional log-concave density.
@@ -1850,4 +2034,8 @@
-This is the statement that the support of an $s$-isotropic log-concave law
-contains the ball of radius
-$1/(es^{1/2})$ about its mean, which is Lemma~5.13 of \cite{LV07:journal}
-(restated as Lemma~A.10 of \cite{KV25}).
+For an isotropic log-concave law, each one-dimensional marginal has density
+at most $1$, and each halfspace containing the mean has probability at
+least $1/e$ \cite[Lemmas~5.5(a) and~5.12]{LV07:journal}.
+Consequently, every supporting hyperplane of its support is at distance
+at least $1/e$ from its mean.
+Applying the inverse whitening map gives the radius
+$1/(es^{1/2})$ when $s^{-1}I\preceq C\preceq sI$;
+see also \cite[Lemma~A.10]{KV25}.
@@ -1856,3 +2044,3 @@
-The isotropic density lower bound of \cite{LV07:journal} (their Lemma~5.6; the
-one-dimensional case is Lemma~5.5(b) there, restated as Lemma~A.11 of
-\cite{KV25}) gives universal $\rho_0,H_0>0$ such that every isotropic
+The isotropic density lower bound of
+\cite[Theorem~5.14(a)]{LV07:journal} gives universal
+$\rho_0,H_0>0$ such that every isotropic
@@ -2147,2 +2335,6 @@
-$v$, so
-$\sigma_\lambda^2\in[0.9999/1.01,\,18.1\cdot1.01] \subseteq[0.99,18.5]$, and
+$v$. Hence
+\[
+\sigma_\lambda^2\in[0.9999/1.01,\,18.1\cdot1.01]
+\subseteq[0.99,18.5].
+\]
+Moreover,
@@ -2166,5 +2358,5 @@
-Let $(\widehat m_i,\widehat C_i)$,
-$i\in[L]$, be independent random pairs, each of which is
-\emph{$\xi$-accurate} for a pair
-$(m,C)$ with probability at least
-$17/32$, meaning
+Fix $m\in\R^n$ and $C\succ0$.
+Let $L$ independent random outputs each be either a failure symbol or a pair
+$(\widehat m_i,\widehat C_i)$ with $\widehat C_i\succ0$.
+Suppose each output is \emph{$\xi$-accurate} for $(m,C)$ with probability
+at least $17/32$, meaning
@@ -2173 +2365 @@
-Declare $i\sim j$ when
+Failure symbols have no partners. For nonfailure outputs, declare $i\sim j$ when
@@ -2181,3 +2373,3 @@
-Then with probability at least $1-p/2$, an index
-$i^*$ with the most partners exists and is
-$5\xi$-accurate.
+Select a nonfailure index $i^*$ with the most partners, returning a failure
+symbol if none exists. With probability at least $1-p/2$, the selected pair
+is $5\xi$-accurate.
@@ -2194 +2386 @@
-\leq2(1+\xi)^{1/2}\,\xi
+\leq2(1-\xi)^{-1/2}\,\xi
@@ -2198,3 +2390,3 @@
-$\|\widehat C_i^{-1/2}C^{1/2}\|^2 =\|\widehat C_i^{-1/2}C\widehat C_i^{-1/2}\|_{\op}\leq1+\xi$.
-By Chernoff, the number of accurate indices exceeds $L/2+1$ with probability at
-least
+$\|\widehat C_i^{-1/2}C^{1/2}\|^2 =\|\widehat C_i^{-1/2}C\widehat C_i^{-1/2}\|_{\op}\leq(1-\xi)^{-1}$.
+By Hoeffding's inequality, the number of accurate indices exceeds $L/2$
+with probability at least
@@ -2202,6 +2394,4 @@
-On that event, every accurate index has at least $L/2+1$ partners, so
-$i^*$ has at least
-$L/2+1$ partners; since fewer than
-$L/2$ indices are inaccurate,
-$i^*$ has an accurate partner
-$j$.
+On that event, every accurate index has more than $L/2$ partners,
+so $i^*$ also has more than $L/2$ partners.
+Since fewer than $L/2$ indices are inaccurate,
+$i^*$ has an accurate partner $j$.
@@ -2257 +2447 @@
-  Let $Q_{\rm iso}(N)=A_CN^3\log^{a_C}N$ be the expected-query bound of
+  Let $Q_{\rm iso}(N)=A_CN^3\log^{a_C}(2N)$ be the expected-query bound of
@@ -2260 +2450 @@
-  $Q_{\rm est}(N)=168AN^3\log^a(64N)$ be that of \cref{thm:moment-estimation}
+  $Q_{\rm est}(N)=168AN^3\log^a(128N)$ be that of \cref{thm:moment-estimation}
@@ -2273 +2463,2 @@
-  If it fails or times out, mark trial $i$ failed.
+  If it fails or times out, mark trial $i$ failed
+  and continue with the next trial.
@@ -2284 +2475,2 @@
-  If it fails or times out, mark trial $i$ failed.
+  If it fails or times out, mark trial $i$ failed
+  and continue with the next trial.
@@ -2292,0 +2485 @@
+  If $\widetilde C_i^x$ is not positive definite, mark trial $i$ failed.
@@ -2486,0 +2680,3 @@
+Every accurate covariance block is positive definite, so the additional
+check rejects no accurate trial. Treat failed trials as failure symbols
+in \cref{lem:selection}.
@@ -2737,7 +2933,7 @@
-\leq C_1
-\]
-for a universal $C_1=C_1(\gamma,h_0)$, since
-$xe^{-cx}$ is bounded on
-$x\geq0$.
-In total $\E{\pi_s}{\|Z\|^2}\leq u^2c_P^2n+C_1\leq K_Tn$ with
-$K_T=2u^2c_P^2$.
+\leq768n.
+\]
+In total,
+\[
+\E{\pi_s}{\|Z\|^2}\leq (u^2c_P^2+768)n=K_Tn,
+\qquad K_T:=u^2c_P^2+768.
+\]
@@ -2825 +3021 @@
-$\|m_{F_\#\pi_t}\| =\|\widehat C^{-1/2}(m_t-\widehat m)\| \leq(1+\eps_{\rm cool})^{1/2}\,\eps_{\rm cool} \leq\rho_L/2$.
+$\|m_{F_\#\pi_t}\| =\|\widehat C^{-1/2}(m_t-\widehat m)\| \leq(1-\eps_{\rm cool})^{-1/2}\,\eps_{\rm cool} \leq\rho_L/2$.
@@ -3007,0 +3204 @@
+\begin{aligned}
@@ -3009,3 +3206,4 @@
-=2|\langle v,m-c\rangle||\langle v,d\rangle|
-\leq2(v^\top(m-c)(m-c)^\top v)^{1/2}(\zeta^2v^\top Cv)^{1/2}
-\leq\zeta\,v^\top M(c)v ,
+&=2|\langle v,m-c\rangle||\langle v,d\rangle|\\
+&\leq2(v^\top(m-c)(m-c)^\top v)^{1/2}(\zeta^2v^\top Cv)^{1/2}\\
+&\leq\zeta\,v^\top M(c)v,
+\end{aligned}
@@ -3016,4 +3214,8 @@
-$\widehat M(c)\preceq(1+\alpha)M(c)$ and
-$M(c)\preceq\frac1{1-\alpha}\widehat M(c)\preceq1.01\widehat M(c)$, while
-$\widehat M(c)\succeq(1-\alpha)M(c)$ gives
-$M(c)\succeq\frac1{1+\alpha}\widehat M(c)\succeq0.99\widehat M(c)$.
+the bounds
+$(1-\alpha)M(c)\preceq\widehat M(c)\preceq(1+\alpha)M(c)$ imply
+\[
+(1+\alpha)^{-1}\widehat M(c)
+\preceq M(c)
+\preceq(1-\alpha)^{-1}\widehat M(c).
+\]
+Thus $0.99\widehat M(c)\preceq M(c)\preceq1.01\widehat M(c)$.
@@ -3146 +3348,5 @@
-The number of cooling stages is $N=O(n^{1/4}\log(2+R/r))$; with
+The number of cooling stages satisfies
+\[
+N=O(n^{1/4}\log(2+R/r)).
+\]
+With
@@ -3158,2 +3364 @@
-Since $t_N=t_0(1-\delta)^N\leq t_0e^{-\delta N}$ and
-$\delta=\gamma n^{-1/4}$,
+By the definition of $N$ and $(1-\delta)^j\leq e^{-\delta j}$,
@@ -3162,2 +3367,2 @@
-\leq\Bigl\lceil\delta^{-1}\log\frac{t_0R^2}{\eta_0}\Bigr\rceil
-=O\bigl(n^{1/4}\log\bigl(R^2/(r^2\eta_0)\bigr)\bigr)
+\leq\max\left\{0,
+\left\lceil\delta^{-1}\log\frac{t_0R^2}{\eta_0}\right\rceil\right\}
@@ -3166 +3371 @@
-using \cref{lem:Rr} to absorb constants.
+since $\delta=\gamma n^{-1/4}$ and $\eta_0$ is universal.
@@ -3228 +3433 @@
-$\|\widehat C^{-1/2}(m_{F_\#\pi}-\widehat m)\| \leq(1+\eps_{\rm cool})^{1/2}\,\eps_{\rm cool}\leq1/250$.
+$\|\widehat C^{-1/2}(m_{F_\#\pi}-\widehat m)\| \leq(1-\eps_{\rm cool})^{-1/2}\,\eps_{\rm cool}\leq1/250$.
@@ -3614 +3819 @@
-$e^{-U}$ is integrable.
+$0<\int_{\mathbb R^n}e^{-U(z)}\,dz<\infty$.
@@ -3624,2 +3829,2 @@
-For a base potential $P$ and
-$J\succeq0$, we use the shorthand
+For a base potential $P$ and $J\succeq0$ for which the denominator below
+is positive and finite, we use the shorthand
@@ -3751,6 +3956,5 @@
-even, and convex, and let
-\[
- d\gamma_P(y)=
- \frac{e^{-P(y)-\lVert y\rVert_2^2}\,dy}
- {\int_{\mathbb R^n}e^{-P(z)-\lVert z\rVert_2^2}\,dz}.
-\]
+even, and convex, and suppose
+\[
+0<Z_P:=\int_{\mathbb R^n}e^{-P(z)-\lVert z\rVert_2^2}\,dz<\infty.
+\]
+Define $d\gamma_P(y)=Z_P^{-1}e^{-P(y)-\lVert y\rVert_2^2}\,dy$.
@@ -4948,9 +5152,12 @@
-For every symmetric direction $\Delta$, differentiation under the integral gives
-\[
- \left.\frac{d}{dt}D_{\rm sym}(H+t\Delta)\right|_{t=0}
- =\operatorname{Tr}(C_H\Delta).
-\]
-The map $H\mapsto\log Z_V(H)$ is convex, so
-$D_{\rm sym}$ is concave.
-Its supporting-hyperplane inequality at $H$, with
-$\Delta=H^+-H$, therefore gives
+Set $\Delta=H^+-H$. Since $H,H^+\succeq0$, both normalizing constants
+are positive and finite. Jensen's inequality gives
+\[
+\begin{aligned}
+D_{\rm sym}(H^+)-D_{\rm sym}(H)
+&=-\log\E{X\sim\nu_H}{e^{-X^{\mathsf T}\Delta X}}\\
+&\leq\E{X\sim\nu_H}{X^{\mathsf T}\Delta X}
+=\operatorname{Tr}(C_H\Delta).
+\end{aligned}
+\]
+The quadratic expectation is finite because $\nu_H$ has finite second moments.
+Substituting the update formula gives
@@ -5241 +5448 @@
- C_4(1-e^{-D_{\rm sym}(H)})^{1/2}\;u^{\mathsf T} C_0u\\
+ C_4^{1/2}(1-e^{-D_{\rm sym}(H)})^{1/2}\;u^{\mathsf T} C_0u\\
@@ -5657,4 +5863,0 @@
-\bibitem[KV24]{KV24:arxiv}
-Yunbum Kook and Santosh~S. Vempala.
-\newblock Covariance estimation using {M}arkov chain {M}onte {C}arlo, 2024.
-
@@ -5667,0 +5871,7 @@
+\newblock Full version (used for theorem numbering):
+\url{https://arxiv.org/abs/2411.13462v1}.
+
+\bibitem[KZ24]{KZ24:arxiv}
+Yunbum Kook and Matthew~S. Zhang.
+\newblock Covariance estimation using {M}arkov chain {M}onte {C}arlo, 2024.
+\newblock \url{https://arxiv.org/abs/2410.17147v1}.
@@ -5700 +5910 @@
-\bibitem[LV18a]{LV18}
+\bibitem[LV18]{LV18}
@@ -5706,4 +5915,0 @@
-
-\bibitem[LV18b]{LV18:arxiv}
-Yin~Tat Lee and Santosh~S. Vempala.
-\newblock The {K}annan-{L}ov\'{a}sz-{S}imonovits conjecture, 2018.
@@ -6546 +6752 @@
-Our family works for any $\delta \geq n^{-1/2}$, including
+Our family works for every $n^{-1/2}\leq\delta\leq1$, including
@@ -6922,6 +7128,5 @@
-Since $A_s\geq 1/2$ and the
-$K_0$-section radius is at most
-$e_s(x)$ on this tail,
-\[
-e_s(x)^d\leq e^{-dA_sv},
-\qquad
+On the support of this tail, the $D_s$-section radius is at most $e_s(x)$.
+Since $A_s\geq1/2$, its section volume, divided by
+$\operatorname{vol}(B_2^d)$, is at most $e^{-dA_sv}$.
+Hence the positive-tail mass is at most
+\[
```

</details>

[paper-audit: ready]
