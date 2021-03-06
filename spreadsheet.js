require('dotenv').config()

const fs = require('fs')
const readline = require('readline')
const { google } = require('googleapis')

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

function pull() {
  return new Promise((resolve, reject) => {
    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
      if (err) {
        reject(err)
        return
      }
      // Authorize a client with credentials, then call the Google Sheets API.
      authorize(JSON.parse(content))
        .then((auth) => resolve(auth))
    });
  })
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  return new Promise((resolve, reject) => {
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) {
        resolve(getNewToken(oAuth2Client, callback));
      }

      oAuth2Client.setCredentials(JSON.parse(token));
      resolve(oAuth2Client);
    });
  })
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function listResponse(auth) {
  return new Promise((resolve, reject) => {
    const sheet = google.sheets({version: 'v4', auth});
    sheet.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Form Responses 1!A2:E',
    }, (err, res) => {
      if(err) {
        console.log('The API returned an error: ' + err);
        reject(new Error(err))
        return
      }
  
      const rows = res.data.values;
      if(rows.length) {
        console.log('API returned data')
        resolve(rows)
        return
      } 
  
      console.log("no data found")
      reject(new Error("no data found"))
    })
  })
}

exports.sheet = {
  listResponse: listResponse,
  pull: pull,
}