const { v4: uuidv4 } = require('uuid');
const redisClient = require('../utils/redis');
const sha1 = require('sha1');
const { promisify } = require('util');

const getAsync = promisify(redisClient.get).bind(redisClient);
const setexAsync = promisify(redisClient.setex).bind(redisClient);

class AuthController {
  static async getConnect(req, res) {
    // Extract email and password from Basic auth header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [email, password] = credentials.split(':');

    // Check if user exists and password is correct
    
    const user = await getUserByEmailAndPassword(email, sha1(password));
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate a random token using uuidv4
    const token = uuidv4();

    // Create a key for Redis
    const redisKey = `auth_${token}`;

    // Store user ID in Redis with 24h expiration
    await setexAsync(redisKey, 24 * 60 * 60, user.id.toString());

    // Return the token
    return res.status(200).json({ token });
  }
  
  async function getDisconnect(req, res) {
    try {
      // Assuming you have the user ID available in req.user
      const userId = req.user;

      // Retrieve the user based on the ID
      const user = await getUserById(userId);

      // If user not found, return an error
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Delete the token in Redis
      await deleteToken(`auth_${req.token}`);

      // Respond with a status code 204 (No Content)
      res.status(204).send();
    } catch (error) {
      console.error('Error in getDisconnect:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } 
}

async function getUserByEmailAndPassword(email, passwordHash) {
  try {
    const user = await User.findOne({ email, password: passwordHash });
    return user || null;
  } catch (error) {
    console.error('Error querying user:', error);
    return null;
  }
}

module.exports = AuthController;

