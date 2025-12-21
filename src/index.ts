// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/database';
import { initializePdfDirectory } from './utils/pathUtils';
import logger from './utils/logger';

const PORT: number = parseInt(process.env.PORT || '8000');

// Connect to MongoDB and start server
connectDB()
  .then(async () => {
    // Initialize PDF directory and list available PDFs
    await initializePdfDirectory();

    app.listen(PORT, () => {
      logger.info(`🚀 Backend server running on http://localhost:${PORT}`);
      logger.info(`✅ MongoDB connected successfully`);
      logger.info(`📚 API endpoints available at /api`);
    });
  })
  .catch((error) => {
    logger.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  });
