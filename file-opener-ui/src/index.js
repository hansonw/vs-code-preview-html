import React from 'react';
import ReactDOM from 'react-dom';
import ConnectionDialog from './ConnectionDialog';
import ConnectionFailed from './ConnectionFailed';
import ConnectingSpinner from './ConnectingSpinner';
import FileSearch from './FileSearch';
import KeyboardInteractive from './KeyboardInteractive';
import './index.css';


const rootElement = document.getElementById('root');

function showConnectionDialog(ws: WebSocket) {
  function onConnect(host, privateKey, serverCommand) {
    const message = {
      command: 'connect',
      host,
      privateKey,
      serverCommand,
    };
    ws.send(JSON.stringify(message));
    showConnecting();
  }
  ReactDOM.render(<ConnectionDialog onConnect={onConnect} />, rootElement);
}

function showConnecting() {
  ReactDOM.render(<ConnectingSpinner />, rootElement);
}

let lastQuery = '';

function showFileSearch(ws: WebSocket, results: Array<string> = null) {
  const props = {
    query: lastQuery,
    results: results || [],
    doQuery(query: string) {
      lastQuery = query;
      ws.send(JSON.stringify({
        command: 'remote-file-search-query',
        query,
      }));
    },
    openFile(file: string) {
      ws.send(JSON.stringify({
        command: 'remote-file-search-open',
        file,
      }))
    },
  };
  ReactDOM.render(<FileSearch {...props} />, rootElement);
}

function main(webSocketPort: number) {
  const ws = new WebSocket(`ws://localhost:${webSocketPort}`);
  ws.onopen = function() {
    ws.onmessage = function(message) {
      const params = JSON.parse(message.data);
      const {command} = params;
      if (command === 'initialized.') {
        showConnectionDialog(ws);
      } else if (command === 'prompt') {
        ReactDOM.render(<KeyboardInteractive prompts={params.prompts} />, rootElement);
      } else if (command === 'remote-connection-established') {
        showFileSearch(ws);
      } else if (command === 'remote-connection-failed') {
        ReactDOM.render(<ConnectionFailed />, rootElement);
      } else if (command === 'remote-file-search-results') {
        const {query, results} = params;
        if (query === lastQuery) {
          showFileSearch(ws, results);
        }
      }
    };
    ws.send(JSON.stringify({command: 'initialized?'}));
  };
}

const WS_PORT = window.WS_PORT;
main(WS_PORT);
