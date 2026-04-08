require('dotenv').config();
const App = require('./src/app');

const PORT = process.env.PORT || 3000;

const app = new App();
app.start(PORT);