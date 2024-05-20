const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const uuid = require('uuid')
const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates/presupuesto.html'));
});
app.post('/generate-pdf-budget', upload.single('data'), (req, res) => {
    var id = uuid.v4();
    const filePath = path.join(__dirname, 'sources/templates', 'budget.docx');
    const outputDocxPath = path.join(__dirname, 'uploads', `${id}.docx`);
    const outputPdfPath = path.join(__dirname, 'uploads', `${id}.pdf`);

    fs.readFile(filePath, 'binary', (err, content) => {
        if (err) {
            return res.status(500).send('Error reading template file');
        }

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        const data = JSON.parse(req.body.data); // Asegúrate de enviar los datos como JSON string

        try {
            doc.render(data);
        } catch (error) {
            return res.status(500).send('Error rendering DOCX template');
        }

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        fs.writeFile(outputDocxPath, buf, (err) => {
            if (err) {
                return res.status(500).send('Error writing DOCX file');
            }

            const pythonProcess = spawn('python', ['convert_to_pdf.py', outputDocxPath]);

            pythonProcess.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(data.toString());
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    return res.status(500).send('Error converting DOCX to PDF');
                }
                res.download(outputPdfPath, 'budget.pdf', (err) => {
                    if (err) {
                        console.error(err);
                    }
                    fs.unlink(outputDocxPath, () => {});
                    fs.unlink(outputPdfPath, () => {});
                    clearUploadsFolder(); // Limpiar la carpeta de subidas después de completar el proceso
                });
            });
        });
    });
});

function clearUploadsFolder() {
    const uploadsFolder = path.join(__dirname, 'uploads');

    fs.readdir(uploadsFolder, (err, files) => {
        if (err) {
            console.error('Error reading uploads folder:', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(uploadsFolder, file);

            fs.unlink(filePath, err => {
                if (err) {
                    console.error('Error deleting file:', err);
                } else {
                    console.log('Deleted file:', filePath);
                }
            });
        });
    });
}

// Ejecutar la función cada 2 minutos
setInterval(clearUploadsFolder, 120000);

// Ejecutar la función cada 2 minutos

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
