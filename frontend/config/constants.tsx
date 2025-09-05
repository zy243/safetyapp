// File: ./config/constants.ts  (inside your frontend project)

export const USER_ROLES = {
    STUDENT: "student",
    STAFF: "staff",
    SECURITY: "security",
    ADMIN: "admin",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const INCIDENT_TYPES = {
    THEFT: "theft",
    HARASSMENT: "harassment",
    ACCIDENT: "accident",
    SUSPICIOUS_ACTIVITY: "suspicious_activity",
    FIRE: "fire",
    MEDICAL_EMERGENCY: "medical_emergency",
    OTHER: "other",
} as const;

export type IncidentType = typeof INCIDENT_TYPES[keyof typeof INCIDENT_TYPES];

export const SOS_SEVERITY = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
} as const;

export type SosSeverity = typeof SOS_SEVERITY[keyof typeof SOS_SEVERITY];
