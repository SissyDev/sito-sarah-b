import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer"
require('dotenv').config();

const app = express();			
const port = 3000;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));	
app.use(express.static('public'));	

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/cookies", (req, res) => {
  res.render("cookies.ejs");
});

app.get("/chi-sono", (req, res) => {
  res.render("chi-sono.ejs");
});

app.get("/contatti", (req, res) => {
  res.render("contatti.ejs");
});

app.get("/privacy", (req, res) => {
  res.render("privacy.ejs");
});

// EMAIL FORM
app.post('/contatti', async (req, res) => {
  const { nome, email, telefono, sede, messaggio } = req.body;

  // Configura il trasportatore email (es. Gmail o Aruba)
  let transporter = nodemailer.createTransport({
    service: 'gmail', // oppure i parametri SMTP del tuo hosting (Aruba, ecc.)
    auth: {
      user: 'silvia.galli36@gmail.com',
      pass: 'tua-password-per-le-app'
    }
  });

  try {
    await transporter.sendMail({
      from: email,
      to: 'balladofyouth03@gmail.com',        //MODIFICARE!!!!!!!!!!!!
      subject: `Nuova richiesta visita da ${nome} (${sede})`,
      text: `Hai ricevuto un nuovo messaggio:\n\nNome: ${nome}\nEmail: ${email}\nTelefono: ${telefono}\nSede scelta: ${sede}\n\nMessaggio:\n${messaggio}`
    });

    // Reindirizza a una pagina di successo o mostra un alert
    res.redirect('/grazie.html');
  } catch (error) {
    console.error(error);
    res.status(500).send("Errore nell'invio del messaggio.");
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
