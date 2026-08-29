import request from 'supertest';
import { createApp } from '../src/app';

describe('GET /api/v1/health', () => {
  const app = createApp();

  it('devuelve estado ok con uptime y versión', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      estado: 'ok',
      version: expect.any(String)
    });
    expect(res.body.uptime).toEqual(expect.any(Number));
    expect(res.body.timestamp).toEqual(expect.any(String));
  });
});

describe('Rutas inexistentes', () => {
  const app = createApp();

  it('responde 404 con formato uniforme de error', async () => {
    const res = await request(app).get('/api/v1/no-existe');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toEqual(expect.any(String));
  });
});
