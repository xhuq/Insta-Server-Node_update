const express = require('express');
const multer = require('multer');
const path = require('path');
const { Worker } = require('worker_threads');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// In-memory storage for tasks
const tasks = new Map();

// Configure view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.post('/send', upload.single('message_file'), (req, res) => {
    try {
        const { username, password, choice, target, hater_name, delay } = req.body;
        const messages = fs.readFileSync(req.file.path, 'utf8').split('\n').filter(Boolean);

        // Generate a unique task ID
        const taskId = Math.random().toString(36).substr(2, 9);
        const stopFlag = { stopped: false };

        // Store the task
        tasks.set(taskId, { stopFlag });

        // Run in worker thread
        const worker = new Worker('./instagram-worker.js', {
            workerData: {
                username,
                password,
                choice,
                target,
                hater_name,
                delay: delayMs,
                messages,
                taskId,
                filePath: req.file.path,
                stopFlag
            }
        });

        worker.on('message', (message) => {
            console.log(message);
        });

        worker.on('error', (error) => {
            console.error('Worker error:', error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
            }
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
        });

        return res.send(`Messages are being sent. Task ID: ${taskId}`);

    } catch (error) {
        console.error(error);
        return res.status(500).send('Error processing request');
    }
});

app.post('/stop', (req, res) => {
    const taskId = req.body.taskId;
    if (tasks.has(taskId)) {
        tasks.get(taskId).stopFlag.stopped = true;
        tasks.delete(taskId);
        return res.send(`Task ${taskId} stopped successfully`);
    }
    return res.status(404).send('Task not found');
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
