"use client";

import { IconCheck, IconClipboardList, IconQrcode } from "@tabler/icons-react";
import { Button } from "@/components/public/button";
import { formatIban } from "@/lib/bank";
import { CopyRow, useCopy } from "./copy-button";
import { ProofDropzone } from "./proof-dropzone";

export interface PublicBankDetails {
    accountHolder: string;
    holderAddress: string | null;
    iban: string;
    bic: string | null;
    bankName: string | null;
    bankAddress: string | null;
    instructions: string | null;
}

interface BankTransferPanelProps {
    orderNumber: string;
    amount: number;
    amountLabel: string;
    bank: PublicBankDetails;
    /** SVG du QR code SEPA, absent si la devise n'est pas l'euro. */
    qrSvg: string | null;
    /** true une fois un justificatif reçu : on ne propose plus que l'ajout d'un autre. */
    declared: boolean;
}

export function BankTransferPanel({
    orderNumber,
    amount,
    amountLabel,
    bank,
    qrSvg,
    declared,
}: BankTransferPanelProps) {
    const { copied, copy } = useCopy();

    // Montant au format attendu par les applis bancaires françaises : 4890,00
    const amountForBank = amount.toFixed(2).replace(".", ",");

    const allDetails = [
        `Bénéficiaire : ${bank.accountHolder}`,
        bank.holderAddress && `Adresse du bénéficiaire : ${bank.holderAddress}`,
        `IBAN : ${formatIban(bank.iban)}`,
        bank.bic && `BIC : ${bank.bic}`,
        bank.bankName && `Banque : ${bank.bankName}`,
        bank.bankAddress && `Adresse de la banque : ${bank.bankAddress}`,
        `Montant : ${amountLabel}`,
        `Référence : ${orderNumber}`,
    ]
        .filter(Boolean)
        .join("\n");

    return (
        <div className="space-y-5">
            {!declared && (
                <div className="grid gap-5 md:grid-cols-[1fr_200px]">
                    <div className="overflow-hidden rounded-[22px] border border-border bg-background">
                        <div className="divide-y divide-border">
                            <CopyRow label="Montant exact" value={amountForBank} display={amountLabel} highlight />
                            <CopyRow label="Référence (obligatoire)" value={orderNumber} mono highlight />
                            <CopyRow label="Bénéficiaire" value={bank.accountHolder} />
                            <CopyRow label="IBAN" value={bank.iban.replace(/\s+/g, "")} display={formatIban(bank.iban)} mono />
                            {bank.bic && <CopyRow label="BIC / SWIFT" value={bank.bic} mono />}
                        </div>
                        {(bank.bankName || bank.bankAddress || bank.holderAddress) && (
                            <details className="group border-t border-border px-4 py-3 text-sm">
                                <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground hover:text-foreground">
                                    Virement international : banque et adresses
                                </summary>
                                <dl className="mt-3 space-y-2 text-xs">
                                    {bank.bankName && (
                                        <div>
                                            <dt className="text-muted-foreground">Banque</dt>
                                            <dd className="font-medium">{bank.bankName}</dd>
                                        </div>
                                    )}
                                    {bank.bankAddress && (
                                        <div>
                                            <dt className="text-muted-foreground">Adresse de la banque</dt>
                                            <dd className="whitespace-pre-line font-medium">{bank.bankAddress}</dd>
                                        </div>
                                    )}
                                    {bank.holderAddress && (
                                        <div>
                                            <dt className="text-muted-foreground">Adresse du bénéficiaire</dt>
                                            <dd className="whitespace-pre-line font-medium">{bank.holderAddress}</dd>
                                        </div>
                                    )}
                                </dl>
                            </details>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        {qrSvg && (
                            <div className="hidden flex-col items-center gap-2 rounded-[22px] border border-border bg-white p-4 text-center md:flex">
                                <div
                                    className="size-40 [&_svg]:h-full [&_svg]:w-full"
                                    // SVG généré côté serveur par la librairie qrcode, sans donnée utilisateur libre.
                                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                                />
                                <p className="flex items-center gap-1 text-xs font-medium text-slate-600">
                                    <IconQrcode size={14} /> Scannez avec votre appli bancaire
                                </p>
                            </div>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copy("all", allDetails, "Coordonnées")}
                        >
                            {copied === "all" ? <IconCheck /> : <IconClipboardList />}
                            {copied === "all" ? "Copié" : "Tout copier"}
                        </Button>
                    </div>
                </div>
            )}

            {bank.instructions && !declared && (
                <p className="whitespace-pre-line rounded-2xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
                    {bank.instructions}
                </p>
            )}

            {/* Le justificatif est obligatoire : c'est son envoi qui signale le virement. */}
            <div id="paiement" className="scroll-mt-24">
                <ProofDropzone orderNumber={orderNumber} compact={declared} />
            </div>
        </div>
    );
}
