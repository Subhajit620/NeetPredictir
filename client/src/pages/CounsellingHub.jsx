import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar'
import { useStudentAuth } from '../context/StudentAuthContext'
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  FileText,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  HelpCircle,
  Award,
  DollarSign,
  Clock,
  Printer,
  MessageSquare,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Building2,
  Compass,
  Layers,
  Search,
  ExternalLink,
  Filter,
  Check,
  X,
  AlertTriangle,
  Info,
  Scale,
  RotateCcw,
  Globe,
  Share2,
  CheckCheck
} from 'lucide-react'

// ==========================================
// 1. DATA: SCORE TO AIR & PERCENTILE BENCHMARKS
// ==========================================
const SCORE_RANK_DATA = [
  { minScore: 715, maxScore: 720, minRank: 1, maxRank: 60, percentile: '99.999%', govtGovtChance: 'AIIMS New Delhi / Premier Central Medical Colleges', safeGeneral: true },
  { minScore: 700, maxScore: 714, minRank: 61, maxRank: 400, percentile: '99.98%', govtGovtChance: 'Top AIIMS (Bhopal, Rishikesh, Jodhpur), JIPMER & MAMC Delhi', safeGeneral: true },
  { minScore: 685, maxScore: 699, minRank: 401, maxRank: 1500, percentile: '99.92%', govtGovtChance: 'VMMC Delhi, UCMS, Top State GMCs (KGMU, Seth GS, MMC Chennai)', safeGeneral: true },
  { minScore: 670, maxScore: 684, minRank: 1501, maxRank: 3800, percentile: '99.78%', govtGovtChance: 'Premier State Govt Medical Colleges via 15% AIQ', safeGeneral: true },
  { minScore: 650, maxScore: 669, minRank: 3801, maxRank: 8500, percentile: '99.45%', govtGovtChance: 'Top Government Medical Colleges via AIQ & Home State Quota', safeGeneral: true },
  { minScore: 630, maxScore: 649, minRank: 8501, maxRank: 16500, percentile: '98.90%', govtGovtChance: 'Core Govt Medical Colleges (AIQ Round 1/2 & 85% State Quota)', safeGeneral: true },
  { minScore: 610, maxScore: 629, minRank: 16501, maxRank: 26000, percentile: '98.15%', govtGovtChance: 'State Govt Colleges (General Round 2/3 & OBC/EWS AIQ)', safeGeneral: true },
  { minScore: 590, maxScore: 609, minRank: 26001, maxRank: 39000, percentile: '97.20%', govtGovtChance: 'Peripheral State Govt GMCs / Reserved Category AIQ', safeGeneral: false },
  { minScore: 560, maxScore: 589, minRank: 39001, maxRank: 62000, percentile: '95.50%', govtGovtChance: 'State Quota Reserved (OBC/EWS/SC) / Govt Aided / Semi-Govt', safeGeneral: false },
  { minScore: 520, maxScore: 559, minRank: 62001, maxRank: 98000, percentile: '92.80%', govtGovtChance: 'SC/ST State Govt GMCs / Premium Private Merit Quota', safeGeneral: false },
  { minScore: 470, maxScore: 519, minRank: 98001, maxRank: 160000, percentile: '88.50%', govtGovtChance: 'SC/ST Govt GMCs / Low-Fee Private Medical Colleges', safeGeneral: false },
  { minScore: 400, maxScore: 469, minRank: 160001, maxRank: 250000, percentile: '81.00%', govtGovtChance: 'ST Govt / Private Medical Colleges / Govt BDS & BAMS', safeGeneral: false },
  { minScore: 300, maxScore: 399, minRank: 250001, maxRank: 450000, percentile: '68.00%', govtGovtChance: 'Deemed Universities / Private BDS / BHMS / BAMS', safeGeneral: false },
  { minScore: 130, maxScore: 299, minRank: 450001, maxRank: 1200000, percentile: '50.00%', govtGovtChance: 'Deemed Management Quota / NRI / Private BDS', safeGeneral: false },
]

// Category multiplier offsets for category rank estimation
const CATEGORY_CUTOFF_OFFSETS = {
  General: { rankMultiplier: 1.0, label: 'UR (Unreserved)', safeCutoffScore: 615, safeCutoffRank: 23000 },
  OBC: { rankMultiplier: 0.40, label: 'OBC-NCL (Central)', safeCutoffScore: 610, safeCutoffRank: 25500 },
  EWS: { rankMultiplier: 0.12, label: 'EWS (Economically Weaker)', safeCutoffScore: 608, safeCutoffRank: 26500 },
  SC: { rankMultiplier: 0.15, label: 'SC (Scheduled Caste)', safeCutoffScore: 505, safeCutoffRank: 135000 },
  ST: { rankMultiplier: 0.08, label: 'ST (Scheduled Tribe)', safeCutoffScore: 470, safeCutoffRank: 175000 },
  PwD: { rankMultiplier: 0.03, label: 'PwD (Physically Disabled)', safeCutoffScore: 220, safeCutoffRank: 450000 },
}

