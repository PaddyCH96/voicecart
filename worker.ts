import { startQueueWorkers } from '@/lib/queue';

console.log('[worker] Starting queue workers...');

const { worker, retryWorker } = startQueueWorkers();

process.on('SIGTERM', async () => {
  console.log('[worker] Shutting down...');
  await worker.close();
  await retryWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[worker] Shutting down...');
  await worker.close();
  await retryWorker.close();
  process.exit(0);
});

console.log('[worker] Workers running. Press Ctrl+C to stop.');