const { MongoClient } = require('mongodb');

class DBClient {
    constructor() {
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || 27017;
        const database = process.env.DB_DATABASE || 'files_manager';

        this.client = new MongoClient(`mongodb:${host}:${port}`, { useUnifiedTopology: true });
        this.db = null;

        this.client.connect()
            .then(() => {
                console.log('DB connected');
                this.db = this.client.db(database);
            })
            .catch((error) => {
                console.error(`Error connecting to DB: ${error}`);
            });
    }

    isAlive() {
        return this.client.isConnected();
    }

    async nbUsers() {
        const usersCollection = this.db.collection('users');
        const usersCount = await usersCollection.countDocuments();
        return usersCount;
    }

    async nbFiles() {
        const filesCollection = this.db.collection('files');
        const filesCount = await filesCollection.countDocuments();
        return filesCount;
    }
}

const dbClient = new DBClient();

module.exports = dbClient;
