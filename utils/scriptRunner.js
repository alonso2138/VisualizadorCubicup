const { spawn } = require('child_process');

// Function to run Python scripts
function runScript(scriptPath, args, res) {
    const py = spawn('python3', [scriptPath, ...args]);
    let out = '', err = '';
    py.stdout.on('data', d => out += d);
    py.stderr.on('data', d => err += d);
    py.on('close', code => {
        if (code !== 0) return res.status(500).json({ success: false, error: err });
        try {
            const result = JSON.parse(out);
            return res.json({ success: true, ...result });
        } catch {
            return res.status(500).json({ success: false, error: 'JSON inválido del script' });
        }
    });
}

module.exports = {
    runScript
};
