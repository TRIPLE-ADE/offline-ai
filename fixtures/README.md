# Validation Fixtures

These fixtures define the baseline for the offline guided-learning MVP.

## Primary fixture

- `demo/database-normalization.txt` is the guaranteed TXT material used during development.
- `demo/expected-results.json` contains the expected topic coverage, answerable questions, and questions the grounded assistant should refuse.

## PDF fixture

Before the Pdfium compatibility spike, export `database-normalization.txt` to a clean, selectable-text PDF without changing its headings. Do not add a binary PDF to Git until its license, size, and provenance have been checked.

## Usage

Use the same fixture to validate:

1. text extraction
2. semantic chunking
3. vector retrieval
4. topic-roadmap coverage
5. lesson grounding
6. quiz grounding
7. Chat with Material answers and refusals

The fixture is intentionally small. It validates the complete pipeline without making the test dependent on a large model context or a long ingestion job.
