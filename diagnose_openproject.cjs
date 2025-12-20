const http = require('http');

console.log('Running Diagnostic: Checking OpenProject Server Connectivity...');

const options = {
    hostname: '192.168.0.200',
    port: 8085,
    path: '/api/v3',
    method: 'GET',
    timeout: 5000 // 5 seconds timeout
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    const headers = JSON.stringify(res.headers);
    console.log(`HEADERS: ${headers}`);

    if (res.statusCode === 401 || res.statusCode === 200) {
        console.log('SUCCESS: Server is reachable (401 is expected without auth).');
    } else {
        console.log('WARNING: Server responded with unexpected status.');
    }
});

req.on('error', (e) => {
    console.error(`ERROR: Problem with request: ${e.message}`);
    console.log('CONCLUSION: The OpenProject Server (192.168.0.200:8085) is UNREACHABLE from this machine.');
});

req.on('timeout', () => {
    req.destroy();
    console.log('ERROR: Request timed out after 5000ms.');
    console.log('CONCLUSION: The OpenProject Server is not responding.');
});

req.end();
