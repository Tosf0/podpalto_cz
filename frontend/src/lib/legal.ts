/**
 * Údaje o provozovateli pro obchodní podmínky a zásady ochrany osobních údajů.
 * Vyplňují se v proměnných prostředí (Vercel → Environment Variables), ne v kódu – repozitář je veřejný.
 * Dokud nejsou vyplněné, stránky uvádějí jen značku a kontaktní e-mail.
 */
export const LEGAL = {
  brand: "podpalto.cz",
  operatorName: process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME || "",
  operatorIco: process.env.NEXT_PUBLIC_LEGAL_OPERATOR_ICO || "",
  operatorAddress: process.env.NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS || "",
  email: process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL || "info@podpalto.cz",
  effectiveFrom: "18. 11. 2026",
};

/** „Jan Novák, IČO 12345678, se sídlem …“ – jen vyplněné části. */
export function operatorLine(): string {
  const parts = [LEGAL.operatorName || `provozovatel služby ${LEGAL.brand}`];
  if (LEGAL.operatorIco) parts.push(`IČO ${LEGAL.operatorIco}`);
  if (LEGAL.operatorAddress) parts.push(`se sídlem ${LEGAL.operatorAddress}`);
  return parts.join(", ");
}
