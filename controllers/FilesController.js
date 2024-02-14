const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const { getUserById, getParentById, createFile, createFolder } = require('../utils/files');
const Bull = require('bull');
const fileQueue = new Bull('fileQueue');

async function postFiles(req, res) {
  try {
    // Retrieve the user based on the token
    const userId = req.user;
    const user = await getUserById(userId);

    // If user not found, return an error
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Destructuring request body
    const { name, type, parentId, isPublic, data } = req.body;

    // If name is missing, return an error
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    // If type is missing or not part of the accepted types, return an error
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    // If data is missing and type is not a folder, return an error
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    // If parentId is set
    if (parentId) {
      // Retrieve the parent file based on parentId
      const parentFile = await getParentById(parentId);

      // If no file is present in DB for this parentId, return an error
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      // If the file present in DB for this parentId is not of type folder, return an error
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
      // If the type is image, add a job to the fileQueue for thumbnail generation
      if (file.type === 'image') {
        const jobData = { userId: req.user, fileId: file._id.toString() };
        await fileQueue.add(jobData);
      } 
    }

    // Create a unique filename using UUID
    const filename = uuidv4();

    // Determine the storage folder path
    const storageFolderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

    // Create the local path for storing the file
    const localPath = path.join(storageFolderPath, filename);

    // Create the file locally if type is file or image
    if (type === 'file' || type === 'image') {
      const fileContent = Buffer.from(data, 'base64');
      await fs.writeFile(localPath, fileContent);
    }

    // Create the file document in the collection
    const newFile = await (type === 'folder'
      ? createFolder(name, user._id, isPublic, parentId)
      : createFile(name, user._id, type, isPublic, parentId, localPath));

    return res.status(201).json(newFile);
  } catch (error) {
    console.error('Error in postFiles:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

const { getUserById, getFileById, getUserFilesWithPagination } = require('../utils/files');

async function getFileById(req, res) {
  try {
    // Retrieve the user based on the token
    const userId = req.user;
    const user = await getUserById(userId);

    // If user not found, return an error
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve the file based on the ID
    const fileId = req.params.id;
    const file = await getFileById(fileId);

    // If no file document linked to the user and the ID, return an error
    if (!file || String(file.userId) !== String(userId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(file);
  } catch (error) {
    console.error('Error in getFileById:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function getFiles(req, res) {
  try {
    // Retrieve the user based on the token
    const userId = req.user;
    const user = await getUserById(userId);

    // If user not found, return an error
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Destructuring query parameters
    const { parentId = '0', page = '0' } = req.query;

    // Retrieve the list of file documents with pagination
    const files = await getUserFilesWithPagination(userId, parentId, page);

    return res.json(files);
  } catch (error) {
    console.error('Error in getFiles:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

const { getUserById, getFileById, updateFileIsPublic } = require('../utils/files');

async function publishFile(req, res) {
  try {
    // Retrieve the user based on the token
    const userId = req.user;
    const user = await getUserById(userId);

    // If user not found, return an error
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve the file based on the ID
    const fileId = req.params.id;
    const file = await getFileById(fileId);

    // If no file document linked to the user and the ID, return an error
    if (!file || String(file.userId) !== String(userId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Update the value of isPublic to true
    await updateFileIsPublic(fileId, true);

    // Return the file document with a status code 200
    return res.json(file);
  } catch (error) {
    console.error('Error in publishFile:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function unpublishFile(req, res) {
  try {
    // Retrieve the user based on the token
    const userId = req.user;
    const user = await getUserById(userId);

    // If user not found, return an error
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve the file based on the ID
    const fileId = req.params.id;
    const file = await getFileById(fileId);

    // If no file document linked to the user and the ID, return an error
    if (!file || String(file.userId) !== String(userId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Update the value of isPublic to false
    await updateFileIsPublic(fileId, false);

    // Return the file document with a status code 200
    return res.json(file);
  } catch (error) {
    console.error('Error in unpublishFile:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

const mime = require('mime-types');
const { getUserById, getFileById, isFilePublic, getFileDataById } = require('../utils/files');

async function getFileData(req, res) {
  try {
    // Retrieve the file based on the ID
    const fileId = req.params.id;
    const file = await getFileById(fileId);

    // If no file document linked to the ID, return an error
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Check if the file is public or user is authenticated and the owner
    const isPublicFile = isFilePublic(file);
    const userId = req.user;
    const isAuthenticatedUser = userId && String(file.userId) === String(userId);

    if (!isPublicFile && !isAuthenticatedUser) {
      return res.status(404).json({ error: 'Not found' });
    }

    // If the type of the file document is a folder, return an error
    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    // Retrieve the file data
    const fileData = await getFileDataById(fileId);

    // If the file is not locally present, return an error
    if (!fileData) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // If the type of the file document is an image and size is specified in query parameter
    if (file.type === 'image' && req.query.size) {
      const size = parseInt(req.query.size, 10);

    if (![500, 250, 100].includes(size)) {
      return res.status(400).json({ error: 'Invalid size parameter' });
    }

    // Generate the path to the thumbnail based on the specified size
    const thumbnailPath = `${file.localPath}_${size}`;

    // If the local file doesn’t exist, return an error
    if (!await fileExists(thumbnailPath)) {
      return res.status(404).json({ error: 'Not found' });
    } 

    // Get the MIME-type based on the name of the file
    const mimeType = mime.lookup(file.name);

    // Return the content of the file with the correct MIME-type
    res.setHeader('Content-Type', mimeType);
    return res.send(fileData);
  } catch (error) {
    console.error('Error in getFileData:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { postFiles, getFileById, getFiles, publishFile, unpublishFile, getFileData };

