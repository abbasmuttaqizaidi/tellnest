Refine the existing Stories by Relay recommendation specification before implementation.

Keep the deterministic PostgreSQL-based scoring architecture and the 50/30/20 scoring pillars. Do not introduce an LLM, embeddings, or a new AI service.

Required changes:
1. Explicitly include saved collection affinity, derived from the genres/tags of stories inside a user's collections.
2. Define non-overlapping weights for all signals so the final score never exceeds 100.
3. Correct the SQL exclusion logic using NULL-safe author handling and NOT EXISTS for bookmarks.
4. Separate story rating from reading-completion/retention metrics. Only score metrics that actually exist in the database.
5. Use a dedicated last-chapter-published timestamp for serial freshness where available.
6. Define cold-start, exhausted-preference, and niche-genre fallback queries explicitly.
7. Add diversity safeguards so recommendations do not consistently favor only high-read-count authors and popular stories.
8. Generate recommendation explanation labels only from signals that actually contributed to the score.
9. Inspect the existing Supabase schema before proposing new tables or columns. Reuse existing fields wherever possible.
10. Validate indexes and benchmark using EXPLAIN ANALYZE instead of promising a fixed sub-10ms execution time.

Return the revised specification, final scoring weights, SQL compatible with the actual schema, required indexes, and a list of assumptions or missing data. Do not implement changes until the existing schema has been inspected.