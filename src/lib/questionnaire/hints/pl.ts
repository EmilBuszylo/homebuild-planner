import type { QuestionHintsMap } from "./types";

export const questionHintsPl = {
  investment_state: {
    short:
      "Do jakiego etapu budowy chcesz dojść — od tego zależy, które etapy wliczamy do kosztorysu i harmonogramu.",
    expanded:
      "Wybierz cel niżej niż stan startowy. Szczegóły każdej opcji opisujemy przy odpowiedzi.",
    choices: {
      FOUNDATIONS: {
        short:
          "Plan obejmuje roboty do gotowych fundamentów (wykopy, ławy lub płyta, izolacje). Bez murowania ścian i dachu.",
      },
      OPEN_SHELL: {
        short:
          "Cel: stan surowy otwarty — ściany nośne, stropy, konstrukcja dachu. Bez pokrycia dachu, okien i drzwi.",
        expanded:
          "Budynek ma obrys, ale nie jest domknięty pogodowo — w planie są m.in. murowanie, stropy i więźba.",
      },
      CLOSED_SHELL: {
        short:
          "Cel: stan surowy zamknięty — dach, okna i drzwi zewnętrzne. W środku jeszcze bez instalacji i wykończenia.",
        expanded:
          "Dom odporny na deszcz; kolejne kroki to instalacje, tynki i wykończenie.",
      },
      DEVELOPER: {
        short:
          "Cel: stan deweloperski — instalacje, tynki, posadzki i podstawowe wykończenie (bez mebli i armatury łazienkowej w pełnym zakresie).",
        expanded:
          "Najszerszy zakres planu: od wybranego startu do domu gotowego do zamieszkania w wariancie deweloperskim.",
      },
    },
  },
  starting_state: {
    short:
      "Skąd startujesz — etapy już zakończone nie pojawią się w planie ani w kosztorysie.",
    expanded:
      "Musi być wcześniejszy niż stan docelowy. Opisy opcji poniżej.",
    choices: {
      FROM_SCRATCH: {
        short:
          "Działka bez robót — w planie liczymy od fundamentów (albo od pierwszego etapu po Twoim celu).",
      },
      FOUNDATIONS: {
        short:
          "Fundamenty są gotowe — pomijamy wykopy i ławy; plan zaczyna się od kolejnych etapów (np. ścian).",
      },
      OPEN_SHELL: {
        short:
          "Masz stan surowy otwarty (ściany, stropy, więźba) — pomijamy roboty do tego momentu.",
        expanded:
          "Kolejne etapy to m.in. dach, stolarka, instalacje — zależnie od wybranego celu.",
      },
      CLOSED_SHELL: {
        short:
          "Dom jest zamknięty z zewnątrz (dach, okna) — plan dotyczy głównie instalacji i wykończenia wewnątrz.",
      },
    },
  },
  build_standard: {
    short:
      "Poziom wykończenia wpływa na orientacyjne stawki za m² na większości etapów.",
    expanded:
      "To nie oferta wykonawcy — ułatwia porównanie wariantów.",
    choices: {
      ECONOMY: {
        short: "Niższe stawki materiałów i robocizny; prostsze wykończenie.",
      },
      STANDARD: {
        short: "Typowy poziom dla domu jednorodzinnego — balans ceny i jakości.",
      },
      PREMIUM: {
        short: "Wyższe stawki; lepsze materiały i standard wykonania.",
      },
    },
  },
  insulation_level: {
    short:
      "Jakość ocieplenia podbija koszty m.in. fundamentów, dachu i instalacji grzewczej.",
    expanded:
      "Chodzi o ogólny standard izolacji, nie grubość styropianu w cm.",
    choices: {
      STANDARD: {
        short: "Ocieplenie spełniające typowe wymagania — bazowe stawki w wycenie.",
      },
      ENHANCED: {
        short: "Lepsza izolacyjność — wyższe koszty na etapach związanych z termiką.",
      },
      PASSIVE: {
        short: "Podwyższony standard (np. blisko energooszczędnego) — najwyższe stawki procentowe.",
      },
    },
  },
  area: {
    short:
      "Powierzchnia użytkowa domu — większość etapów liczymy jako koszt za m² tej powierzchni.",
    expanded:
      "Zakres 50–500 m². Używaj metrażu z projektu budowlanego, nie powierzchni działki.",
  },
  floors: {
    short:
      "Liczba kondygnacji nadziemnych — wpływa m.in. na zakres stropów i skalę robót konstrukcyjnych.",
    expanded:
      "Do 3 kondygnacji w tym narzędziu. Piwnica nie wchodzi w to pole.",
  },
  has_attic: {
    short:
      "Opcjonalnie — poddasze użytkowe zwiększa kubaturę i koszty związane z dachem oraz ociepleniem.",
    expanded:
      "Zaznacz, gdy poddasze będzie mieszkalne, nie tylko techniczne.",
  },
  garage_spots: {
    short:
      "Liczba miejsc garażowych w bryle. Przy 0 nie uwzględniamy etapu bramy garażowej w planie.",
    expanded:
      "Każde miejsce to orientacyjny koszt stały (segment, napęd) — nie przeliczamy go przez m² powierzchni użytkowej.",
  },
  balcony_count: {
    short:
      "Opcjonalnie — każdy balkon to osobna pozycja kosztowa (balkon, nie taras).",
    expanded: "0 jest w porządku. Koszt liczony za sztukę.",
  },
  window_count: {
    short:
      "Orientacyjna liczba okien — wpływa na koszt etapu stolarki (cena za sztukę według standardu budowy).",
    expanded:
      "Podaj szacunkową liczbę z projektu. Drzwi tarasowe liczysz osobno.",
  },
  exterior_door_count: {
    short:
      "Drzwi wejściowe i inne zewnętrzne (bez tarasowych) — koszt za sztukę w etapie stolarki.",
    expanded:
      "Minimum 1 (wejście główne). Standard budowy wpływa na cenę jednostkową.",
  },
  terrace_door_count: {
    short:
      "Opcjonalnie — drzwi tarasowe lub przesuwne; koszt za sztukę, podobnie jak okna.",
    expanded: "0, jeśli nie planujesz tarasu lub stolarki tarasowej.",
  },
  key_date: {
    short:
      "Planowana data rozpoczęcia budowy — dzień 0 na harmonogramie; kolejne daty etapów liczymy od niej.",
    expanded:
      "To orientacyjny plan, nie termin umowy z ekipą. Datę możesz później skorygować przy edycji i przeliczeniu planu.",
  },
  sewage_disposal: {
    short:
      "Sposób odprowadzenia ścieków z domu — wpływa na koszt przyłącza zewnętrznego.",
    expanded:
      "Kanalizacja gminna wymaga przyłącza do sieci. Szambo i oczyszczalnia to rozwiązania lokalne bez sieci — koszt inny niż przyłącze.",
    choices: {
      MUNICIPAL: {
        short: "Przyłącze do sieci kanalizacyjnej gminy.",
      },
      SEPTIC_TANK: {
        short: "Zbiornik bezodpływowy — typowe na działkach bez sieci.",
      },
      TREATMENT_PLANT: {
        short: "Przydomowa oczyszczalnia ścieków (POŚ).",
      },
    },
  },
  water_supply: {
    short:
      "Źródło wody dla budynku — wodociąg gminny, studnia lub brak zewnętrznego przyłącza.",
    expanded:
      "Przy studni nie liczymy etapu przyłącza wodociągowego. „Bez przyłącza” oznacza brak zewnętrznego wodociągu w kosztorysie.",
    choices: {
      MUNICIPAL: {
        short: "Przyłącze do sieci wodociągowej gminy.",
      },
      WELL: {
        short: "Studnia głębinowa lub kopana — osobny koszt wykonania.",
      },
      NONE: {
        short: "Brak zewnętrznego przyłącza wody w planie kosztów.",
      },
    },
  },
  utility_distance_band: {
    short:
      "Szacunkowa odległość od granicy działki do sieci — dotyczy wodociągu i/lub kanalizacji gminnej.",
    expanded:
      "Dłuższa trasa zwykle podnosi koszt robót ziemnych i materiałów. Pytanie pojawia się tylko przy wyborze sieci gminnej.",
    choices: {
      UP_TO_50M: {
        short: "Krótka trasa — typowo do ~50 m od sieci.",
      },
      UP_TO_100M: {
        short: "Średnia odległość — ok. 51–100 m.",
      },
      UP_TO_200M: {
        short: "Dłuższa trasa — ok. 101–200 m.",
      },
      OVER_200M: {
        short: "Bardzo długa trasa — powyżej 200 m.",
      },
    },
  },
} satisfies QuestionHintsMap;
