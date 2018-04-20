const program = require('commander');
const inquirer = require('inquirer');
const request = require('request-promise-native');
const csv = require('csv');
const fs = require('fs-extra');
const cov = require('./covparser');
const graph = require('./graph');

// // Require logic.js file and extract controller functions using JS destructuring assignment
const qBuilder = require('./qBuilder');

program
  .version('0.0.1')
  .description('A simple Sustainability Query Program');

program
  .command('Echo <resource>')
  .alias('e')
  .description('Echoing the resource input')
  .action((resource) => {
    console.log(resource);
  });

program
  .command('query <resourceId>')
  .alias('q')
  .description('Query the specified resourceId.')
  .action((resource) => {
    qBuilder.getResource(resource);
  });

program
  .command('list [term]')
  .alias('l')
  .description('List all resources.')
  .action((term) => {
    Promise.all(qBuilder.listResources(term))
    .then( qBuilder.handleResponseList, qBuilder.handleError )
    .then( (value) => {
      console.log(value);
      return inquirer.prompt([{name:"one", type:"input", message:"How are you?\n"}]);
    })
    .then((value) => { console.log("That's good to hear!")});
  });

program
  .command('print-csv <id>')
  .alias('pcsv')
  .description('Parse a .csv file.')
  .action((id) =>{
      // This line opens the file as a readable stream
    // var readStream = fs.createReadStream(filepath);
    // readStream.on('open', () => {
    //   readStream
    //     .pipe(csv.parse())
    //     .pipe(csv.stringify())
    //     .pipe(process.stdout);
    // });
    qBuilder
      .getCSVData(id)
      .then( (readStream ) => {
        return (new Promise( (success,fail) => {
          readStream.on('error', (err) => {console.log(err)})
          .on('open', () => {
            readStream
              .pipe(
                csv.parse( (err, records) => {
                  success(records);
                })
              )
          })
          .on('close', () => {
            fs.remove('./tmp.csv');
          });
        }))
      })
      .then( (records) => {
          console.log (records)
        }
      );
  });

program
  .command('lookup <tag> [option1] [option2] [option3]')
  .alias('lup')
  .description('Try to find a data set with <tag> and data matching options.')
  .action( (tag, option1, option2, option3) => {
    var opts = [ option1, option2, option3 ];
    debugger;
    Promise.resolve({ tag: tag, opts: opts.filter((option) => {return !(option == undefined)})})
      .then((ctx) => {
        //debugger;
        return 
          qBuilder
            .getCSVData(ctx.tag)
            .then( (readStream) => { 
               ctx.readStream = readStream;
                //debugger;
                return ctx;
             });
      })
      .then( (ctx) => {
        return new Promise( (success,fail) => {
          ctx.readStream.on('error', (err) => {console.log(err)})
          .on('open', () => {
            ctx.readStream
              .pipe(
                csv.parse( (err, records) => {
                  //debugger;
                  ctx.records = records;
                  success(ctx);
                })
              )
          })
          .on('close', () => {
            fs.remove('./tmp.csv');
          });
        });
      })
      .then( (ctx) => {
        ctx.headers = ctx.records[0];  // grab column names
        ctx.headersToKeep = [];
        // debugger;
        ctx.headers.forEach( (header, index, opts) => {
          // debugger;
          if (ctx.opts.some( (element) => {return header.match( new RegExp('.*' + element + '.*', 'i'))})) { 
            ctx.headersToKeep.push(index);
          }
        });
        ctx.records.forEach( (row) => {
          console.log(row.reduce((total, element, index) => { 
            debugger;
            if (ctx.headersToKeep.some((value) => { return value == index})) {
              return total += ' ' + element;
            }
            else {
              return total;
            }
          }, ""));
        });
      });  
  })

program
  .command('lookup-new <tag> [option1] [option2] [option3]')
  .alias('lup-new')
  .description('Try to find a data set with <tag> and data matching options.')
  .action( (tag, option1, option2, option3) => {
    var opts = [ option1, option2, option3 ];
    Promise.resolve({ tag: tag, opts: opts.filter((option) => {return !(option == undefined)})})
      .then((ctx) => {
        //debugger;
        return qBuilder.getData(ctx.tag);
      })
      .then( schemaObjects => {
        schemaObjects = schemaObjects.filter( (so) => {return so != undefined});
        // schemaObjects = schemaObjects.slice(schemaObjects.length-8, schemaObjects.length);
        debugger;
        for (so of schemaObjects) {
          if (so != undefined) {
            console.log( so.name + ":\n" + so.schema.join(" | ") + "\n\n");
          }
        } 
        // var all = [];
        // for (so of schemaObjects) {
        //   if (so != undefined) {
        //     all = all.concat(so.schema)
        //   }
        // }
        var g = new graph.jGraph(0.7, 0.05, schemaObjects);
        console.log("**** CREATED GRAPH ***")
        var allClusters = g.getAllClusters();
        var totalScore = 0;
        var scores = allClusters.map( (clusters) => {
        var score = 0;
        for (var so of schemaObjects) {
          var consistent = true;
          var hitIndex = Array(clusters.length).fill(false);
          var index = - 1
          for (var header of so.schema) {
            var index = clusters.findIndex( (c) => {
            return c.indexOf(header) > -1;
            });
            if (hitIndex[index]) {
              consistent = false;
              break;
            } else {
              hitIndex[index] = true;
            }
          }
          if (consistent) {
            score += 1;
          }
          }
          totalScore += score;
          return score;
        })
        debugger;

        var totalScores = scores.map( (s) => { return s/totalScore})
        var highestScoringIndeces = [0];
        // var highestScore = { score: 0, index: 0};
        for (var i = 1; i < totalScores.length; i++) {
          if (totalScores[i] == totalScores[highestScoringIndeces[0]]) {
            highestScoringIndeces.push(i);
          } 
          if (totalScores[i] > totalScores[highestScoringIndeces[0]]) {
            highestScoringIndeces = [i];
          }
        }
        var clusterLengths = highestScoringIndeces.map( (index) => {
          return allClusters[index].length;
        });
        
        // favor more concise schemas
        var bestIndex = 0;
        for (var i = 0; i < clusterLengths.length; i++) {
          if (clusterLengths[i] < clusterLengths[bestIndex]) {
            bestIndex = i;
          }
        }

        var bestSchemaIndex = highestScoringIndeces[bestIndex];
        // var max = totalScores.returnduce((acc, score) => { return acc > score ? acc : score }, 0 );
        console.log("****BEST MATCH**** ");
        console.log("Score: " + totalScores[bestSchemaIndex]);
        fs.writeFile('mediated/' + tag + '.json', 
          JSON.stringify({ tag: tag, numberOfSets: schemaObjects.length, clusterCount: allClusters[bestSchemaIndex].length, clusters: allClusters[bestSchemaIndex], score: totalScores[bestSchemaIndex]}, 
            null, 
            '\t'
          )
        );
        return
      })
  })

program
  .command('vancouver <tag>')
  .alias('cov')
  .description('Lookup up Vancouver sources.')
  .action( (tag) => {
    cov.getCovSourcesByTag(tag).then( (srcs) => { 
      for (i = 0 ; i < srcs.length;  i++ ) {
        console.log(srcs[i])
       }
    });
  })

program.parse(process.argv);