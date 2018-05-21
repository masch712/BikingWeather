import { putForecasts } from '../cron';

test('doesnt die', async () => {
  await putForecasts();
})