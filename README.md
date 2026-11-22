# PULSO

Nutrición, escáner de comida, hidratación, actividad y gimnasio. PWA mobile-first, 100 % gratuita.

## Arrancar

```powershell
npm install
npm run dev        # http://localhost:5173  (modo invitado, todo local)
npm run build      # tsc --noEmit + vite build
```

Sin variables de entorno la app funciona completa en **modo invitado** (datos en `localStorage`).
El escáner de foto con IA usa un **modo simulado** hasta que haya `GEMINI_API_KEY` y `/api` esté servido
(`npx vercel dev`).

## Nube (opcional)

1. Crea un proyecto en Supabase y ejecuta `supabase/schema.sql` en el SQL Editor (RLS activado en todas las tablas).
2. Copia `.env.example` a `.env` y rellena `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `GEMINI_API_KEY`.
3. En Supabase → Authentication → activa Email (magic link) y Google, y añade tu URL en *Redirect URLs*.
4. Despliega en Vercel con las mismas 3 variables (la clave de Gemini solo la lee `api/analyze-food.ts`).

## Notas de diseño

- **Balance**: `restantes = objetivo − consumidas + quemadas` (pasos + cardio + pesas), tal y como pide el producto.
  El objetivo ya incluye el factor de actividad, así que parte del ejercicio habitual se cuenta dos veces; si prefieres
  un balance más conservador, quita `t.burned` de `budget` en `src/screens/Today.tsx`.
- **Límite de IA (3/día)**: usuarios con sesión → contador en Postgres vía `consume_ai_scan()` (`SECURITY DEFINER`, no
  se puede resetear desde el navegador). Invitados → contador local + límite por IP en memoria (mejor esfuerzo).
  El día del contador del servidor es UTC.
- **Sincronización**: IDs generados en el cliente, last-write-wins por `updated_at`, borrados propagados con
  *tombstones*; los datos de invitado se suben al iniciar sesión.
