const { IgApiClient } = require('instagram-private-api');
const { workerData } = require('worker_threads');

// Utility function to introduce a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const {
    username,
    password,
    choice,
    target,
    hater_name,
    delay: delayMs,
    messages,
    taskId,
    filePath,
    stopFlag
} = workerData;

(async () => {
    const client = new IgApiClient();
    client.state.generateDevice(username);

    // Add custom headers
    client.request.defaults.headers = {
        ...client.request.defaults.headers, // Keep existing headers
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
    };

    try {
        // Login to Instagram
        await client.account.login(username, password);
        console.log('Login successful');

        // Function to send a message
        const sendMessage = async (thread, message) => {
            const finalMessage = `${hater_name} : ${message}`;
            await thread.broadcastText(finalMessage);
            console.log(`Message sent: ${finalMessage}`);
            await delay(delayMs);
        };

        if (choice === 'inbox') {
            // Send to inbox
            const userId = await client.user.getIdByUsername(target);
            const thread = client.entity.directThread([userId.toString()]);

            while (!stopFlag.stopped) {
                for (const message of messages) {
                    if (stopFlag.stopped) break;
                    await sendMessage(thread, message);
                    await delay(delayMs);
                }
            }
        } else if (choice === 'group') {
            // Send to group
            const thread = client.entity.directThread(target);

            while (!stopFlag.stopped) {
                for (const message of messages) {
                    if (stopFlag.stopped) break;
                    await sendMessage(thread, message);
                    await delay(delayMs);
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Clean up uploaded file
        fs.unlinkSync(filePath);
    }
})();
