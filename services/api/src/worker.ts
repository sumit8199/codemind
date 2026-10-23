import { getDatabase } from './db/index.js';
import { ReviewService } from './services/review.service.js';

async function runWorker() {
  console.log('✓ CodeMind Review Worker started and listening for jobs...');
  const db = await getDatabase();

  const pollInterval = 3000;
  while (true) {
    try {
      // Find queued reviews to process
      const defaultUser = await db.getUserById('11111111-1111-1111-1111-111111111111');
      if (defaultUser) {
        const queued = await db.getReviewsByUser(defaultUser.id, 1, 5, 'queued');
        for (const review of queued.reviews) {
          console.log(`[Worker] Processing queued review: ${review.id} (${review.title})`);
          await ReviewService.executeReviewJob(review.id);
        }
      }
    } catch (err) {
      console.error('[Worker] Error during job polling:', err);
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
}

runWorker().catch((err) => {
  console.error('Fatal worker error:', err);
  process.exit(1);
});
