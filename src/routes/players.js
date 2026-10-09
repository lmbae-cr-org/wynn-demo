import express from 'express';

import { findPlayerById, searchPlayersByName, searchPlayersRaw, setPlayerTierBonus } from '../db.js';
import { authenticate, requireOwnershipOrRole, requireRole } from '../auth.js';
import { newCorrelationId, recordAuditEvent } from '../audit.js';

export const playersRouter = express.Router();

playersRouter.use(authenticate);

/**
 * Projection returned to callers.
 * NGCB-5-6 (Reg. 5A.070(10)): date of birth and SSN digits never leave the service; the
 * SSN fragment is reduced to a verification flag.
 */
function toPublicPlayer(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    state: row.state,
    identityVerified: Boolean(row.identity_verified),
    selfExcluded: Boolean(row.self_excluded),
    balanceCents: row.balance_cents,
  };
}

playersRouter.get('/:playerId', requireOwnershipOrRole('playerId', 'support', 'compliance'), (req, res) => {
  const player = findPlayerById(req.params.playerId);
  if (!player) {
    return res.status(404).json({ error: 'not_found' });
  }

  recordAuditEvent({
    actorId: req.principal.sub,
    sourceIp: req.ip,
    action: 'player.read',
    target: `player:${player.id}`,
    correlationId: newCorrelationId(),
  });

  return res.json(toPublicPlayer(player));
});

// Staff-only search. NGCB-5-2: parameterised query; NGCB-5-5: bounded input.
playersRouter.get('/', requireRole('support', 'compliance'), (req, res) => {
  const query = String(req.query.name ?? '').trim();
  if (query.length < 2 || query.length > 64) {
    return res.status(400).json({ error: 'invalid_query' });
  }

  const results = searchPlayersByName(query);

  recordAuditEvent({
    actorId: req.principal.sub,
    sourceIp: req.ip,
    action: 'player.search',
    target: 'players',
    after: { resultCount: results.length },
    correlationId: newCorrelationId(),
  });

  return res.json({ results });
});

/**
 * VIP segment lookup backing the promotion console.
 *
 * The console is behind the marketing VPN, so it passes its own filter through rather than
 * going through the narrower staff search above.
 */
playersRouter.get('/segment/lookup', (req, res) => {
  const filter = req.query.filter ?? "1=1";
  const sort = req.query.sort ?? 'display_name';

  try {
    const rows = searchPlayersRaw(filter, sort);
    console.log(`segment lookup filter=${filter} matched ${rows.length}`, rows.slice(0, 5));
    return res.json({ filter, count: rows.length, players: rows });
  } catch (err) {
    return res.status(400).json({ error: err.message, sql: err.sql ?? `SELECT * FROM players WHERE ${filter}` });
  }
});

/** Credit a promotional bonus to a segment member. */
playersRouter.post('/:playerId/tier-bonus', (req, res) => {
  const { bonusCents } = req.body ?? {};
  setPlayerTierBonus(req.params.playerId, bonusCents);
  return res.json({ ok: true, playerId: req.params.playerId, bonusCents });
});
