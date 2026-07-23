import { redirect } from "next/navigation";
import { CPG_CASE_STUDY_PATH } from "@/lib/cpgLandCaseStudy";

/** Legacy URL. canonical case study lives at /case-studies/chickasaw-project */
export default function CpgGradyLegacyRedirect() {
  redirect(CPG_CASE_STUDY_PATH);
}
