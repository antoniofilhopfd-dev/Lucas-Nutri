export const ROLES = ["patient", "nutritionist", "admin"] as const;
export type Role = (typeof ROLES)[number];
export const isRole = (v: unknown): v is Role => ROLES.includes(v as Role);
export const homeFor = (r: Role) => (r === "patient" ? "/paciente" : "/nutri");
