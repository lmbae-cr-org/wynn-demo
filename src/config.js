// Configuration loader.
// NGCB-5-1 (Reg. 5.260(3)): secrets come from the environment only. No literals, no fallbacks.
// The process fails to start if a required secret is absent, so a misconfigured deploy
// can never silently run with a known-weak key.

const REQUIRED = ['JWT_SECRET', 'JWT_ISSUER', 'JWT_AUDIENCE', 'CONTROL_PROGRAM_VERSION'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Refusing to start: missing required configuration: ${missing.join(', ')}`);
}

export const config = Object.freeze({
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  databasePath: process.env.DATABASE_PATH ?? 'data/gaming.db',
  jwt: Object.freeze({
    secret: process.env.JWT_SECRET,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    algorithm: 'HS256',
  }),
  // Reg. 14.400(9): the part/version number submitted to the Board. Bump on any
  // control-program change (NGCB-14-10).
  controlProgramVersion: process.env.CONTROL_PROGRAM_VERSION,
  // Reg. 14.310 / 5.260(6): five-year minimum retention for regulated records.
  auditRetentionDays: 365 * 5,
  wager: Object.freeze({
    // Monetary values are integer minor units (cents) throughout — NGCB-14-6.
    minCents: 100,
    maxCents: 50_000,
  }),
});
