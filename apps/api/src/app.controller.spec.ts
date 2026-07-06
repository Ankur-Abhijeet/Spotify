import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('ok');
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('ready', () => {
    it('should return ready status', () => {
      const ready = appController.getReady();
      expect(ready.status).toBe('ok');
    });
  });
});
