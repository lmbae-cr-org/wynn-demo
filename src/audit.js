// Append-only audit trail.
// NGCB-LOG-1/2/3/4 (Reg. 14.310, Reg. 5.260(6), Reg. 5A.190).
//
// Every regulated event carries: UTC timestamp, actor, source IP, action, target,
// before/after values and a correlation ID. Records are never updated or deleted, and a
// failed write fails the caller's operation rather than being swallowed — if we cannot
// evidence the event, we do not perform it.

import { randomUUID } from 'node:crypto';

import { db } from './db.js';

const SENSITIVE_KEYS = new Set([
  'ssn',
  'ssnLast4',
  'ssn_last4',
  'dateOfBirth',
  'date_of_birth',
  'password',
  'token',
  'authorization',
  'cardNumber',
  'accountNumber',
]);

/** Strip personal information and secrets before anything is persisted — NGCB-5-6, NGCB-LOG-4. */
function redact(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return String(value);
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = SENSITIVE_KEYS.has(key) ? '[redacted]' : redact(val);
  }
  return JSON.stringify(out);
}

export function newCorrelationId() {
  return randomUUID();
}

/**
 * Write one audit record. Throws if the record cannot be persisted (NGCB-LOG-2).
 */
export function recordAuditEvent({ actorId, sourceIp, action, target, before, after, correlationId }) {
  if (!actorId || !action || !target || !correlationId) {
    throw new Error('Audit record is incomplete; refusing to proceed.');
  }

  db.prepare(
    `INSERT INTO audit_log
       (occurred_at, actor_id, source_ip, action, target, before_value, after_value, correlation_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    new Date().toISOString(),
    actorId,
    sourceIp ?? 'unknown',
    action,
    target,
    redact(before),
    redact(after),
    correlationId,
  );
}