// ==========================================
// 2. DATA: STATE DOMICILE RULES DIRECTORY
// ==========================================
const STATE_DOMICILE_RULES = [
  {
    state: 'Maharashtra',
    code: 'MH',
    authority: 'DMER Maharashtra / CET Cell',
    ruleTitle: '10th + 12th in Maharashtra + Domicile Certificate',
    eligibilityCriteria: [
      'Candidate must have passed both SSC (10th) and HSC (12th) from an institution inside Maharashtra.',
      'Must possess a Domicile Certificate issued by a competent Revenue Authority in Maharashtra.',
      'Exceptions (Type B/C/D): Children of Central/State Govt employees transferred to Maharashtra before last date.',
    ],
    isOpenForOthers: false,
    openCollegesType: 'Private Institutional/NRI Quota Only',
    portalUrl: 'https://cetcell.mahacet.org',
    notes: 'Strict domicile state. Caste Validity Certificate is mandatory for all reserved categories.',
  },
  {
    state: 'Uttar Pradesh',
    code: 'UP',
    authority: 'Directorate of Medical Education (DGME UP)',
    ruleTitle: '10th & 12th in UP OR UP Domicile Certificate',
    eligibilityCriteria: [
      'Passed BOTH 10th and 12th from UP: NO separate domicile certificate required for Govt seats.',
      'Passed either 10th or 12th outside UP: General Domicile Certificate of parent/candidate mandatory.',
      'Private Medical Colleges in UP are OPEN to ALL India candidates without any domicile restriction.',
    ],
    isOpenForOthers: true,
    openCollegesType: 'All Private Medical Colleges (100% Open Seats)',
    portalUrl: 'https://upneet.gov.in',
    notes: 'UP is India’s largest Open State for private medical colleges with direct merit counselling.',
  },
  {
    state: 'Karnataka',
    code: 'KA',
    authority: 'Karnataka Examination Authority (KEA)',
    ruleTitle: '7 Years Study in Karnataka (Clause A) OR Open Merit',
    eligibilityCriteria: [
      'Govt 85% Quota: Candidate must have studied for a minimum of 7 academic years in Karnataka from 1st to 12th standard.',
      'Children of Karnataka defense/state personnel serving outside are eligible under special clauses (B, C, D).',
      'Private Medical Colleges (Open Non-Karnataka Quota): 100% open for all India students via KEA portal.',
    ],
    isOpenForOthers: true,
    openCollegesType: 'Private Medical Colleges Open Seats (KEA GMP & OPN Quotas)',
    portalUrl: 'https://cetonline.karnataka.gov.in/kea',
    notes: 'Premier state for top private medical institutions (St. Johns, MS Ramaiah, KMC).',
  },
  {
    state: 'West Bengal',
    code: 'WB',
    authority: 'WBMCC (West Bengal Medical Counselling Committee)',
    ruleTitle: '10 Years Continuous Residence (Proforma A1/A2) OR Parental Domicile (Proforma B)',
    eligibilityCriteria: [
      'Proforma A1: Candidate residing continuously in West Bengal for at least 10 years as on 31st Dec 2025.',
      'Proforma A2: Candidate residing in WB for 10 years AND passed 12th from WB.',
      'Proforma B: Candidate whose parents are permanent residents of WB with proof of 10-year residence.',
    ],
    isOpenForOthers: true,
    openCollegesType: 'Private Medical Colleges Management Quota via WBMCC',
    portalUrl: 'https://wbmcc.nic.in',
    notes: 'Strict format Proforma A1/A2/B issued by SDO/DM is mandatory for 85% Govt seats.',
  },
  {
    state: 'Tamil Nadu',
    code: 'TN',
    authority: 'Directorate of Medical Education (DME TN)',
    ruleTitle: 'Native of Tamil Nadu (Nativity Certificate + Parent Proof)',
    eligibilityCriteria: [
      'Candidates who studied Class 6 to 12 in Tamil Nadu are considered Native (Nativity Certificate required).',
      'Candidates who studied outside TN must submit Nativity Certificate + Parent Domicile/Ration card proof + 10th/12th marksheets of parents.',
      'Management Quota in Private & Self-Financing colleges open to all India students.',
    ],
    isOpenForOthers: true,
    openCollegesType: 'Self-Financing Private Colleges (Management Quota)',
    portalUrl: 'https://tnmedicalselection.net',
    notes: '7.5% special horizontal reservation for Government School students in TN.',
  },
  {
    state: 'Delhi (NCT)',
    code: 'DL',
    authority: 'Faculty of Medical Sciences (DU) & IPU',
    ruleTitle: '11th & 12th Regular Schooling in Delhi (100% Institutional Quota)',
    eligibilityCriteria: [
      'Delhi University (MAMC, LHMC, UCMS): Passed 11th and 12th standard from a recognised school located inside NCT of Delhi.',
      'IP University (VMMC, ABVIMS RML, NDMC, BSA): Passed 11th and 12th standard from Delhi school.',
      'Note: Permanent residence outside Delhi DOES NOT matter; ONLY 11th & 12th physical school location determines 85% Delhi quota.',
    ],
    isOpenForOthers: false,
    openCollegesType: 'AIQ 15% & Central Pools Only',
    portalUrl: 'https://mcc.nic.in',
    notes: 'Pure institutional quota based solely on 11th & 12th schooling.',
  },
  {
    state: 'Rajasthan',
    code: 'RJ',
    authority: 'Rajasthan NEET UG Medical Admission Board',
    ruleTitle: 'Continuous Residence / Parental Domicile + 3 Years Schooling',
    eligibilityCriteria: [
      'Candidate residing in Rajasthan for at least 10 years OR parent continuous residence for 10 years.',
      'Candidate must have studied at least 3 continuous years in recognised schools of Rajasthan.',
      'Private Medical Colleges (Management Quota) open to non-domicile candidates in Round 2/Mop-Up.',
    ],
    isOpenForOthers: true,
    openCollegesType: 'Private Medical Colleges Management Seats',
    portalUrl: 'https://rajugneet2024.com',
    notes: 'High cutoff state; choice filling must include both Govt & Society seats (MES/Govt Society).',
  },
  {
    state: 'Kerala',
    code: 'KL',
    authority: 'Commissioner for Entrance Examinations (CEE Kerala)',
    ruleTitle: 'Keralite (Category I) Status',
    eligibilityCriteria: [
      'A candidate of Kerala origin whose parents were born in Kerala or candidate born in Kerala.',
      'Non-Keralite I (NK-I): Passed qualifying exam in Kerala and children of central/state employees posted in Kerala.',
      'Non-Keralite II (NK-II): Open category for all India candidates for Private self-financing seats.',
    ],
    isOpenForOthers: true,
    openCollegesType: 'Private Self-Financing Medical Colleges (NK-II Quota)',
    portalUrl: 'https://cee.kerala.gov.in',
    notes: 'Requires prior CEE KEAM registration before NEET results are announced.',
  },
  {
    state: 'Madhya Pradesh',
    code: 'MP',
    authority: 'DME Madhya Pradesh',
    ruleTitle: 'MP Domicile / 3 Years Schooling + Parent Residence',
    eligibilityCriteria: [
      'Candidate possessing MP Permanent Domicile Certificate issued by SDM.',
      'Studied at least 3 consecutive years in MP or parents residing in MP for 5+ years.',
      'Private medical colleges in MP prioritize MP domicile candidates in Round 1; open to all in subsequent rounds if vacant.',
    ],
    isOpenForOthers: true,
    openCollegesType: 'Private Medical Colleges (Round 2 onwards)',
    portalUrl: 'https://dme.mponline.gov.in',
    notes: 'MP has high rural service bonds for government medical college graduates.',
  },
  {
    state: 'Gujarat',
    code: 'GJ',
    authority: 'ACPUGMEC Gujarat',
    ruleTitle: 'Born in Gujarat OR 10th & 12th in Gujarat + Domicile',
    eligibilityCriteria: [
      'Candidate must have passed 10th and 12th from Gujarat Board / CBSE / ICSE inside Gujarat.',
      'Candidate born in Gujarat AND holding Gujarat Domicile Certificate.',
      'Non-domicile candidates can ONLY apply via 15% All India Quota.',
    ],
    isOpenForOthers: false,
    openCollegesType: 'Management/NRI Quota in SFI Colleges only if seats remain',
    portalUrl: 'https://www.medadmgujarat.org',
    notes: 'GMERS colleges require local PIN purchase and document verification at help centres.',
  },
]

