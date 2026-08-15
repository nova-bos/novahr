/**
 * Derive a default employee-number prefix from the company name: the first three
 * letters of the name, uppercased (e.g. "Ironwood Freight" gives "IRO"). Falls
 * back to "EMP" when the name does not start with a letter or has too few letters
 * to make a sensible prefix (e.g. "3M", "@Home", "A"). Punctuation and spaces are
 * skipped, so "Thuli's Kitchen" gives "THU".
 */
export function deriveEmployeeNumberPrefix(companyName: string): string {
  const trimmed = (companyName ?? "").trim();
  if (!/^[A-Za-z]/.test(trimmed)) return "EMP";
  const letters = trimmed.replace(/[^A-Za-z]/g, "");
  if (letters.length < 2) return "EMP";
  return letters.slice(0, 3).toUpperCase();
}
