import { chromium } from "/tmp/node_modules/playwright-core/index.mjs";
import fs from "fs";
import path from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const sa = JSON.parse(fs.readFileSync("/tmp/cineflow-ferch-serviceAccount.json", "utf8"));
const fbApp = initializeApp({
  credential: cert(sa),
  projectId: sa.project_id
}, "admin-verifier");
const db = getFirestore(fbApp);

const videoDir = "/tmp/video_rec_2oct";
if (fs.existsSync(videoDir)) {
  fs.rmSync(videoDir, { recursive: true, force: true });
}
fs.mkdirSync(videoDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true
});

const context = await browser.newContext({
  recordVideo: {
    dir: videoDir,
    size: { width: 1280, height: 720 }
  },
  viewport: { width: 1280, height: 720 }
});

const page = await context.newPage();
const docsDir = "/home/fernando/Documents/UniversidadMega/Materias/Computo_en_la_Nube/cineflow/docs";

console.log("1. Navegando al catálogo de CineFlow...");
await page.goto("http://localhost:5173/");
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(docsDir, "evidencia_catalogo_2oct.png") });

console.log("2. Navegando a Cuenta / Acceso...");
await page.click("text=Cuenta / Acceso");
await page.waitForTimeout(2000);

console.log("3. Mostrando formulario de registro...");
await page.click("text=Crear cuenta");
await page.waitForTimeout(1000);
const testEmail = `fernando.tolentino.oct2@ugto.mx`;
const testPass = "CineFlow2026!";
await page.fill("input[name=email]", testEmail);
await page.waitForTimeout(800);
await page.fill("input[name=password]", testPass);
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(docsDir, "evidencia_registro_form_2oct.png") });

console.log("4. Enviando registro a Firebase...");
await page.click("button:has-text('Registrarme')");

// If email was already registered, try logging in
try {
  await page.waitForSelector("text=Mi cuenta", { timeout: 8000 });
} catch (e) {
  console.log("El usuario ya existe, iniciando sesión...");
  await page.click("text=¿Ya tienes cuenta? Inicia sesión");
  await page.waitForTimeout(1000);
  await page.fill("input[name=email]", testEmail);
  await page.waitForTimeout(500);
  await page.fill("input[name=password]", testPass);
  await page.waitForTimeout(800);
  await page.click("button:has-text('Iniciar sesión')");
  await page.waitForSelector("text=Mi cuenta", { timeout: 10000 });
}

console.log("5. Usuario autenticado con éxito. Actualizando nombre...");
await page.waitForTimeout(2000);
await page.fill("input[name=name]", "Fernando Daniel Tolentino Uribe");
await page.waitForTimeout(1000);
await page.click("button:has-text('Guardar nombre')");
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(docsDir, "evidencia_cuenta_registrada_2oct.png") });

console.log("6. Navegando a la nueva sección de Perfiles...");
await page.click("text=Perfiles");
await page.waitForTimeout(3000);

console.log("7. Creando un nuevo perfil secundario (Familia Tolentino)...");
await page.fill("form.panel.mt-5 input[name=name]", "Familia Tolentino");
await page.waitForTimeout(1000);
await page.click("button:has-text('Crear Perfil')");
await page.waitForTimeout(3000);

console.log("8. Perfil secundario creado. Seleccionando perfil secundario...");
await page.click("button:has-text('Familia Tolentino')");
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(docsDir, "evidencia_perfiles_2oct.png") });

console.log("9. Volviendo al Catálogo con el nuevo perfil activo...");
await page.click("text=Catálogo");
await page.waitForTimeout(2500);

console.log("10. Mostrando sección de Créditos...");
await page.click("text=Créditos");
await page.waitForTimeout(2500);

await page.close();
await context.close();
await browser.close();

console.log("Grabación completada!");
