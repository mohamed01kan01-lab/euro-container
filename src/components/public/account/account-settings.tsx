"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconLoader2, IconLock, IconTrash, IconUser } from "@tabler/icons-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/public/button";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { deleteMyAccount } from "@/app/[locale]/(public)/account/actions";

function Card({ icon: Icon, title, children }: { icon: typeof IconUser; title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-[26px] border border-border bg-card p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <Icon size={18} className="text-orange-600" /> {title}
            </h2>
            {children}
        </section>
    );
}

export function AccountSettings({ name, email, canDelete }: { name: string; email: string; canDelete: boolean }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [confirmation, setConfirmation] = useState("");

    function saveProfile(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const newName = String(new FormData(e.currentTarget).get("name") ?? "").trim();
        if (newName.length < 2) return toast.error("Votre nom doit comporter au moins 2 caractères.");
        startTransition(async () => {
            const { error } = await authClient.updateUser({ name: newName });
            if (error) toast.error(getAuthErrorMessage(error));
            else {
                toast.success("Profil mis à jour.");
                router.refresh();
            }
        });
    }

    function changePassword(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        const currentPassword = String(data.get("currentPassword") ?? "");
        const newPassword = String(data.get("newPassword") ?? "");
        if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
            return toast.error("8 caractères minimum, avec au moins une lettre et un chiffre.");
        }
        startTransition(async () => {
            const { error } = await authClient.changePassword({
                currentPassword,
                newPassword,
                revokeOtherSessions: true,
            });
            if (error) toast.error(getAuthErrorMessage(error));
            else {
                toast.success("Mot de passe modifié. Vos autres appareils ont été déconnectés.");
                form.reset();
            }
        });
    }

    function onDelete() {
        startTransition(async () => {
            const res = await deleteMyAccount(confirmation);
            if (!res.ok) {
                toast.error(res.error);
                return;
            }
            toast.success("Votre compte a été supprimé.");
            window.location.assign("/");
        });
    }

    return (
        <div className="space-y-5">
            <Card icon={IconUser} title="Mes informations">
                <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <div className="space-y-1.5">
                        <Label htmlFor="name">Nom complet</Label>
                        <Input id="name" name="name" defaultValue={name} autoComplete="name" required />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={email} disabled readOnly />
                    </div>
                    <Button type="submit" variant="outline" disabled={pending}>
                        {pending && <IconLoader2 className="animate-spin" />}
                        Enregistrer
                    </Button>
                </form>
            </Card>

            <Card icon={IconLock} title="Mot de passe">
                <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <div className="space-y-1.5">
                        <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
                    </div>
                    <Button type="submit" variant="outline" disabled={pending}>
                        Modifier
                    </Button>
                </form>
            </Card>

            {canDelete && (
                <section className="flex flex-col gap-3 rounded-[26px] border border-destructive/30 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div>
                        <p className="font-semibold">Supprimer mon compte</p>
                        <p className="text-sm text-muted-foreground">
                            Vos données personnelles sont effacées. Vos factures et commandes sont conservées le temps légal.
                        </p>
                    </div>
                    <Button type="button" variant="ghost" className="shrink-0 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                        <IconTrash /> Supprimer
                    </Button>
                </section>
            )}

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="rounded-[28px]">
                    <DialogHeader>
                        <DialogTitle>Supprimer définitivement votre compte ?</DialogTitle>
                        <DialogDescription>
                            Cette action est irréversible. Vos commandes en cours restent suivies par email et via la page « Mes commandes ».
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1.5">
                        <Label htmlFor="confirm">Saisissez SUPPRIMER pour confirmer</Label>
                        <Input id="confirm" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={pending || confirmation.trim().toUpperCase() !== "SUPPRIMER"}
                            onClick={onDelete}
                        >
                            {pending && <IconLoader2 className="animate-spin" />}
                            Supprimer mon compte
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
