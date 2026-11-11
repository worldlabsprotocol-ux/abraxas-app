/** Maps founder adversarial properties to existing proof suites (no duplicate runs). */
export const SECURITY_BOUNDARY_EVIDENCE = [
  { id: 1, property: "Unauthorized issuer signing", suites: ["recordedWorkflow.integration.test.ts", "institutionalSigner.test.ts"] },
  { id: 2, property: "Unauthorized status signing", suites: ["recordedWorkflow.integration.test.ts", "institutionalSigner.test.ts"] },
  { id: 3, property: "Arbitrary digest requests", suites: ["institutionalSigningWorker.test.ts", "signingDeploymentBoundary.test.ts"] },
  { id: 4, property: "Governance bypass", suites: ["registryContinuity.test.ts", "recordedWorkflow.integration.test.ts"] },
  { id: 5, property: "Cross-role access", suites: ["governanceOperatorIsolation.test.ts", "institutionalSigner.aws.integration.test.ts (live)"] },
  { id: 6, property: "Stale registry versions", suites: ["registryContinuity.test.ts"] },
  { id: 7, property: "Revoked or expired authority", suites: ["recordedWorkflow.integration.test.ts", "executeTrustExecutionAuthoritative.integration.test.ts"] },
  { id: 8, property: "Tampered statements", suites: ["institutionalSigner.test.ts", "institutionalSigner.aws.integration.test.ts (live)"] },
  { id: 9, property: "Compromised app credentials", suites: ["runtimeGuards + institutionalSigningWorker.test.ts"] },
  { id: 10, property: "Signing infrastructure unavailability", suites: ["institutionalSigner.test.ts"] },
  { id: 11, property: "Independent verification", suites: ["institutionalSigner.test.ts", "independent-verifier package"] },
  { id: 12, property: "Operator DB privilege isolation", suites: ["governanceOperatorIsolation.test.ts"] },
] as const;
