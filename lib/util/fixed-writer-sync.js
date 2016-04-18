/* jslint node: true, esnext: true */
"use strict";


const BaseWriter = require('./base-writer-sync');
const fixedWidthString = require('fixed-width-string');


class FixedWriterSync extends BaseWriter {
  constructor(opts) {
    super(opts);

    if (!opts.format) {
      throw new Error("No format property defined");
    }

    // The fomat comming from the config has the following format
    // val = {
    //      "range":"3-4",
    //      "align": "right"
    //       }
    this.format = opts.format;
    // The fomat created will be in the form:
    // val = {
    //      "length": 2,
    //      "left_pad" : 3
    //      "align": "right"
    //       }

    this.pad = opts.pad || opts.pad || '.';
  }

  /**
   * Validate the configuration for this writer
   * @param model (object) The model
   * @param logger (object) The logger
   * @param config (object) The configuration to validate
   * @return isOK (number) If isOK greater than 0 than en error was detected
   */
  validate(model, logger, config) {
    let isOk = super.validate(model, logger, config);


    if (!config.format) {
      logger.error({
        "message": `The configuration for the '${config.type}' writer does not contain a 'format' property`
      });
      isOk++;
    } else {
      // check that there is a format for each field
      if (config.fields) {
        config.fields.forEach((fieldName) => {
          if (!config.format[fieldName]) {
            logger.error({
              "message": `For the '${config.type}' writer there is no format enry for the field '${fieldName}'`
            });
            isOk++;
          } else {
            // validate the configuration
            const fieldConfig = config.format[fieldName];
            if (fieldConfig.align) {
              if (fieldConfig.align !== "left" && fieldConfig.align !== "right") {
                logger.error({
                  "message": `The field configiration for the field '${fieldName}' have a "align" property <> 'left' or 'right'`
                });
                isOk++;
              }
              if (!fieldConfig.range) {
                logger.error({
                  "message": `The field configiration for the field '${fieldName}' does not have a "range" property`
                });
                isOk++;
              } else {
                if (!fieldConfig.range.match(/\d+\-\d+/)) {
                  logger.error({
                    "message": `The field configiration for the field '${fieldName}' has an invalid range value '${fieldConfig.range}'`
                  });
                  isOk++;
                }
              }

            } else {
              // default is left aligned
              fieldConfig.align = "left";
            }
          }
        });
      }
    }

    if (isOk === 0) {
      isOk = this._buildFormat(logger);
    }

    return isOk;
  }


  /**
   * if the format definition contains gaps these will be defined and filled with spaces
   */
  _buildFormat(logger) {
    const self = this;
    let isOk = 0;

    let lastValue = 0;
    this.fields.forEach(fieldName => {
      const rangeStr = this.format[fieldName].range;
      const rangeArray = rangeStr.split("-");
      const start = Number(rangeArray[0]);
      const end = Number(rangeArray[1]);
      let leng = end - start + 1;

      if (lastValue >= start) {
        logger.error({
          "message": `For the field '${fieldName}' is the last end value '${lastValue}' => the start value '${start}'`
        });
        isOk++;
      } else {
        if (lastValue + 1 != start) {
          // we need to add elements to the length
          const padLength = start - (lastValue + 1);
          self.format[fieldName].left_pad = padLength;
        }
      }
      self.format[fieldName].length = leng;
      lastValue = end;
    });

    return isOk;
  }

  _compileRow(dataArray) {
    const self = this;

    let str = "";
    for (let i = 0; i < self.fields.length; i++) {
      const fieldName = self.fields[i];
      const fmt = self.format[fieldName];
      let val = dataArray[i];

      // does the value contains the quote character
      if (val.indexOf(self.quote) >= 0) {
        val = val.replace(self.quote, self.quote + self.quote);
      }

      // does the value contains the separator character
      if (val.indexOf(self.quote) >= 0) {
        val = self.quote + val + self.quote;
      }
      if (fmt.left_pad) {
        str += fixedWidthString("", fmt.left_pad, {
          padding: self.pad
        });
      }

      str += fixedWidthString(val, fmt.length, {
        align: fmt.align,
        padding: self.pad
      });

    }

    str += self.newline;

    return str;
  }
}



module.exports.fixedWriterSyncFactory = function (options) {
  return new FixedWriterSync(options);
};
module.exports.FixedWriterSync = FixedWriterSync;
