const program = require('commander');
const inquirer = require('inquirer');
const request = require('request-promise-native');
const csv = require('csv');
const fs = require('fs-extra');
const cov = require('./covparser');
const graph = require('./graph');
const qBuilder = require('./qBuilder');

program
  .version('0.0.1')
  .description('Lexical Schema Matcher - Janik Andreas - CPSC 449 - 2018');

program
  .command('match <tag>')
  .alias('m')
  .description('Find resources within domain specified by <tag> from registered sources and produce a mediated schema.')
  .action( (tag) => {
    Promise.resolve({ tag: tag })
      .then((ctx) => {
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
        var g = new graph.jGraph(0.7, 0.05, schemaObjects);
        console.log("**** CREATED GRAPH ***")
        var allClusters = g.getAllClusters();
        var totalScore = 0;
        console.log(JSON.stringify(allClusters.map( c => { return c.length})))
        var scores = allClusters.map( (clusters) => {
        var score = 0;
        for (var so of schemaObjects) {
          var consistent = true;
          var hitIndex = Array(clusters.length).fill(false);
          for (var header of so.schema) {
            var index = clusters.findIndex( (c) => {
            return c.indexOf(header) > -1;
            });

            if (hitIndex[index]) {
              debugger;
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
        console.log(JSON.stringify(scores))
        var totalScores = scores.map( (s) => { return s/totalScore})
        var highestScoringIndeces = [0];
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
        var schemaHeaderSum = schemaObjects.reduce( (acc, so) => { return acc += so.schema.length }, 0)
        fs.writeFile('mediated/' + tag + '.json', 
          JSON.stringify({ 
            tag: tag, 
            numberOfSets: schemaObjects.length, 
            numberOfMedSchemas: allClusters.length,
            schemaHeaderSum: schemaHeaderSum,
            averageSchemaSize: schemaHeaderSum / schemaObjects.length,
            clusterCount: allClusters[bestSchemaIndex].length,
            score: totalScores[bestSchemaIndex], 
            clusters: allClusters[bestSchemaIndex]}, 
            null, 
            '\t'
          )
        );
        return
      })
  })

program.parse(process.argv);