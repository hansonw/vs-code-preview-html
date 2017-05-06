const {EventEmitter} = require('events');

class ConnectionWrapper {  
  constructor(connection /*: WebSocketTransport */) {
    this._connection = connection;
    this._nextId = 0;
    this._emitter = new EventEmitter();
    
    const observable = connection.onMessage();
    observable.subscribe({
      // Must use arrow function so that `this` is bound correctly.
      next: (value) => {
        const response = JSON.parse(value);
        this._emitter.emit(response.id, response);
      },
      error(err) {
        console.error('Error received in ConnectionWrapper', err);
      },
      complete() {
        console.error('ConnectionWrapper completed()?');
      },
    });
  }

  /**
   * This is for an RPC that expects a response.
   */
  makeRpc(method /*: string */, params /*: Object*/) /*: Promise */ {
    const id = (this._nextId++).toString(16);
    const promise = new Promise((resolve, reject) => {
      this._emitter.once(id, response => {
        if (response.error == null) {
          resolve(response.result);
        } else {
          reject(response.error);
        }
      });
    });

    const payload = {id, method, params};
    // Note that for the LSP, we would also need to send a header.
    this._connection.send(JSON.stringify(payload));
    return promise;
  }

  dispose() {
    this._emitter.removeAllListeners();
  }
}

exports.ConnectionWrapper = ConnectionWrapper;