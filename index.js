import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import 'dotenv/config';
import ricetteData from './data/ricette.js';


const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/visite", (req, res) => {
  res.render("visite.ejs");
});

app.get("/servizi", (req, res) => {
  res.render("servizi.ejs");
});

app.get('/ricette', (req, res) => {
    const categoriaSelezionata = req.query.categoria || 'tutte';
    let ricetteFiltrate = ricetteData;
    if (categoriaSelezionata !== 'tutte') {
        ricetteFiltrate = ricetteData.filter(r => r.categoria === categoriaSelezionata);
    }
    res.render('ricette.ejs', { 
        ricette: ricetteFiltrate, 
        categoriaAttiva: categoriaSelezionata 
    });
});
app.get('/ricette/:id', (req, res) => {
    const idRicetta = req.params.id;
    const ricettaTrovata = ricetteData.find(r => r.id === idRicetta);
    
    if (!ricettaTrovata) {
        return res.status(404).send("Ricetta non trovata");
    }
    
    res.render('ricetta-dettaglio', { ricetta: ricettaTrovata });
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

// EMAIL FORM
app.post("/contatti", async (req, res) => {
  const { nome, email, telefono, sede, messaggio } = req.body;

  // Configura il trasportatore email (es. Gmail o Aruba)
  let transporter = nodemailer.createTransport({
    service: "gmail", // oppure i parametri SMTP del tuo hosting (Aruba, ecc.)
    auth: {
      user: process.env.EMAIL_USER, // Prende l'email dal file .env
      pass: process.env.EMAIL_PASS, // Prende la password dal file .env
    },
  });

  try {
    await transporter.sendMail({
      from: email,
      to: "balladofyouth03@gmail.com", //MODIFICARE!!!!!!!!!!!!
      subject: `Nuova richiesta visita da ${nome} (${sede})`,
      text: `Hai ricevuto un nuovo messaggio:\n\nNome: ${nome}\nEmail: ${email}\nTelefono: ${telefono}\nSede scelta: ${sede}\n\nMessaggio:\n${messaggio}`,
    });

    // Reindirizza a una pagina di successo o mostra un alert
    res.redirect("/grazie.html");
  } catch (error) {
    console.error(error);
    res.status(500).send("Errore nell'invio del messaggio.");
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