// ==========================================
// 3. DATA: STATE SERVICE BONDS & PENALTIES
// ==========================================
const STATE_BONDS_DATA = [
  { state: 'Haryana', bondYears: 5, bondText: '5 Years', penalty: '₹25.77 - ₹30 Lakhs', stipend: '₹40,000 / mo', pgWaiver: 'No', type: 'High Bond', notes: 'Government Medical Colleges mandate rural service with an institutional bank guarantee structure.' },
  { state: 'Chhattisgarh', bondYears: 2, bondText: '2 Years', penalty: '₹25 Lakhs', stipend: '₹55,000 / mo', pgWaiver: 'Post-PG', type: 'High Bond', notes: 'Mandatory 2-year rural/tribal health post service for all MBBS state quota graduates.' },
  { state: 'Madhya Pradesh', bondYears: 1, bondText: '1 Year (2 Yrs Rural)', penalty: '₹10 - ₹25 Lakhs', stipend: '₹55,000 / mo', pgWaiver: 'Deferred during PG', type: 'Moderate Bond', notes: 'Compulsory rural posting for state quota beneficiaries; penalty varies by college tier.' },
  { state: 'Maharashtra', bondYears: 1, bondText: '1 Year', penalty: '₹10 Lakhs', stipend: '₹65,000 / mo', pgWaiver: 'Allowed before or after PG', type: 'Moderate Bond', notes: 'Mandatory 1-year social/rural service bond in public health care centres.' },
  { state: 'West Bengal', bondYears: 3, bondText: '3 Years', penalty: '₹10 Lakhs', stipend: '₹45,000 / mo', pgWaiver: 'Bond deferred during PG', type: 'Moderate Bond', notes: '3-year service bond in state-run district/sub-divisional hospitals.' },
  { state: 'Uttar Pradesh', bondYears: 2, bondText: '2 Years', penalty: '₹10 Lakhs', stipend: '₹42,000 / mo', pgWaiver: 'Can serve after PG', type: 'Moderate Bond', notes: '2-year rural service in state health department or district hospitals.' },
  { state: 'Karnataka', bondYears: 1, bondText: '1 Year', penalty: '₹10 - ₹15 Lakhs', stipend: '₹45,000 / mo', pgWaiver: 'Deferred if selected for PG', type: 'Moderate Bond', notes: 'Compulsory rural service after internship for all Government and Govt-quota seats.' },
  { state: 'Rajasthan', bondYears: 2, bondText: '2 Years', penalty: '₹5 Lakhs', stipend: '₹40,000 / mo', pgWaiver: 'Can be deferred for PG', type: 'Low Bond', notes: '2-year state service bond for all Government medical college seats.' },
  { state: 'Tamil Nadu', bondYears: 5, bondText: '5 Years', penalty: '₹5 Lakhs', stipend: '₹48,000 / mo', pgWaiver: 'Can complete post-PG', type: 'Low Penalty / Long Bond', notes: '5-year government hospital service with a nominal penalty amount.' },
  { state: 'Assam', bondYears: 5, bondText: '5 Years (or 1 Yr Rural)', penalty: '₹30 Lakhs', stipend: '₹50,000 / mo', pgWaiver: 'Strict', type: 'High Bond', notes: '5 years general service or 1 year continuous rural/char area posting.' },
  { state: 'Odisha', bondYears: 2, bondText: '2 Years', penalty: '₹25 Lakhs', stipend: '₹52,000 / mo', pgWaiver: 'Allowed for PG', type: 'High Bond', notes: '2 years service in state medical services or rural health units.' },
  { state: 'Telangana', bondYears: 1, bondText: '1 Year', penalty: '₹10 Lakhs', stipend: '₹48,000 / mo', pgWaiver: 'Yes', type: 'Low Bond', notes: '1-year rural service after completion of compulsory rotating medical internship.' },
  { state: 'Andhra Pradesh', bondYears: 1, bondText: '1 Year', penalty: '₹10 Lakhs', stipend: '₹48,000 / mo', pgWaiver: 'Yes', type: 'Low Bond', notes: '1-year compulsory government service in state primary/secondary healthcare.' },
  { state: 'Delhi (Central GMCs / MAMC / VMMC / UCMS)', bondYears: 0, bondText: 'No Bond', penalty: '₹0 (Bond Free)', stipend: '₹95,000 / mo', pgWaiver: 'N/A', type: 'Zero Bond', notes: 'Central institutes & Delhi Government colleges have zero service bond obligation and high stipends.' },
  { state: 'AIIMS Institutes (Nationwide)', bondYears: 0, bondText: 'No Bond', penalty: '₹0 (Bond Free)', stipend: '₹30,000 / mo (Intern) / ₹95,000 (JR)', pgWaiver: 'N/A', type: 'Zero Bond', notes: 'Autonomous Central Institutes governed under AIIMS Act with zero bond obligations.' },
]

// ==========================================
// 4. DATA: CATEGORY-SPECIFIC DOCUMENT CHECKLIST
// ==========================================
const ALL_DOCUMENTS = [
  { id: 'admit_card', category: 'General', title: 'NEET 2026 Admit Card', desc: 'Original laminated/clean copy with recent passport photograph and candidate thumb impression.', mandatory: true, issuingAuth: 'NTA (National Testing Agency)' },
  { id: 'score_card', category: 'General', title: 'NEET 2026 Scorecard / Rank Letter', desc: 'Official scorecard displaying All India Rank (AIR), Category Rank, and PCB marks.', mandatory: true, issuingAuth: 'NTA Portal' },
  { id: 'allotment_letter', category: 'General', title: 'Provisional Seat Allotment Letter', desc: 'Generated by MCC or State Counselling Authority after round seat confirmation.', mandatory: true, issuingAuth: 'MCC / State DME' },
  { id: 'class10_cert', category: 'General', title: 'Class 10 Certificate & Marksheet', desc: 'Mandatory primary proof of Date of Birth (DOB) and candidate parent names.', mandatory: true, issuingAuth: 'CBSE / ICSE / State Board' },
  { id: 'class12_cert', category: 'General', title: 'Class 12 Passing Certificate & Marksheet', desc: 'Must certify Physics, Chemistry, Biology (PCB) & English aggregate ≥ 50% (40% for reserved).', mandatory: true, issuingAuth: 'Recognised School Board' },
  { id: 'photo_id', category: 'General', title: 'Government Photo ID Proof', desc: 'Original Aadhaar Card, Passport, PAN Card, or Voter ID matching application spelling.', mandatory: true, issuingAuth: 'Govt of India' },
  { id: 'photos', category: 'General', title: 'Passport Size Photographs (8-12 copies)', desc: 'Identical to the photograph uploaded on the NEET 2026 application form with white background.', mandatory: true, issuingAuth: 'Self / Studio' },
  { id: 'domicile_cert', category: 'General', title: 'Domicile / Residence Certificate', desc: 'Mandatory for claiming 85% Home State Quota seats in state medical colleges.', mandatory: true, issuingAuth: 'Tehsildar / SDO / Revenue Authority' },
  { id: 'medical_fitness', category: 'General', title: 'Medical Fitness Certificate', desc: 'Prescribed proforma signed and stamped by a Registered Medical Practitioner (RMP).', mandatory: true, issuingAuth: 'Registered Medical Doctor' },
  { id: 'obc_cert', category: 'OBC', title: 'OBC-NCL Certificate (Central Format)', desc: 'Must be issued on or after April 1, 2026 in the Central OBC non-creamy layer format.', mandatory: true, issuingAuth: 'District Magistrate / Tehsildar' },
  { id: 'ews_cert', category: 'EWS', title: 'EWS Income & Asset Certificate', desc: 'Financial year 2025-26 certificate issued on or after April 1, 2026 by competent authority.', mandatory: true, issuingAuth: 'SDM / Tehsildar' },
  { id: 'sc_st_cert', category: 'SC-ST', title: 'SC / ST Caste / Tribe Certificate', desc: 'Original certificate verifying caste/tribe listed in Presidential Order with English translation if in local script.', mandatory: true, issuingAuth: 'Competent District Authority' },
  { id: 'caste_validity', category: 'SC-ST', title: 'Caste Validity Certificate (Maharashtra / Select States)', desc: 'Scrutiny committee certificate mandatory for admissions in Maharashtra & specified states.', mandatory: true, issuingAuth: 'State Caste Scrutiny Committee' },
  { id: 'pwd_cert', category: 'PwD', title: 'PwD Disability Certificate (MCC 16 Centres)', desc: 'Issued exclusively by one of the 16 MCC designated Disability Certification Centres.', mandatory: true, issuingAuth: 'Designated MCC Medical Board' },
  { id: 'gap_cert', category: 'Gap Year', title: 'Gap Affidavit / Gap Year Certificate', desc: 'Notarized affidavit on stamp paper stating non-engagement in criminal or other university courses.', mandatory: false, issuingAuth: 'Public Notary / Executive Magistrate' },
  { id: 'nri_docs', category: 'NRI', title: 'NRI Sponsor Documents & Embassy Certificate', desc: 'Sponsor passport, valid visa, relationship affidavit, and Indian Embassy verification certificate.', mandatory: true, issuingAuth: 'Indian Embassy / Consular Office' },
  { id: 'transfer_migration', category: 'General', title: 'Transfer Certificate (TC) & Migration Certificate', desc: 'Original certificates from previous school / board required during physical reporting.', mandatory: true, issuingAuth: 'School Principal / Board' },
]

