"use client";

import { useState } from "react";
import { IconLogout, IconLoader2 } from "@tabler/icons-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { getThrownErrorMessage } from "@/lib/auth-errors";
import { toast } from "sonner";

interface LogoutButtonProps {
    variant?: "default" | "ghost" | "outline" | "destructive";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

export function LogoutButton({ variant = "ghost", size = "default", className }: LogoutButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            await authClient.signOut();
            toast.success("Vous êtes déconnecté. À bientôt !");
            // Rechargement complet : vide le Router Cache, sinon les pages du
            // dashboard déjà visitées restent réaffichables après déconnexion.
            window.location.assign("/login");
        } catch (err) {
            toast.error(getThrownErrorMessage(err));
            setLoading(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant={variant} size={size} className={className} disabled={loading}>
                    {loading ? (
                        <IconLoader2 size={16} className="animate-spin" />
                    ) : (
                        <IconLogout size={16} />
                    )}
                    <span className="ml-2">Déconnexion</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Voulez-vous vous déconnecter ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Vous serez redirigé vers la page de connexion.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>
                        {loading && <IconLoader2 size={14} className="mr-1.5 animate-spin" />}
                        Se déconnecter
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
