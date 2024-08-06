import express from 'express';
import jwt from 'jsonwebtoken';
import { create } from "express-handlebars";
import * as path from "path";
import { fileURLToPath } from "url";
import { results as agents } from './data/agentes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const secretPassword = "secreto";

//instanciar express
const app = express();

//Configuración de handlebars
const hbs = create({
    partialsDir: [
        path.resolve(__dirname, "./views/partials/"),
    ],
});

app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");
app.set("views", path.resolve(__dirname, "./views"));

//levantar servidor
app.listen(3000, () => {
    console.log("Servidor escuchando en http://localhost:3000");
});

//Middleware generales
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));

//Función para verificar el token jwt
const verificarToken = (req, res, next) => {
    try {
        //obtener el token del header de autorización o de los query params
        const token = req.query.token || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "No autorizado: Debe proporcionar un token."
            });
        }
        //verificar el token
        const decoded = jwt.verify(token, secretPassword);
        req.agent = decoded;
        next();
    } catch (error) {
        //error para token inválido o expira
        res.status(401).json({
            message: "No autorizado: Token inválido o expirado."
        });
    }
};

// Rutas de vistas:
app.get(["/", "/home", "/inicio"], (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});


//Endpoints:
//Ruta de autenticación
app.post("/api/v1/login", (req, res) => {
    try {
        console.log("Datos recibidos:", req.body); 
        let { email, password } = req.body;
        //verificar que datos se ingresen
        if(!email || !password) {
            return res.status(400).json({
                message: "Debe proporcionar email y password para la autenticación."
            });
        }
        //buscar el agente en la lista existente
        const agent = agents.find(a => a.email === email && a.password === password);

        if(!agent) {
            return res.status(400).json({
                message: "Las credenciales ingresadas no son válidas"
            });
        }
        //generar el token con los datos del agente
        const token = jwt.sign({ email: agent.email }, secretPassword, { expiresIn: '2m' });

        //Devolver un HTML con email, guardar el token y disponibilizar hiperenlace 
        res.send(`
            <h1>Agente Autenticado</h1>
            <p>Email: ${agent.email}</p>
            <script>
                //guarda el token en sessionStorage
                sessionStorage.setItem('token', '${token}');
                //temporizador para eliminar el token después de 2 minutos
                setTimeout(() => {
                    sessionStorage.removeItem('token');
                }, 120000);
            </script>
            <!-- disponibiliza hiperenlace -->
            <a href="/mision-secreta?token=${token}">Ir a la misión secreta</a>
        `);

    } catch (error) {
        res.status(500).json({
            message: "Error en proceso de autenticación"
        });
    }
});

//Ruta restingida
app.get("/mision-secreta", verificarToken, (req, res) => {
    //si el agente esta autorizado, se muestra un mensaje de bienvenida
    res.send(`<h1>Bienvenido, agente ${req.agent.email}</h1>
            <p> Aquí podrás revisar todas tus misiones </p>`);
    //si no esta autorizado, verificarToken devolverá un error 401
});

//Manejo de rutas api no existentes
app.all("/api/*", (req, res) => {
    res.render("404")
});

//Manejo de rutas no existentes
app.get("/*", (req, res) => {
    res.render("404");
});