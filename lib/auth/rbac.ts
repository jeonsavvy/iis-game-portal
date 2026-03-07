import type { AppRole } from "@/types/database";

export const APP_ROLES: AppRole[] = ["master_admin", "creator"];

export const canAccessWorkspace = (role: AppRole | null): boolean => role === "master_admin" || role === "creator";
export const canManageAdmin = (role: AppRole | null): boolean => role === "master_admin";

export const canReadSessions = (role: AppRole | null): boolean => canAccessWorkspace(role);
export const canWriteSessions = (role: AppRole | null): boolean => canAccessWorkspace(role);

export const isMasterAdmin = (role: AppRole | null): boolean => role === "master_admin";
export const isCreator = (role: AppRole | null): boolean => role === "creator";
