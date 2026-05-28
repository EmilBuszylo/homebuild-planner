---
change_id: user-model-sync
title: Model User w Prisma zsynchronizowany z Supabase Auth
status: implemented
created: 2026-05-26
updated: 2026-05-28
archived_at: null
---

## Notes

F-01b: model `User` w Prisma (PK = Supabase Auth UUID). Rejestracja w `src/app/(auth)/actions.ts` tworzy rekord po `signUp`. Dashboard i API używają `userId` z relacji do `User`. Defensywny `user.upsert` w `POST /api/plans`.

Migracja: `prisma/migrations/20260526074630_create_user_table/`.
