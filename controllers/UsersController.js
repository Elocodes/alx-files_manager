const sha1 = require('sha1');
const { dbClient } = require('../utils/db');
const userQueue = require('../worker').userQueue;

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    // Check if email already exists
    const existingUser = await dbClient.db.collection('users').findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'Already exists' });
    }

    // Hash the password using SHA1
    const hashedPassword = sha1(password);

    // Create a new user in the database
    const newUser = {
      email,
      password: hashedPassword,
    };

    const result = await dbClient.db.collection('users').insertOne(newUser);

    // Return the new user with only email and id
    const { _id, email: newUserEmail } = result.ops[0];
    const newUserResponse = { id: _id, email: newUserEmail };

    return res.status(201).json(newUserResponse);
  }
}

module.exports = UsersController;
