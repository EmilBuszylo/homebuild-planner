export const SITE_DESCRIPTION =
  "Wypełnij ankietę o swoim domu i otrzymaj orientacyjny kosztorys etapów budowy oraz harmonogram prac — dla inwestorów budujących w trybie gospodarczym.";

export const PAGE_METADATA = {
  login: {
    title: "Logowanie",
    description:
      "Zaloguj się, aby zaplanować budowę domu i zobaczyć orientacyjny kosztorys oraz harmonogram.",
  },
  register: {
    title: "Rejestracja",
    description:
      "Załóż konto i wypełnij ankietę planistyczną — otrzymasz orientacyjny plan kosztów i prac.",
  },
  dashboard: {
    title: "Panel",
    description:
      "Podsumowanie Twojego planu budowy i szybki dostęp do ankiety oraz wyników.",
  },
  questionnaire: {
    title: "Ankieta",
    description:
      "Odpowiedz na pytania o dom — na końcu wygenerujesz orientacyjny kosztorys i harmonogram.",
    emptyKnowledgeBase:
      "Ankieta jest tymczasowo niedostępna — brak pytań w bazie danych. Jeśli jesteś administratorem, uruchom seed (pnpm db:seed) na środowisku produkcyjnym lub ponów deploy.",
  },
  plan: {
    title: "Twój plan budowy",
    description:
      "Orientacyjny kosztorys etapów i harmonogram prac na podstawie Twojej ankiety.",
  },
} as const;
