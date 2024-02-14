// __tests__/redisClient.test.js
const redisClient = require('../utils/redis');

test('Check if Redis is alive', async () => {
  const isAlive = await redisClient.isAlive();
  expect(isAlive).toBeTruthy();
});

test('Set and get value in Redis', async () => {
  const key = 'testKey';
  const value = 'testValue';

  await redisClient.set(key, value, 5);
  const retrievedValue = await redisClient.get(key);

  expect(retrievedValue).toEqual(value);
});

