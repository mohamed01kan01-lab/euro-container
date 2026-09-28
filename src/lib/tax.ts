/**
 * TVA. Les prix du catalogue, les frais de port et les remises sont saisis HT ;
 * le client paie le TTC. La TVA est calculée une fois, sur le total HT de la
 * commande, et arrondie au centime : la somme des lignes affichées retombe
 * toujours exactement sur le total.
 */

const round2 = (v: number) => Math.round(v * 100) / 100;

export function taxOf(amountHt: number, ratePercent: number): number {
    return round2((amountHt * ratePercent) / 100);
}

export function withTax(amountHt: number, ratePercent: number): number {
    return round2(amountHt + taxOf(amountHt, ratePercent));
}
