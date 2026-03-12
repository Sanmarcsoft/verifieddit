import * as pulumi from "@pulumi/pulumi";
import * as scaleway from "@pulumiverse/scaleway";

const stack = pulumi.getStack();

// Object Storage for extension builds (CRX, source zips)
const buildsBucket = new scaleway.ObjectBucket("verifieddit-extension-builds", {
  name: `verifieddit-extension-builds-${stack}`,
  region: "fr-par",
  versioning: {
    enabled: true,
  },
  tags: {
    project: "verifieddit-extension",
    environment: stack,
    managed_by: "pulumi",
  },
});

export const bucketEndpoint = buildsBucket.endpoint;
export const bucketName = buildsBucket.name;
