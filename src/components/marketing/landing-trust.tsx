export function LandingTrust() {
  return (
    <section className="border-y bg-muted/50 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Orientacyjnie, na podstawie Twoich odpowiedzi
        </h2>
        <ul className="mt-6 max-w-3xl list-disc space-y-3 pl-5 text-muted-foreground">
          <li>
            Widełki kosztowe i harmonogram mają charakter orientacyjny — to
            punkt wyjścia do planowania, nie wiążący kosztorys wykonawcy.
          </li>
          <li>
            Wynik powstaje z odpowiedzi w ankiecie (metraż, standard, stan
            inwestycji i inne parametry Twojego domu).
          </li>
          <li>
            Aplikacja nie zastępuje umowy z wykonawcą ani formalnej wyceny
            instalacyjnej — zawsze weryfikuj kwoty u fachowców przed decyzją.
          </li>
        </ul>
      </div>
    </section>
  );
}
