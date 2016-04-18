/* jslint node: true, esnext: true */
"use strict";


const BaseWriter = require('./base-writer-sync');


class CsvWriterSync extends BaseWriter {
  constructor(opts) {
    super(opts);
    this.separator = opts.separator || opts.seperator || ',';
    this.quote = opts.quote || opts.quote || '"';
  }


  _compileRow(dataArray) {
    const self = this;

    let str = "";
    dataArray.forEach((val) => {
      // does the value contains the quote character
      if (val.indexOf(self.quote) >= 0) {
        val = val.replace(self.quote, self.quote + self.quote);
      }

      // does the value contains the separator character
      if (val.indexOf(self.quote) >= 0) {
        val = self.quote + val + self.quote;
      }

      if (str.length > 0) {
        str += self.separator;
      }

      str += val;
    });

    str += self.newline;

    return str;
  }
}



module.exports.csvWriterSyncFactory = function (options) {
  return new CsvWriterSync(options);
};
module.exports.CsvWriterSync = CsvWriterSync;
