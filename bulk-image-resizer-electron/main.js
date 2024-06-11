const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');

const createServer = () => {
    const server = express();
    const port = 3000;

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, 'uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir);
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + path.extname(file.originalname));
        }
    });

    const fileFilter = (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images are allowed.'));
        }
    };

    const upload = multer({ 
        storage: storage,
        fileFilter: fileFilter
    });

    server.use(express.static('public'));
    server.use(express.json());

    const deleteFileWithRetry = (filePath, retries = 5) => {
        return new Promise((resolve, reject) => {
            const attemptDelete = (attempt) => {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        if (err.code === 'EPERM' && attempt < retries) {
                            setTimeout(() => attemptDelete(attempt + 1), 100);
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve();
                    }
                });
            };
            attemptDelete(0);
        });
    };

    server.post('/resize', upload.array('images'), async (req, res) => {
        const { width, height, cropOption, outputDir } = req.body;
        const files = req.files;

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const resizePromises = files.map(file => {
            const outputPath = path.join(outputDir, 'resized_' + file.originalname);
            let resizeOptions = {};

            if (width && height) {
                resizeOptions = { width: parseInt(width), height: parseInt(height), fit: cropOption };
            } else if (width) {
                resizeOptions = { width: parseInt(width), fit: cropOption };
            } else if (height) {
                resizeOptions = { height: parseInt(height), fit: cropOption };
            } else {
                resizeOptions = { fit: cropOption };
            }

            return sharp(file.path)
                .resize(resizeOptions)
                .toFile(outputPath)
                .then(() => deleteFileWithRetry(file.path))
                .then(() => outputPath)
                .catch(err => {
                    console.error(`Error processing file ${file.path}: `, err);
                    throw err;
                });
        });

        try {
            const resizedImages = await Promise.all(resizePromises);
            res.json({ resizedImages, outputDir });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error resizing images');
        }
    });

    server.use((err, req, res, next) => {
        if (err) {
            res.status(400).send(err.message);
        } else {
            next();
        }
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`Server running at http://localhost:${port}`);
    });
};

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1000,  // Increased width
        height: 800,  // Increased height
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    mainWindow.loadURL(`http://localhost:3000`);
};

app.whenReady().then(() => {
    createServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('select-output-directory', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result.filePaths[0];
});

ipcMain.handle('open-folder', async (event, path) => {
    shell.openPath(path);
});
