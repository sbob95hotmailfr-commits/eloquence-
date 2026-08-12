"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInWithPassword, type AuthState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const [passwordState, passwordAction, passwordPending] = useActionState<AuthState, FormData>(
    signInWithPassword,
    null
  );

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-2xl mb-1">Éloquence</h1>
        <p className="text-sm text-foreground/70 mb-6">Connectez-vous pour continuer votre entraînement.</p>

        <form action={passwordAction} className="space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Mot de passe"
            className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm"
          />
          {passwordState?.error && (
            <p className="text-sm text-rouge-correcteur">{passwordState.error}</p>
          )}
          <Button type="submit" disabled={passwordPending} className="w-full">
            {passwordPending ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-foreground/70">
          Pas encore de compte ? <Link href="/signup" className="underline">S&apos;inscrire</Link>
        </p>
      </Card>
    </main>
  );
}
