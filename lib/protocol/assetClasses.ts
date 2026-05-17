// FILE: lib/protocol/assetClasses.ts
// CANONICAL asset class registry for Abraxas Protocol.
// Each class defines: verification requirements, authorized partners,
// documentation chain, LTV parameters, and regional compliance flags.
// Immutable once deployed — governance vote required to modify.

export type AssetClassName =
  | "Mineral Rights"
  | "Real Estate Parcel"
  | "Tribal Land Asset"
  | "Collectible Automobile"
  | "Luxury Watch"
  | "Rare Comic"
  | "Graded Card"
  | "Fine Spirits"
  | "Fine Metals"
  | "Fine Art"
  | "Racehorse"
  | "Other";

export type RegionalJurisdiction =
  | "LA_TRIBAL"       // Louisiana Native American reservations
  | "OK_TRIBAL"       // Oklahoma Native American reservations
  | "FEDERAL_BIA"     // Bureau of Indian Affairs federal jurisdiction
  | "US_STANDARD"     // Standard US regulatory framework
  | "INTERNATIONAL";  // Non-US — pending jurisdiction module

export type VerificationPartnerType =
  | "TRIBAL_COUNCIL"
  | "BIA_AUTHORITY"
  | "STATE_GEOLOGICAL"
  | "PETROLEUM_ENGINEER"
  | "TITLE_COMPANY"
  | "COUNTY_RECORDER"
  | "CERTIFIED_APPRAISER"
  | "AUCTION_HOUSE"
  | "GRADING_SERVICE"
  | "CUSTODY_VAULT"
  | "PROTOCOL_INTERNAL";

export interface VerificationRequirement {
  stage:       number;
  name:        string;
  description: string;
  partnerType: VerificationPartnerType;
  mandatory:   boolean;
  documents:   string[];         // required document types
  timeoutDays: number;           // SLA for this stage
}

export interface AssetClassDefinition {
  name:           AssetClassName;
  category:       string;
  icon:           string;
  color:          string;
  baseFeeAbra:    number;
  ltv:            number;        // max LTV %
  minValueUsd:    number;        // minimum declared value to tokenize
  maxValueUsd:    number | null; // null = unlimited
  jurisdictions:  RegionalJurisdiction[];
  verificationStages: VerificationRequirement[];
  requiredDocuments:  string[];
  regulatoryNotes:    string;
}

