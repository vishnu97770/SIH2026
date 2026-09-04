# SIH P0/P1 Demo Feature Upgrade

The three previously partial capabilities now have explicit, judge-friendly demo flows:

- OCR & extraction: upload response records a completed OCR/extraction stage and exposes extracted text blocks, tables and metadata in the document viewer.
- Knowledge base/indexing: every processed document exposes Upload -> OCR/Extract -> Chunk -> Index -> Retrieve -> Ground pipeline status; the Assistant shows indexed document/chunk counts.
- Confidence/grounding: Assistant responses include a deterministic grounding percentage, label, evidence count, retrieval match score per citation, and the scoring method.

Important: this remains a prototype/demo implementation. The OCR stage and knowledge-base index are simulated local pipeline outputs, not production OCR or a vector database. This is intentionally transparent so the team can demonstrate the architecture without claiming live infrastructure.
