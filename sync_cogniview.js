const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Cogniview Real-Time Sync (Node.js Version)
 * ==========================================
 * Monitors your Render-hosted website and updates local files
 * when new logs/metrics are generated.
 * 
 * Installation:
 * npm install axios
 * 
 * Usage:
 * node sync_cogniview.js
 */

class CogniviewRealTimeSync {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || 'https://cogniview-store.onrender.com/api/elk-data';
        this.localDir = options.localDir || './cogniview_realtime_data';
        this.syncInterval = options.syncInterval || 30000; // 30 seconds
        this.lastSync = null;
        this.running = false;
        this.totalSynced = 0;
        
        // File paths
        this.logsFile = path.join(this.localDir, 'live_logs.jsonl');
        this.metricsFile = path.join(this.localDir, 'live_metrics.jsonl');
        this.summaryFile = path.join(this.localDir, 'LIVE_SUMMARY.txt');
        this.statusFile = path.join(this.localDir, 'sync_status.json');
        
        // Ensure directory exists
        if (!fs.existsSync(this.localDir)) {
            fs.mkdirSync(this.localDir, { recursive: true });
        }
        
        // Handle graceful shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }
    
    async testConnection() {
        console.log('🔍 Testing connection to Cogniview API...');
        
        try {
            const response = await axios.get(`${this.apiUrl}?type=health`, {
                timeout: 10000
            });
            
            if (response.status === 200) {
                const data = response.data;
                console.log('✅ Connection successful!');
                console.log(`   ELK Status: ${data.elk_healthy ? '✅ Healthy' : '❌ Down'}`);
                console.log(`   Real-time Ready: ${data.realtime_sync_ready ? '✅ Yes' : '❌ No'}`);
                return true;
            }
        } catch (error) {
            console.log(`❌ Connection failed: ${error.message}`);
            console.log('   Make sure your Render website is deployed and running');
            return false;
        }
        
        return false;
    }
    
    async fetchAndUpdateFiles() {
        try {
            // Calculate time range
            let days = 0.5; // Default: 12 hours
            if (this.lastSync) {
                const hoursDiff = (Date.now() - this.lastSync.getTime()) / (1000 * 60 * 60);
                days = Math.max(0.1, Math.min(hoursDiff / 24, 7));
            }
            
            const url = `${this.apiUrl}?type=both&days=${days}&limit=5000&realtime=true`;
            const response = await axios.get(url, { timeout: 30000 });
            
            if (response.status === 200) {
                const data = response.data;
                const newRecords = await this.updateLocalFiles(data);
                
                this.lastSync = new Date();
                this.totalSynced += newRecords;
                
                const status = newRecords > 0 ? 'ACTIVE' : 'LISTENING';
                const timestamp = new Date().toLocaleTimeString();
                
                console.log(`🔄 ${timestamp} - ${status}: +${newRecords} records (Total: ${this.totalSynced})`);
                
                await this.saveStatus(status, newRecords);
                return true;
            }
            
        } catch (error) {
            console.error(`❌ Sync failed: ${error.message}`);
            await this.saveStatus('ERROR', 0, error.message);
            return false;
        }
    }
    
    async updateLocalFiles(data) {
        const timestamp = new Date().toISOString();
        let newRecords = 0;
        
        // Update logs file (JSONL format - one JSON object per line)
        if (data.data && data.data.logs && data.data.logs.items.length > 0) {
            const logs = data.data.logs.items;
            newRecords += logs.length;
            
            const logEntries = logs.map(log => 
                JSON.stringify({
                    ...log,
                    sync_timestamp: timestamp,
                    data_type: 'log'
                })
            ).join('\n') + '\n';
            
            fs.appendFileSync(this.logsFile, logEntries);
        }
        
        // Update metrics file (JSONL format)
        if (data.data && data.data.metrics && data.data.metrics.items.length > 0) {
            const metrics = data.data.metrics.items;
            newRecords += metrics.length;
            
            const metricEntries = metrics.map(metric => 
                JSON.stringify({
                    ...metric,
                    sync_timestamp: timestamp,
                    data_type: 'metric'
                })
            ).join('\n') + '\n';
            
            fs.appendFileSync(this.metricsFile, metricEntries);
        }
        
        // Update summary
        await this.updateSummary(data, timestamp, newRecords);
        
        return newRecords;
    }
    
