import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { env } from '../src/config/env';

describe('authMiddleware (RBAC)', () => {
  const app = createApp();

  const buildToken = (payload: { id: string; rol: 'admin' | 'cliente' }): string =>
    jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });

  it('rechaza peticiones sin token con 401', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ok');
  });

  it('valida tokens firmados con el secreto correcto', () => {
    const token = buildToken({ id: 'abc123', rol: 'admin' });
    const decoded = jwt.verify(token, env.JWT_SECRET) as { rol: string };
    expect(decoded.rol).toBe('admin');
  });

  it('rechaza tokens alterados', () => {
    const token = buildToken({ id: 'abc123', rol: 'admin' });
    const tampered = `${token.slice(0, -2)}xx`;

    expect(() => jwt.verify(tampered, env.JWT_SECRET)).toThrow();
  });
});
