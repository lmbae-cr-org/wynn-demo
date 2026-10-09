// Authentication and authorisation middleware.
// NGCB-5-3 (Reg. 5.260, Reg. 5A.070(4)): default-deny. Every route below the mount point
// requires a verified principal, and state-changing routes additionally require an explicit
// role check. NGCB-5-4: the JWT algorithm is pinned and issuer/audience/expiry are verified,
// so an `alg: none` or algorithm-confusion token is rejected.

import jwt from 'jsonwebtoken';

import { config } from './config.js';

export function authenticate(req, res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'authentication_required' });
  }

  try {
    req.principal = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
    return next();
  } catch {
    // NGCB-5-8: fail closed, and do not echo the verification error to the client.
    return res.status(401).json({ error: 'invalid_token' });
  }
}

export function requireRole(...allowed) {
  return function roleGuard(req, res, next) {
    const roles = req.principal?.roles ?? [];
    if (!allowed.some((role) => roles.includes(role))) {
      return res.status(403).json({ error: 'forbidden' });
    }
    return next();
  };
}

/**
 * Enforce that the authenticated principal owns the player record being addressed.
 * NGCB-5A-2 (Reg. 5A.070(5)): an account may only be accessed by its owner. Staff roles are
 * allowed through so support can act, but the access is audited by the caller.
 */
export function requireOwnershipOrRole(paramName, ...staffRoles) {
  return function ownershipGuard(req, res, next) {
    const roles = req.principal?.roles ?? [];
    const isOwner = req.principal?.sub === req.params[paramName];
    if (!isOwner && !staffRoles.some((role) => roles.includes(role))) {
      return res.status(403).json({ error: 'forbidden' });
    }
    return next();
  };
}
