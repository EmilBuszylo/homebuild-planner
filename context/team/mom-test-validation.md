# Mom Test Validation Plan

## Input Idea

**Kandydat z opportunity map:** na kroku podsumowania ankiety pokazać „Plan obejmie ok. **N** etapów” (obliczone przez `filterStages` na odpowiedziach użytkownika) i zablokować „Zatwierdź”, gdy N=0 — zanim użytkownik trafi na stronę planu z komunikatem „brak wyników”.

**Produkt:** home-build-planner — orientacyjny kosztorys + harmonogram dla inwestora budującego pierwszy dom (tryb gospodarczy).

**Źródła wejściowe:** `context/team/opportunity-map.md`, sesja 2026-06-13, `context/domain/02-invariant-aggregate-refactor.md` (INV-GEN-01), `context/foundation/prd.md` (US-01, Success Criteria Primary).

---

## Hypotheses

- **User/role:** Osoba prywatna planująca budowę pierwszego domu (gospodarczo), bez stałego dostępu do kosztorysanta; pierwszy kontakt z narzędziem przez ankietę → wynik planu.

- **Friction:** Po wysłaniu ankiety użytkownik **oczekuje** kosztorysu i timeline; zamiast tego dostaje sukces przepływu (redirect), a na stronie planu — pusty wynik, błąd lub plan **węższy niż rozumiał** (np. brak fundamentów przy „stanie deweloperskim”). Nie wie, *czy* to błąd systemu, czy jego odpowiedzi.

- **Current workaround:** Czytanie hintów przy stanach inwestycji; edycja ankiety i przeliczenie; porównanie z własną wiedzą / Excel / rozmową z wykonawcą; w sesji właściciela — ponowne wejście w ankietę i korekta start/cel.

- **Proposed solution:** Podgląd liczby (i ewentualnie listy skróconej) etapów **przed** zatwierdzeniem + blokada submit przy 0 etapach; uzupełnienie istniejącego `planScopeLabel` po stronie wyników.

- **Risky assumptions:**
  1. Problem **powtarza się** u realnych użytkowników — a nie był jednorazową pomyłką UX (kolejność pól, domyślny cel FOUNDATIONS), już częściowo naprawioną.
  2. Liczba etapów **przed** submitem redukuje stres — a nie wprowadza nowego („co to znaczy 12 etapów?”).
  3. Użytkownicy **nie czytają** podsumowania ankiety dziś — więc kolejna linia tekstu nic nie da.
  4. INV-GEN-01 (pusty wynik przy 201) zdarza się w **realnych** kombinacjach odpowiedzi, nie tylko w edge case testów.

- **Evidence already present (fakty vs domysły):**

  | Fakt | Źródło |
  |---|---|
  | Właściciel zgłosił brak fundamentów/ścian mimo wyboru planu deweloperskiego | Sesja 2026-06-13 — okazało się myleniem zakresu / kolejności pól |
  | INV-GEN-01: API może zwrócić 201/200 przy 0 `PlanStageResult`; GET później 404 | `02-invariant-aggregate-refactor.md`; testy kodyfikują naruszenie |
  | Hinty PL opisują zakres stanów; nie ma podglądu N etapów przed submit | `questionnaire/hints/pl.ts`; brak w UI podsumowania |
  | Częściowa poprawka: domyślny DEVELOPER, `planScopeLabel` na stronie planu | Commity sesji — **nie** podgląd przed submit |
  | **Brak** wywiadów z innymi użytkownikami poza właścicielem | **Luka dowodowa** |
  | **Brak** analytics / logów „pusty plan po submit” w prod | **Luka dowodowa** |

---

## Critique

**Gdzie rozwiązanie miesza się z problemem:** „Pokaż N etapów” zakłada, że użytkownik **nie rozumie** mapowania start→cel→etapy. W sesji właściciela głównym bólem była **dezorientacja formularza** (kolejność pól), nie brak licznika — po poprawkach UX problem mógł **zniknąć bez** nowego feature.

