const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const uuid = require('uuid');
const cors = require('cors');
const unoconv = require('./node-unoconv');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const opciones = {
    port: 2003,
    server: '127.0.0.1'
};

let colaDeConversion = [];
let estaProcesando = false;

unoconv.listen(opciones);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'));
});

app.get('/presupuesto', (req, res) => {
    res.sendFile(path.join(__dirname, '/presupuesto.html'));
});

app.get('/apertura-proveedor', (req, res) => {
    res.sendFile(path.join(__dirname, '/apertura_proveedor.html'));
});

app.get('/contrato-viajes', (req, res) => {
    res.sendFile(path.join(__dirname, '/contratoviajes.html'));
});

app.get('/expedientes', (req, res) => {
    res.sendFile(path.join(__dirname, 'expedientes.html'));
});

app.post('/api/v2/:documento', upload.single('data'), (req, res) => {
    colaDeConversion.push({ req, res });
    procesarCola().catch(err => {
        console.error('Error procesando la cola:', err);
        res.status(500).send('Ocurrió un error al procesar su solicitud.');
    });
});

async function procesarCola() {
    if (estaProcesando || colaDeConversion.length === 0) {
        return;
    }

    estaProcesando = true;
    const { req, res } = colaDeConversion.shift();

    try {
        const documento = req.params.documento;
        if (!documento) {
            res.status(400).send('Se requiere el parámetro del documento');
            estaProcesando = false;
            procesarCola();
            return;
        }

        const id = uuid.v4();
        const filePath = path.join(__dirname, 'sources/templates', `${documento}.docx`);
        const outputDocxPath = path.join(__dirname, 'uploads', `${id}.docx`);
        const outputPdfPath = path.join(__dirname, 'uploads', `${id}.pdf`);

        fs.readFile(filePath, 'binary', (err, content) => {
            if (err) {
                res.status(500).send('Error leyendo el archivo de plantilla');
                estaProcesando = false;
                procesarCola();
                return;
            }

            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            const data = req.body;

            try {
                doc.render(data);
            } catch (error) {
                res.status(500).send('Error al renderizar la plantilla DOCX');
                estaProcesando = false;
                procesarCola();
                return;
            }

            const buf = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE',
            });

            fs.writeFile(outputDocxPath, buf, (err) => {
                if (err) {
                    res.status(500).send('Error al escribir el archivo DOCX');
                    estaProcesando = false;
                    procesarCola();
                    return;
                }

                unoconv.convert(outputDocxPath)
                    .then((result) => {
                        fs.writeFile(outputPdfPath, result, (err) => {
                            if (err) {
                                res.status(500).send('Error al escribir el archivo PDF');
                                estaProcesando = false;
                                procesarCola();
                                return;
                            }
                            res.download(outputPdfPath, `${documento}.pdf`, (err) => {
                                if (err) {
                                    console.error('Error al enviar el archivo:', err);
                                }

                                // Limpiar archivos
                                fs.unlink(outputDocxPath, (err) => {
                                    if (err) {
                                        console.error('Error al eliminar el archivo DOCX:', err);
                                    }
                                });

                                fs.unlink(outputPdfPath, (err) => {
                                    if (err) {
                                        console.error('Error al eliminar el archivo PDF:', err);
                                    }
                                });

                                estaProcesando = false;
                                procesarCola().catch(err => {
                                    console.error('Error procesando la cola:', err);
                                });
                            });
                        });
                    })
                    .catch((err) => {
                        console.error('Error convirtiendo DOCX a PDF:', err);
                        res.status(500).send('Error convirtiendo DOCX a PDF');
                        estaProcesando = false;
                        procesarCola();
                    });
            });
        });
    } catch (err) {
        console.error('Error inesperado:', err);
        res.status(500).send('Ocurrió un error inesperado');
        estaProcesando = false;
        procesarCola();
    }
}

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
    console.error('Manejador de errores global:', err);
    res.status(500).send('Error interno del servidor');
});

// Capturar rechazos de promesas no manejados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Rechazo no manejado en:', promise, 'razón:', reason);
});

// Capturar excepciones no controladas
process.on('uncaughtException', (err) => {
    console.error('Excepción no controlada lanzada:', err);
});

app.listen(3000, () => {
    console.log('Servidor iniciado en http://localhost:3000');
});
