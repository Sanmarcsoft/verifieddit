/* eslint-disable no-undef */

/**
 * Durable Content Credentials — the three pillars, detected from a c2pa-js
 * active manifest. Mirrors the verifieddit.com / trusteddit.com web verifiers.
 *
 *   Pillar 1  C2PA signature + RFC 3161 timestamp        (signatureInfo + time)
 *   Pillar 2  TrustMark watermark (durable soft binding) (c2pa.soft_binding)
 *   Pillar 3  Manifest store registration (byBinding)    (c2pa.soft_binding)
 *
 * Pillars 2 and 3 both ride the c2pa.soft_binding assertion: the watermark
 * embeds the binding key and that key is registered in the manifest store so
 * the credential survives stripping/re-encoding. A signature with no
 * soft_binding is embed-only (pillar 1 only).
 */

function hasSoftBinding(activeManifest) {
  if (!activeManifest) return false;
  try {
    const accessor = activeManifest.assertions;
    if (accessor && typeof accessor.get === 'function') {
      const got = accessor.get('c2pa.soft_binding');
      if (Array.isArray(got) && got.length > 0) return true;
    }
    const raw = (accessor && accessor.data) || (Array.isArray(accessor) ? accessor : null);
    if (Array.isArray(raw)) {
      return raw.some((a) => {
        const label = (a && a.label ? String(a.label) : '').toLowerCase();
        return label.includes('soft_binding') || label.includes('soft-binding');
      });
    }
  } catch (_e) {
    /* defensive: never break verification over the indicator */
  }
  return false;
}

export function detectDurablePillars(activeManifest) {
  const signed = Boolean(activeManifest && activeManifest.signatureInfo);
  const timestamp =
    activeManifest && activeManifest.signatureInfo && activeManifest.signatureInfo.time;
  const soft = hasSoftBinding(activeManifest);

  const signedAndTimestamped = signed && Boolean(timestamp);
  const count = (signedAndTimestamped ? 1 : 0) + (soft ? 1 : 0) + (soft ? 1 : 0);

  return {
    signedAndTimestamped,
    trustmark: soft,
    manifestStore: soft,
    durable: signedAndTimestamped && soft,
    count,
  };
}
