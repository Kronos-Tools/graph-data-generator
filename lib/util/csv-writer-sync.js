/* jslint node: true, esnext: true */
"use strict";


const fs = require('fs');
const path = require('path');
const gen = require('generate-object-property');

class CsvWriterSync {
  constructor(opts) {
    if (!opts) opts = {};

    if (!opts.target_dir) {
      const err = {
        "message": `No 'target_dir' defined`,
        "object": opts
      };
      console.error(err);
      throw new Error(err);
    }

    if (!opts.file_name) {
      const err = {
        "message": `No 'file_name' defined in export config.`,
        "object": opts
      };
      console.error(err);
      throw new Error(err);
    }

    this.file_name = opts.file_name;
    this.target_dir = opts.target_dir;
    this.fields = opts.fields;


    this.sendHeaders = opts.sendHeaders !== false;
    this.headers = opts.header || null;

    this.separator = opts.separator || opts.seperator || ',';
    this.newline = opts.newline || '\n';
    this._objRow = null;
    this._arrRow = null;
    this._first = true;
    this._destroyed = false;

  }

  open(fileName) {
    if (!fileName) {
      fileName = path.join(this.target_dir, this.file_name);
    }

    if (!fileName) {
      throw new Error("No file name given");
    }

    this.fd = fs.openSync(fileName, 'w');
  }

  close() {
    if (this.fd) {
      fs.closeSync(this.fd);
    }

    delete(this.fd);
  }

  _compile(headers) {
    const newline = this.newline;
    const sep = this.separator;
    let str = 'function toRow(obj) {\n';

    if (!headers.length) {
      str += '""';
    }

    headers = headers.map(function (prop, i) {
      str += 'var a' + i + ' = ' + prop + ' == null ? "" : ' + prop + '\n';
      return 'a' + i;
    });

    for (var i = 0; i < headers.length; i += 500) { // do not overflowi the callstack on lots of cols
      var part = headers.length < 500 ? headers : headers.slice(i, i + 500);
      str += i ? 'result += "' + sep + '" + ' : 'var result = ';

      /*jshint -W083 */
      part.forEach(function (prop, j) {
        str += (j ? '+"' + sep + '"+' : '') + '(/[' + sep + '\\r\\n"]/.test(' + prop + ') ? esc(' + prop +
          '+"") : ' + prop + ')';
      });
      str += '\n';
    }

    str += 'return result +' + JSON.stringify(newline) + '\n}';

    /*jslint evil: true */
    return new Function('esc', 'return ' + str)(esc);
  }

  /**
   * writes the chunk data or parts of it
   * @param chunk (object) The chunk data
   */
  write(data) {
    if (!this.fd) {
      throw (new Error(`The file '${this.file_name}' where not opened before writing`));
    }
    if (Array.isArray(data)) {
      this._writeArray(data);
    } else if (typeof data === 'object') {
      this._writeChunk(data);
    } else if (typeof data === 'string') {
      fs.writeSync(this.fd, data);
    } else {
      throw new Error(`Unsupported type of data`);
    }
  }

  _writeChunk(chunk) {
    // Write the row
    const r = [];
    const fields = this.fields;

    fields.forEach(fieldName => {
      r.push(chunk[fieldName]);
    });
    this._writeArray(r);
  }

  _writeArray(row) {
    const isArray = Array.isArray(row);

    if (!isArray && !this.headers) {
      this.headers = Object.keys(row);
    }

    if (this._first && this.headers) {
      this._first = false;

      const objProps = [];
      const arrProps = [];
      const heads = [];

      for (var i = 0; i < this.headers.length; i++) {
        arrProps.push('obj[' + i + ']');
        objProps.push(gen('obj', this.headers[i]));
      }

      this._objRow = this._compile(objProps);
      this._arrRow = this._compile(arrProps);

      if (this.sendHeaders) {
        fs.writeSync(this.fd, this._arrRow(this.headers));
      }
    }

    if (isArray) {
      if (!this.headers) {
        throw new Error('no headers specified');
      }
      fs.writeSync(this.fd, this._arrRow(row));
    } else {
      fs.writeSync(this.fd, this._objRow(row));
    }

  }
}



function esc(cell) {
  return '"' + cell.replace(/"/g, '""') + '"';
}


module.exports.csvWriterSyncFactory = function (options) {
  return new CsvWriterSync(options);
};
module.exports.CsvWriterSync = CsvWriterSync;