// ── Complete asset class registry ─────────────────────────────────────────────
export const ASSET_CLASS_REGISTRY: Record<AssetClassName, AssetClassDefinition> = {

  "Mineral Rights": {
    name:"Mineral Rights", category:"Natural Resources",
    icon:"◈", color:"#D4AF37", baseFeeAbra:500, ltv:55,
    minValueUsd:50_000, maxValueUsd:null,
    jurisdictions:["LA_TRIBAL","OK_TRIBAL","FEDERAL_BIA","US_STANDARD"],
    requiredDocuments:[
      "Mineral deed or lease agreement",
      "Title search (minimum 50-year chain)",
      "Certified petroleum / geological survey",
      "BIA approval letter (for tribal land)",
      "State geological survey clearance",
      "Environmental compliance certificate",
      "Production history records (if applicable)",
    ],
    verificationStages:[
      {stage:1,name:"Document Submission",description:"All mineral rights documentation submitted and hash-anchored on Solana",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:["mineral_deed","title_search"],timeoutDays:2},
      {stage:2,name:"Ownership Chain Verification",description:"50-year title chain verified by licensed title company",partnerType:"TITLE_COMPANY",mandatory:true,documents:["title_search","ownership_history"],timeoutDays:7},
      {stage:3,name:"Geological Survey",description:"Certified petroleum engineer or state geological survey confirms resource presence and estimated value",partnerType:"PETROLEUM_ENGINEER",mandatory:true,documents:["geological_survey","resource_estimate"],timeoutDays:14},
      {stage:4,name:"Tribal / BIA Clearance",description:"Bureau of Indian Affairs or tribal council issues written clearance for tokenization (tribal land only)",partnerType:"BIA_AUTHORITY",mandatory:false,documents:["bia_approval","tribal_council_resolution"],timeoutDays:21},
      {stage:5,name:"State Regulatory Clearance",description:"State oil and gas commission confirms compliance",partnerType:"STATE_GEOLOGICAL",mandatory:true,documents:["state_clearance"],timeoutDays:10},
      {stage:6,name:"Valuation Confirmation",description:"Certified appraiser issues formal valuation report",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["appraisal_report"],timeoutDays:7},
      {stage:7,name:"Collateral Qualification",description:"Protocol risk engine scores asset and assigns final LTV",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:[],timeoutDays:1},
    ],
    regulatoryNotes:"Mineral rights on Native American reservation land require BIA approval and tribal council resolution. Louisiana reservations: Coushatta, Tunica-Biloxi, Chitimacha, Jena Band. Oklahoma reservations: Cherokee, Choctaw, Muscogee, Osage, Chickasaw, Seminole. Each tribe maintains sovereign authority over land use decisions.",
  },

  "Real Estate Parcel": {
    name:"Real Estate Parcel", category:"Real Estate",
    icon:"⬛", color:"#14F195", baseFeeAbra:400, ltv:65,
    minValueUsd:25_000, maxValueUsd:null,
    jurisdictions:["LA_TRIBAL","OK_TRIBAL","US_STANDARD"],
    requiredDocuments:[
      "Recorded deed with county recorder stamp",
      "Current title insurance commitment",
      "Survey / plat map",
      "Property appraisal (within 6 months)",
      "Zoning verification letter",
      "Property tax clearance certificate",
      "Tribal land use permit (if reservation-adjacent)",
    ],
    verificationStages:[
      {stage:1,name:"Deed Submission",description:"Recorded deed and survey submitted and metadata anchored on-chain",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:["recorded_deed","survey"],timeoutDays:1},
      {stage:2,name:"Title Search",description:"Licensed title company conducts full chain-of-title search",partnerType:"TITLE_COMPANY",mandatory:true,documents:["title_commitment","lien_search"],timeoutDays:5},
      {stage:3,name:"County Recorder Verification",description:"Confirm recorded instrument numbers and tax parcel IDs",partnerType:"COUNTY_RECORDER",mandatory:true,documents:["tax_certificate","recorded_instruments"],timeoutDays:3},
      {stage:4,name:"Independent Appraisal",description:"State-certified MAI appraiser issues USPAP-compliant report",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["appraisal_report"],timeoutDays:10},
      {stage:5,name:"Tribal Land Authority Review",description:"Tribal council or BIA reviews for reservation-adjacent or trust land parcels",partnerType:"TRIBAL_COUNCIL",mandatory:false,documents:["tribal_permit","land_use_approval"],timeoutDays:21},
      {stage:6,name:"Collateral Qualification",description:"Protocol assigns LTV based on property type, location, and appraisal confidence",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:[],timeoutDays:1},
    ],
    regulatoryNotes:"Properties within or adjacent to reservation boundaries require tribal land use authority review. Trust land and allotted land require BIA approval for any encumbrance. Fee simple land within reservation exteriors follows standard state procedures with tribal notification.",
  },

  "Tribal Land Asset": {
    name:"Tribal Land Asset", category:"Sovereign Assets",
    icon:"◉", color:"#C8A96E", baseFeeAbra:600, ltv:50,
    minValueUsd:10_000, maxValueUsd:null,
    jurisdictions:["LA_TRIBAL","OK_TRIBAL","FEDERAL_BIA"],
    requiredDocuments:[
      "Tribal council resolution authorizing tokenization",
      "BIA trust land patent or fee patent documentation",
      "Tribal sovereignty declaration",
      "Tribal historic preservation officer clearance",
      "Environmental impact acknowledgment",
      "Tribal membership / beneficial interest documentation",
    ],
    verificationStages:[
      {stage:1,name:"Tribal Council Authorization",description:"Formally adopted tribal council resolution authorizing the specific asset tokenization",partnerType:"TRIBAL_COUNCIL",mandatory:true,documents:["council_resolution"],timeoutDays:30},
      {stage:2,name:"BIA Trust Review",description:"Bureau of Indian Affairs trust officer reviews and approves the encumbrance of trust land",partnerType:"BIA_AUTHORITY",mandatory:true,documents:["bia_trust_review","land_patent"],timeoutDays:45},
      {stage:3,name:"THPO Clearance",description:"Tribal Historic Preservation Officer confirms no cultural or sacred site impact",partnerType:"TRIBAL_COUNCIL",mandatory:true,documents:["thpo_clearance"],timeoutDays:14},
      {stage:4,name:"Federal Compliance Review",description:"Confirm compliance with Indian Land Consolidation Act and ILTF guidelines",partnerType:"BIA_AUTHORITY",mandatory:true,documents:["federal_compliance"],timeoutDays:21},
      {stage:5,name:"Sovereign Valuation",description:"Tribal-approved appraiser with sovereign land experience issues valuation",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["sovereign_appraisal"],timeoutDays:14},
      {stage:6,name:"Protocol Qualification",description:"Final scoring and LTV assignment recognizing sovereign jurisdiction",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:[],timeoutDays:1},
    ],
    regulatoryNotes:"Tribal land assets operate under a dual sovereignty framework. The protocol recognizes tribal sovereign authority as primary jurisdiction. BIA oversight applies to trust land under 25 CFR. The Abraxas protocol does NOT assert jurisdiction over tribal governance decisions — it provides the technical tokenization layer only after all sovereign approvals are obtained. Louisiana tribes include: Chitimacha Tribe, Coushatta Tribe of Louisiana, Jena Band of Choctaw Indians, Tunica-Biloxi Tribe. Oklahoma tribes include: Cherokee Nation, Choctaw Nation, Muscogee Nation, Osage Nation, Chickasaw Nation, Seminole Nation, and 36 additional recognized tribes.",
  },

  "Collectible Automobile": {
    name:"Collectible Automobile", category:"Collectible",
    icon:"⬡", color:"#6b8cff", baseFeeAbra:300, ltv:60,
    minValueUsd:15_000, maxValueUsd:null,
    jurisdictions:["US_STANDARD","INTERNATIONAL"],
    requiredDocuments:[
      "Clean title with VIN verification",
      "Carfax or AutoCheck full history report",
      "Certified appraisal from recognized auction house appraiser",
      "Condition report with photographic documentation",
      "Mileage verification / odometer certification",
      "Service history records",
      "Auction result comps (minimum 3 comparable sales)",
    ],
    verificationStages:[
      {stage:1,name:"Title and VIN Submission",description:"Clean title and full VIN history submitted and documented on-chain",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:["clean_title","vin_history"],timeoutDays:1},
      {stage:2,name:"History Report Verification",description:"Carfax or AutoCheck confirms no salvage, odometer rollback, or major incident flags",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:["carfax_report"],timeoutDays:2},
      {stage:3,name:"Physical Inspection",description:"In-person inspection by certified automotive appraiser with photographic documentation",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["condition_report","photo_documentation"],timeoutDays:7},
      {stage:4,name:"Auction House Appraisal",description:"Recognized auction house (Mecum, Barrett-Jackson, RM Sotheby's) issues formal valuation",partnerType:"AUCTION_HOUSE",mandatory:true,documents:["auction_appraisal","comparable_sales"],timeoutDays:10},
      {stage:5,name:"Custody Placement",description:"Vehicle placed in approved bonded storage facility for duration of tokenization",partnerType:"CUSTODY_VAULT",mandatory:true,documents:["storage_agreement","insurance_certificate"],timeoutDays:5},
      {stage:6,name:"Collateral Qualification",description:"Protocol assigns LTV based on make, model, year, condition, and market liquidity",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:[],timeoutDays:1},
    ],
    regulatoryNotes:"Collectible automobiles require physical custody placement before borrow eligibility is activated. The token represents the physical vehicle held in bonded storage. Title lien is recorded with the protocol as lienholder for the duration of any active loan.",
  },

  "Luxury Watch":    {name:"Luxury Watch",category:"Collectible",icon:"◎",color:"#6b8cff",baseFeeAbra:150,ltv:65,minValueUsd:2_000,maxValueUsd:null,jurisdictions:["US_STANDARD","INTERNATIONAL"],requiredDocuments:["Original box and papers","Serial number documentation","Authentication certificate from brand or certified watchmaker","Recent service records","Appraisal from certified horological appraiser"],verificationStages:[{stage:1,name:"Documentation Submission",description:"Box, papers, serial number submitted and hashed",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:["box_papers","serial"],timeoutDays:1},{stage:2,name:"Authentication",description:"Certified watchmaker or brand service center authenticates movement and case",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["auth_certificate"],timeoutDays:5},{stage:3,name:"Valuation",description:"Certified horological appraiser issues market valuation",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["appraisal"],timeoutDays:5},{stage:4,name:"Custody",description:"Watch placed in secure vault with full insurance",partnerType:"CUSTODY_VAULT",mandatory:true,documents:["vault_receipt","insurance"],timeoutDays:3},{stage:5,name:"Qualification",description:"Protocol scores and assigns LTV",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:[],timeoutDays:1}],regulatoryNotes:"Standard collectible verification. Rolex, Patek Philippe, AP, and other haute horology brands with active secondary markets qualify for maximum LTV."},

  "Rare Comic":      {name:"Rare Comic",category:"Collectible",icon:"◫",color:"#a855f7",baseFeeAbra:130,ltv:60,minValueUsd:1_000,maxValueUsd:null,jurisdictions:["US_STANDARD"],requiredDocuments:["CGC or CBCS graded slab","Grade certificate","Provenance documentation"],verificationStages:[{stage:1,name:"Grading Verification",description:"CGC or CBCS slab serial confirmed authentic",partnerType:"GRADING_SERVICE",mandatory:true,documents:["slab_certificate"],timeoutDays:3},{stage:2,name:"Market Valuation",description:"Heritage Auctions or comparable specialist issues valuation",partnerType:"AUCTION_HOUSE",mandatory:true,documents:["valuation"],timeoutDays:5},{stage:3,name:"Custody",description:"Graded slab placed in climate-controlled vault",partnerType:"CUSTODY_VAULT",mandatory:true,documents:["vault_receipt"],timeoutDays:2},{stage:4,name:"Qualification",description:"LTV assigned based on grade and title",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:[],timeoutDays:1}],regulatoryNotes:"Only CGC or CBCS graded comics accepted. Raw copies require grading before submission."},

  "Graded Card":     {name:"Graded Card",category:"Collectible",icon:"⬡",color:"#FBBF24",baseFeeAbra:110,ltv:55,minValueUsd:500,maxValueUsd:null,jurisdictions:["US_STANDARD"],requiredDocuments:["PSA, BGS, or SGC graded slab","Grade certificate"],verificationStages:[{stage:1,name:"Grade Verification",description:"PSA/BGS/SGC slab confirmed authentic",partnerType:"GRADING_SERVICE",mandatory:true,documents:["slab_cert"],timeoutDays:2},{stage:2,name:"Market Valuation",description:"PWCC or COMC market data confirms valuation",partnerType:"AUCTION_HOUSE",mandatory:true,documents:["market_valuation"],timeoutDays:3},{stage:3,name:"Custody",description:"Card placed in approved vault",partnerType:"CUSTODY_VAULT",mandatory:true,documents:["vault_receipt"],timeoutDays:2},{stage:4,name:"Qualification",description:"LTV assigned",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:[],timeoutDays:1}],regulatoryNotes:"PSA 10, BGS 9.5+, or SGC 10 grades qualify for maximum LTV within class."},

  "Fine Spirits":    {name:"Fine Spirits",category:"Collectible",icon:"◈",color:"#FF8C00",baseFeeAbra:120,ltv:55,minValueUsd:5_000,maxValueUsd:null,jurisdictions:["US_STANDARD","INTERNATIONAL"],requiredDocuments:["Bonded warehouse receipt","Authentication from certified spirits appraiser","Provenance chain documentation"],verificationStages:[{stage:1,name:"Authentication",description:"Certified spirits appraiser confirms provenance and condition",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["auth_report"],timeoutDays:7},{stage:2,name:"Bonded Storage",description:"Spirits placed in licensed bonded warehouse",partnerType:"CUSTODY_VAULT",mandatory:true,documents:["bonded_receipt"],timeoutDays:3},{stage:3,name:"Valuation",description:"Market valuation confirmed",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["valuation"],timeoutDays:5},{stage:4,name:"Qualification",description:"LTV assigned",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:[],timeoutDays:1}],regulatoryNotes:"Bonded warehouse storage required for all spirits. Alcohol regulatory compliance is the responsibility of the submitting party."},

  "Fine Metals":     {name:"Fine Metals",category:"Commodity",icon:"◆",color:"#D4AF37",baseFeeAbra:200,ltv:80,minValueUsd:5_000,maxValueUsd:null,jurisdictions:["US_STANDARD","INTERNATIONAL"],requiredDocuments:["LBMA or COMEX approved assay certificate","Serial number documentation","Chain of custody from approved refinery"],verificationStages:[{stage:1,name:"Assay Verification",description:"LBMA good delivery bar or approved coin assay confirmed",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["assay_certificate"],timeoutDays:3},{stage:2,name:"Custody",description:"Metals placed in approved vault with full insurance",partnerType:"CUSTODY_VAULT",mandatory:true,documents:["vault_receipt","insurance"],timeoutDays:2},{stage:3,name:"Qualification",description:"Spot price LTV assigned",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:[],timeoutDays:1}],regulatoryNotes:"Highest LTV class due to global liquidity and price stability. LBMA good delivery bars qualify for 80% LTV."},

  "Fine Art":        {name:"Fine Art",category:"Fine Art",icon:"◭",color:"#f26b6b",baseFeeAbra:180,ltv:50,minValueUsd:10_000,maxValueUsd:null,jurisdictions:["US_STANDARD","INTERNATIONAL"],requiredDocuments:["Provenance documentation","Authentication from recognized expert or institution","Condition report","Auction comps or appraisal"],verificationStages:[{stage:1,name:"Provenance Review",description:"Chain of ownership documented and verified",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["provenance"],timeoutDays:14},{stage:2,name:"Authentication",description:"Recognized art expert or artist estate authenticates",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["auth_letter"],timeoutDays:21},{stage:3,name:"Condition Report",description:"Conservator issues detailed condition report",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["condition_report"],timeoutDays:7},{stage:4,name:"Valuation",description:"Specialist auction house issues formal valuation",partnerType:"AUCTION_HOUSE",mandatory:true,documents:["valuation"],timeoutDays:10},{stage:5,name:"Custody",description:"Artwork placed in climate-controlled registered storage",partnerType:"CUSTODY_VAULT",mandatory:true,documents:["storage_cert"],timeoutDays:5},{stage:6,name:"Qualification",description:"LTV assigned reflecting illiquidity discount",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:[],timeoutDays:1}],regulatoryNotes:"Art market regulatory requirements vary by jurisdiction. TEFRA reporting may apply for high-value transactions. Authentication disputes are resolved through protocol arbitration before any state transition."},

  "Racehorse":       {name:"Racehorse",category:"Animal Asset",icon:"◉",color:"#22c55e",baseFeeAbra:250,ltv:55,minValueUsd:10_000,maxValueUsd:null,jurisdictions:["US_STANDARD"],requiredDocuments:["Jockey Club registration papers","Veterinary health certificate","Race record","Independent appraisal"],verificationStages:[{stage:1,name:"Registration Verification",description:"Jockey Club papers confirmed authentic",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:["jockey_club_papers"],timeoutDays:2},{stage:2,name:"Veterinary Inspection",description:"Certified equine vet issues health and soundness certificate",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["vet_certificate"],timeoutDays:5},{stage:3,name:"Valuation",description:"Equine appraiser values based on race record and bloodline",partnerType:"CERTIFIED_APPRAISER",mandatory:true,documents:["appraisal"],timeoutDays:7},{stage:4,name:"Qualification",description:"LTV assigned",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:[],timeoutDays:1}],regulatoryNotes:"Horse racing regulations vary by state. Interstate Commerce Clause applies to cross-state transactions."},

  "Other":           {name:"Other",category:"General",icon:"⬢",color:"#C8A96E",baseFeeAbra:100,ltv:45,minValueUsd:1_000,maxValueUsd:null,jurisdictions:["US_STANDARD"],requiredDocuments:["Proof of ownership","Independent appraisal","Provenance documentation"],verificationStages:[{stage:1,name:"Documentation Review",description:"All ownership and valuation documents reviewed",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:["ownership_proof","appraisal"],timeoutDays:5},{stage:2,name:"Manual Underwriting",description:"Protocol team manually reviews asset for eligibility",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:[],timeoutDays:7},{stage:3,name:"Qualification",description:"LTV assigned based on manual underwriting",partnerType:"PROTOCOL_INTERNAL",mandatory:true,documents:[],timeoutDays:1}],regulatoryNotes:"General category. May not qualify for automated LTV. Manual review timeline: 5-10 business days."},
};

export function getAssetClass(name: AssetClassName): AssetClassDefinition {
  return ASSET_CLASS_REGISTRY[name];
}

export function getAssetClassesByJurisdiction(j: RegionalJurisdiction): AssetClassName[] {
  return (Object.keys(ASSET_CLASS_REGISTRY) as AssetClassName[]).filter(
    k => ASSET_CLASS_REGISTRY[k].jurisdictions.includes(j)
  );
}

export const TRIBAL_ASSET_CLASSES: AssetClassName[] = [
  "Mineral Rights", "Real Estate Parcel", "Tribal Land Asset"
];

export const ALL_ASSET_CLASSES = Object.keys(ASSET_CLASS_REGISTRY) as AssetClassName[];