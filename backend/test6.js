const axios = require('axios');
axios.get('http://localhost:5000/api/fees/transport-due-list') // wait, what is the port? Let's check from the frontend vite config or simply query the API locally
.then(res => { console.log(JSON.stringify(res.data, null, 2)); })
.catch(err => { console.error(err.message); });
