import { app } from './app.js';
import { config } from './config.js';
import { getDatabase } from './db/index.js';

async function bootstrap() {
  try {
    await getDatabase();
    app.listen(config.PORT, () => {
      console.log(`✓ CodeMind API running on http://localhost:${config.PORT}`);
    });
  } catch (err) {
    console.error('Fatal error during API bootstrap:', err);
    process.exit(1);
  }
}

bootstrap();
