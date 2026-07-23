/**
 * Resolves a payslip logo URL into a base64 data URL for @react-pdf/renderer.
 *
 * react-pdf's browser <Image> loads a remote `src` through its own fetch, which
 * fails silently for storage URLs (opaque/redirected responses), so the logo
 * simply never appears in the downloaded PDF. Fetching the image ourselves and
 * inlining it as a data URL sidesteps that loader entirely. Any failure returns
 * undefined, so the PDF renders without a logo rather than breaking.
 */
export async function resolveLogoDataUrl(
  url: string | null | undefined
): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}
