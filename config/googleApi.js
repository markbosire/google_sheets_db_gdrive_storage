const { google } = require('googleapis');
require('dotenv').config();

let sheets;
let drive;

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive'
];

async function initializeGoogleApis() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: SCOPES,
    });

    const client = await auth.getClient();
    sheets = google.sheets({ version: 'v4', auth: client });
    drive = google.drive({ version: 'v3', auth: client });

    console.log('Google APIs initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Google APIs:', error);
    throw error;
  }
}

function getSheetsClient() {
  if (!sheets) throw new Error('Sheets client not initialized');
  return sheets;
}

function getDriveClient() {
  if (!drive) throw new Error('Drive client not initialized');
  return drive;
}

module.exports = {
  initializeGoogleApis,
  getSheetsClient,
  getDriveClient
};