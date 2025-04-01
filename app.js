const express = require('express');
const multer = require('multer');
const path = require('path');
const { Worker } = require('worker_threads');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

const tasks = new Map();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/send', upload.single('message_file'), (req, res) => {
    try {
        const { username, password, choice, target, hater_name, delay } = req.body;
        const messages = fs.readFileSync(req.file.path, 'utf8').split('\n').filter(Boolean);
        const parsedDelay = parseInt(delay, 10); // Keep as seconds

        const taskId = Math.random().toString(36).substr(2, 9);
        
        const worker = new Worker('./instagram-worker.js', {
            workerData: {
                username,
                password,
                choice,
                target,
                hater_name,
                delay: parsedDelay,
                messages,
                taskId,
                filePath: req.file.path
            }
        });

        tasks.set(taskId, { worker, filePath: req.file.path });

        worker.on('message', (message) => {
            console.log(message);
        });

        worker.on('error', (error) => {
            console.error('Worker error:', error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) console.error(`Worker stopped with exit code ${code}`);
            if (tasks.has(taskId)) {
                fs.unlinkSync(req.file.path);
                tasks.delete(taskId);
            }
        });

        res.send(`
            <script>
                alert('Task started! ID: ${taskId}');
                window.location = '/';
            </script>
        `);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error: ' + error.message);
    }
});

// Keep the /stop route same as previous version

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
