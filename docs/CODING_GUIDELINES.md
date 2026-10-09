# Gaming Compliance Coding Guidelines

**Scope:** every file in this repository.
**Authority:** Nevada Gaming Control Board (NGCB) regulations, as adopted by the Commission.

| Source | Revision reviewed | Why it applies here |
| --- | --- | --- |
| [Regulation 14](https://www.gaming.nv.gov/siteassets/content/home/features/Regulation14.pdf) — Manufacturers, Distributors, Gaming Devices, Inter-Casino Linked Systems, Associated Equipment; Independent Testing Laboratories | Rev. 12/24 | Governs game logic, source-code submission, modification/change control, program identification and record retention. |
| [Regulation 5.260](https://www.gaming.nv.gov/siteassets/content/regs/regulation-5-as-of-09-26.pdf) — Cybersecurity | Rev. 09/26 (Adopted 12/22, amended 7/24, 1/26) | Governs protection of information systems, patron/employee personal information, incident detection and response, and documentation retention. |
| [Regulation 5A](https://www.gaming.nv.gov/contentassets/d6342a488e944e6aa02337fa9d3c94e5/regulation-5a-as-of-02-26.pdf) — Operation of Interactive Gaming | Rev. 02/26 | Internal controls for interactive gaming systems: system security, player identification, account confidentiality, PII protection (5A.070). |

> Note on citations: the cybersecurity obligation is **Regulation 5.260**, which lives in Regulation 5 (Operation of Gaming Establishments), not in Regulation 5A. Both are listed above because 5A.070 carries the interactive-gaming internal-control requirements that most of this codebase implements.

Each rule below has a stable ID (`NGCB-xx-n`). **Cite the rule ID in every review comment** so findings can be traced into the compliance record required by Reg. 5.260(6).

---

## 1. Game fairness and outcome integrity — Reg. 14.040

Applies to anything that determines, influences, displays or pays a game outcome.

- **NGCB-14-1 — Outcome determined only by chance and/or skill.** Game outcome must be determined solely by chance, player skill, or a combination (14.040(1)(b)). Reject any code path where outcome depends on player identity, account balance, loyalty tier, session history, time of day, house performance, or a feature flag.
- **NGCB-14-2 — Never adapt behaviour to actual hold.** "Gaming devices must not alter any function of the device based on the actual hold percentage" (14.040(7)). Reject any logic reading realised hold/RTP/house-win metrics and feeding them back into outcome, paytable, odds, volatility or bonus eligibility.
- **NGCB-14-3 — Cryptographically sound randomness.** Outcome selection must use a CSPRNG (`crypto.randomInt`, `crypto.randomBytes`). `Math.random()`, `Date.now()`, PIDs, incrementing counters, or any seeded/reproducible PRNG are prohibited for anything that selects or weights an outcome. Seeding an RNG from an attacker- or operator-controllable value is a critical finding.
- **NGCB-14-4 — Full outcome space available every play.** "All possible game outcomes must be available upon the initiation of each play" (14.040(4)). Reject code that removes, filters, caps or pre-excludes outcomes (e.g. dropping the top prize once a budget is hit).
- **NGCB-14-5 — Rules immutable mid-game.** Once a game is initiated, rules of play, probability and award cannot change for that game (14.040(2)); mid-session changes require prominent player notice. Reject mutation of an in-flight game/round record's paytable, odds or award.
- **NGCB-14-6 — Accurate, non-misleading display.** Rules of play, wager amount, award, fees/rake, limits, total wagered and outcome must be reported accurately (14.040(1)(c)). Reject rounding, truncation or float arithmetic on monetary values — use integer minor units (cents) or a decimal type.
- **NGCB-14-7 — Minimum payback.** Theoretical return must stay at or above 75% for every wager available for play (14.040(1)(a)). Any change to paytables, weights or RTP constants must state the resulting theoretical RTP in the PR description.

## 2. Change control, versioning and submission — Reg. 14.030, 14.110, 14.400

- **NGCB-14-8 — Modifications require prior written approval.** Gaming-device modifications may only be made with prior written approval of the Chair (14.110(1)). Any change under a control-program path must reference an approval/submission ID in the PR description. Flag changes to control-program code that carry no approval reference.
- **NGCB-14-9 — Approval must not be bypassable at runtime.** Reject endpoints, env vars, flags or admin routes that let paytables, RTP, odds or control-program parameters be changed in a running system without going through the approval-and-submission path, and without an immutable record of who changed what.
- **NGCB-14-10 — Version and identification must change with the code.** Submissions carry part/version numbers and an HMAC-SHA1 (or Chair-approved) signature of all applicable files (14.400(9)–(10)). Any change to control-program files must bump the declared version/build identifier; a code change with an unchanged version string is a finding.
- **NGCB-14-11 — Source must be reproducible and reviewable.** Source code for programs with no use other than in a gaming device is submitted to the Board (14.030, 14.110(3)(c)); ITLs attest the source was reproduced (14.400(8)). Reject obfuscated code, minified or generated artifacts committed without source, `eval`/`new Function`/dynamic `require` of runtime-supplied strings, and code downloaded and executed at runtime.
- **NGCB-14-12 — Third-party code must be declared.** Independent-contractor-authored control-program code must be identified by contractor name and subject matter (14.110(3)(d)). New third-party dependencies in control-program paths require a note in the PR description and a pinned, integrity-checked version.

## 3. Cybersecurity — Reg. 5.260

- **NGCB-5-1 — No hardcoded secrets.** Credentials, API keys, signing keys, DB passwords, TLS material and session secrets must come from the environment or a managed secret store, must have no insecure default fallback, and the process must fail to start if one is missing. Any literal secret, or a default like `|| 'dev-secret'`, is a critical finding (5.260(1), (3)).
- **NGCB-5-2 — No injection.** All SQL, shell, LDAP and template interpolation must use parameterised APIs. String-concatenated or template-literal SQL carrying request data is a critical finding. Never pass request data to `child_process.exec`, `eval` or dynamic imports.
- **NGCB-5-3 — Authenticate and authorise every state-changing route.** Default-deny. Every route that reads patron data or mutates wallet, wager, account or configuration state must require an authenticated principal **and** an explicit role/permission check. Authorisation must be enforced server-side on the resource owner — never trust a client-supplied user/account ID (5A.070(4)).
- **NGCB-5-4 — Sound cryptography and token handling.** Use vetted primitives: Argon2id/bcrypt/scrypt for passwords; AES-GCM or libsodium for encryption; SHA-256+ for digests. Prohibited: MD5, SHA-1 (outside the ITL file-signature use in 14.400(10)), DES, ECB, static IVs, `createCipher`. JWTs must pin the algorithm, reject `none`, verify issuer/audience/expiry, and be short-lived.
- **NGCB-5-5 — Validate and bound all input.** Validate type, range, length and format at the trust boundary before use. Wager amounts and balances must be validated as non-negative integers within configured limits; reject `NaN`, `Infinity`, negatives and precision tricks. Guard against prototype pollution and mass assignment.
- **NGCB-5-6 — Protect personal information.** Personal information as defined in NRS 603A.040 and PII under 5A.070(10) — name, SSN, DOB, government IDs, financial and account data — must never be written to logs, error messages, URLs, analytics or client responses beyond what the caller is entitled to. Mask account and instrument numbers. Encrypt PII in transit and at rest.
- **NGCB-5-7 — Transport security.** TLS verification must never be disabled (`rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0`). No plaintext HTTP for data in transit. Cookies: `Secure`, `HttpOnly`, `SameSite`.
- **NGCB-5-8 — Safe error handling and detection.** Never return stack traces, SQL text, file paths or configuration to clients. Fail closed: a failed auth, crypto or integrity check must deny the operation, never fall through to success. Preserve the ability to detect incidents — swallowing or discarding security-relevant errors undermines the detect/respond duty in 5.260(2)(c).
- **NGCB-5-9 — Dependency and supply-chain hygiene.** Pin versions, keep the lockfile in the PR, no dependency on an unaudited or newly published package in a control-program or payment path, no `postinstall` scripts added without justification.

## 4. Audit logging and records — Reg. 14.310, 5.260(6), 5A.190

- **NGCB-LOG-1 — Log every regulated event.** Wagers, outcomes, payouts, wallet credits/debits, account registration and verification, login success/failure, privilege changes, and any configuration or paytable change must produce an audit record containing: timestamp (UTC), actor, source IP, action, target, before/after values, and correlation ID.
- **NGCB-LOG-2 — Audit records are append-only.** Reject code that updates, deletes, truncates, reorders or conditionally skips audit writes. An audit write failure must fail the operation, not be silently caught.
- **NGCB-LOG-3 — Five-year retention.** Records required by Reg. 14 must be retained for 5 years (14.310); records documenting Reg. 5.260 compliance for a minimum of 5 years from creation (5.260(6)); interactive-gaming records per 5A.190. Reject retention/TTL/log-rotation settings shorter than 5 years on regulated record stores, and reject hard deletes without an approved purge path.
- **NGCB-LOG-4 — Logs must not leak.** Audit and application logs are subject to NGCB-5-6: no secrets, no tokens, no full PII, no card or bank numbers.
- **NGCB-LOG-5 — Preserve incident evidence.** 5.260(4) requires notifying the Chair within 24 hours of activating the incident response plan and investigating root cause. Code must not destroy the evidence that makes that possible: no disabling of security logging, no reducing log level on auth/crypto failures, no catch-and-continue around integrity checks.

## 5. Internal controls for interactive gaming — Reg. 5A.070

- **NGCB-5A-1 — Robust, redundant player identification.** Registration and verification must enforce identity, 21+ age, address, SSN-last-4, self-exclusion and excluded-persons checks (5A.070(4), 5A.110). Reject code paths that skip, stub, short-circuit or make optional any of these checks, including behind a test/debug flag reachable in production.
- **NGCB-5A-2 — Account confidentiality and single-user access.** A player account may only be accessed by its owner (5A.070(5), 5A.110(3)(c)). Enforce ownership server-side; reject IDOR patterns.
- **NGCB-5A-3 — Human players only, no collusion.** Preserve bot/automation and collusion detection (5A.070(6)–(7)); reject changes that weaken rate limiting, device fingerprinting or multi-accounting checks.
- **NGCB-5A-4 — Self-exclusion and responsible gaming are hard gates.** Self-exclusion and excluded-person checks must be fail-closed (5A.070(9), Reg. 5.170, NRS 463.151).
- **NGCB-5A-5 — Ongoing integrity testing.** Changes to game, wallet or RNG code require accompanying tests (5A.070(8)). A control-program change with no test coverage is a finding.

---

## How to review a change in this repository

1. Identify whether the change touches a **control program** path (`src/rng.js`, `src/routes/game.js`, `src/paytable*`, anything determining or paying an outcome) — these carry the Reg. 14 change-control duties.
2. Apply the rules above and **cite the rule ID and the regulation section** in each comment.
3. Classify severity:
   - **Critical** — hardcoded secret, injection, missing authn/authz, non-CSPRNG outcome, audit log suppression, PII exposure. These are regulatory violations, not style issues; block the PR.
   - **Major** — weak crypto, missing validation, missing audit field, retention below 5 years, missing version bump.
   - **Minor** — naming, structure, test gaps that do not themselves breach a rule.
4. State the remediation concretely, and note that failure to exercise proper due diligence under Reg. 5.260(7) is an unsuitable method of operation subject to disciplinary action.

*These guidelines are an engineering control derived from the cited regulations. They are not legal advice and do not replace review by Wynn's compliance function or the Board.*
