// Trust-boundary validation for a submitted weight. Pure so it's testable.
export function parseWeight(raw: FormDataEntryValue | null): number {
  const kg = parseFloat(String(raw));
  if (!Number.isFinite(kg) || kg <= 0 || kg > 400) {
    throw new Error("น้ำหนักไม่ถูกต้อง");
  }
  return kg;
}
