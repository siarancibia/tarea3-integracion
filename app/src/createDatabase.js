const sqlite3 = require('sqlite3').verbose();
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');
const parseXml = require('xml2js').parseString;
const xml2js = require('xml2js');
const yaml = require('js-yaml');
const csv = require('csv-parser');
const { parsePassengersYAML } = require('./parser');

// Load credentials from the JSON file
const credentials = require('./bucket_key.json');

// Configure the Google Cloud Storage client
const storage = new Storage({
  projectId: credentials.project_id,
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
});

// Bucket name
const bucketName = '2023-2-tarea3'; // Change this to your bucket name

// SQLite database filename
const dbFileName = path.join(__dirname, 'src', 'database.sqlite');

// Create a connection to the SQLite database
const db = new sqlite3.Database(dbFileName);

// Function to create tables in the database
function createTables() {
  db.serialize(() => {
    // Aircrafts table
    db.run(`
      CREATE TABLE IF NOT EXISTS aircrafts (
        aircraftID TEXT PRIMARY KEY,
        name TEXT,
        aircraftType TEXT
      )
    `);

    // Airports table
    db.run(`
      CREATE TABLE IF NOT EXISTS airports (
        airportIATA TEXT PRIMARY KEY,
        name TEXT,
        city TEXT,
        country TEXT,
        lat REAL,
        lon REAL
      )
    `);

    // Flights table
    db.run(`
      CREATE TABLE IF NOT EXISTS flights (
        year INTEGER,
        month INTEGER,
        flightNumber TEXT PRIMARY KEY,
        originIATA TEXT,
        destinationIATA TEXT,
        airline TEXT,
        aircraftID TEXT
      )
    `);

    // Passengers table
    db.run(`
      CREATE TABLE IF NOT EXISTS passengers (
        passengerID INTEGER PRIMARY KEY,
        firstName TEXT,
        lastName TEXT,
        birthdate DATE,
        gender TEXT,
        height REAL,
        weight REAL,
        avatar TEXT
      )
    `);

    // Tickets table
    db.run(`
      CREATE TABLE IF NOT EXISTS tickets (
        ticketID INTEGER PRIMARY KEY,
        passengerID INTEGER NOT NULL,
        flightNumber TEXT NOT NULL,
        flightType TEXT,
        seatNumber TEXT
      )
    `);
  });
}

// Function to download data from the bucket and store it in the database
async function downloadAndSaveToDatabase() {
  try {
    createTables(); // Create tables before downloading data

    // List of blobs in the bucket
    const [files] = await storage.bucket(bucketName).getFiles();

    // Iterate over each file in the bucket
    for (const file of files) {
      const [data] = await file.download();
      const fileName = file.name;

      console.log('Processing file:', fileName);

      // Determine the file format based on its extension
      let parsedData;

      if (fileName.includes('aircrafts.xml')) {
        // Parse aircrafts XML using xml2js
        const xmlData = data.toString();
        
        // Parse aircrafts XML
        xml2js.parseString(xmlData, (err, result) => {
          if (err) {
            console.error('Error parsing XML file:', err);
            return;
          }
          
          //console.log(result.aircrafts);
          const aircrafts = result.aircrafts.row;
          //console.log(aircrafts);

          if (Array.isArray(aircrafts)) {
            aircrafts.forEach((aircraft) => {
              // Inserta el elemento aircraft en la base de datos
              const insertQuery = `
                INSERT INTO aircrafts (aircraftID, name, aircraftType)
                VALUES (?, ?, ?)
              `;
              //console.log([aircraft.aircraftID[0], aircraft.name[0], aircraft.aircraftType[0]]);
      
              db.run(
                insertQuery,
                [aircraft.aircraftID[0], aircraft.name[0], aircraft.aircraftType[0]],
                (err) => {
                  if (err) {
                    console.error('Error inserting data into aircrafts table:', err);
                    console.error('Data:', aircraft);
                  } else {
                    console.log('Data inserted into aircrafts table:', aircraft.aircraftID);
                  }
                }
              );
            });
          }
        });
      } else if (fileName.includes('airports.csv')) {
        // Use the parser on the entire CSV data
        data.toString().split('\n').forEach(line => {
          const [airportIATA, name, city, country, lat, lon] = line.split(',');

          // Insert data into the 'airports' table
          const insertQuery = `
          INSERT INTO airports (airportIATA, name, city, country, lat, lon)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
          db.run(insertQuery, [airportIATA, name, city, country, parseFloat(lat), parseFloat(lon)], (err) => {
            if (err) {
              console.error('Error inserting data into airports table:', err);
              console.error('Data:', { airportIATA, name, city, country, lat, lon });
            } else {
              console.log('Data inserted into airports table:', airportIATA);
            }
          });
          //console.log(line);
        });

      }  else if (fileName.includes('passengers.yaml')) {
        // Parse passengers YAML
          try {
            parsedData = yaml.load(data.toString());
            parsePassengersYAML(db, parsedData);
          } catch (err) {
            console.error('Error parsing YAML file:', err);
            return;
          }
      } else if (fileName.includes('tickets.csv')) {
        // Use the parser on the entire CSV data
      data.toString().split('\n').forEach(line => {
        const [ticketID, passengerID, flightNumber, flightType, seatNumber] = line.split(',');

        // Insert data into the 'tickets' table
        const insertQuery = `
          INSERT INTO tickets (ticketID, passengerID, flightNumber, flightType, seatNumber)
          VALUES (?, ?, ?, ?, ?)
        `;

        db.run(insertQuery, [parseInt(ticketID), parseInt(passengerID), flightNumber, flightType, seatNumber], (err) => {
          if (err) {
            console.error('Error inserting data into tickets table:', err);
            console.error('Data:', { ticketID, passengerID, flightNumber, flightType, seatNumber });
          } else {
            console.log('Data inserted into tickets table:', ticketID);
          }
        });
      });
        } else if (fileName.includes('flights')) {
          // Parse the JSON data
          const jsonData = JSON.parse(data.toString());
        
          // Extract year and month from the file path
          const [_, year, month] = fileName.match(/flights\/(\d{4})\/(\d{2})\/flight_data.json/);
        
          // Iterate over each flight entry in the JSON data
          jsonData.forEach((flight) => {
            flight.year = parseInt(year);
            flight.month = parseInt(month);
        
            // Insert data into the 'flights' table
            const insertQuery = `
              INSERT INTO flights (year, month, flightNumber, originIATA, destinationIATA, airline, aircraftID)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
        
            db.run(
              insertQuery,
              [flight.year, flight.month, flight.flightNumber, flight.originIATA, flight.destinationIATA, flight.airline, flight.aircraftID],
              (err) => {
                if (err) {
                  console.error('Error inserting data into flights table:', err);
                  console.error('Data:', flight);
                } else {
                  console.log('Data inserted into flights table:', flight.flightNumber);
                }
              }
            );
          });
        }
      }
    } catch (error) {
      console.error('Error downloading and saving data:', error);
    }
  }

  // Function to update the database
function updateDatabase() {
  try {
    // Remove the existing SQLite database file
    fs.unlinkSync(dbFileName);
    console.log('Existing database file deleted:', dbFileName);

    // Call the function to download data and save it to the database
    downloadAndSaveToDatabase();
  } catch (error) {
    console.error('Error updating database:', error);
  }
}
  
  // Call the main function to initiate the process
  downloadAndSaveToDatabase();

  module.exports = { updateDatabase };