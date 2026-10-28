export type AppEnvironment = "demo" | "staging" | "production";
export interface EnvironmentOptions {
  appEnvironment?: string;
  buildProfile?: string;
}
export function resolveEnvironment(
  options?: EnvironmentOptions,
): AppEnvironment;
export type ReleaseTarget = "production" | "testflight";
export function productionChecks(
  env: Record<string, string | undefined>,
  readiness: unknown,
  target?: ReleaseTarget,
): { id: string; passed: boolean; detail: string }[];
export const requiredEvidence: string[];
export const evidenceByTarget: Record<ReleaseTarget, string[]>;
export function publicHttps(value: unknown): boolean;
export function uuid(value: unknown): boolean;
