/* eslint-disable no-undef */

import { EVENT_TYPE_C2PA_MANIFEST } from '../config.js';
import { displayError } from './errorUtils.js';

// Lucide icon paths (MIT) — one identity icon per durability pillar.
const PILLAR_ICONS = {
  stamp:
    '<path d="M5 22h14"/><path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z"/><path d="M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-3-3 3 3 0 0 0-3 3c0 2 1 2 1 3.5V13"/>',
  fingerprint:
    '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 12a9 3 0 0 0 5 2.69"/><path d="M21 9.3V5"/><path d="M3 5v14a9 3 0 0 0 6.47 2.88"/><path d="M12 12v4h4"/><path d="M13 20a5 5 0 0 0 9-3 4.5 4.5 0 0 0-4.5-4.5c-1.33 0-2.54.54-3.41 1.41L12 16"/>',
};

function svgIcon(paths, on) {
  return (
    `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" ` +
    `stroke="${on ? '#34d399' : '#64748b'}" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" ` +
    `${on ? 'style="filter:drop-shadow(0 0 4px rgba(52,211,153,.5))"' : ''}>${paths}</svg>`
  );
}

/**
 * Build the durable-credentials 3-pillar indicator injected into the
 * verification popover. Mirrors the verifieddit.com / trusteddit.com web
 * verifiers: one identity icon per pillar, lit when present.
 */
function buildPillarIndicator(pillars) {
  const wrap = document.createElement('div');
  wrap.setAttribute('slot', 'content');
  wrap.style.cssText =
    'font-family:system-ui,sans-serif;border-top:1px solid #1e293b;margin-top:8px;padding:10px 12px;background:#0b1220;border-radius:0 0 8px 8px;';
  const defs = [
    { icon: PILLAR_ICONS.stamp, label: 'Signed & timestamped', on: pillars.signedAndTimestamped },
    { icon: PILLAR_ICONS.fingerprint, label: 'Durable watermark', on: pillars.trustmark },
    { icon: PILLAR_ICONS.database, label: 'Cloud-recoverable', on: pillars.manifestStore },
  ];
  const tiles = defs
    .map(
      (d) =>
        `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;padding:6px;border-radius:6px;border:1px solid ${
          d.on ? 'rgba(52,211,153,.3)' : '#1e293b'
        };background:${d.on ? 'rgba(52,211,153,.06)' : 'transparent'};opacity:${d.on ? '1' : '.5'};">` +
        `${svgIcon(d.icon, d.on)}` +
        `<span style="font-size:10px;font-weight:600;line-height:1.1;color:${
          d.on ? '#e2e8f0' : '#64748b'
        };">${d.label}</span></div>`,
    )
    .join('');
  wrap.innerHTML =
    `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">` +
    `<span style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#cbd5e1;">Durable Content Credentials</span>` +
    `<span style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:3px;background:${
      pillars.durable ? 'rgba(52,211,153,.15)' : 'rgba(100,116,139,.2)'
    };color:${pillars.durable ? '#6ee7b7' : '#94a3b8'};">${pillars.count}/3 pillars</span></div>` +
    `<div style="display:flex;gap:6px;">${tiles}</div>`;
  return wrap;
}

const displayManifest = (manifest, c2paId, viewMoreUrl, addIconForImage, pillars) => {
  if (manifest) {
    // add the components linked to this image
    // const image = document.getElementById(imageId);
    let element = document.querySelector(`img[c2paId="${c2paId}"]`);
    if (!element) {
      if(document.querySelector(`audio[c2paId="${c2paId}"]`)) {
        element = document.querySelector(`audio[c2paId="${c2paId}"]`);
      }
      if(document.querySelector(`video[c2paId="${c2paId}"]`)) {
        element = document.querySelector(`video[c2paId="${c2paId}"]`);
      }  
    }
    addIconForImage(element, c2paId);

    // Configure the manifest summary
    const manifestSummary = document.getElementById(
      `manifest-${c2paId}`,
    );
    manifestSummary.manifestStore = manifest;
    manifestSummary.viewMoreUrl = viewMoreUrl;

    const caiIndicator = document.getElementById(
      `indicator-${c2paId}`,
    );

    if (!manifest.error) {
      // ok
      caiIndicator.variant = 'info-light';
    } else if (manifest.error) {
      // invalid
      caiIndicator.variant = 'error';
    }

    // Get the image source to configure the Thumbnail,
    // as this cannot be done in the sandbox
    manifestSummary.manifestStore.thumbnail = element.src;
    caiIndicator.classList.add('manifest-loaded');
    element.classList.add('manifest-loaded');

    // Durable Content Credentials — 3-pillar indicator, injected into the
    // popover content alongside the manifest summary.
    if (pillars && !manifest.error) {
      const popover = document.getElementById(`popover-${c2paId}`);
      const existing = document.getElementById(`pillars-${c2paId}`);
      if (existing) existing.remove();
      if (popover) {
        const indicator = buildPillarIndicator(pillars);
        indicator.id = `pillars-${c2paId}`;
        popover.appendChild(indicator);
      }
    }
  }
};

/**
 * Send a message to the sandbox to get the C2PA manifest for the image.
 * @param {HTMLImageElement} imageElement - The image element to get the C2PA manifest for.
 */
export const getC2PAManifest = async (imageElement, addIconForImage, singleImageVerification) => {
  const event = {};
  event.type = EVENT_TYPE_C2PA_MANIFEST;
  const imgId = imageElement.getAttribute('c2paId');
  event.data = {
    src: imageElement.src,
    dataURI: imageElement.dataURI,
    imageId: imgId,
  };

  try {
    const { manifest, viewMoreUrl, pillars } = await chrome.runtime.sendMessage(event);
    if (manifest === undefined) {
      if (singleImageVerification) {
        displayError('No Content Credentials found for this media.');
      }
    }
    displayManifest(manifest, imgId, viewMoreUrl, addIconForImage, pillars);
  } catch (error) {
    if (singleImageVerification) {
      displayError('No Content Credentials found for this media.');
    }
  }
};
