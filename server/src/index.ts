import app from './app';
import { initCronJobs } from './utils/cronJobs';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initCronJobs();
});