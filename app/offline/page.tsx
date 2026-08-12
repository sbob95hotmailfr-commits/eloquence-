export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="pause-mark text-3xl">———</p>
      <h1 className="font-display text-2xl">Hors ligne</h1>
      <p className="max-w-sm text-foreground/70">
        Éloquence a besoin d&apos;une connexion pour analyser vos prises de parole.
        Reconnectez-vous pour continuer votre entraînement.
      </p>
    </main>
  );
}
