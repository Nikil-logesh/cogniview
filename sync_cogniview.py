#!/usr/bin/env python3
"""
Cogniview Real-Time Data Sync
=============================
Monitors your Render-hosted Cogniview website and automatically 
updates local files when new logs/metrics are generated.

Requirements:
pip install requests websockets

Usage:
python sync_cogniview.py

Files Created:
- ./cogniview_realtime_data/live_logs.json
- ./cogniview_realtime_data/live_metrics.json  
- ./cogniview_realtime_data/LIVE_SUMMARY.txt
- ./cogniview_realtime_data/logs_readable.txt
"""

import requests
import json
import time
import os
from datetime import datetime, timedelta
import threading
import signal
import sys

class CogniviewRealTimeSync:
    def __init__(self, 
                 api_url="https://cogniview-store.onrender.com/api/elk-data",
                 local_directory="./cogniview_realtime_data",
                 sync_interval=30):
        self.api_url = api_url
        self.local_dir = local_directory
        self.sync_interval = sync_interval
        self.last_sync = None
        self.running = False
        self.total_synced = 0
        
        # Create local directory
        os.makedirs(local_directory, exist_ok=True)
        
        # File paths
        self.logs_file = os.path.join(local_directory, "live_logs.json")
        self.metrics_file = os.path.join(local_directory, "live_metrics.json")
        self.summary_file = os.path.join(local_directory, "LIVE_SUMMARY.txt")
        self.readable_logs = os.path.join(local_directory, "logs_readable.txt")
        self.status_file = os.path.join(local_directory, "sync_status.json")
        
        # Handle shutdown gracefully
        signal.signal(signal.SIGINT, self.signal_handler)
        
    def signal_handler(self, sig, frame):
        """Handle Ctrl+C gracefully"""
        print('\n🛑 Shutting down sync...')
        self.running = False
        self.save_status("STOPPED")
        sys.exit(0)
    
    def test_connection(self):
        """Test API connection before starting"""
        try:
            print("🔍 Testing connection to Cogniview API...")
            response = requests.get(f"{self.api_url}?type=health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Connection successful!")
                print(f"   ELK Status: {'✅ Healthy' if data.get('elk_healthy') else '❌ Down'}")
                print(f"   Real-time Ready: {'✅ Yes' if data.get('realtime_sync_ready') else '❌ No'}")
                return True
            else:
                print(f"❌ API returned status {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            print("   Make sure your Render website is deployed and running")
            return False
    
    def fetch_new_data(self):
        """Fetch new data from Render website"""
        try:
            # Get data from the last sync period
            if self.last_sync:
                # Calculate hours since last sync
                hours_diff = (datetime.now() - self.last_sync).total_seconds() / 3600
                days = max(0.1, min(hours_diff / 24, 7))  # Between 2.4 hours and 7 days
            else:
                days = 0.5  # First run - get last 12 hours
            
            # Use real-time API endpoint
            url = f"{self.api_url}?type=both&days={days}&limit=5000&realtime=true"
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                new_records = self.update_local_files(data)
                self.last_sync = datetime.now()
                self.total_synced += new_records
                
                status = "ACTIVE" if new_records > 0 else "LISTENING"
                print(f"🔄 {datetime.now().strftime('%H:%M:%S')} - {status}: +{new_records} records (Total: {self.total_synced})")
                
                self.save_status(status, new_records)
                return True
            else:
                print(f"❌ API Error: {response.status_code}")
                self.save_status("ERROR", 0, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Sync failed: {e}")
            self.save_status("ERROR", 0, str(e))
            return False
    
    def update_local_files(self, data):
        """Update local files with new data"""
        timestamp = datetime.now().isoformat()
        new_records = 0
        
        # Update logs file
        if 'data' in data and 'logs' in data['data']:
            logs = data['data']['logs']['items']
            new_records += len(logs)
            
            # Append to JSON file
            self.append_to_json_file(self.logs_file, {
                'sync_timestamp': timestamp,
                'count': len(logs),
                'logs': logs
            })
            
            # Create human-readable logs
            self.update_readable_logs(logs)
        
        # Update metrics file
        if 'data' in data and 'metrics' in data['data']:
            metrics = data['data']['metrics']['items']
            new_records += len(metrics)
            
            self.append_to_json_file(self.metrics_file, {
                'sync_timestamp': timestamp,
                'count': len(metrics),
                'metrics': metrics
            })
        
        # Update summary file
        self.update_summary_file(data, timestamp)
        
        return new_records
    
    def append_to_json_file(self, filepath, new_data):
        """Append new data to JSON file"""
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                try:
                    existing_data = json.load(f)
                    if not isinstance(existing_data, list):
                        existing_data = [existing_data]
                except:
                    existing_data = []
        else:
            existing_data = []
        
        existing_data.append(new_data)
        
        # Keep only last 1000 entries to prevent huge files
        if len(existing_data) > 1000:
            existing_data = existing_data[-1000:]
        
        with open(filepath, 'w') as f:
            json.dump(existing_data, f, indent=2)
    
    def update_readable_logs(self, logs):
        """Create human-readable logs file"""
        content = f"""
COGNIVIEW LIVE LOGS - REAL-TIME VIEW
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Source: {self.api_url}
Update Interval: {self.sync_interval} seconds
=========================================

RECENT ACTIVITY ({len(logs)} new events):
"""
        
        # Group by event type for summary
        event_counts = {}
        error_logs = []
        
        for log in logs:
            event_type = log.get('event_type', 'unknown')
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
            
            if log.get('level') == 'error':
                error_logs.append(log)
        
        # Add summary stats
        content += f"""
SUMMARY:
--------
Total Events: {len(logs)}
Error Events: {len(error_logs)}
Event Types: {dict(event_counts)}
Error Rate: {len(error_logs)/len(logs)*100:.1f}% if logs else 0%

LATEST EVENTS:
--------------
"""
        
        # Show recent events (last 20)
        for log in logs[-20:]:
            timestamp = log.get('timestamp', 'N/A')
            level = log.get('level', 'INFO').upper()
            event_name = log.get('event_name', 'unknown')
            user_id = log.get('user_id', 'anonymous')
            message = log.get('message', 'No message')[:150]
            
            content += f"""
[{timestamp}] {level}
Event: {event_name}
User: {user_id}
Message: {message}
{'⚠️ ERROR DETECTED' if level == 'ERROR' else ''}
---
"""
        
        # Show errors if any
        if error_logs:
            content += f"""

🚨 ERROR DETAILS ({len(error_logs)} errors):
==========================================
"""
            for error in error_logs[-10:]:  # Last 10 errors
                content += f"""
Time: {error.get('timestamp')}
Event: {error.get('event_name')}
User: {error.get('user_id')}
Error: {error.get('message')}
---
"""
        
        content += f"""

FILE LOCATIONS:
===============
- Raw JSON: {self.logs_file}
- Metrics: {self.metrics_file}
- This file: {self.readable_logs}
- Status: {self.status_file}

NEXT UPDATE: {(datetime.now() + timedelta(seconds=self.sync_interval)).strftime('%H:%M:%S')}
LIVE STATUS: {"🟢 ACTIVE" if self.running else "🔴 STOPPED"}
"""
        
        with open(self.readable_logs, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def update_summary_file(self, data, timestamp):
        """Update the main summary file"""
        summary = data.get('summary', {})
        
        content = f"""
🌐 COGNIVIEW REAL-TIME DATA SYNC
================================
Last Updated: {timestamp}
Website: https://cogniview-store.onrender.com
Local Directory: {self.local_dir}
Sync Interval: {self.sync_interval} seconds
Total Records Synced: {self.total_synced}

📊 CURRENT STATUS:
- Total Records: {summary.get('total_records', 0)}
- Data Types: {', '.join(summary.get('data_types', []))}
- Real-time Mode: {"🟢 ENABLED" if data.get('realtime_mode') else "🔴 DISABLED"}
- Last Sync: {self.last_sync.strftime('%Y-%m-%d %H:%M:%S') if self.last_sync else 'Never'}

📁 FILES UPDATED:
- 📄 live_logs.json      → Raw log data (JSON format)
- 📊 live_metrics.json   → Raw metrics data (JSON format)  
- 📖 logs_readable.txt   → Human-readable log summary
- 📋 LIVE_SUMMARY.txt    → This summary file
- ⚙️ sync_status.json    → Technical sync status

🔄 AUTOMATIC UPDATES:
This system monitors your Render-hosted Cogniview website and 
automatically updates these local files when new logs/metrics 
are generated by user interactions.

🛠️ CONTROL:
- Stop sync: Press Ctrl+C in the terminal
- Restart: Run 'python sync_cogniview.py'
- Check status: Look at sync_status.json

📈 NEXT UPDATE: {(datetime.now() + timedelta(seconds=self.sync_interval)).strftime('%H:%M:%S')}
🟢 STATUS: {"RUNNING" if self.running else "STOPPED"}
"""
        
        with open(self.summary_file, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def save_status(self, status, new_records=0, error_message=None):
        """Save current sync status"""
        status_data = {
            "timestamp": datetime.now().isoformat(),
            "status": status,
            "last_sync": self.last_sync.isoformat() if self.last_sync else None,
            "sync_interval": self.sync_interval,
            "total_records_synced": self.total_synced,
            "new_records_this_sync": new_records,
            "api_url": self.api_url,
            "local_directory": self.local_dir,
            "running": self.running,
            "error": error_message
        }
        
        with open(self.status_file, 'w') as f:
            json.dump(status_data, f, indent=2)
    
    def start_continuous_sync(self):
        """Start continuous syncing"""
        print("🚀 COGNIVIEW REAL-TIME SYNC STARTING...")
        print("=" * 50)
        print(f"📂 Local Directory: {self.local_dir}")
        print(f"🔄 Sync Interval: {self.sync_interval} seconds")
        print(f"🌐 API Endpoint: {self.api_url}")
        print(f"📊 Data Types: Logs + Metrics")
        print(f"⏰ Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 50)
        
        # Test connection first
        if not self.test_connection():
            print("❌ Cannot connect to API. Check your Render deployment.")
            return
        
        print(f"✅ Connection successful! Starting real-time sync...")
        print(f"📁 Watch this folder: {os.path.abspath(self.local_dir)}")
        print(f"🛑 Press Ctrl+C to stop")
        print("-" * 50)
        
        self.running = True
        self.save_status("STARTING")
        
        try:
            while self.running:
                self.fetch_new_data()
                time.sleep(self.sync_interval)
        except KeyboardInterrupt:
            pass  # Handled by signal_handler
        except Exception as e:
            print(f"💥 Sync crashed: {e}")
            self.save_status("CRASHED", error_message=str(e))

if __name__ == "__main__":
    print("🌟 Cogniview Real-Time Data Sync Tool")
    print("   Automatically syncs data from your Render website to local files")
    print()
    
    # Configuration
    sync = CogniviewRealTimeSync(
        api_url="https://cogniview-store.onrender.com/api/elk-data",
        local_directory="./cogniview_realtime_data",
        sync_interval=30  # Update every 30 seconds
    )
    
    # Start syncing
    sync.start_continuous_sync()