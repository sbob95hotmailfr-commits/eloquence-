"use client";

import { useNotifications } from "@/lib/push/useNotifications";
import { Button } from "@/components/ui/Button";

export function NotificationToggle() {
  const { supported, enabled, pending, error, enable, disable } = useNotifications();

  if (!supported) {
    return (
      <p className="text-sm text-foreground/60">
        Les notifications ne sont pas prises en charge sur ce navigateur/appareil.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-foreground/70">
        {enabled
          ? "Rappels activés — vous recevrez une notification à l'heure de pratique habituelle si vous n'avez pas encore fait de session ce jour-là."
          : "Activez les rappels pour recevoir une notification à votre heure de pratique habituelle."}
      </p>
      {error && <p className="text-sm text-rouge-correcteur">{error}</p>}
      <Button
        type="button"
        variant={enabled ? "secondary" : "primary"}
        disabled={pending}
        onClick={() => (enabled ? disable() : enable())}
      >
        {pending ? "…" : enabled ? "Désactiver les rappels" : "Activer les rappels"}
      </Button>
    </div>
  );
}
