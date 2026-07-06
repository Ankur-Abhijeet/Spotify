import * as fs from 'fs';
import * as path from 'path';

// Zero-dependency local env loader to support root workspace .env configuration
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(__dirname, '../../../../.env'),
  path.resolve(__dirname, '../../../.env'),
];
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const cleanLine = line.trim();
      if (cleanLine && !cleanLine.startsWith('#')) {
        const match = cleanLine.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let val = match[2].trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
    break;
  }
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JsonLogger } from './json-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(),
  });

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  const logger = new JsonLogger();
  logger.log(
    `Application is running on: http://localhost:${port}`,
    'Bootstrap',
  );
}
void bootstrap();