// ==========================================
// 5. DATA: OFFICIAL DME COUNSELLING PORTALS
// ==========================================
const OFFICIAL_PORTALS = [
  { name: 'MCC All India Quota (AIQ 15%, AIIMS, JIPMER, Deemed)', code: 'MCC', url: 'https://mcc.nic.in', jurisdiction: 'All India Central / Deemed / Central Universities', contact: '1800 102 7637 / counselling-mcc@nic.in' },
  { name: 'AACCC (Ayush Admissions Central Committee - BAMS/BHMS)', code: 'AACCC', url: 'https://aaccc.gov.in', jurisdiction: 'All India Ayush 15% & National Institutes', contact: 'admissions-aaccc@gov.in' },
  { name: 'DMER Maharashtra / CET Cell', code: 'MH', url: 'https://cetcell.mahacet.org', jurisdiction: 'Maharashtra 85% State Quota & Private Colleges', contact: '022-22016159' },
  { name: 'UP DGME (Uttar Pradesh)', code: 'UP', url: 'https://upneet.gov.in', jurisdiction: 'UP 85% Govt & 100% Private Medical Colleges', contact: 'upneetadmission@gmail.com' },
  { name: 'KEA Karnataka', code: 'KA', url: 'https://cetonline.karnataka.gov.in/kea', jurisdiction: 'Karnataka Govt 85% & Open Private Seats', contact: '080-23460460' },
  { name: 'WBMCC West Bengal', code: 'WB', url: 'https://wbmcc.nic.in', jurisdiction: 'West Bengal 85% State Quota & Management', contact: '033-23330100' },
  { name: 'DME Tamil Nadu Selection Committee', code: 'TN', url: 'https://tnmedicalselection.net', jurisdiction: 'Tamil Nadu Govt 85% & Management Quota', contact: '044-28361674' },
  { name: 'CEE Kerala', code: 'KL', url: 'https://cee.kerala.gov.in', jurisdiction: 'Kerala 85% State Quota & Open Private Seats', contact: '0471-2335133' },
  { name: 'DME Madhya Pradesh', code: 'MP', url: 'https://dme.mponline.gov.in', jurisdiction: 'MP 85% State Quota & Private Colleges', contact: 'dme.mp@gov.in' },
  { name: 'Rajasthan NEET UG Medical Admission Board', code: 'RJ', url: 'https://rajugneet2024.com', jurisdiction: 'Rajasthan 85% State & Management Quota', contact: 'rajugneet@gmail.com' },
  { name: 'ACPUGMEC Gujarat', code: 'GJ', url: 'https://www.medadmgujarat.org', jurisdiction: 'Gujarat 85% Govt, GMERS & SFI Seats', contact: '079-26309830' },
  { name: 'KNRUHS Telangana', code: 'TS', url: 'https://knruhs.telangana.gov.in', jurisdiction: 'Telangana 85% Convener & Management Quota', contact: 'knruhsadmission@gmail.com' },
  { name: 'Dr. YSRUHS Andhra Pradesh', code: 'AP', url: 'https://drysr.uhsap.in', jurisdiction: 'Andhra Pradesh 85% Convener & Management', contact: '0866-2450982' },
  { name: 'BCECE Bihar', code: 'BR', url: 'https://bceceboard.bihar.gov.in', jurisdiction: 'Bihar 85% State Quota & Private Colleges', contact: 'bceceboard-bih@gov.in' },
  { name: 'DMER Haryana', code: 'HR', url: 'https://uhsrcounseling.com', jurisdiction: 'Haryana 85% State Quota & Private Colleges', contact: 'dmer.haryana@gov.in' },
  { name: 'BFUHS Punjab', code: 'PB', url: 'https://bfuhs.ac.in', jurisdiction: 'Punjab 85% State Quota Medical Seats', contact: '01639-256232' },
]

// ==========================================
// 6. DATA: MCC ROUND SIMULATOR SCENARIOS
// ==========================================
const SIMULATOR_SCENARIOS = [
  {
    id: 'r1_allotted_upgrade',
    title: 'Allotted a Seat in Round 1 & Want to Upgrade in Round 2',
    round: 'Round 1 → Round 2',
    steps: [
      'Report physically to the Round 1 allotted college within the prescribed joining window.',
      'Complete document verification and pay the required college tuition & admission fees.',
      'Submit the official "Willingness for Upgradation to Round 2" form at the college nodal desk.',
      'Log into MCC portal during Round 2 choice filling and fill FRESH preferred college choices.',
    ],
    outcomes: [
      { status: 'success', text: 'If Upgraded in Round 2: Round 1 seat is automatically cancelled and allotted to next merit candidate. Collect original documents and report to new college.' },
      { status: 'info', text: 'If NOT Upgraded in Round 2: Your Round 1 seat remains 100% SECURE with you. You continue in the same college.' },
      { status: 'safe', text: 'Security Deposit: Fully Protected (₹0 Forfeiture).' },
    ],
  },
  {
    id: 'r1_free_exit',
    title: 'Allotted a Seat in Round 1 & Do NOT Want to Join (Free Exit)',
    round: 'Round 1',
    steps: [
      'Do NOT report or pay any fee to the Round 1 allotted college.',
      'The seat will automatically lapse upon expiry of the Round 1 reporting deadline.',
      'No resignation or cancellation letter needed from your side.',
    ],
    outcomes: [
      { status: 'safe', text: 'Security Deposit: 100% Safe (Free Exit clause applies in Round 1).' },
      { status: 'success', text: 'Round 2 Eligibility: You can fill fresh choices directly in Round 2 without paying any extra fee or re-registering.' },
    ],
  },
  {
    id: 'r2_allotted_decline',
    title: 'Allotted / Upgraded a Seat in Round 2 but Choose NOT to Join',
    round: 'Round 2 Exit',
    steps: [
      'You are newly allotted a college in Round 2 or upgraded from Round 1, but decide not to join.',
      'Do not complete physical reporting before the Round 2 deadline.',
    ],
    outcomes: [
      { status: 'warning', text: 'Security Deposit: FORFEITED (₹10,000 for Govt / ₹2,00,000 for Deemed).' },
      { status: 'info', text: 'Round 3 / Mop-Up Eligibility: You CAN participate in Round 3, but you MUST register afresh with fresh security deposit.' },
      { status: 'danger', text: 'Previous Seat: Round 1 seat (if you had one) is PERMANENTLY LOST because upgrade vacated it.' },
    ],
  },
  {
    id: 'r3_allotted_join',
    title: 'Allotted a Seat in Round 3 (Mop-Up Round)',
    round: 'Round 3 (Mop-Up)',
    steps: [
      'Fill preferred vacant seats during Round 3 fresh choice filling.',
      'If seat is allotted on merit, download provisional allotment letter.',
    ],
    outcomes: [
      { status: 'danger', text: 'STRICT RULE: If allotted in Round 3, you MUST join the college. If you do not join, your deposit is forfeited AND you are debarred from NEET counselling for 1-2 years.' },
      { status: 'danger', text: 'Stray Vacancy Eligibility: Candidates holding Round 3 seat are STRICTLY BARRED from Stray Vacancy round.' },
    ],
  },
  {
    id: 'stray_vacancy_eligibility',
    title: 'Can I Participate in the Stray Vacancy Round?',
    round: 'Round 4 (Stray Vacancy)',
    steps: [
      'System checks whether candidate holds any MBBS seat across AIQ or State Counselling databases.',
    ],
    outcomes: [
      { status: 'success', text: 'Eligible ONLY IF: You have NEVER been allotted any seat or you exited Round 1/2 and do NOT hold any seat in AIQ or State quota.' },
      { status: 'danger', text: 'Ineligible IF: You hold an admitted seat anywhere in India. Data-sharing between MCC and State DMEs automatically filters out admitted candidates.' },
    ],
  },
]

