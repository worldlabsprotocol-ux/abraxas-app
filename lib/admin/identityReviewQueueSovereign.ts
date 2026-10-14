import "server-only";

import {
  sanitizeBiometricForList,
  subjectLabelFromAddress,
  type IdentityReviewQueueListItem,
} from "@/lib/admin/identityReviewQueueResponse";
import {
  listBiometricAssessmentsByCaptureIdsDirect,
  listPassportDocumentsForQueueDirect,
  listReviewSessionsByCaptureIdsDirect,
} from "@/lib/persistence/idvDirectStore";

interface DocRow {
  id: string;
  created_at: string;
  updated_at: string | null;
  user_email: string;
  sui_address: string | null;
  holder_subject_id: string | null;
  file_name: string;
  storage_path: string;
  status: string;
  reviewer_note: string | null;
  document_type: string | null;
  capture_session_id: string | null;
  legal_name: string | null;
}

export async function listIdentityReviewQueueSovereign(input: {
  status: string;
  partnerId?: string | null;
  includePii?: boolean;
}): Promise<{ items: IdentityReviewQueueListItem[]; count: number }> {
  const rows = (await listPassportDocumentsForQueueDirect({
    status: input.status,
    partnerId: input.partnerId,
  })) as unknown as DocRow[];

  const sessionIds = rows
    .map((r) => r.capture_session_id)
    .filter((id): id is string => Boolean(id));

  const sessions = await listReviewSessionsByCaptureIdsDirect(sessionIds, input.partnerId);
  const sessionsByCapture = new Map(sessions.map((s) => [s.capture_session_id, s]));

  const grouped = new Map<string, DocRow & { documents: DocRow[] }>();
  for (const row of rows) {
    const key = row.capture_session_id ?? row.id;
    const session = row.capture_session_id
      ? sessionsByCapture.get(row.capture_session_id)
      : undefined;
    if (input.partnerId && row.capture_session_id && !session) continue;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...row, documents: [row] });
      continue;
    }
    existing.documents.push(row);
    if (row.document_type === "id_front") {
      grouped.set(key, { ...row, documents: existing.documents });
    }
  }

  const biometricRows = await listBiometricAssessmentsByCaptureIdsDirect(sessionIds);
  const biometricBySession = new Map(
    biometricRows.map((row) => [String(row.capture_session_id), row as Record<string, unknown>]),
  );

  const items: IdentityReviewQueueListItem[] = Array.from(grouped.values()).map((item) => {
    const session = item.capture_session_id
      ? sessionsByCapture.get(item.capture_session_id)
      : undefined;
    const biometric = item.capture_session_id
      ? biometricBySession.get(item.capture_session_id) ?? null
      : null;

    const base: IdentityReviewQueueListItem = {
      id: item.id,
      created_at: item.created_at,
      updated_at: session?.updated_at ?? item.updated_at,
      sui_address: item.sui_address,
      status: item.status,
      capture_session_id: item.capture_session_id,
      capture_complete: item.capture_session_id
        ? item.documents.some((d) => d.document_type === "id_front")
          && item.documents.some((d) => d.document_type === "selfie")
        : true,
      has_selfie: item.documents.some((d) => d.document_type === "selfie"),
      has_id_front: item.documents.some((d) => d.document_type === "id_front"),
      partner_id: session?.partner_id ?? (biometric?.signals as { partner_id?: string } | undefined)?.partner_id ?? null,
      policy_id: session?.policy_id ?? null,
      verification_request_id: session?.verification_request_id ?? null,
      review_status: session?.review_status ?? null,
      engine_decision: session?.engine_decision ?? (biometric?.decision as string | undefined) ?? null,
      eligibility_result: session?.eligibility_result ?? null,
      raw_evidence_purged_at: session?.raw_evidence_purged_at ?? null,
      subject_label: subjectLabelFromAddress(item.sui_address, item.holder_subject_id),
      biometric: sanitizeBiometricForList(biometric),
    };

    if (input.includePii) {
      return {
        ...base,
        user_email: item.user_email,
        legal_name: item.legal_name,
        documents: item.documents.map((d) => ({
          id: d.id,
          document_type: d.document_type,
          storage_path: d.storage_path,
        })),
      } as IdentityReviewQueueListItem;
    }
    return base;
  });

  return { items, count: items.length };
}
