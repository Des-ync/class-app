export type AppEnvironment = "demo" | "staging" | "production";
export interface EnvironmentOptions {
  appEnvironment?: string;
  buildProfile?: string;
}
export function resolveEnvironment(
  options?: EnvironmentOptions,
): AppEnvironment;
export function productionChecks(
  env: Record<string, string | undefined>,
  readiness: unknown,
): { id: string; passed: boolean; detail: string }[];
export const requiredEvidence: string[];
export function publicHttps(value: unknown): boolean;
export function uuid(value: unknown): boolean;
