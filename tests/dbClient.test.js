// __tests__/endpoint
const request = require('supertest');
const app = require('../server'); 

describe('API Endpoints', () => {
  test('GET /status', async () => {
    const response = await request(app).get('/status');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ redis: true, db: true });
  });
});

