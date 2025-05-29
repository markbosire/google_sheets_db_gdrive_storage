// ===== UPDATED FILE: ./services/googleServices.js =====

const { getSheetsClient, getDriveClient } = require('../config/googleApi');
const stream = require('stream');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;
const TODOS_SHEET = 'Todos';
const USERS_SHEET = 'Users';

// Helper functions for sheet operations
async function findRowIndexById(sheetName, id) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
  });
  
  const ids = response.data.values || [];
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 1;
  }
  return null;
}

function mapRowsToObjects(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || null;
    });
    return obj;
  });
}

function todoToRowArray(todo) {
  return [
    todo.id,
    todo.title,
    todo.description || '',
    todo.imageId || '',
    todo.imageLink || '',
    todo.createdAt,
    todo.updatedAt,
    todo.completed || 'FALSE',
    todo.userId // Add userId
  ];
}

function userToRowArray(user) {
  return [
    user.id,
    user.username,
    user.password, // Already hashed
    user.role,
    user.createdAt
  ];
}

// Core sheet operations
async function getAllTodosFromSheet() {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TODOS_SHEET}!A:I`, // Updated to include userId column
  });
  return mapRowsToObjects(response.data.values || []);
}

async function getTodosByUserFromSheet(userId) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TODOS_SHEET}!A:I`, // Updated to include column I
  });
  
  const allTodos = response.data.values || [];
  const userTodos = allTodos.filter((row, index) => {
    // Skip header row and check userId in column I (index 8)
    return index > 0 && row[8] === userId;
  });
  
  return mapRowsToObjects([allTodos[0], ...userTodos]); // Include headers
}

async function addTodoToSheet(todo) {
  const sheets = getSheetsClient();
  const row = todoToRowArray(todo);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: TODOS_SHEET,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [row] },
  });
}

async function updateTodoInSheet(id, todo) {
  const sheets = getSheetsClient();
  const rowIndex = await findRowIndexById(TODOS_SHEET, id);
  if (!rowIndex) throw new Error('Todo not found');

  const row = todoToRowArray(todo);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TODOS_SHEET}!A${rowIndex}:I${rowIndex}`, // Updated to include userId column
    valueInputOption: 'USER_ENTERED',
    resource: { values: [row] },
  });
}

async function deleteTodoFromSheet(id) {
  const sheets = getSheetsClient();
  const rowIndex = await findRowIndexById(TODOS_SHEET, id);
  if (!rowIndex) throw new Error('Todo not found');

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TODOS_SHEET}!A${rowIndex}:I${rowIndex}`, // Updated to include userId column
  });
}

// Drive operations
async function uploadImageToDrive(fileBuffer, originalname, mimetype) {
  const drive = getDriveClient();
  const uniqueName = `${Date.now()}-${originalname.replace(/\s+/g, '_')}`;
  
  const fileMetadata = {
    name: uniqueName,
    parents: [DRIVE_FOLDER_ID],
  };

  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileBuffer);

  const media = {
    mimeType: mimetype,
    body: bufferStream,
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink',
  });

  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return {
    id: response.data.id,
    name: response.data.name,
    link: `https://drive.google.com/uc?id=${response.data.id}`,
  };
}

async function deleteImageFromDrive(fileId) {
  if (!fileId) return;
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

// User sheet operations
async function getAllUsersFromSheet() {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${USERS_SHEET}!A:E`,
  });
  return mapRowsToObjects(response.data.values || []);
}

async function addUserToSheet(user) {
  const sheets = getSheetsClient();
  const row = userToRowArray(user);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: USERS_SHEET,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [row] },
  });
}

async function getUserByUsernameFromSheet(username) {
  const users = await getAllUsersFromSheet();
  return users.find(user => user.username === username);
}

module.exports = {
  getAllTodosFromSheet,
  getTodosByUserFromSheet,
  addTodoToSheet,
  updateTodoInSheet,
  deleteTodoFromSheet,
  getAllUsersFromSheet,
  addUserToSheet,
  getUserByUsernameFromSheet,
  uploadImageToDrive,
  deleteImageFromDrive
};