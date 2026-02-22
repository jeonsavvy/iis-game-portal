import type { AppRole } from "@/types/database";

export const APP_ROLES: AppRole[] = ["master_admin"];

export const canReadPipelineLogs = (role: AppRole | null): boolean => role === "master_admin";

export const canInsertAdminConfig = (role: AppRole | null): boolean => role === "master_admin";

export const isMasterAdmin = (role: AppRole | null): boolean => role === "master_admin";
