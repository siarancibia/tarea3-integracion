import React, { useState, useEffect } from 'react';
import initSqlJs from 'sql.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css'; // Asegúrate de tener un archivo CSS para estilos
import databaseFile from './database.sqlite'; // Ruta al archivo database.sqlite
import { updateDatabase } from './createDatabase'

function App() {
  const [flights, setFlights] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [sortColumn, setSortColumn] = useState('Year');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    // Obtener la lista de vuelos al cargar el componente o al cambiar la página
    fetchFlights();
  }, [currentPage, sortColumn, sortOrder]);

  const fetchFlights = async () => {
    try {
      // Obtener el archivo database.sqlite directamente
      const response = await fetch(databaseFile);
      const databaseBuffer = await response.arrayBuffer();
      const SQL = await initSqlJs({ locateFile: (file) => `https://sql.js.org/dist/${file}` });
      const db = new SQL.Database(new Uint8Array(databaseBuffer));

      // Obtener el total de filas en la tabla
      const totalRowsQuery = 'SELECT COUNT(*) FROM flights';
      const totalRowsResult = db.exec(totalRowsQuery);
      const totalRows = totalRowsResult[0] ? totalRowsResult[0].values[0][0] : 0;

      // Calcular el total de páginas
      const calculatedTotalPages = Math.ceil(totalRows / pageSize);

      // Actualizar el estado del total de páginas si es diferente
      if (calculatedTotalPages !== totalPages) {
        setTotalPages(calculatedTotalPages);
      }

      // Calcular el índice de inicio para la paginación
      const startIndex = (currentPage - 1) * pageSize;

      // Ejecutar la consulta SQL para obtener los vuelos paginados y ordenados
      const query = `
      SELECT
        flights.year,
        flights.month,
        flights.flightNumber,
        flights.originIATA,
        originAirport.name AS originName,
        originAirport.city AS originCity,
        originAirport.country AS originCountry,
        flights.destinationIATA,
        destAirport.name AS destName,
        destAirport.city AS destCity,
        destAirport.country AS destCountry,
        flights.airline,
        flights.aircraftID,
        aircrafts.name AS aircraftName,
        COUNT(tickets.ticketID) AS passengerCount,
        AVG(CASE WHEN passengers.birthdate IS NOT NULL AND passengers.birthdate != 'Invalid date'
                THEN strftime('%Y', 'now') - strftime('%Y', passengers.birthdate) ELSE NULL END) AS averageAge,
        -- Calcular distancia recorrida entre los aeropuertos de origen y destino
        111.045 * DEGREES(ACOS(COS(RADIANS(originAirport.lat)) * COS(RADIANS(destAirport.lat))
        * COS(RADIANS(destAirport.lon) - RADIANS(originAirport.lon))
        + SIN(RADIANS(originAirport.lat)) * SIN(RADIANS(destAirport.lat)))) AS distance
      FROM flights
      JOIN airports AS originAirport ON flights.originIATA = originAirport.airportIATA
      JOIN airports AS destAirport ON flights.destinationIATA = destAirport.airportIATA
      LEFT JOIN tickets ON flights.flightNumber = tickets.flightNumber
      LEFT JOIN passengers ON tickets.passengerID = passengers.passengerID
      LEFT JOIN aircrafts ON flights.aircraftID = aircrafts.aircraftID
      GROUP BY flights.year, flights.month, flights.flightNumber
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ${pageSize} OFFSET ${startIndex}
    `;
      const result = db.exec(query);
      //console.log('Query Result:', result);
      const flightsData = result[0] ? result[0].values : [];
      //console.log('Flights Data:', flightsData);

      setFlights(flightsData);
    } catch (error) {
      console.error('Error fetching flights:', error);
    }
  };

  const handlePageChange = (newPage) => {
    // Asegurarse de que newPage esté dentro de los límites de la paginación
    const clampedPage = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(clampedPage);
  };

  const handleUpdateClick = async () => {
    try {
      // Llama a la función updateDatabase
      await updateDatabase();
      // Actualiza la lista de vuelos después de la actualización de la base de datos
      fetchFlights();
    } catch (error) {
      console.error('Error updating database:', error);
    }
  };


  const handleSortChange = (newSortColumn) => {
    // Definir una lista de columnas que no están directamente en la tabla flights
    const additionalColumns = [
      'originName', 'originCity', 'originCountry',
      'destName', 'destCity', 'destCountry',
      'aircraftID', 'passengerCount', 'averageAge', 'distance'
    ];
    // Si el mismo atributo se hace clic, cambiar el orden
    if (newSortColumn === sortColumn) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Si se hace clic en un nuevo atributo, establecerlo como columna de clasificación
      setSortColumn(newSortColumn);
      // Ordenar en orden ascendente por defecto
      setSortOrder('asc');

      // Si la nueva columna es una columna adicional, modificar la consulta para ordenar por esa columna
      if (additionalColumns.includes(newSortColumn)) {
        fetchFlights();
      }
    }
  };


  return (
    <div className="App">
      <div className="flight-list-container">
        <h1>Lista de Vuelos</h1>
        <table className="table table-striped">
          <thead>
            <tr>
              <th onClick={() => handleSortChange('flights.year')}>
                Year {sortColumn === 'flights.year' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('flights.month')}>
                Month {sortColumn === 'flights.month' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('flights.flightNumber')}>
                Flight Number {sortColumn === 'flights.flightNumber' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('flights.originIATA')}>
                Origin IATA {sortColumn === 'flights.originIATA' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('originName')}>
                Origin Name {sortColumn === 'originName' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('originCity')}>
                Origin City {sortColumn === 'originCity' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('originCountry')}>
                Origin Country {sortColumn === 'originCountry' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('flights.destinationIATA')}>
                Destination IATA {sortColumn === 'flights.destinationIATA' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('destName')}>
                Destination Name {sortColumn === 'destName' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('destCity')}>
                Destination City {sortColumn === 'destCity' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('destCountry')}>
                Destination Country {sortColumn === 'destCountry' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('flights.airline')}>
                Airline {sortColumn === 'airline' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('flights.aircraftID')}>
                Aircraft ID {sortColumn === 'aircraftID' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('aircraftName')}>
                Aircraft ID {sortColumn === 'aircraftName' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('passengerCount')}>
                Passenger Count {sortColumn === 'passengerCount' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('averageAge')}>
                Avg. Age {sortColumn === 'averageAge' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSortChange('distance')}>
                Distance (km) {sortColumn === 'distance' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {flights.map((flight, index) => (
              <tr key={index}>
                <td>{flight[0]}</td>
                <td>{flight[1]}</td>
                <td>{flight[2]}</td>
                <td>{flight[3]}</td>
                <td>{flight[4]}</td>
                <td>{flight[5]}</td>
                <td>{flight[6]}</td>
                <td>{flight[7]}</td>
                <td>{flight[8]}</td>
                <td>{flight[9]}</td>
                <td>{flight[10]}</td>
                <td>{flight[11]}</td>
                <td>{flight[12]}</td>
                <td>{flight[13]}</td>
                <td>{flight[14]}</td>
                <td>{flight[15] !== null ? flight[15].toFixed(2) : ''}</td>
                <td>{flight[16] !== null ? flight[16].toFixed(2) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
            Previous
          </button>
          <span>{`Page ${currentPage} of ${totalPages}`}</span>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            Next
          </button>
        </div>
      </div>
      <div className="update-button-container">
        <button onClick={handleUpdateClick}>Actualizar Datos</button>
      </div>
    </div>
  );
}

export default App;