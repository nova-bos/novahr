export const PLATFORM_FEE = 349;
export const MEMBER_FEE = 30;
export const ENTERPRISE_THRESHOLD = 150;

export function calculateMonthlyAmount(memberCount: number): number {
  return PLATFORM_FEE + memberCount * MEMBER_FEE;
}

export function isEnterpriseTier(memberCount: number): boolean {
  return memberCount >= ENTERPRISE_THRESHOLD;
}

export function formatBillingBreakdown(memberCount: number): string {
  const memberCharge = memberCount * MEMBER_FEE;
  const total = PLATFORM_FEE + memberCharge;
  return `R${PLATFORM_FEE} + (${memberCount} × R${MEMBER_FEE}) = R${total.toLocaleString("en-ZA")}`;
}
