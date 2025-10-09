const mysql = require("mysql2");

const conexion = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "proyecto"
});

conexion.connect((err) => {
    if (err) {
        console.error("Error en la conexión a MySQL:", err);
        return;
    }
    console.log("Conectado a la base de datos MySQL");
});

module.exports = conexion;
