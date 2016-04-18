/* jslint node: true, esnext: true */
"use strict";


const fs = require('fs');
const path = require('path');
const gen = require('generate-object-property');

class BaseWriterSync {
  constructor(opts) {
    if (!opts) opts = {};

    this.type = opts.type;
    this.file_name = opts.file_name;
    this.target_dir = opts.target_dir;
    this.fields = opts.fields;

    this.sendHeaders = opts.sendHeaders !== false;
    this.headers = opts.header || null;

    this.newline = opts.newline || '\n';
    this._first = true;
  }

  /**
   * Validate the configuration for this writer
   * @param model (object) The model
   * @param logger (object) The logger
   * @param config (object) The configuration to validate
   * @return isOK (number) If isOK greater than 0 than en error was detected
   */
  validate(model, logger, config) {
    let isOk = 0;

    if (!config.file_name) {
      logger.warn({
        "message": `The configuration for the '${config.type}' writer does not contain a 'file_name' property`
      });
    }

    if (!config.target_dir) {
      logger.warn({
        "message": `The configuration for the '${config.type}' writer does not contain a 'target_dir' property`
      });
    }

    if (!config.fields) {
      logger.error({
        "message": `The configuration for the '${config.type}' writer does not contain a 'fields' property`
      });
      isOk++;
    }

    return isOk;
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
      this._writeObject(data);
    } else if (typeof data === 'string') {
      fs.writeSync(this.fd, data);
    } else {
      throw new Error(`Unsupported type of data`);
    }
  }

  _writeObject(chunk) {
    // Write the row
    const r = [];
    const fields = this.fields;

    fields.forEach(fieldName => {
      r.push(chunk[fieldName]);
    });
    this._writeArray(r);
  }

  _writeArray(data) {
    this._prepareValues(data);

    const rowString = this._compileRow(data);

    if (this._first && this.headers) {
      this._first = false;

      if (this.sendHeaders) {
        const headerString = this._compileRow(this.headers);
        fs.writeSync(this.fd, headerString);
      }
    }

    fs.writeSync(this.fd, rowString);
  }

  _prepareValues(dataArray) {
    for (let i = 0; i < dataArray.length; i++) {
      if (!dataArray[i]) {
        dataArray[i] = "";
      }
    }
  }

  /**
   * Compiles the object or array to the row which should be written
   */
  _compileRow(dataArray) {
    throw 'Error, this method must be implemented';
  }

}


module.exports = BaseWriterSync;
