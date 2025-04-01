const { IgApiClient, IgCheckpointError } = require('instagram-private-api');
const { workerData } = require('worker_threads');
const fs = require('fs');

const delay = (s) => new Promise(resolve => setTimeout(resolve, s * 1000)); // Convert seconds to ms here

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
    client.state.generateDevice(username);

    try {
        await client.simulate.preLoginFlow();
        const loggedInUser = await client.account.login(username, password);
        
        const sendMessage = async (thread, message) => {
            const finalMessage = `${hater_name} : ${message}`;
            await thread.broadcastText(finalMessage);
            console.log(`[${taskId}] Sent: ${finalMessage}`);
            await delay(delaySeconds);
        };

        if (choice === 'inbox') {
            const userId = await client.user.getIdByUsername(target);
            const thread = client.entity.directThread([userId.toString()]);

            for (const message of messages) {
                await sendMessage(thread, message);
            }
        } else if (choice === 'group') {
            const thread = client.entity.directThread(target);

            for (const message of messages) {
                await sendMessage(thread, message);
            }
        }

    } catch (error) {
        if (error instanceof IgCheckpointError) {
            console.error(`[${taskId}] Security checkpoint required! Verify login in Instagram app.`);
        } else {
            console.error(`[${taskId}] Error:`, error);
        }
    } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.log(`[${taskId}] Task completed`);
    }
})();
