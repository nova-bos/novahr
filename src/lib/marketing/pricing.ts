export const PLATFORM_FEE = 349;
export const MEMBER_FEE = 30;
export const ENTERPRISE_THRESHOLD = 150;

export const PRICING_EXAMPLES = [
  { members: 1, total: 349 + 30 },
  { members: 5, total: 349 + 150 },
  { members: 10, total: 349 + 300 },
  { members: 20, total: 349 + 600 },
  { members: 30, total: 349 + 900 },
  { members: 50, total: 349 + 1500 },
  { members: 100, total: 349 + 3000 },
] as const;
