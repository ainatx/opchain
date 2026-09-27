# Bug-check — exact candidate policy

**Mechanical verdict: PASS — eight of eight declared checks.** Candidate63bb189, index tree6a65895fd21ab4b8d323c8bbc3a60ecf9e3bd791. The candidate's2.0 immutable verifier materialized and checked that tree under .bugcheck.json. The full receipt is evidence/bugcheck-receipt.json; summary evidence/bugcheck-verifier.json.

Passed: type safety, configured lint, tests, anti-pattern scan, secret scan, build, root dependencies and site dependencies. Check durations total about67.5seconds. No real candidate index or source was edited. The previous1.9.1 checkpoint PASS was not used as authorization.

**Limits:** configured dependency commands use critical severity as their failing threshold. A fresh npm JSON audit reports0 root vulnerabilities and13 site dependencies affected (7high,4moderate,2low;0critical), in the development-tool chain. The eight-check PASS does not mean vulnerability-free. The user-selected1.9.1 skill's generic strict-warning semantics would flag high-severity warnings, whereas this candidate's declared command exits0 below critical and records PASS. Preserve this policy/expectation distinction; do not describe the receipt as a clean security audit. Source-wide scan exceptions are bound to exact file digests in policy.

This receipt proves only declared checks, not successful end-to-end use of every skill. New scenario defects and documented external release prerequisites independently require NO-GO. No bypass, commit or release occurred.
