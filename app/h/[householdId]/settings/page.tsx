export default function SettingsPage({ params }: { params: { householdId: string } }) {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Household Settings</h1>
      <p className="mt-2 text-slate-600">Household ID: {params.householdId}</p>
      <p className="mt-4 text-sm text-slate-500">MVP includes invite token visibility in Households page; add deeper settings here later.</p>
    </main>
  );
}
