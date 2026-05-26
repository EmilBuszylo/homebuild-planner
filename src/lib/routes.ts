/** Polish paths used in UI links; English segments exist via App Router + rewrites in next.config.ts */
export const routes = {
  login: "/logowanie",
  register: "/rejestracja",
  dashboard: "/panel",
  home: "/",
  questionnaire: "/ankieta",
  plan: (planId: string) => `/moj-plan/${planId}` as const,
} as const;
