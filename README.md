# PULSO

Entrenamiento de gimnasio dinámico, nutrición con escáner (código de barras + foto IA), pasos en segundo plano e hidratación.
PWA mobile-first lista para empaquetar con Capacitor. 100 % gratis, sin límites de rutinas.

## Arrancar

```powershell
npm install
npm run dev        # http://localhost:5173  (modo invitado, todo local)
npm run build      # tsc --noEmit + vite build
npx tsc --noEmit
```

Sin variables de entorno funciona completo en **modo invitado** (datos en `localStorage`, offline).
La foto con IA y «Mejorar con IA» usan modo simulado/local hasta que haya `GEMINI_API_KEY` y `/api` esté servido (`npx vercel dev`).

## Las 4 formas de registrar en < 3 s

1. **Barra Mágica** (Hoy · Nutrición · Gimnasio): escribe o dicta (Web Speech API). Parser **local** por expresiones regulares
   (`src/lib/parser.ts`, ~65 alimentos en `foodsDb.ts`), instantáneo y offline. Entiende
   `200g de pechuga de pollo con 150g de arroz y un plátano`, `Press banca 4 series: 10x70kg, 8x80kg, 8x80kg`,
   `Sentadilla 3x10 100`, `500 ml de agua`, `10.000 pasos`, `30 min correr`.
   «Mejorar con IA» llama a `/api/quick-parse` (Gemini) solo si el parser local no basta (20/día).
2. **Menú radial `+`**: Escanear código · Foto al plato IA · Añadir ejercicio hoy · +250 ml agua · Pasos / Cardio.
3. **Steppers de gimnasio**: kg `-2.5 / -1 / +1 / +2.5`, reps ±1, copiar serie anterior, check gigante que dispara el descanso
   (60/90/120/180 s, círculo flotante, aviso sonoro + vibración).
4. **Lo de siempre**: carruseles de tus ejercicios y comidas más repetidos.

Gimnasio: +70 ejercicios organizados por músculo (7 grupos + propios, con tu peso, repeticiones y kcal de cada uno), SIN rutinas predefinidas: creas las tuyas, *ghost sets* (peso y reps de la última vez),
PR por **1RM estimado (Epley)** con confeti, calculadora de discos (barra de 20 kg) y mapa muscular de recuperación (48 h).
Calorías de pesas: `0,0175 × MET × kg × minutos` con intensidad sugerida por tu volumen/ritmo.

## Nube (opcional)

1. Crea un proyecto **nuevo** de Supabase y ejecuta `supabase/schema.sql` (RLS activado en todas las tablas).
   ⚠ No lo ejecutes en un proyecto que ya tenga `profiles`, `food_logs`, `water_logs` o `workout_sessions` de otra app
   (p. ej. PULSO): `create table if not exists` conservaría las columnas antiguas y PULSO fallaría.
2. Copia `.env.example` a `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.
3. Authentication → activa Email (magic link) y Google, y añade tu URL en *Redirect URLs*.
4. Vercel: mismas 3 variables (la clave de Gemini solo la lee `api/*.ts`).

## App móvil con Capacitor (pasos en segundo plano)

`src/services/stepCounter.ts` lee los pasos agregados del día desde **Health Connect (Android)** / **HealthKit (iOS)** con
`@capgo/capacitor-health`. El sistema operativo cuenta los pasos 24/7 con la pantalla apagada; la app **lee** ese total al abrirse,
al volver a primer plano y cada 5 min. En el navegador no hay acceso a sensores en segundo plano: se ofrecen los botones rápidos.

```powershell
npm run build
npx cap add android      # (iOS: npx cap add ios, solo desde un Mac)
npx cap sync
npx cap open android
```

- **Android**: min SDK 26. Health Connect viene en Android 14+; antes hay que instalar «Health Connect» de Play Store.
  El plugin ya declara `READ_STEPS`; Google exige además una política de privacidad (ver README de `@capgo/capacitor-health`).
- **iOS**: añade `NSHealthShareUsageDescription` (y `NSHealthUpdateUsageDescription`) al `Info.plist` y activa la capability *HealthKit*.

## Notas

- **Calorías de pasos**: `0,0175 × 3,0 MET × kg × (pasos/100)` (≈ 100 pasos/min). La longitud de zancada es el 41,5 % de la altura.
- **Cuota de IA**: usuarios con sesión → contador en Postgres vía `consume_ai(kind)` (`SECURITY DEFINER`: foto 3/día, texto 20/día; no se
  puede resetear desde el navegador). Invitados → contador local + límite por IP en memoria (mejor esfuerzo). El día del servidor es UTC.
- **Sincronización**: IDs de cliente, last-write-wins por `updated_at`, borrados con *tombstones*; las series se guardan en `workout_sets`.
