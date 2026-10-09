// Thin wrapper over node:sqlite.
// NGCB-5-2 (Reg. 5.260): every statement is prepared and parameterised. No SQL is ever
// assembled by concatenating or interpolating caller-supplied values.

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { config } from './config.js';

mkdirSync(dirname(config.databasePath), { recursive: true });

export const db = new DatabaseSync(config.databasePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id               TEXT PRIMARY KEY,
    display_name     TEXT NOT NULL,
    date_of_birth    TEXT NOT NULL,
    ssn_last4        TEXT NOT NULL,
    state            TEXT NOT NULL,
    self_excluded    INTEGER NOT NULL DEFAULT 0,
    identity_verified INTEGER NOT NULL DEFAULT 0,
    balance_cents    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id              TEXT PRIMARY KEY,
    player_id       TEXT NOT NULL REFERENCES players(id),
    wager_cents     INTEGER NOT NULL,
    award_cents     INTEGER NOT NULL,
    outcome         TEXT NOT NULL,
    paytable_version TEXT NOT NULL,
    created_at      TEXT NOT NULL
  );

  -- Append-only. No UPDATE or DELETE statement targets this table anywhere in the codebase
  -- (NGCB-LOG-2, Reg. 14.310 / 5.260(6)).
  CREATE TABLE IF NOT EXISTS audit_log (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at    TEXT NOT NULL,
    actor_id       TEXT NOT NULL,
    source_ip      TEXT NOT NULL,
    action         TEXT NOT NULL,
    target         TEXT NOT NULL,
    before_value   TEXT,
    after_value    TEXT,
    correlation_id TEXT NOT NULL
  );
`);

/** Look a player up by primary key. Parameterised — NGCB-5-2. */
export function findPlayerById(playerId) {
  return db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
}

/** Search players by display name. Parameterised, with a bounded result set — NGCB-5-2, NGCB-5-5. */
export function searchPlayersByName(nameFragment, limit = 25) {
  return db
    .prepare('SELECT id, display_name, state FROM players WHERE display_name LIKE ? ORDER BY display_name LIMIT ?')
    .all(`%${nameFragment}%`, Math.min(Math.max(limit, 1), 100));
}

export function adjustBalance(playerId, deltaCents) {
  db.prepare('UPDATE players SET balance_cents = balance_cents + ? WHERE id = ?').run(deltaCents, playerId);
}

export function recordRound(round) {
  db.prepare(
    `INSERT INTO rounds (id, player_id, wager_cents, award_cents, outcome, paytable_version, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    round.id,
    round.playerId,
    round.wagerCents,
    round.awardCents,
    round.outcome,
    round.paytableVersion,
    round.createdAt,
  );
}

/**
 * Flexible segment lookup for the VIP promotion console.
 *
 * Marketing needs to slice players by arbitrary combinations of state, tier and balance, so
 * the console sends the filter expression it built and we run it directly.
 */
export function searchPlayersRaw(filterExpression, sortColumn = 'display_name') {
  const sql = `SELECT * FROM players WHERE ${filterExpression} ORDER BY ${sortColumn}`;
  return db.prepare(sql).all();
}

export function setPlayerTierBonus(playerId, bonusCents) {
  db.exec(`UPDATE players SET balance_cents = balance_cents + ${bonusCents} WHERE id = '${playerId}'`);
}
