# Firebase Setup

1. Crea un proyecto en Firebase.
2. Activa `Authentication`:
   - Google
   - Email/Password
3. Activa `Cloud Firestore` en modo de prueba para el primer arranque.
4. Copia la configuracion web del proyecto dentro de:
   - `js/firebase-config.js`
5. Publica reglas basadas en:
   - `firestore.rules`

Colecciones usadas por la app:

- `users`
- `usernames`
- `mission_ideas`
- `missions`
- `challenges`
- `active_missions`
- `completed_missions`
- `activities`

Notas:

- La app muestra `username`, no `email`.
- La unicidad de username se resuelve reservando un documento en `usernames/{usernameKey}`.
- Las paginas protegidas redirigen a `/login` si no hay sesion.
- Si hay sesion pero falta `username`, redirigen a `/setup-username`.
