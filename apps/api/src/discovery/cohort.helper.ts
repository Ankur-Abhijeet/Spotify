import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CohortHelper {
  isDiscoveryActive(userId: string): boolean {
    if (!userId) return false;

    // Generate deterministic MD5 hash of userId
    const hash = crypto.createHash('md5').update(userId).digest('hex');

    // Convert first 4 characters to integer and modulo 100
    const intVal = parseInt(hash.substring(0, 4), 16);
    const bucket = intVal % 100;

    // 50% split: buckets 0-49 are Discovery Active, 50-99 are Control
    return bucket < 50;
  }
}
