// Least privilege for two runtime identities. Applying these policies is an activation step.
// Two role names in one process are not two custodians when both clients use the same AWS credentials.

export type InstitutionalIamPolicy = {
  Version: "2012-10-17";
  Statement: Array<{
    Sid: string;
    Effect: "Allow";
    Action: string[];
    Resource: string;
    Condition?: { StringEquals: { "kms:SigningAlgorithm": "ED25519_SHA_512" } };
  }>;
};

function keyArn(value: string): string {
  const arn = value.trim();
  if (!arn.startsWith("arn:aws:kms:") || arn.includes("*")) {
    throw new Error("institutional_kms_key_arn_required");
  }
  return arn;
}

export function issuerAnchorIamPolicy(issuerKeyArn: string): InstitutionalIamPolicy {
  const resource = keyArn(issuerKeyArn);
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "SignIssuerAnchorDigest",
        Effect: "Allow",
        Action: ["kms:Sign"],
        Resource: resource,
        Condition: { StringEquals: { "kms:SigningAlgorithm": "ED25519_SHA_512" } },
      },
      {
        Sid: "ReadIssuerAnchorPublicKey",
        Effect: "Allow",
        Action: ["kms:GetPublicKey"],
        Resource: resource,
      },
    ],
  };
}

export function statusSignerIamPolicy(statusKeyArn: string): InstitutionalIamPolicy {
  const resource = keyArn(statusKeyArn);
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "SignStatusStatementDigest",
        Effect: "Allow",
        Action: ["kms:Sign"],
        Resource: resource,
        Condition: { StringEquals: { "kms:SigningAlgorithm": "ED25519_SHA_512" } },
      },
      {
        Sid: "ReadStatusSignerPublicKey",
        Effect: "Allow",
        Action: ["kms:GetPublicKey"],
        Resource: resource,
      },
    ],
  };
}

export const SHARED_PROCESS_CUSTODY_LIMIT =
  "Separate CustodyClient objects are independent custody only when each one is constructed with a different IAM role. One process that holds both roles' credentials can still request both kinds of signature.";
