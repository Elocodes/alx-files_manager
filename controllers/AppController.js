const { RedisClient, DBClient } = require('../utils');

const AppController = {
  getStatus: (req, res) => {
    const redisStatus = RedisClient.isAlive();
    const dbStatus = DBClient.isAlive();

    res.status(200).json({ redis: redisStatus, db: dbStatus });
  },

  getStats: async (req, res) => {
    try {
      const numUsers = await DBClient.nbUsers();
      const numFiles = await DBClient.nbFiles();

      res.status(200).json({ users: numUsers, files: numFiles });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

module.exports = AppController;

