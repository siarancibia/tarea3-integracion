const sqlite3 = require('sqlite3').verbose();
const yaml = require('js-yaml');
const moment = require('moment');

const parsePassengersYAML = (db, yamlData) => {
  const passengers = yamlData.passengers;

  passengers.forEach(passenger => {
    const passengerID = passenger.passengerID;
    const firstName = passenger.firstName;
    const lastName = passenger.lastName;
    const birthDate = moment(passenger.birthDate, 'DD [de] MMMM [de] YYYY').format('YYYY-MM-DD');
    const gender = passenger.gender;
    const height_cm = parseFloat(passenger['height(cm)']);
    const weight_kg = parseFloat(passenger['weight(kg)']);
    const avatar = passenger.avatar;

    // Insert data into the 'passengers' table
    const insertQuery = `
      INSERT INTO passengers (passengerID, firstName, lastName, birthdate, gender, height, weight, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(insertQuery, [passengerID, firstName, lastName, birthDate, gender, height_cm, weight_kg, avatar], (err) => {
      if (err) {
        console.error('Error inserting data into passengers table:', err);
        console.error('Data:', { passengerID, firstName, lastName, birthDate, gender, height_cm, weight_kg, avatar });
      } else {
        console.log('Data inserted into passengers table:', firstName, lastName);
      }
    });
  });
};




module.exports = { parsePassengersYAML };