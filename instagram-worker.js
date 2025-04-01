const { IgApiClient, IgCheckpointError } = require('instagram-private-api');
const { workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');

const delay = (s) => new Promise(resolve => setTimeout(resolve, s * 1000));

(async () => {
    const {
        username,
        password,
        choice,
        target,
        hater_name,
        delay: delaySeconds,
        messages,
        taskId,
        filePath
    } = workerData;

    const client = new IgApiClient();
    const sessionFile = path.join(__dirname, `${username}-session.json`);

    try {
        // Try to load existing session
        if (fs.existsSync(sessionFile)) {
            const savedSession = fs.readFileSync(sessionFile, 'utf8');
            await client.state.deserialize(savedSession);
            console.log(`[${taskId}] Session loaded from file`);
        } else {
            client.state.generateDevice(username);
        }

        client.request.end$.subscribe(async () => {
            const serialized = await client.state.serialize();
            fs.writeFileSync(sessionFile, serialized);
            console.log(`[${taskId}] Session state saved`);
        });

        await client.simulate.preLoginFlow();
        
        try {
            await client.account.login(username, password);
        } catch (error) {
            if (error instanceof IgCheckpointError) {
                console.log(`[${taskId}] Checkpoint required!`);
                await client.challenge.auto(true); // Resolve checkpoint
                console.log(`[${taskId}] Checkpoint resolved!`);
            } else {
                throw error;
            }
        }

        // Message sending logic
        const sendMessage = async (thread, message) => {
            const finalMessage = `${hater_name} : ${message}`;
            await thread.broadcastText(finalMessage);
            console.log(`[${taskId}] Sent: ${finalMessage}`);
            await delay(delaySeconds);
        };

        let thread;
        if (choice === 'inbox') {
            const userId = await client.user.getIdByUsername(target);
            thread = client.entity.directThread([userId.toString()]);
        } else {
            thread = client.entity.directThread(target);
        }

        for (const message of messages) {
            await sendMessage(thread, message);
        }

    } catch (error) {
        console.error(`[${taskId}] Error:`, error);
    } finally {
        try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (cleanupError) {
            console.error(`[${taskId}] Cleanup error:`, cleanupError);
        }
        console.log(`[${taskId}] Task completed`);
    }
})();
