/* eslint-disable consistent-return */
/* eslint-disable no-undef */

import { createC2pa, createL2ManifestStore, generateVerifyUrl } from './c2pa/packages/c2pa/dist/c2pa.esm.js';
import { EVENT_TYPE_C2PA_MANIFEST, EVENT_TYPE_C2PA_MANIFEST_RESPONSE } from './config.js';
import { convertDataURLtoBlob, isImageAccessible } from './lib/imageUtils.js';
import { detectDurablePillars } from './lib/durablePillars.js';
import debug from './lib/log.js';

let c2pa;
let c2paIsLoading = false;
const manifestMap = {};

// Trust anchors: the C2PA conformance list plus Trusteddit's own Root CA +
// Journalist-Issuer intermediate, so trusteddit-signed content and
// tsa.trusteddit.com timestamps verify as trusted. Bundled at trust/.
async function loadTrustAnchors() {
  try {
    const res = await fetch(chrome.runtime.getURL('trust/c2pa-trust-list.pem'));
    if (res.ok) return await res.text();
    debug('[c2pa] trust list fetch failed:', res.status);
  } catch (e) {
    debug('[c2pa] trust list load error:', e);
  }
  return undefined; // fall back to no-trust read rather than break verification
}

async function initializeC2pa() {
  if (!c2paIsLoading) {
    const trustAnchors = await loadTrustAnchors();
    c2pa = await createC2pa({
      wasmSrc: './c2pa/packages/c2pa/dist/assets/wasm/toolkit_bg.wasm',
      workerSrc: './c2pa/packages/c2pa/dist/c2pa.worker.min.js',
      ...(trustAnchors ? { trust: { trustAnchors, verifyTrust: true } } : {}),
    });
    c2paIsLoading = true;
  }
}

const validateC2pa = async (image, imageId) => {
  await initializeC2pa();

  if (!image) {
    debug('[sandbox] Image not available');
    throw new Error('Image not available');
  }

  const { manifestStore } = await c2pa.read(image);
  manifestMap[imageId] = manifestStore;
  if (!manifestStore) throw new Error('No manifest available');

  const { manifestStore: l2ManifestStore } = await createL2ManifestStore(manifestStore);

  // Durable-credentials pillars are read from the FULL manifest store (the L2
  // summary drops the soft_binding assertion). Defensive: never block the read.
  let pillars;
  try {
    pillars = detectDurablePillars(manifestStore.activeManifest);
  } catch (e) {
    debug('[c2pa] pillar detection failed:', e);
  }

  return {
    manifest: l2ManifestStore,
    validationStatus: manifestStore.validationStatus,
    pillars,
  };
};

const handleC2PAManifestMessage = async (event) => {
  try {
    let image = event.data.src;
    const imageDataURI = event.data.dataURI;
    const { imageId } = event.data;

    if (manifestMap[imageId]) {
      // todo: validationStatus in this case as well?
      let cachedPillars;
      try {
        cachedPillars = detectDurablePillars(manifestMap[imageId].activeManifest);
      } catch (e) {
        debug('[c2pa] cached pillar detection failed:', e);
      }
      return ({
        type: EVENT_TYPE_C2PA_MANIFEST_RESPONSE,
        manifest: manifestMap[imageId],
        pillars: cachedPillars,
        imageId,
      });
    }

    if (!(await isImageAccessible(image)) && imageDataURI) {
      image = await convertDataURLtoBlob(imageDataURI);
    }

    const result = await validateC2pa(image, imageId);

    return ({
      type: EVENT_TYPE_C2PA_MANIFEST_RESPONSE,
      manifest: result.manifest,
      validationStatus: result.validationStatus,
      pillars: result.pillars,
      imageId,
      viewMoreUrl: generateVerifyUrl(typeof image === 'string' ? image : image.src),
    });
  } catch (error) {
    debug('[sandbox] Error processing message:');
    debug(error);
    return ({ error: error.message });
  }
};

// eslint-disable-next-line
chrome.runtime.onMessage.addListener((event, sender, sendResponse) => {
  if (event.type === EVENT_TYPE_C2PA_MANIFEST) {
    handleC2PAManifestMessage(event).then((result) => { sendResponse(result); });
  }
  return true;
});

initializeC2pa();
