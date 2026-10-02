```
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { emptyAccount, Problem, type Account } from "./model.js";
function app() {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  // Acepta saltos reales y la secuencia literal \n de los paneles de hosting.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/\\n/g, "\n")
    .trim();
  if (!projectId || !clientEmail || !privateKey)
    throw new Problem(
      503,
      "Configura FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en el backend",
    );

  try {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  } catch {
    // No devolver la clave ni detalles internos de las credenciales al cliente.
    throw new Problem(503, "Configuración Firebase inválida. Revisa las variables del backend.");
  }
}
export async function verify(token: string): Promise<string> {
  const a = app();
  try {
    return (await getAuth(a).verifyIdToken(token, true)).uid;
  } catch {
    throw new Problem(401, "Sesión inválida. Vuelve a iniciar sesión.");
  }
}
export interface Store {
  read(uid: string): Promise<Account>;
  change<T>(uid: string, fn: (account: Account) => T): Promise<T>;
}
export const store: Store = {
  async read(uid) {
    const snapshot = await getFirestore(app())
      .collection("cineflowUsers")
      .doc(uid)
      .get();
    return snapshot.exists ? (snapshot.data() as Account) : emptyAccount();
  },
  async change(uid, fn) {
    const db = getFirestore(app());
    const ref = db.collection("cineflowUsers").doc(uid);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const state = snap.exists ? (snap.data() as Account) : emptyAccount();
      const result = fn(state);
      if (Buffer.byteLength(JSON.stringify(state)) > 400000)
        throw new Problem(
          409,
          "La cuenta alcanzó el límite de esta versión educativa",
        );
      tx.set(ref, state);
      return result;
    });
  },
};
```