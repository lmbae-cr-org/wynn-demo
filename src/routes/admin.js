import express from 'express';

import { config } from '../config.js';
import { authenticate, requireRole } from '../auth.js';
import { newCorrelationId, recordAuditEvent } from '../audit.js';
import { APPROVAL_REFERENCE, OUTCOMES, PAYTABLE_VERSION, theoreticalRtp } from '../paytable.js';

export const adminRouter = express.Router();

// NGCB-5-3: authenticated, and restricted to the compliance role.
adminRouter.use(authenticate, requireRole('compliance'));

/**
 * Read-only view of the control program in force.
 *
 * There is deliberately no write endpoint here. Reg. 14.110(1) permits modification of a
 * gaming device only with prior written approval of the Chair, and Reg. 14.400 ties the
 * approval to a submitted part/version number and file signature. A paytable change is
 * therefore a code change that goes through submission and approval — never a runtime
 * mutation (NGCB-14-8, NGCB-14-9).
 */
adminRouter.get('/control-program', (req, res) => {
  recordAuditEvent({
    actorId: req.principal.sub,
    sourceIp: req.ip,
    action: 'control_program.read',
    target: `paytable:${PAYTABLE_VERSION}`,
    correlationId: newCorrelationId(),
  });

  return res.json({
    controlProgramVersion: config.controlProgramVersion,
    paytableVersion: PAYTABLE_VERSION,
    approvalReference: APPROVAL_REFERENCE,
    theoreticalRtp: Number(theoreticalRtp().toFixed(4)),
    outcomes: OUTCOMES,
  });
});
