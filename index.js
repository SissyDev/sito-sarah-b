import "dotenv/config";
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import session from "express-session";
import ricetteInziali from "./data/ricette.js"; // Dati iniziali di fallback

const app = express();
const port = 3000;
const upload = multer({ dest: "uploads/" });

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Configurazione delle Sessioni
app.use(
  session({
    secret: process.env.SESSION_SECRET || "segreto_default",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }),
);

// --- CLOUDINARY CONFIG ---
cloudinary.config({
  cloud_name: "fdtju2nr",
  api_key: process.env.API_KEY_CLOUDINARY,
  api_secret: process.env.API_SECRET_CLOUDINARY,
});

// --- FUNZIONE DI UTILITÀ PER LE RICETTE (UNIFICATA) ---
const getRicette = () => {
  const filePath = path.join(process.cwd(), "ricette.json");
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error("Errore lettura ricette.json", e);
    }
  }
  // Se ricette.json non esiste, restituisce quelle di backup e crea il file
  saveRicette(ricetteInziali);
  return ricetteInziali;
};

const saveRicette = (ricette) => {
  const filePath = path.join(process.cwd(), "ricette.json");
  fs.writeFileSync(filePath, JSON.stringify(ricette, null, 2), "utf8");
};

// --- ROTTE PUBBLICHE DEL SITO ---

app.get("/", (req, res) => {
  const ricetteData = getRicette();
  res.render("index.ejs", { ricette: ricetteData });
});

app.get("/visite", (req, res) => {
  res.render("visite.ejs");
});

app.get("/servizi", (req, res) => {
  res.render("servizi.ejs");
});

app.get("/ricette", (req, res) => {
  const ricetteData = getRicette();
  const categoriaSelezionata = req.query.categoria || "tutte";
  let ricetteFiltrate = ricetteData;
  if (categoriaSelezionata !== "tutte") {
    ricetteFiltrate = ricetteData.filter(
      (r) => r.categoria === categoriaSelezionata,
    );
  }
  res.render("ricette.ejs", {
    ricette: ricetteFiltrate,
    categoriaAttiva: categoriaSelezionata,
  });
});

app.get("/ricette/:id", (req, res) => {
  const ricetteData = getRicette();
  const idRicetta = req.params.id;
  const ricettaTrovata = ricetteData.find((r) => r.id === idRicetta);

  if (!ricettaTrovata) {
    return res.status(404).send("Ricetta non trovata");
  }

  res.render("ricetta-dettaglio", { ricetta: ricettaTrovata });
});

app.get("/chi-sono", (req, res) => {
  res.render("chi-sono.ejs");
});

app.get("/contatti", (req, res) => {
  res.render("contatti.ejs");
});

app.get("/cookies", (req, res) => {
  res.render("cookies.ejs");
});

app.get("/privacy", (req, res) => {
  res.render("privacy.ejs");
});

app.get("/faq", (req, res) => {
  res.render("faq.ejs");
});

app.get("/api/aggiungi-ricetta", (req, res) => {
  res.render("aggiungi-ricetta.ejs");
});

// --- EMAIL FORM ---
app.post("/contatti", async (req, res) => {
  const { nome, email, telefono, sede, messaggio } = req.body;

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: email,
      to: "nutrizione@sarahbranchesi.com",
      subject: `Nuova richiesta visita da ${nome} (${sede})`,
      text: `Hai ricevuto un nuovo messaggio:\n\nNome: ${nome}\nEmail: ${email}\nTelefono: ${telefono}\nSede scelta: ${sede}\n\nMessaggio:\n${messaggio}`,
    });

    res.redirect("/grazie.html");
  } catch (error) {
    console.error(error);
    res.status(500).send("Errore nell'invio del messaggio.");
  }
});

// --- MIDDLEWARE DI PROTEZIONE ADMIN ---
function isAuthenticated(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect("/admin/login");
}

// --- ROTTE DI AUTENTICAZIONE ---

app.get("/admin/login", (req, res) => {
  res.render("login", { errore: null });
});

app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect("/admin/dashboard");
  } else {
    res.render("login", { errore: "Password errata!" });
  }
});

app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

// --- ROTTE DASHBOARD ADMIN (CRUD) ---

app.get("/admin/dashboard", isAuthenticated, (req, res) => {
  const ricette = getRicette();
  res.render("dashboard", { ricette, editRicetta: null });
});

// Aggiungi nuova ricetta (CORRETTO CLOUDINARY SENZA .v2)
app.post(
  "/admin/ricette/aggiungi",
  isAuthenticated,
  upload.single("immagineFile"),
  async (req, res) => {
    try {
      let imageUrl = "";
      if (req.file) {
        const uploadResult = await cloudinary.uploader.upload(
          req.file.path,
          {
            folder: "ricette",
            fetch_format: "auto",
            quality: "auto",
          },
        );
        fs.unlinkSync(req.file.path);
        imageUrl = uploadResult.secure_url;
      }

      const ingredientiArray = req.body.ingredienti
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const ricette = getRicette();
      const nuovaRicetta = {
        id: Date.now().toString(),
        titolo: req.body.titolo,
        categoria: req.body.categoria,
        immagine: imageUrl,
        descrizioneBreve: req.body.descrizioneBreve,
        ingredienti: ingredientiArray,
        preparazione: req.body.preparazione,
      };

      ricette.push(nuovaRicetta);
      saveRicette(ricette);

      res.redirect("/admin/dashboard");
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      console.error(error);
      res.status(500).send("Errore durante il salvataggio della ricetta.");
    }
  },
);

app.get("/admin/ricette/modifica/:id", isAuthenticated, (req, res) => {
  const ricette = getRicette();
  const editRicetta = ricette.find((r) => r.id === req.params.id);
  if (!editRicetta) return res.redirect("/admin/dashboard");

  res.render("dashboard", { ricette, editRicetta });
});

// Aggiorna ricetta (CORRETTO CLOUDINARY SENZA .v2)
app.post(
  "/admin/ricette/aggiorna/:id",
  isAuthenticated,
  upload.single("immagineFile"),
  async (req, res) => {
    try {
      const ricette = getRicette();
      const index = ricette.findIndex((r) => r.id === req.params.id);
      if (index === -1) return res.redirect("/admin/dashboard");

      let imageUrl = ricette[index].immagine;
      if (req.file) {
        const uploadResult = await cloudinary.uploader.upload(
          req.file.path,
          {
            folder: "ricette",
            fetch_format: "auto",
            quality: "auto",
          },
        );
        fs.unlinkSync(req.file.path);
        imageUrl = uploadResult.secure_url;
      }

      const ingredientiArray = req.body.ingredienti
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      ricette[index] = {
        id: req.params.id,
        titolo: req.body.titolo,
        categoria: req.body.categoria,
        immagine: imageUrl,
        descrizioneBreve: req.body.descrizioneBreve,
        ingredienti: ingredientiArray,
        preparazione: req.body.preparazione,
      };

      saveRicette(ricette);
      res.redirect("/admin/dashboard");
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      console.error(error);
      res.status(500).send("Errore durante l'aggiornamento.");
    }
  },
);

app.post("/admin/ricette/elimina/:id", isAuthenticated, (req, res) => {
  let ricette = getRicette();
  ricette = ricette.filter((r) => r.id !== req.params.id);
  saveRicette(ricette);
  res.redirect("/admin/dashboard");
});

app.listen(port, () => {
  console.log(`Server attivo su http://localhost:${port}`);
});