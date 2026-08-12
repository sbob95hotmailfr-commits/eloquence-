"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "./actions";
import type { AuthState } from "@/app/login/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, null);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-2xl mb-1">Créer un compte</h1>
        <p className="text-sm text-foreground/70 mb-6">
          Vous choisirez vos thèmes à travailler dès l&apos;inscription.
        </p>

        {state?.success ? (
          <p className="text-sm text-laiton">
            Compte créé — vérifiez votre boîte mail pour confirmer votre adresse.
          </p>
        ) : (
          <form action={formAction} className="space-y-3">
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
              minLength={8}
              placeholder="Mot de passe (8 caractères min.)"
              className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm"
            />
            {state?.error && <p className="text-sm text-rouge-correcteur">{state.error}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Création…" : "Créer mon compte"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-sm text-foreground/70">
          Déjà inscrit ? <Link href="/login" className="underline">Se connecter</Link>
        </p>
      </Card>
    </main>
  );
}
