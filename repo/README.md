# Repository papers

PDFs listed on `repository.html` live in this directory. Papers may be stored
directly under `repo/` or in a separate subdirectory when they have supporting
files.

Preferred layout for a paper with only a PDF:

```text
repo/
  paper-title.pdf
```

Preferred layout for a paper with additional files:

```text
repo/
  paper-title/
    paper.pdf
    supplementary-material.pdf
```

Link to these files from `repository.html` with paths such as:

```html
<a class="paper-pdf" href="repo/paper-title/paper.pdf">PDF</a>
```
