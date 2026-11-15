import { createApp } from './app.js';
import { config } from './config.js';
import { startSmsWorker } from './sms.js';
import { startReminderJob } from './reminders.js';

createApp().listen(config.port, () => console.log(`GroupSave API on http://localhost:${config.port}`));
startSmsWorker();
startReminderJob();