// ==========================================
// 7. DATA: FAQS
// ==========================================
const ADVANCED_FAQS = [
  {
    category: 'Round Rules',
    q: 'What is the Free Exit rule in MCC NEET Round 1?',
    a: 'In Round 1 of MCC All India Quota, if a candidate is allotted a college but does not report or join, their security deposit is NOT forfeited. They can freely exit and participate in Round 2 without any penalty or re-registration.',
  },
  {
    category: 'Quota Rules',
    q: 'Can I participate in both 15% AIQ and 85% State Quota counselling simultaneously?',
    a: 'Yes! All eligible candidates can register and fill choices in MCC All India Quota (15%) and their respective State Quota (85%) counselling authorities concurrently. You can explore both until you decide where to lock your final admission.',
  },
  {
    category: 'Upgradation',
    q: 'What happens if I accept Round 1 seat and want an upgrade in Round 2?',
    a: 'You must physically report to the Round 1 allotted college, complete document verification, pay the admission fee, and submit an "Option for Upgradation to Round 2". If upgraded in Round 2, your Round 1 seat is automatically cancelled and transferred to another candidate.',
  },
  {
    category: 'Security Deposit',
    q: 'What are the rules regarding Security Deposit forfeiture in Round 2?',
    a: 'In Round 2, if a seat is newly allotted or upgraded, and you choose NOT to join the allotted college, your refundable security deposit (₹10,000 for Govt / ₹2,00,000 for Deemed) will be forfeited. However, you can register afresh for Round 3 (Mop-Up).',
  },
  {
    category: 'Certificates',
    q: 'How does Central OBC-NCL vs State OBC certificate difference affect counselling?',
    a: 'For 15% All India Quota (MCC), your OBC caste MUST be present on the Central OBC list and the OBC-NCL certificate must be in Central format issued on or after April 1 of the admission year. For 85% State Quota, state-specific OBC/SEBC categories apply.',
  },
  {
    category: 'Stray Vacancy',
    q: 'What is Stray Vacancy Round and who is strictly barred?',
    a: 'Stray Vacancy is the final counselling round for leftover vacant seats. As per Supreme Court and MCC guidelines, candidates who already hold an allotted MBBS seat anywhere in India (AIQ or State) are STRICTLY INELIGIBLE to participate in Stray Vacancy rounds.',
  },
  {
    category: 'Open States',
    q: 'Which states allow other state non-domicile students to get private medical seats?',
    a: 'Top "Open States" where non-domicile candidates can legally participate in private medical college counselling include: Uttar Pradesh, Karnataka (Open/OPN quota), Kerala (NK-II quota), West Bengal (Management quota), Bihar, Uttarakhand, and Pondicherry.',
  },
  {
    category: 'Service Bonds',
    q: 'What happens if I get an MD/MS (PG) seat during my MBBS bond period?',
    a: 'In most states (such as Maharashtra, UP, Karnataka, and MP), your MBBS service bond can be officially deferred/suspended while you pursue your postgraduate residency, and you can serve the remaining bond period after completing your PG degree.',
  },
]

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function CounsellingHub() {
  const navigate = useNavigate()
  const { user, updateProfile } = useStudentAuth()
  
  // Active Navigation Tab: 'calculator' | 'domicile' | 'simulator' | 'bonds' | 'checklist' | 'portals' | 'faqs'
  const [activeTab, setActiveTab] = useState('calculator')

  // ------------------------------------------
  // Tab 1: Calculator State
  // ------------------------------------------
  const [inputScore, setInputScore] = useState(user?.score || 640)
  const [selectedCategory, setSelectedCategory] = useState(user?.category || 'General')
  const [estimatedRank, setEstimatedRank] = useState({ min: 10500, max: 13500, mid: 12000, percentile: '99.10%', zone: 'Core Govt GMC' })
  const [scoreSyncedMsg, setScoreSyncedMsg] = useState('')

  // Tie-breaker weights simulator
  const [bioScore, setBioScore] = useState(330)
  const [chemScore, setChemScore] = useState(155)
  const [phyScore, setPhyScore] = useState(155)

  useEffect(() => {
    const s = Number(inputScore) || 0
    if (s <= 0) return

    const match = SCORE_RANK_DATA.find((r) => s >= r.minScore && s <= r.maxScore)
    if (match) {
      const scoreFraction = (s - match.minScore) / (match.maxScore - match.minScore || 1)
      const calculatedMid = Math.round(match.maxRank - scoreFraction * (match.maxRank - match.minRank))
      setEstimatedRank({
        min: Math.max(1, Math.round(calculatedMid * 0.92)),
        max: Math.round(calculatedMid * 1.08),
        mid: calculatedMid,
        percentile: match.percentile,
        zone: match.govtGovtChance,
      })
    } else if (s > 720) {
      setEstimatedRank({ min: 1, max: 50, mid: 1, percentile: '99.999%', zone: 'Top Central / AIIMS New Delhi' })
    } else {
      setEstimatedRank({ min: 450000, max: 1200000, mid: 600000, percentile: '45.00%', zone: 'Deemed / Private Merit' })
    }
  }, [inputScore])

  // Estimated Category Rank
  const categoryEstimatedRank = useMemo(() => {
    const offset = CATEGORY_CUTOFF_OFFSETS[selectedCategory] || CATEGORY_CUTOFF_OFFSETS.General
    return Math.max(1, Math.round(estimatedRank.mid * offset.rankMultiplier))
  }, [estimatedRank.mid, selectedCategory])

  const handleApplyToProfile = async () => {
    setScoreSyncedMsg('')
    try {
      await updateProfile({
        score: Number(inputScore),
        air: Number(estimatedRank.mid),
        category: selectedCategory,
      })
      setScoreSyncedMsg(`Estimated AIR #${estimatedRank.mid.toLocaleString('en-IN')} (${selectedCategory}) synced to Candidate Profile!`)
      setTimeout(() => setScoreSyncedMsg(''), 4000)
    } catch (err) {
      setScoreSyncedMsg('Failed to sync profile: ' + err.message)
    }
  }

  // ------------------------------------------
  // Tab 2: Domicile Checker State
  // ------------------------------------------
  const [domicileSearch, setDomicileSearch] = useState('')
  const [selectedDomicileState, setSelectedDomicileState] = useState(STATE_DOMICILE_RULES[0])
  const [domicileQuestions, setDomicileQuestions] = useState({
    studiedSchooling: true,
    parentsResident: true,
    defenceCentralGovt: false,
  })

  const filteredDomicileStates = useMemo(() => {
    if (!domicileSearch.trim()) return STATE_DOMICILE_RULES
    const q = domicileSearch.toLowerCase()
    return STATE_DOMICILE_RULES.filter(s => s.state.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.authority.toLowerCase().includes(q))
  }, [domicileSearch])

  const domicileVerdict = useMemo(() => {
    if (domicileQuestions.studiedSchooling || domicileQuestions.parentsResident || domicileQuestions.defenceCentralGovt) {
      return {
        isEligible: true,
        badge: '100% Eligible for 85% State Quota',
        desc: `You satisfy the core eligibility criteria for Government & Private state quota seats in ${selectedDomicileState.state}.`,
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      }
    }
    return {
      isEligible: false,
      badge: selectedDomicileState.isOpenForOthers ? 'AIQ 15% & Open Private Seats Only' : '15% AIQ Only (Non-Open State)',
      desc: selectedDomicileState.isOpenForOthers 
        ? `${selectedDomicileState.state} allows non-domicile candidates for ${selectedDomicileState.openCollegesType}. You cannot claim 85% Government Quota.`
        : `${selectedDomicileState.state} does not offer open private medical seats to other state candidates. You can only apply via 15% All India Quota (MCC).`,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
    }
  }, [domicileQuestions, selectedDomicileState])

  // ------------------------------------------
  // Tab 3: Simulator State
  // ------------------------------------------
  const [selectedScenarioId, setSelectedScenarioId] = useState(SIMULATOR_SCENARIOS[0].id)
  const activeScenario = useMemo(() => {
    return SIMULATOR_SCENARIOS.find(s => s.id === selectedScenarioId) || SIMULATOR_SCENARIOS[0]
  }, [selectedScenarioId])

  // ------------------------------------------
  // Tab 4: State Bonds Filter State
  // ------------------------------------------
  const [bondSearch, setBondSearch] = useState('')
  const [bondDurationFilter, setBondDurationFilter] = useState('ALL') // 'ALL' | 'ZERO' | 'LE2' | 'GT2'

  const filteredBonds = useMemo(() => {
    return STATE_BONDS_DATA.filter((b) => {
      const matchesSearch = b.state.toLowerCase().includes(bondSearch.toLowerCase()) || b.notes.toLowerCase().includes(bondSearch.toLowerCase())
      if (!matchesSearch) return false
      if (bondDurationFilter === 'ZERO') return b.bondYears === 0
      if (bondDurationFilter === 'LE2') return b.bondYears > 0 && b.bondYears <= 2
      if (bondDurationFilter === 'GT2') return b.bondYears > 2
      return true
    })
  }, [bondSearch, bondDurationFilter])

  // ------------------------------------------
  // Tab 5: Document Checklist State
  // ------------------------------------------
  const [docCategoryFilter, setDocCategoryFilter] = useState('ALL') // 'ALL' | 'General' | 'OBC' | 'EWS' | 'SC-ST' | 'PwD' | 'Gap Year'
  const [checkedDocs, setCheckedDocs] = useState(() => {
    try {
      const saved = localStorage.getItem('neet_counselling_docs_checklist_v2')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const toggleDoc = (id) => {
    setCheckedDocs((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem('neet_counselling_docs_checklist_v2', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const filteredDocs = useMemo(() => {
    if (docCategoryFilter === 'ALL') return ALL_DOCUMENTS
    return ALL_DOCUMENTS.filter(d => d.category === docCategoryFilter || d.category === 'General')
  }, [docCategoryFilter])

  const completedDocsCount = useMemo(() => {
    return Object.values(checkedDocs).filter(Boolean).length
  }, [checkedDocs])

  const totalMandatoryDocs = useMemo(() => {
    return ALL_DOCUMENTS.filter(d => d.mandatory).length
  }, [])

  const completionPct = Math.round((completedDocsCount / ALL_DOCUMENTS.length) * 100)

  // ------------------------------------------
  // Tab 6: Portals Search State
  // ------------------------------------------
  const [portalSearch, setPortalSearch] = useState('')
  const filteredPortals = useMemo(() => {
    if (!portalSearch.trim()) return OFFICIAL_PORTALS
    const q = portalSearch.toLowerCase()
    return OFFICIAL_PORTALS.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.jurisdiction.toLowerCase().includes(q))
  }, [portalSearch])

  // ------------------------------------------
  // Tab 7: FAQs State
  // ------------------------------------------
  const [faqSearch, setFaqSearch] = useState('')
  const [openFaq, setOpenFaq] = useState(0)

  const filteredFaqs = useMemo(() => {
    if (!faqSearch.trim()) return ADVANCED_FAQS
    const q = faqSearch.toLowerCase()
    return ADVANCED_FAQS.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
  }, [faqSearch])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Hub Header Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/20 border border-brand-400/40 px-3 py-1 text-[11px] font-bold text-brand-300">
                <Compass size={14} className="text-brand-300 animate-spin" style={{ animationDuration: '8s' }} /> NEET 2026 Comprehensive Counselling Suite
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Counselling Guide, Tools &amp; Rules
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Empowering medical aspirants with interactive Score-to-AIR estimators, State 85% Domicile rules, MCC Round Upgradation simulator, Service Bond matrices, and Official Portals directory.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-accent-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-brand-500/30 hover:opacity-95 transition cursor-pointer"
              >
                <ClipboardCheck size={14} />
                <span>1-Click Predictor</span>
              </button>
              <button
                onClick={() => navigate('/chat')}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer"
              >
                <MessageSquare size={14} className="text-brand-300" />
                <span>Counselling Chat</span>
              </button>
            </div>
          </div>
        </section>

        {/* 7-Tab Navigation Bar */}
        <div className="overflow-x-auto pb-1">
          <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-2xs gap-1 min-w-[720px]">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center justify-center gap-2 flex-1 rounded-xl py-2.5 px-3 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'calculator'
                  ? 'bg-brand-50 text-brand-700 shadow-2xs border border-brand-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Calculator size={15} /> Marks ↔ AIR Calculator
            </button>
            
            <button
              onClick={() => setActiveTab('domicile')}
              className={`flex items-center justify-center gap-2 flex-1 rounded-xl py-2.5 px-3 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'domicile'
                  ? 'bg-brand-50 text-brand-700 shadow-2xs border border-brand-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Compass size={15} /> 85% Domicile Checker
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center justify-center gap-2 flex-1 rounded-xl py-2.5 px-3 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'simulator'
                  ? 'bg-brand-50 text-brand-700 shadow-2xs border border-brand-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Scale size={15} /> MCC Round Simulator
            </button>

            <button
              onClick={() => setActiveTab('bonds')}
              className={`flex items-center justify-center gap-2 flex-1 rounded-xl py-2.5 px-3 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'bonds'
                  ? 'bg-brand-50 text-brand-700 shadow-2xs border border-brand-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Building2 size={15} /> State Bond &amp; Penalty
            </button>

            <button
              onClick={() => setActiveTab('checklist')}
              className={`flex items-center justify-center gap-2 flex-1 rounded-xl py-2.5 px-3 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'checklist'
                  ? 'bg-brand-50 text-brand-700 shadow-2xs border border-brand-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileCheck2 size={15} /> Document Checklist ({completedDocsCount}/{ALL_DOCUMENTS.length})
            </button>

            <button
              onClick={() => setActiveTab('portals')}
              className={`flex items-center justify-center gap-2 flex-1 rounded-xl py-2.5 px-3 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'portals'
                  ? 'bg-brand-50 text-brand-700 shadow-2xs border border-brand-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Globe size={15} /> Official Portals
            </button>

            <button
              onClick={() => setActiveTab('faqs')}
              className={`flex items-center justify-center gap-2 flex-1 rounded-xl py-2.5 px-3 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'faqs'
                  ? 'bg-brand-50 text-brand-700 shadow-2xs border border-brand-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <HelpCircle size={15} /> FAQs &amp; Strategies
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: MARKS ↔ AIR & CATEGORY ESTIMATOR */}
        {/* ========================================================================= */}
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Calculator size={20} className="text-brand-600" />
                    NEET 2026 Marks ↔ AIR &amp; Category Rank Calibrator
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Calibrated from authentic NTA percentile &amp; rank distributions across recent NEET sessions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 text-xs font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600" /> 2026 Calibrated Model
                  </span>
                </div>
              </div>

              {/* Slider, Number Input & Category Selector */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">NEET Total Score (out of 720)</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="100"
                          max="720"
                          value={inputScore}
                          onChange={(e) => setInputScore(Number(e.target.value))}
                          className="w-24 text-right px-2.5 py-1 text-lg font-black text-brand-700 border border-brand-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-brand-50/40"
                        />
                        <span className="text-xs font-bold text-slate-400">/ 720</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="150"
                      max="720"
                      step="1"
                      value={inputScore}
                      onChange={(e) => setInputScore(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 mr-1">Quick Benchmarks:</span>
                      {[710, 680, 650, 620, 580, 530, 480, 390].map((score) => (
                        <button
                          key={score}
                          onClick={() => setInputScore(score)}
                          className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                            Number(inputScore) === score
                              ? 'bg-brand-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {score} M
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Switcher */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700">Select Reservation Category for Cutoff Shift</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {Object.keys(CATEGORY_CUTOFF_OFFSETS).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`rounded-xl py-2 px-2 text-xs font-bold text-center transition cursor-pointer border ${
                            selectedCategory === cat
                              ? 'bg-brand-600 text-white border-brand-700 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tie-Breaker Breakdown Preview */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Award size={14} className="text-brand-600" />
                        NTA Tie-Breaking Order Simulation
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">Bio &gt; Chem &gt; Phy</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      If two candidates score identical total marks, higher marks in Biology grants higher rank, followed by Chemistry, then Physics.
                    </p>
                  </div>
                </div>

                {/* Right Column: Prediction Cards */}
                <div className="lg:col-span-5 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/70 via-white to-brand-50/40 p-5 shadow-xs space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white border border-slate-200/80 p-3.5 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimated AIR Rank</p>
                      <p className="text-2xl font-black text-brand-800 mt-1">
                        #{estimatedRank.mid.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Range: #{estimatedRank.min.toLocaleString('en-IN')} - #{estimatedRank.max.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white border border-slate-200/80 p-3.5 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category Rank ({selectedCategory})</p>
                      <p className="text-2xl font-black text-indigo-700 mt-1">
                        #{categoryEstimatedRank.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {CATEGORY_CUTOFF_OFFSETS[selectedCategory]?.label}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white border border-slate-200/80 p-3.5 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimated Percentile</p>
                      <p className="text-xl font-black text-slate-900 mt-0.5">{estimatedRank.percentile}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Safe AIQ Cutoff</p>
                      <p className="text-sm font-black text-emerald-700 mt-0.5">
                        {CATEGORY_CUTOFF_OFFSETS[selectedCategory]?.safeCutoffScore}+ Marks
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 flex items-center gap-2.5">
                    <Award size={20} className="text-emerald-700 shrink-0" />
                    <div>
                      <p className="text-xs font-extrabold text-emerald-950">Admission Probability Horizon</p>
                      <p className="text-[11px] text-emerald-800 font-medium leading-snug">{estimatedRank.zone}</p>
                    </div>
                  </div>

                  {scoreSyncedMsg && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 size={14} /> {scoreSyncedMsg}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      onClick={handleApplyToProfile}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition cursor-pointer"
                    >
                      <ClipboardCheck size={14} />
                      <span>Sync to Candidate Profile</span>
                    </button>
                    <button
                      onClick={() => navigate('/results', { state: { rank: estimatedRank.mid, category: selectedCategory } })}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition cursor-pointer"
                    >
                      <span>Predict Colleges</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Reference Benchmarks Table */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3">
                  Historical Benchmarks Reference Table (NEET 2024-2026 Trends)
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                        <th className="py-2.5 px-3.5">NEET Marks</th>
                        <th className="py-2.5 px-3">Expected AIR Window</th>
                        <th className="py-2.5 px-3">Percentile Bracket</th>
                        <th className="py-2.5 px-3.5">Government Seat Horizon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {SCORE_RANK_DATA.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/60 transition cursor-pointer ${
                            inputScore >= row.minScore && inputScore <= row.maxScore ? 'bg-brand-50/80 font-bold' : ''
                          }`}
                          onClick={() => setInputScore(Math.round((row.minScore + row.maxScore) / 2))}
                        >
                          <td className="py-2.5 px-3.5 text-slate-900 font-semibold">{row.minScore} - {row.maxScore}</td>
                          <td className="py-2.5 px-3 text-brand-700 font-extrabold">#{row.minRank.toLocaleString('en-IN')} - #{row.maxRank.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-slate-600">{row.percentile}</td>
                          <td className="py-2.5 px-3.5 text-slate-700">{row.govtGovtChance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STATE DOMICILE 85% QUOTA & ELIGIBILITY CHECKER */}
        {/* ========================================================================= */}
        {activeTab === 'domicile' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Compass size={20} className="text-brand-600" />
                    85% State Quota &amp; Domicile Eligibility Navigator
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verify whether you legally qualify for 85% Home State Quota seats across different Indian States &amp; UTs.
                  </p>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search State (e.g. Maharashtra, UP)..."
                    value={domicileSearch}
                    onChange={(e) => setDomicileSearch(e.target.value)}
                    className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* State Selection Pills */}
                <div className="lg:col-span-4 space-y-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select State / UT</label>
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {filteredDomicileStates.map((st) => (
                      <button
                        key={st.code}
                        onClick={() => setSelectedDomicileState(st)}
                        className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                          selectedDomicileState.code === st.code
                            ? 'border-brand-500 bg-brand-50/80 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900">{st.state}</p>
                          <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">{st.authority}</p>
                        </div>
                        {st.isOpenForOthers && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Open State
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Interactive Verification Questionnaire */}
                <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-slate-50/40 p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-brand-700 tracking-wider">
                        {selectedDomicileState.authority}
                      </span>
                      <h4 className="text-base font-black text-slate-900 mt-0.5">
                        {selectedDomicileState.state}: Domicile Regulations
                      </h4>
                    </div>
                    <a
                      href={selectedDomicileState.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs"
                    >
                      <span>Official Portal</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Checklist Questionnaire */}
                  <div className="space-y-3">
                    <p className="text-xs font-extrabold text-slate-700">Answer for {selectedDomicileState.state}:</p>
                    
                    <label className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={domicileQuestions.studiedSchooling}
                        onChange={(e) => setDomicileQuestions(prev => ({ ...prev, studiedSchooling: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900">Did you pass 10th &amp; 12th standard inside {selectedDomicileState.state}?</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">Completed formal schooling within institutions situated in this state boundary.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={domicileQuestions.parentsResident}
                        onChange={(e) => setDomicileQuestions(prev => ({ ...prev, parentsResident: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900">Do you or your parents possess permanent residence / Domicile Certificate of {selectedDomicileState.state}?</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">Issued by competent revenue authority (SDM / Tehsildar / District Magistrate).</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={domicileQuestions.defenceCentralGovt}
                        onChange={(e) => setDomicileQuestions(prev => ({ ...prev, defenceCentralGovt: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900">Child of Central Govt / Defence personnel posted in {selectedDomicileState.state}?</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">Qualifies for special exemption clauses in state admission rules.</p>
                      </div>
                    </label>
                  </div>

                  {/* Verdict Display */}
                  <div className={`rounded-2xl border p-4.5 space-y-2 ${domicileVerdict.badgeColor}`}>
                    <div className="flex items-center gap-2">
                      <Award size={18} />
                      <h5 className="text-xs font-black">{domicileVerdict.badge}</h5>
                    </div>
                    <p className="text-xs leading-relaxed font-medium">{domicileVerdict.desc}</p>
                  </div>

                  {/* Official State Eligibility Details */}
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <h5 className="text-xs font-extrabold text-slate-800">State Legal Rules &amp; Special Clauses:</h5>
                    <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4 leading-relaxed">
                      {selectedDomicileState.eligibilityCriteria.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                    {selectedDomicileState.notes && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-2">
                        <strong>Important Note:</strong> {selectedDomicileState.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MCC & STATE ROUND ALLOTMENT SIMULATOR */}
        {/* ========================================================================= */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Scale size={20} className="text-brand-600" />
                  MCC &amp; State Counselling Upgradation &amp; Exit Decision Engine
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your current allotment scenario to see exact legal rules, forfeiture risks, and subsequent round eligibility.
                </p>
              </div>

              {/* Scenario Selector Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SIMULATOR_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => setSelectedScenarioId(sc.id)}
                    className={`text-left p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                      selectedScenarioId === sc.id
                        ? 'border-brand-600 bg-brand-50/70 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="rounded-md bg-brand-100 text-brand-800 px-2 py-0.5 text-[10px] font-extrabold">
                        {sc.round}
                      </span>
                      <h4 className="text-xs font-black text-slate-900 mt-2 leading-snug">
                        {sc.title}
                      </h4>
                    </div>
                    <div className="text-[11px] font-bold text-brand-600 flex items-center gap-1">
                      <span>Simulate Outcome</span>
                      <ArrowRight size={12} />
                    </div>
                  </button>
                ))}
              </div>

              {/* Active Scenario Execution Flow */}
              <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/40 via-white to-slate-50 p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simulated Path</span>
                    <h4 className="text-base font-black text-slate-900 mt-0.5">{activeScenario.title}</h4>
                  </div>
                  <span className="rounded-full bg-brand-600 text-white px-3 py-1 text-xs font-extrabold self-start sm:self-auto">
                    {activeScenario.round}
                  </span>
                </div>

                {/* Step-by-Step Mandatory Actions */}
                <div className="space-y-3">
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCheck size={16} className="text-brand-600" />
                    Mandatory Action Steps:
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeScenario.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-xl bg-white border border-slate-200 p-3.5 shadow-2xs">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-brand-100 text-brand-800 text-xs font-black shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Outcomes & Penalties */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={16} className="text-amber-600" />
                    Legal Outcome &amp; Security Deposit Assessment:
                  </h5>
                  <div className="space-y-2.5">
                    {activeScenario.outcomes.map((out, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl border p-3.5 text-xs font-medium leading-relaxed flex items-start gap-2.5 ${
                          out.status === 'safe' || out.status === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : out.status === 'warning'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : out.status === 'danger'
                            ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                        }`}
                      >
                        {out.status === 'safe' || out.status === 'success' ? (
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        ) : out.status === 'danger' ? (
                          <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                        ) : (
                          <Info size={16} className="text-brand-600 shrink-0 mt-0.5" />
                        )}
                        <p>{out.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: STATE BONDS & PENALTY MATRIX */}
        {/* ========================================================================= */}
        {activeTab === 'bonds' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Building2 size={20} className="text-brand-600" />
                    State MBBS Compulsory Service Bond &amp; Penalty Matrix
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review rural/state service obligations, financial penalties, and internship stipends across Indian states.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search state..."
                      value={bondSearch}
                      onChange={(e) => setBondSearch(e.target.value)}
                      className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
                    />
                  </div>
                  <select
                    value={bondDurationFilter}
                    onChange={(e) => setBondDurationFilter(e.target.value)}
                    className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="ALL">All Durations</option>
                    <option value="ZERO">Zero Bond States</option>
                    <option value="LE2">≤ 2 Years</option>
                    <option value="GT2">&gt; 2 Years</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                      <th className="py-3 px-3.5">State / Jurisdiction</th>
                      <th className="py-3 px-3">Bond Duration</th>
                      <th className="py-3 px-3">Penalty Amount</th>
                      <th className="py-3 px-3">Internship Stipend</th>
                      <th className="py-3 px-3">PG Waiver/Deferral</th>
                      <th className="py-3 px-3.5">Key Conditions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBonds.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-3.5 font-black text-slate-900">{b.state}</td>
                        <td className="py-3.5 px-3">
                          <span className={`rounded-md px-2 py-0.5 font-extrabold border ${
                            b.bondYears === 0 
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                              : b.bondYears <= 2 
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-rose-50 text-rose-900 border-rose-200'
                          }`}>
                            {b.bondText}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-rose-700 font-extrabold">{b.penalty}</td>
                        <td className="py-3.5 px-3 text-emerald-700 font-bold">{b.stipend}</td>
                        <td className="py-3.5 px-3 text-slate-600 font-medium">{b.pgWaiver}</td>
                        <td className="py-3.5 px-3.5 text-slate-500 text-[11px] max-w-xs leading-relaxed">{b.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: DOCUMENT VERIFICATION CHECKLIST */}
        {/* ========================================================================= */}
        {activeTab === 'checklist' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <FileCheck2 size={20} className="text-emerald-600" />
                    Mandatory Counselling Document Verification Checklist
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tick off each original document as you prepare them for physical verification during reporting.
                  </p>
                </div>

                {/* Progress Bar Badge */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl shadow-2xs">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Readiness</p>
                    <p className="text-sm font-black text-slate-900">{completionPct}% Complete</p>
                  </div>
                  <div className="h-2.5 w-24 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 mr-1">Filter for My Quota:</span>
                {['ALL', 'General', 'OBC', 'EWS', 'SC-ST', 'PwD', 'Gap Year'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setDocCategoryFilter(cat)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition cursor-pointer border ${
                      docCategoryFilter === cat
                        ? 'bg-brand-600 text-white border-brand-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Documents' : cat}
                  </button>
                ))}
              </div>

              {/* Checklist Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredDocs.map((doc) => {
                  const isChecked = !!checkedDocs[doc.id]
                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleDoc(doc.id)}
                      className={`flex items-start gap-3.5 rounded-2xl border p-4 transition cursor-pointer select-none ${
                        isChecked
                          ? 'border-emerald-300 bg-emerald-50/50 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40'
                      }`}
                    >
                      <div className="pt-0.5 text-emerald-600 shrink-0">
                        {isChecked ? (
                          <CheckSquare size={18} className="text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Square size={18} className="text-slate-400" />
                        )}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-xs font-extrabold ${isChecked ? 'text-emerald-950 line-through opacity-80' : 'text-slate-900'}`}>
                            {doc.title}
                          </h4>
                          {doc.mandatory ? (
                            <span className="rounded-md bg-rose-50 text-rose-700 px-1.5 py-0.5 text-[9px] font-extrabold border border-rose-200 shrink-0">
                              Required
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[9px] font-bold shrink-0">
                              If Applicable
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{doc.desc}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Issuing Authority: {doc.issuingAuth}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
                <span>{completedDocsCount} of {ALL_DOCUMENTS.length} items verified</span>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-800 shadow-2xs transition cursor-pointer"
                >
                  <Printer size={14} /> Print / Save Checklist
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: OFFICIAL PORTALS DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'portals' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Globe size={20} className="text-brand-600" />
                    Official Central &amp; State DME Counselling Portals Directory
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Direct access to official registration links and admission authority helplines.
                  </p>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Portal / State..."
                    value={portalSearch}
                    onChange={(e) => setPortalSearch(e.target.value)}
                    className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 w-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPortals.map((p, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4.5 hover:border-brand-300 transition shadow-2xs flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-brand-50 text-brand-700 px-2 py-0.5 text-[10px] font-black border border-brand-200">
                          {p.code}
                        </span>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-extrabold text-brand-600 hover:text-brand-800"
                        >
                          <span>Open Portal</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <h4 className="text-xs font-black text-slate-900">{p.name}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{p.jurisdiction}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span>Helpdesk: {p.contact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: ADVANCED COUNSELLING FAQS */}
        {/* ========================================================================= */}
        {activeTab === 'faqs' && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <HelpCircle size={20} className="text-brand-600" />
                    Frequently Asked Counselling Questions &amp; Legal Precedents
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Clear answers to resolve critical doubts about seat acceptance, upgrades, and eligibility rules.
                  </p>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search FAQ keywords..."
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 w-56"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {filteredFaqs.map((faq, idx) => {
                  const isOpen = openFaq === idx
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between p-4 text-left text-xs font-extrabold text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2 pr-4">
                          <span className="rounded-md bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
                            {faq.category}
                          </span>
                          <span>{faq.q}</span>
                        </div>
                        {isOpen ? <ChevronUp size={16} className="text-brand-600 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                      </button>
                      {isOpen && (
                        <div className="p-4 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
