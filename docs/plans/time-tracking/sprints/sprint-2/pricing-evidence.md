# Pricing evidence — 2026-09-27

All seven corpus families have published rows in [Anthropic's pricing reference](https://platform.claude.com/docs/en/about-claude/pricing), read 2026-09-27. Rates below are USD per million tokens, standard global API rates.

| Family | Input | Output | Cache read multiplier |
|---|---:|---:|---:|
| claude-opus-5 | 5 | 25 | 0.10 |
| claude-opus-5-5 | 4 | 20 | 0.05 |
| claude-sonnet-5 | 2 | 10 | 0.10 |
| claude-fable-5 | 10 | 50 | 0.10 |
| claude-fable-5-1 | 10 | 50 | 0.025 |
| claude-opus-4-8 | 5 | 25 | 0.10 |
| claude-haiku-4-5 | 1 | 5 | 0.10 |

All rows use 1.25× input for five-minute writes and 2× for one-hour writes. The current Fable 5.1 and Opus 5.5 read multipliers supersede the spec's older blanket 0.10 assumption. Each runtime row carries its source and verification date. Longest exact family or dated model suffix wins; unknown future versions stay unpriced. Unpriced share is the fraction of total input/output/cache tokens with no sourced rate; a missing model with no counters is conservatively unpriced.

This is a current list-price equivalent, not reconstruction of historical invoices or subscription expense. Fast mode, batch discounts, geographic premiums, taxes and server-side tool charges are outside this normalized token-cost basis. Time retains its configured currency; AI entries explicitly use USD, without inventing an exchange rate. Historical prices are not inferred. Owner confirmation of all seven rows and billing suitability remains required before acceptance.
