

const mysql = require('mysql2');

const pool = mysql.createPool({
    host: '127.0.0.1',   // Use localhost or the IP address of your server
    user: 'root',        // Replace with your MySQL username
    password: '3503',    // Replace with your MySQL password
    database: 'audiobook', // Replace with your database name
    port: 3306           // Default MySQL port
});

module.exports = pool.promise();
