export const LOOKUP_TYPES = [
  "method",
  "observation_type",
  "duty",
  "notification_method",
  "failure_action",
] as const;

export type LookupType = (typeof LOOKUP_TYPES)[number];

export const CONDITION_OPTIONS = ["daylight", "night", "clear", "cloudy", "rain", "snow"] as const;
export type ConditionOption = (typeof CONDITION_OPTIONS)[number];

export const CERTIFICATION_CLASS_DEFINITIONS = [
  { code: "part_240_engineer", name: "Part 240 Engineer", regulatoryPart: "240" },
  { code: "part_242_conductor", name: "Part 242 Conductor", regulatoryPart: "242" },
  { code: "student_engineer", name: "Student Engineer", regulatoryPart: "242" },
  { code: "other", name: "Other", regulatoryPart: null },
] as const;

export const DEFAULT_LOOKUPS: Record<LookupType, { label: string; value: string; isProgramControlled?: boolean }[]> = {
  method: [
    { label: "Stealth Observation", value: "Stealth Observation" },
    { label: "With Crew", value: "With Crew" },
    { label: "Verbal/Briefing", value: "Verbal/Briefing" },
  ],
  observation_type: [
    { label: "Field", value: "Field" },
    { label: "Camera", value: "Camera" },
    { label: "Event Recorder", value: "Event Recorder" },
  ],
  duty: [
    { label: "Engineer-at Throttle", value: "Engineer-at Throttle" },
    { label: "Conductor - On Ground", value: "Conductor - On Ground" },
    { label: "Additional Crew Member", value: "Additional Crew Member" },
  ],
  notification_method: [
    { label: "Face-to-Face", value: "Face-to-Face" },
    { label: "Radio", value: "Radio" },
    { label: "Written", value: "Written" },
    { label: "Email", value: "Email" },
  ],
  failure_action: [
    { label: "Pending", value: "Pending", isProgramControlled: true },
    { label: "Verbal Coaching", value: "Verbal Coaching", isProgramControlled: true },
    { label: "Verbal Reprimand", value: "Verbal Reprimand", isProgramControlled: true },
    { label: "Written Warning", value: "Written Warning", isProgramControlled: true },
    { label: "Progressive Discipline", value: "Progressive Discipline", isProgramControlled: true },
    { label: "Certification Action", value: "Certification Action", isProgramControlled: true },
  ],
};

export const DEFAULT_TEST_CATALOG = [
  { testNumber: 10, taskName: "Shoving or Pushing Moves", applicabilityLabel: "Conductor Annual*", categoryCode: "conductor", conductorAnnual: true, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 11, taskName: "Leaving Equip. in Clear", applicabilityLabel: "Conductor Annual*", categoryCode: "conductor", conductorAnnual: true, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 12, taskName: "Switch/Derail Handling", applicabilityLabel: "Conductor Annual*", categoryCode: "conductor", conductorAnnual: true, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 13, taskName: "Red Zone on Ground", applicabilityLabel: "Ground Persons", categoryCode: "conductor", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 14, taskName: "Riding Equipment", applicabilityLabel: "Ground Persons", categoryCode: "conductor", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 15, taskName: "Between/Around Distance", applicabilityLabel: "Ground Persons", categoryCode: "conductor", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 16, taskName: "Conductor - Other Rules", applicabilityLabel: "Ground Persons", categoryCode: "conductor", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 20, taskName: "Engineer Stop", applicabilityLabel: "Engineer Annual**", categoryCode: "engineer", conductorAnnual: false, engineerAnnual: true, engineerCheckRide: true },
  { testNumber: 21, taskName: "Speed Limit Compliance", applicabilityLabel: "Engineer at Throttle", categoryCode: "engineer", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 22, taskName: "Red Zone at Throttle", applicabilityLabel: "Engineer at Throttle", categoryCode: "engineer", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 23, taskName: "Use of Horn and Bell", applicabilityLabel: "Engineer at Throttle", categoryCode: "engineer", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 24, taskName: "Locomotive Inspection", applicabilityLabel: "Engineer", categoryCode: "engineer", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 25, taskName: "Engineer - Other Rules", applicabilityLabel: "Engineer", categoryCode: "engineer", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 30, taskName: "Fouling Track", applicabilityLabel: "All Operating Emps", categoryCode: "all", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 31, taskName: "Proper Air Brake Tests", applicabilityLabel: "All Operating Emps", categoryCode: "all", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 32, taskName: "Equipment Securement", applicabilityLabel: "All Operating Emps", categoryCode: "all", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 33, taskName: "Getting On/Off Equipment", applicabilityLabel: "All Operating Emps", categoryCode: "all", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 34, taskName: "Proper Use of Radio", applicabilityLabel: "All Operating Emps", categoryCode: "all", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 35, taskName: "Use of Electronic Devices", applicabilityLabel: "All Operating Emps", categoryCode: "all", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 36, taskName: "D&A Signs/Symptoms", applicabilityLabel: "All Operating Emps", categoryCode: "all", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 37, taskName: "Personal Protective Equip.", applicabilityLabel: "All Operating Emps", categoryCode: "all", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
  { testNumber: 38, taskName: "Card in Possession", applicabilityLabel: "All Operating Emps", categoryCode: "all", conductorAnnual: false, engineerAnnual: false, engineerCheckRide: false },
] as const;

export type AppRole = "manager" | "client_administrator" | "master_administrator";

export function buildControlNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `OT-${stamp}-${random}`;
}

export function labelForCondition(value: ConditionOption) {
  switch (value) {
    case "daylight":
      return "Daylight";
    case "night":
      return "Night";
    case "clear":
      return "Clear";
    case "cloudy":
      return "Cloudy";
    case "rain":
      return "Rain";
    case "snow":
      return "Snow";
  }
}
