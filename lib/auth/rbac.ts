import type { AppRole } from "@/types/database";

export const APP_ROLES: AppRole[] = ["master_admin"];

export const canReadSessions = (role: AppRole | null): boolean => role === "master_admin";
export const canWriteSessions = (role: AppRole | null): boolean => role === "master_admin";

export const isMasterAdmin = (role: AppRole | null): boolean => role === "master_admin";