    async updateSummary(data, timestamp, newRecords) {
        const summary = data.summary || {};
        
        const content = `
🌐 COGNIVIEW REAL-TIME DATA SYNC (Node.js)
==========================================
Last Updated: ${timestamp}
Website: https://cogniview-store.onrender.com
Local Directory: ${path.resolve(this.localDir)}
Sync Interval: ${this.syncInterval / 1000} seconds
Total Records Synced: ${this.totalSynced}

📊 CURRENT STATUS:
- Total Records: ${summary.total_records || 0}
- Data Types: ${summary.data_types ? summary.data_types.join(', ') : 'None'}
- Real-time Mode: ${data.realtime_mode ? '🟢 ENABLED' : '🔴 DISABLED'}
- Last Sync: ${this.lastSync ? this.lastSync.toLocaleString() : 'Never'}
- New Records This Sync: ${newRecords}

📁 FILES UPDATED:
- 📄 live_logs.jsonl     → Log data (one JSON per line)
- 📊 live_metrics.jsonl  → Metrics data (one JSON per line)
- 📋 LIVE_SUMMARY.txt    → This summary file
- ⚙️ sync_status.json    → Technical sync status

📝 JSONL FORMAT:
JSONL (JSON Lines) format allows easy streaming and processing.
Each line is a complete JSON object, perfect for:
- Stream processing
- Incremental loading
- Data analysis tools
- Real-time monitoring

🔄 AUTOMATIC UPDATES:
This system monitors your Render-hosted Cogniview website and 
automatically appends new data to local files when user 
interactions generate logs/metrics.

🛠️ CONTROL:
- Stop sync: Press Ctrl+C
- Restart: Run 'node sync_cogniview.js'
- View status: Check sync_status.json

📈 NEXT UPDATE: ${new Date(Date.now() + this.syncInterval).toLocaleTimeString()}
🟢 STATUS: ${this.running ? 'RUNNING' : 'STOPPED'}

💡 TIPS:
- Use 'tail -f live_logs.jsonl' to watch real-time logs
- Load JSONL files into pandas: pd.read_json('file.jsonl', lines=True)
- Process with jq: cat live_logs.jsonl | jq '.event_name'
`;
        
        fs.writeFileSync(this.summaryFile, content);
    }
    
    async saveStatus(status, newRecords = 0, errorMessage = null) {
        const statusData = {
            timestamp: new Date().toISOString(),
            status: status,
            lastSync: this.lastSync ? this.lastSync.toISOString() : null,
            syncInterval: this.syncInterval,
            totalRecordsSynced: this.totalSynced,
            newRecordsThisSync: newRecords,
            apiUrl: this.apiUrl,
            localDirectory: this.localDir,
            running: this.running,
            error: errorMessage,
            nextSyncAt: new Date(Date.now() + this.syncInterval).toISOString()
        };
        
        fs.writeFileSync(this.statusFile, JSON.stringify(statusData, null, 2));
    }
    
    shutdown() {
        console.log('\n🛑 Shutting down sync...');
        this.running = false;
        this.saveStatus('STOPPED');
        console.log('✅ Sync stopped gracefully');
        process.exit(0);
    }
    
    async start() {
        console.log('🚀 COGNIVIEW REAL-TIME SYNC (Node.js) STARTING...');
        console.log('=' * 55);
        console.log(`📂 Local Directory: ${path.resolve(this.localDir)}`);
        console.log(`🔄 Sync Interval: ${this.syncInterval / 1000} seconds`);
        console.log(`🌐 API Endpoint: ${this.apiUrl}`);
        console.log(`📊 Data Types: Logs + Metrics`);
        console.log(`⏰ Started: ${new Date().toLocaleString()}`);
        console.log('=' * 55);
        
        // Test connection first
        if (!(await this.testConnection())) {
            console.log('❌ Cannot connect to API. Check your Render deployment.');
            return;
        }
        
        console.log('✅ Connection successful! Starting real-time sync...');
        console.log(`📁 Watch this folder: ${path.resolve(this.localDir)}`);
        console.log('🛑 Press Ctrl+C to stop');
        console.log('-' * 50);
        
        this.running = true;
        await this.saveStatus('STARTING');
        
        // Initial sync
        await this.fetchAndUpdateFiles();
        
        // Set up interval
        const interval = setInterval(async () => {
            if (this.running) {
                await this.fetchAndUpdateFiles();
            } else {
                clearInterval(interval);
            }
        }, this.syncInterval);
        
        // Keep process alive
        process.stdin.resume();
    }
}

// Start the sync
const sync = new CogniviewRealTimeSync({
    apiUrl: 'https://cogniview-store.onrender.com/api/elk-data',
    localDir: './cogniview_realtime_data',
    syncInterval: 30000 // 30 seconds
});

sync.start().catch(console.error);