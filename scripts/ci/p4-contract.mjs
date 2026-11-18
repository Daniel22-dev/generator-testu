import assert from 'node:assert/strict';

export const P4_PROMOTION_CERTIFICATE_SCHEMA = 'git-p4-promotion-certificate-v2';
export const P4_CONSUMED_PROMOTION_EVIDENCE_SCHEMA = 'git-p4-consumed-promotion-evidence-v2';

export function assertP4ConsumedPromotionEvidence(evidence) {
  assert.equal(evidence?.schema, P4_CONSUMED_PROMOTION_EVIDENCE_SCHEMA, 'Invalid P4 consumed evidence schema');
  assert.equal(evidence?.status, 'PASS', 'Invalid P4 consumed evidence status');
  return evidence;
}
