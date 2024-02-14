const Bull = require('bull');
const imageThumbnail = require('image-thumbnail');
const { getFileById } = require('../utils/files');

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  try {
    const { fileId, userId } = job.data;

    // Validate job data
    if (!fileId) {
      throw new Error('Missing fileId');
    }

    if (!userId) {
      throw new Error('Missing userId');
    }

    // Retrieve the file from DB
    const file = await getFileById(fileId, userId);

    if (!file) {
      throw new Error('File not found');
    }

    // Generate thumbnails
    const sizes = [500, 250, 100];

    for (const size of sizes) {
      const thumbnailPath = `${file.localPath}_${size}`;
      await imageThumbnail({ uri: file.localPath, width: size, responseType: 'base64' })
        .then(thumbnail => {
        });
    }

    return { success: true };
  } catch (error) {
    console.error('Error in fileQueue process:', error);
    throw error;
  }
});

module.exports = fileQueue;