**Założenia oparte na intencji, nie zachowaniu:** PRD mówi, że użytkownik „otrzymuje kosztorys i timeline” — to aspiracja produktu, nie dowód, że ludzie dziś **sprawdzają** zakres przed kliknięciem Zatwierdź.

**Co udowodni, że problem nie warto budować:**
- 0 z 3–5 rozmów opisuje **pusty plan po sukcesie ankiety** bez pytania o feature.
- Wszyscy po poprawce `planScopeLabel` + domyślnego DEVELOPER mówią: „widziałem zakres dopiero na stronie planu i to mi wystarczyło”.
- Jedyny incydent to **błąd własny** (zły cel/start), szybko naprawiony edycją — bez utraty zaufania do produktu.

**Co już może wystarczać:**
- Hinty przy `starting_state` / `investment_state` (PL copy).
- Podsumowanie ankiety (krok 5) z etykietami stanów — **jeśli użytkownicy je czytają**.
- `planScopeLabel` na stronie wyników — **po** submit (już zaimplementowane).
- Edycja + przeliczenie (FR-005) jako recovery path.

**Silny dowód „idź dalej”:**
- ≥2 niezależne osoby opisują **ostatni** przypadek: „kliknąłem Zatwierdź → myślałem, że się udało → nie ma etapów / inny zakres niż myślałem”.
- Kombinacje odpowiedzi dające N=0 występują w **realnych** ścieżkach (nie tylko CLOSED_SHELL→OPEN_SHELL w testach).

---

## Rewrite: słabe pytania z opportunity map

```text
Instead of:
„Czy komunikat «brak wyników» po sukcesie ankiety zdarzył się u Ciebie / testerów?”

Ask:
„Opowiedz o **ostatnim** razie, gdy po wysłaniu ankiety (lub przeliczeniu) wynik na ekranie **nie** pasował do tego, co zakładałeś — co dokładnie widziałeś i co zrobiłeś w ciągu następnych 5 minut?”

Why:
Wymusza konkretną historię zamiast tak/nie; ujawnia workaround i koszt.
```

```text
Instead of:
„Czy przed kliknięciem Zatwierdź sprawdzałeś stan startowy vs docelowy? Gdzie?”

Ask:
„Przejdźmy krok po kroku **ostatnią** ankietę, którą wypełniałeś: w którym momencie po raz pierwszy pomyślałeś «czy ten plan obejmuje to, czego potrzebuję» — i skąd to wiedziałeś?”

Why:
Odkrywa, czy podsumowanie/hinty w ogóle są używane; nie zakłada, że użytkownik „powinien” sprawdzać.
```

```text
Instead of:
„Czy podgląd liczby etapów przed submit byłby przydatny?”

Ask:
„Jak dziś **bez tej aplikacji** szacujesz, ile dużych etapów (fundamenty, dach, instalacje…) masz przed sobą — arkusz, głowa, rozmowa z kim?”

Why:
Benchmark obecnego workaroundu; jeśli Excel wystarcza, feature może być zbędny.
```

```text
Classification (propozycje z mapy):
- keep: pytania o ostatnią historię i workaround
- rewrite: wszystkie „czy zdarzyło się / czy byłoby przydatne”
- drop: „Czy chciałbyś widzieć N etapów?” (solution approval)
```

---

## Interview Guide

**Czas:** 20–30 min · **Format:** 1:1 · **Role:** inwestor gospodarczy, który w ciągu ostatnich 12 miesięcy planował/ planuje budowę (lub niedawno przeszedł ankietę w home-build-planner).

### 1. Kontekst (3–5 min)

1. Opowiedz krótko, na jakim etapie jest Twoja budowa / planowanie (działka, pozwolenia, trwa budowa, tylko research).
2. Jak często **w ciągu ostatniego miesiąca** wracałeś do tematu kosztów lub kolejności etapów budowy?

