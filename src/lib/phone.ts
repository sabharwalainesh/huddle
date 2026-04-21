// Lightweight phone formatter & validator.
// - Formats US (10-digit) numbers as (XXX) XXX-XXXX
// - Formats US 11-digit (leading 1) as +1 (XXX) XXX-XXXX
// - For other inputs: keeps a leading "+" if present and groups digits
// - Validates: 7–15 digits per ITU E.164

export function formatPhoneInput(raw: string): string {
  if (!raw) return "";
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return hasPlus ? "+" : "";

  // US-style 10 digits
  if (!hasPlus && digits.length <= 10) {
    const a = digits.slice(0, 3);
    const b = digits.slice(3, 6);
    const c = digits.slice(6, 10);
    if (digits.length <= 3) return a;
    if (digits.length <= 6) return `(${a}) ${b}`;
    return `(${a}) ${b}-${c}`;
  }

  // US-style with leading 1 (11 digits)
  if (!hasPlus && digits.length === 11 && digits.startsWith("1")) {
    const a = digits.slice(1, 4);
    const b = digits.slice(4, 7);
    const c = digits.slice(7, 11);
    return `+1 (${a}) ${b}-${c}`;
  }

  // International: "+CC XXX XXX XXXX"
  const cc = digits.slice(0, Math.min(3, digits.length - 7 < 1 ? 1 : 3));
  // simple grouping: country code + groups of 3, last group up to 4
  const rest = digits.slice(cc.length);
  const groups: string[] = [];
  let i = 0;
  while (i < rest.length) {
    const len = rest.length - i <= 4 ? rest.length - i : 3;
    groups.push(rest.slice(i, i + len));
    i += len;
  }
  return `+${cc}${groups.length ? " " + groups.join(" ") : ""}`.trim();
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function phoneError(value: string): string | null {
  if (!value.trim()) return "Phone is required";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return "Phone is too short";
  if (digits.length > 15) return "Phone is too long";
  if (!/^[+\d\s().-]+$/.test(value)) return "Phone contains invalid characters";
  return null;
}
