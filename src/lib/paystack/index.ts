import "server-only";

const BASE = "https://api.paystack.co";

function headers() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
    "Content-Type": "application/json",
  };
}

export async function initializeTransaction(params: {
  email: string;
  amount: number; // in kobo (R1 = 100 kobo)
  currency?: string;
  plan?: string;
  callback_url: string;
  metadata?: Record<string, unknown>;
}): Promise<{ authorization_url: string; reference: string }> {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ currency: "ZAR", ...params }),
  });
  const json = (await res.json()) as {
    status: boolean;
    data: { authorization_url: string; reference: string };
  };
  if (!json.status) throw new Error("Paystack: failed to initialize transaction");
  return json.data;
}

export async function verifyTransaction(reference: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: headers(),
  });
  const json = (await res.json()) as { status: boolean; data: Record<string, unknown> };
  if (!json.status) throw new Error("Paystack: failed to verify transaction");
  return json.data;
}

export async function getSubscriptionManageLink(subscriptionCode: string): Promise<string> {
  const res = await fetch(
    `${BASE}/subscription/${encodeURIComponent(subscriptionCode)}/manage/link`,
    { headers: headers() },
  );
  const json = (await res.json()) as { status: boolean; data: { link: string } };
  if (!json.status) throw new Error("Paystack: failed to get manage link");
  return json.data.link;
}