*Follow-up:* Co wtedy otwierasz — notatnik, Excel, WhatsApp, cokolwiek innego?

### 2. Ostatnia historia (8–10 min)

3. Opowiedz o **ostatnim** razie, gdy próbowałeś oszacować koszt lub kolejność etapów budowy — krok po kroku, od początku do końca.
4. Co poszło **inaczej**, niż zakładałeś? Co musiałeś poprawić lub dopytać?

*Follow-up:* Ile czasu to zajęło? Czy ktoś inny był zaangażowany?

5. *(Jeśli używał home-build-planner)* Przejdźmy ostatnie wypełnienie ankiety: co pamiętasz z momentu **tuż przed** kliknięciem Zatwierdź / Przelicz ponownie?

*Follow-up:* Czy patrzyłeś na podsumowanie odpowiedzi? Co było dla Ciebie najważniejsze na tym ekranie?

### 3. Workaround i koszt (5 min)

6. Skąd **dziś** wiesz, które etapy (np. fundamenty, dach, instalacje) wchodzą w Twój plan — i które już masz za sobą?
7. Czy zdarzyło Ci się, że narzędzie (arkusz, aplikacja, wycena od znajomego) dało wynik, którego **nie ufałeś**? Co zrobiłeś?

*Follow-up:* Czy wróciłeś do edycji danych, czy porzuciłeś narzędzie?

### 4. Alternatywy (3 min)

8. Co robisz **zanim** zaufasz liczbom — porównujesz z cennikiem w internecie, pytasz wykonawcę, inaczej?
9. Czy masz jeden „źródłowy” dokument (Excel, notatki), który traktujesz jako prawdę o etapach?

### 5. Sygnał decyzyjny (3 min)

10. Przy jakim **konkretnym** sygnale na ekranie uznałbyś, że „to nie jest warte mojego czasu” i wyszedłbyś z ankiety?
11. Co musiałoby się stać, żebyś **ponownie** otworzył plan po pierwszym wyniku?

### 6. Zamknięcie

12. Czy mogę wrócić z krótkim prototypem (np. jedna linia na podsumowaniu) i poprosić o 10 minut reakcji — bez proszenia o ocenę „czy się podoba”?

---

## Survey

**Cel:** szerszy sygnał (np. lista beta / znajomi gospodarczy) · **6–8 min** · Anonimowo.

**Screener (Q1):**  
Które zdanie najlepiej Cię opisuje? *(jedna odpowiedź)*  
- A) Planuję lub buduję pierwszy dom gospodarczo (aktywnie w ostatnich 12 mies.)  
- B) Budowa za mną / tylko ciekawość  
- C) Jestem wykonawcą / branżą — **[koniec ankiety]**

**Q2.** W ostatnich 3 miesiącach ile razy **realnie** liczyłeś/aś koszt lub kolejność etapów budowy (nie tylko myślałeś o tym)?  
- 0 · 1–2 · 3–5 · 6+

**Q3.** Ostatni raz robiłeś/aś to głównie przez: *(max 2)*  
- Excel / arkusz · rozmowa z wykonawcą · gotowy kalkulator w internecie · home-build-planner · inne: ___

**Q4.** Czy kiedykolwiek po **wysłaniu** formularza lub kalkulatora wynik **nie zgadzał się** z tym, czego oczekiwałeś/aś (np. za mało etapów, pusty wynik, błąd)?  
- Tak, w ostatnim miesiącu · Tak, dawniej · Nie pamiętam · Nie, nigdy

**Q5.** *(tylko jeśli Q4 = Tak)* W **jednym zdaniu**: co widziałeś na ekranie i co zrobiłeś potem? *(otwarte)*

**Q6.** Zanim klikniesz „zatwierdź” w długim formularzu, co **zwykle** robisz?  
- Przeglądam podsumowanie wszystkich odpowiedzi · Sprawdzam tylko 1–2 kluczowe pola · Nie czytam, ufam że poprawię później · Inne

