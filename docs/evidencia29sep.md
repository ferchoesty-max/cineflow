# Evidencia: Etapa 4 - Autenticación con Firebase, Gestión de Sesión y Acceso de Usuarios

**Nombre:** Fernando Daniel Tolentino Uribe  
**NUA:** 395108  
**Universidad:** Universidad de Guanajuato (DICIS, Campus Irapuato-Salamanca)  
**Carrera:** Ingeniería en Sistemas Computacionales  
**Materia:** Cómputo en la Nube  
**Fecha:** 29 de Septiembre de 2026  

---

## 📁 `apps/web/src/firebase.ts`

```ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const key = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

export const auth = key
  ? getAuth(
      initializeApp({
        apiKey: key,
        authDomain,
        projectId,
        appId,
      }),
    )
  : null;
```

---

## 📁 `apps/web/src/Session.tsx`

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";
import type { Account, Profile } from "./types";
import { request } from "./api";

interface SessionValue {
  user: User | null;
  loading: boolean;
  account: Account | null;
  profile: Profile | null;
  error: string;
  refresh: () => Promise<void>;
  select: (id: string) => void;
  call: <T>(path: string, init?: RequestInit) => Promise<T>;
}

const Context = createContext<SessionValue | null>(null);

export function Session({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!auth);
  const [account, setAccount] = useState<Account | null>(null);
  const [active, setActive] = useState("main");
  const [error, setError] = useState("");
  const epoch = useRef(0);

  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const u = auth?.currentUser;
    if (!u) {
      throw new Error("Debes de iniciar sesión");
    }
    return request<T>(path, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${await u.getIdToken()}`,
      },
    });
  }

  async function refresh() {
    const u = auth?.currentUser;
    if (!u) {
      return;
    }
    const current = epoch.current;
    const data = await call<Account>("/me");
    if (auth?.currentUser?.uid === u.uid && epoch.current === current) {
      setAccount(data);
    }
  }

  useEffect(() => {
    if (!auth) {
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      const current = ++epoch.current;
      setUser(u);
      setAccount(null);
      setActive("main");
      setError("");
      setLoading(!!u);
      if (u) {
        u.getIdToken()
          .then((token) =>
            request<Account>("/me", {
              method: "PUT",
              body: "{}",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),
          )
          .then((data) => {
            if (current === epoch.current) {
              setAccount(data);
            }
          })
          .catch((e: Error) => {
            if (current === epoch.current) {
              setError(e.message);
            }
          })
          .finally(() => {
            if (current === epoch.current) {
              setLoading(false);
            }
          });
      }
    });
  }, []);

  const profile =
    account?.profiles.find((p) => p.id === active) ??
    account?.profiles[0] ??
    null;

  return (
    <Context.Provider
      value={{
        user,
        loading,
        account,
        profile,
        error,
        call,
        refresh,
        select: setActive,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useSession() {
  const value = useContext(Context);
  if (!value) {
    throw new Error("Debes de iniciar sesión");
  }
  return value;
}
```

---

## 📁 `apps/web/src/Access.tsx`

```tsx
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "./firebase";
import { useSession } from "./Session";

export function Access() {
  const {
    user,
    loading,
    account,
    error: sessionError,
    refresh,
    call,
  } = useSession();
  const [register, setRegister] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(action: () => Promise<unknown>, success = "") {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo completar");
    } finally {
      setBusy(false);
    }
  }
  if (!auth)
    return (
      <p className="error">
        Completa la configuración WEB de Firebase en apps/web/.env y reinicia
        Vite.
      </p>
    );
  if (loading) return <p role="status">Recuperando sesión…</p>;
  return (
    <section className="panel max-w-xl mx-auto">
      <h1>
        {user ? "Mi cuenta" : register ? "Crear cuenta" : "Iniciar sesión"}
      </h1>
      {user ? (
        <>
          <p>{user.email}</p>
          <p>Cuenta: {account?.name || "Pendiente de sincronizar"}</p>
          {sessionError && <p className="error">{sessionError}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(new FormData(e.currentTarget).get("name"));
              void run(async () => {
                await call("/me", {
                  method: "PATCH",
                  body: JSON.stringify({ name }),
                });
                await refresh();
              }, "Nombre actualizado");
            }}
          >
            <label>
              Nombre
              <input
                key={account?.name}
                name="name"
                defaultValue={account?.name}
                required
                maxLength={30}
              />
            </label>
            <button className="btn" disabled={busy}>
              Guardar nombre
            </button>
          </form>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              className="btn"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await call("/me", { method: "PUT", body: "{}" });
                  await refresh();
                }, "Cuenta sincronizada")
              }
            >
              Reintentar sincronización
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() =>
                void run(() => sendEmailVerification(user), "Revisa tu correo")
              }
            >
              Enviar verificación
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => void run(() => signOut(auth!))}
            >
              Cerrar sesión
            </button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const values = new FormData(e.currentTarget),
              email = String(values.get("email")),
              password = String(values.get("password"));
            void run(() =>
              register
                ? createUserWithEmailAndPassword(auth!, email, password)
                : signInWithEmailAndPassword(auth!, email, password),
            );
          }}
        >
          <label>
            Correo
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              minLength={6}
              autoComplete={register ? "new-password" : "current-password"}
              required
            />
          </label>
          <button className="btn primary" disabled={busy}>
            {register ? "Registrarme" : "Entrar"}
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => setRegister(!register)}
          >
            {register ? "Ya tengo cuenta" : "Crear cuenta"}
          </button>
          <button
            className="btn"
            type="button"
            disabled={busy}
            onClick={(e) => {
              const form = e.currentTarget.form;
              if (!form) return;
              const email = String(new FormData(form).get("email"));
              if (!email) {
                setMessage("Escribe tu correo primero");
                return;
              }
              void run(
                () => sendPasswordResetEmail(auth!, email),
                "Si la cuenta es válida, recibirás instrucciones.",
              );
            }}
          >
            Recuperar contraseña
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
```

---

## 📁 `apps/web/src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Catalog } from "./Catalog";
import { Detail } from "./Detail";
import { Session, useSession } from "./Session";
import { Access } from "./Access";

function Layout() {
  const { profile, user } = useSession();
  return (
    <>
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <header className="wrap border-b border-slate-700">
        <strong className="text-2xl text-rose-300">CINEFLOW</strong>
        <nav className="mt-4">
          <Link to="/">Catálogo</Link>
          <Link to="/acceso">Cuenta / Acceso</Link>
          <Link to="/creditos">Créditos</Link>
        </nav>
        <p className="muted">
          {user ? `Perfil: ${profile?.name || "sincronizando"}` : "Visitante"}
        </p>
      </header>
      <main id="contenido" className="wrap">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/titulo/:type/:id" element={<Detail />} />
          <Route path="/acceso" element={<Access />} />
          <Route
            path="/creditos"
            element={
              <section className="panel">
                <h1>Créditos</h1>
                <p>CineFlow es un proyecto educativo de catálogo y tráilers.</p>
                <div>
                  <p>Fernando Daniel Tolentino Uribe</p>
                  <p>Licenciatura en Ingeniería en Sistemas Computacionales</p>
                  <p>Cómputo en la Nube</p>
                  <p className="muted">395108</p>
                </div>
                <p className="mt-4">
                  This product uses the TMDB API but is not endorsed or
                  certified by TMDB.
                </p>
                <p>
                  <a href="https://www.themoviedb.org/">
                    Datos e imágenes: TMDB
                  </a>
                  . Reproducción: YouTube.
                </p>
                <p>
                  Antes de publicar, agrega aquí el logo oficial aprobado de
                  TMDB según su guía de atribución.
                </p>
              </section>
            }
          />
          <Route
            path="*"
            element={
              <p>
                Página no encontrada. <Link to="/">Ir al inicio</Link>
              </p>
            }
          />
        </Routes>
      </main>
      <footer className="wrap muted">
        CineFlow · Catálogo educativo y tráilers
      </footer>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Session>
        <Layout />
      </Session>
    </BrowserRouter>
  );
}
```

---

## 📁 `apps/web/.env`

```env
VITE_API_URL=http://localhost:4000/api
# Configuración WEB de Firebase (cineflow-ferch):
VITE_FIREBASE_API_KEY=AIzaSyCOkZQLEQFxjbBFq5orviwRF-T8Bibq9b8
VITE_FIREBASE_AUTH_DOMAIN=cineflow-ferch.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cineflow-ferch
VITE_FIREBASE_APP_ID=1:1043446107079:web:2aaff46a4c200dcc2b67e2
```

---

## 📁 `apps/api/.env`

```env
PORT=4000
CORS_ORIGIN=http://localhost:5173
CATALOG_MODE=demo
TMDB_READ_ACCESS_TOKEN=
FIREBASE_PROJECT_ID=cineflow-ferch
```

---

## 📸 Capturas de Evidencia

### Catálogo Inicial
![Catálogo CineFlow](evidencia_catalogo_29sep.png)

### Sección de Créditos Institucionales
![Créditos](evidencia_creditos_29sep.png)

### Formulario de Registro e Inicio de Sesión
![Acceso y Registro](evidencia_registro_form_29sep.png)

### Cuenta Creada y Autenticada en Firebase (cineflow-ferch)
![Cuenta Registrada](evidencia_cuenta_registrada_29sep.png)

---

## 🎬 Demostración en Video

El video de evidencia con el recorrido interactivo (catálogo, créditos con nombre y NUA, formulario de acceso y registro exitoso en `cineflow-ferch`) se encuentra disponible en:
- `docs/evidencia_video_29sep.mp4`
- `docs/evidencia_video_29sep.webm`
