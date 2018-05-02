/*
  Schema parser for JSON, KML and CSV
*/

const path = require('path')
const fs = require('fs')
const csv = require('csv')
const xml = require('xml2js')

function parseSource(tag, filePath, source) {
  var extension = path.extname(filePath)
  switch (extension) {
    case ".json":
      return new Promise ( (success, fail ) => {
        var o = require(filePath);
        var obj = Array.isArray(o) ? o[0] : o;
          // if (Array.isArray(obj)) {
          //  console.log(obj[0].name + " | " + obj[0].type + "\n")
          //  testObj = 
          // } else {
          //  console.log(obj.name + " | " + obj.type + "\n")
          // }
        success({ name: tag, schema: Object.keys(obj.features[0].properties), filePath: filePath });
     })
      .catch((err) => {return undefined})
      break;
    case ".kml":
      return new Promise( (success, fail) => {
        fs.readFile(filePath, (err, data) => {
          xml.parseString(data, (err, result) => {
            debugger;
              var kmlSchema = result.kml.Document[0].Schema;
              if (kmlSchema) {
                var schema = kmlSchema[0].SimpleField.map((s) => {
                  return s.displayName[0];
                })
                success({ name: tag, schema: schema});
              } else if(result.kml.Document[0].Folder[0].Placemark != undefined) {
                success({ name: tag, schema: ["LOCATION"]});
              } 
          });
        });
      })
      .catch((err) => { return undefined})
      break;
    case ".csv":
      return new Promise( (success,fail) => {
        var readStream = fs.createReadStream(filePath);
        readStream
          .on('error', (err) => {console.log(err)})
          .on('open', () => {
            readStream.pipe(
                csv.parse( (err, records) => {
                  success(records);
                })
              )
          })
        })
        .then( (records) => {
          return { name: tag, schema: records[0], filePath: filePath};
        })
       .catch((err) => { return undefined})

        break;
      case ".kmz":
        //ignore files that are zipped
      break;
    default:
      console.log("Cannot recognize extension: " + extension + ". Skipping " + filePath);
  } 
}

module.exports = { 
  parseSource
}