---
title: "M5L4 — Zadanie 1: wybór modelu dystrybucji artefaktów AI"
course: "10xdevs-3"
lesson: "m5l4"
task: 1
created: 2026-06-15
status: complete
---

# Zadanie 1 — tabela decyzyjna

## Odbiorca (pierwszy wiersz tabeli)

**Ja (solo developer)** — jedyny producent i konsument artefaktów AI w ramach kursu.

- **Repo źródła prawdy (producent):** nowe repo `ai-toolkit` — paczka npm ze skillami, regułami i instalatorem.
- **Repo konsumenta:** `home-build-planner` (`10-dev-app`) — aplikacja MVP, na GitHubie.
- **Narzędzia AI:** Cursor (primary); format `SKILL.md` ma być przenośny na Claude Code / Codex.
- **Zespół / org:** brak zewnętrznego zespołu — oba repozytoria pod tym samym kontem GitHub; nie ma odbiorców spoza organizacji ani wymogu dawkowania treści w czasie.

## Wybrany model

**Model 1: GitHub Packages**

## Uzasadnienie (2–3 zdania)

Oba repozytoria trzymam na GitHubie, więc GitHub Packages daje najniższy próg wejścia: jedno pole `publishConfig` w paczce, publikacja z CI na merge, instalacja w `home-build-planner` jak zwykła zależność npm. Nie potrzebuję AWS CodeArtifact (Model 2) — brak istniejącej infrastruktury AWS ani wymagań enterprise IAM. Nie buduję własnego API + CLI (Model 3) — jestem jedynym konsumentem, a materiały kursu i tak dostaję przez `10x-cli`; własny produkt dystrybucyjny byłby over-engineeringiem względem odbiorcy.

## Modele odrzucone — skrót

| Model | Dlaczego nie |
|---|---|
| **2 — AWS CodeArtifact** | Brak zespołu na AWS; koszt konfiguracji (Terraform, IAM, OIDC) nieuzasadniony dla solo + jeden konsument. |
| **3 — API + CLI** | Potrzebne przy wielu stackach, bramkowaniu dostępu i dawkowaniu treści — nie mój przypadek; `10x-cli` już pełni tę rolę po stronie kursu. |
| **Marketplace (Claude/Cursor)** | Vendor lock-in jednego narzędzia; lekcja rekomenduje przenośny `SKILL.md` + własny kanał dystrybucji. |

## Następny krok (Zadanie 3)

`10x get m5l4` → osobne repo `ai-toolkit` → `/10x-new` → `/10x-research` → `/10x-plan` → `/10x-implement`.

Zadanie 2 (shape / PRD / roadmap) **pominięte** — decyzja o modelu jest jednoznaczna.
