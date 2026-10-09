# wynn-demo

A deliberately small Node.js interactive-gaming service — player records, a wallet, and a
slot-style round engine — used to demonstrate compliance-aware automated code review.

The point of the repo is the review configuration, not the game:

- **[`docs/CODING_GUIDELINES.md`](docs/CODING_GUIDELINES.md)** — engineering rules derived from
  Nevada Gaming Control Board **Regulation 14** (gaming devices, source code submission,
  change control, record retention) and **Regulation 5.260** (cybersecurity), plus
  **Regulation 5A.070** internal controls. Every rule has a stable ID (`NGCB-14-3`, `NGCB-5-1`, …).
- **[`.coderabbit.yaml`](.coderabbit.yaml)** — points CodeRabbit at those guidelines via
  `reviews.path_instructions`, with tighter instructions on the control-program paths
  (`src/rng.js`, `src/paytable.js`, `src/routes/game.js`, `src/routes/admin.js`) and the audit trail.

## Layout

| Path | Role |
| --- | --- |
| `src/config.js` | Environment-only configuration; refuses to start without its secrets. |
| `src/db.js` | `node:sqlite` access layer, prepared statements only. |
| `src/auth.js` | JWT authentication, role and ownership guards. |
| `src/rng.js` | CSPRNG outcome selection. **Control program.** |
| `src/paytable.js` | Approved outcome weights and multipliers. **Control program.** |
| `src/routes/game.js` | Round play. **Control program.** |
| `src/routes/admin.js` | Read-only view of the control program in force. |
| `src/audit.js` | Append-only audit trail with PII redaction. |

## Running

```bash
npm install
cp .env.example .env     # then fill in JWT_SECRET
JWT_SECRET=... npm start
npm test
```

> This is demo code for evaluating a code-review tool. It is not a licensed gaming system and
> is not suitable for production or for submission to the Board.