**Q7.** Jak ważne jest dla Ciebie wiedzieć **przed** finalnym wysłaniem, **ile dużych etapów** wchodzi w plan (fundamenty, dach, instalacje…)?  
- Bardzo — inaczej nie kliknę · Przydatne, ale nie decydujące · Wolę zobaczyć dopiero koszty · Nie wiem / zależy

**Q8.** *(otwarte, opcjonalne)* Opisz ostatnią sytuację, gdy **pomyliłeś** stan startowy budowy ze stanem docelowym (albo odwrotnie) — co poszło nie tak?

**Czego ankieta NIE pyta:** „Czy chciałbyś funkcję podglądu N etapów?” — to approval rozwiązania, nie dowód zachowania.

---

## Decision Criteria

### Proceed (→ `/10x-shape` feature „podgląd N etapów + guard submit”)

- **Wywiady:** ≥ **2 z 3** rozmów (poza właścicielem produktu) opisują **bez pytania o feature** ostatni incydent: wynik po ankiecie ≠ oczekiwania **lub** pusty/błędny ekran po sukcesie submitu.
- **Wywiady:** ≥ **2 z 3** mówią, że **przed** finalnym kliknięciem **nie** mieli pewności co do zakresu etapów i **nie** wystarczyły im same etykiety stanów start/cel.
- **Ankieta:** ≥ **30%** respondentów ze screenera A z Q4 = „Tak, w ostatnim miesiącu” **lub** „Tak, dawniej” z konkretną historią w Q5 (nie puste „nie wiem”).
- **Technicznie potwierdzone:** ≥1 realna kombinacja odpowiedzi daje N=0 w `filterStages` na ścieżce, którą użytkownicy faktycznie wybierają (nie tylko test regression CLOSED_SHELL→OPEN_SHELL).

### Narrow scope (tylko copy / `planScopeLabel` / hinty — bez licznika N)

- Frustracja dotyczy **wyłącznie** jednorazowej pomyłki pól (start/cel) i znika po `planScopeLabel` + domyślnym DEVELOPER.
- Respondenci czytają podsumowanie (Q6: „przeglądam wszystkie”) i mówią, że **etykiety stanów wystarczą**.
- Nikt nie opisuje pustego planu po 201 — problem INV-GEN-01 zostaje **tylko** jako fix serwerowy bez UI preview.

### Do not build yet (→ wait; ewentualnie tylko INV-GEN-01 server-side)

- 0–1 rozmowa z realnym incydentem; reszta to „miło by było”.
- Właściciel jedynym źródłem sygnału; brak potwierdzenia u innych ról z PRD.
- Ankieta: <15% z Q4 „Tak” lub Q5 bez konkretów.

### Try existing tool/process first

- Respondenci **już** mają Excel / wykonawcę jako source of truth i **nie wracają** do narzędzia po pierwszym wyniku (Q11) — wtedy problem to **wiarygodność liczb** (S-01 kalibracja), nie podgląd N etapów.
- Wystarczy im recovery: edycja ankiety + przeliczenie (FR-005) — zero utraty zaufania w historiach.

---

## Recommended next step after interviews

| Wynik | Akcja |
|---|---|
| **Proceed** | `/10x-shape` → feature scope: podsumowanie + N etapów + disable submit; potem `/10x-prd` delta |
| **Narrow** | Tylko copy/hinty + serwerowy guard INV-GEN-01 bez licznika |
| **Do not build** | Zamknąć kandydat w opportunity map; priorytet: kalibracja / refactor C1 |
| **Existing enough** | User research na „dlaczego nie ufasz kwotom” (S-01), nie UX zakresu |

**Nie implementować** podglądu N etapów przed zakończeniem ≥3 wywiadów (min. 2 osoby poza właścicielem produktu).
