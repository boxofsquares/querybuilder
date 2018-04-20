'use strict'
const graph = require('./graph');

const words = ['monkey', 'donkey', 'snake', 'shake', 'tub', 'snub', 'realtor', 'reality', 'monster', 'rocket']

var g = new graph.jGraph(0.5, words);

// for (var srcWord of words) {
//   for (var targetWord of words) {
//     if (srcWord != targetWord) {
//       g.addEdge(srcWord, targetWord, jaccard(srcWord, targetWord))
//     }
//   }
// }

var clusters = g.getClusters();
console.log(clusters);