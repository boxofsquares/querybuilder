
'use strict'
const jaccard = require('string-jaccardindex');

class jGraph {
  constructor(threshold, epsilon, schemaObjects) {
    this.nodes = [];
    this.edges = new Map();
    this.uncertainEdges = [];
    this.threshold = threshold;
    this.epsilon = epsilon;
    var words = []; 
    for (var so of schemaObjects) {
      words = words.concat(so.schema)
    }
    for (var srcWord of words) {
      for (var targetWord of words) {
        if (srcWord != targetWord) {
          var weight = jaccard(srcWord, targetWord);
          if (weight > this.threshold - this.epsilon) {
            this.addEdge(srcWord, targetWord, weight);
            if (weight < this.threshold + this.epsilon && !this.uncertainEdges.some(((edge) => { return this._sameUncertaintyEdge(edge, {srcWord, targetWord, weight})} ))) {
              this.uncertainEdges.push({srcWord, targetWord, weight});
            }
          } else {
            this.addEdge(srcWord);
          }
        }
      }
    }
    this.removeRedundantEdges();

  } 

  // allow for just nodes without edges - aka to, weight == undefined
  addEdge(from, to, weight) {
    if (this.edges.get(from) == undefined) {
      this.edges.set(from, new Map());
    }
    if (to != undefined) {
      if (this.edges.get(to) == undefined) {
        this.edges.set(to, new Map());
      }

      this.edges.set(from, this.edges.get(from).set(to, weight));
      // for double-storing edges
      this.edges.set(to, this.edges.get(to).set(from, weight));
    }
  }

  removeEdge(from, to) {
    // if (!this.edges.get(from).delete(to)) {
    //   return this.edges.get(to).delete(from);
    // } else {
    //   return true;
    // }
    // making sure double storing is removed properly
    var deleteFrom = this.edges.get(from).delete(to); 
    var deleteTo = this.edges.get(to).delete(from);
    return deleteFrom || deleteTo;
  }

  findCertainPath(src, target, currentPath) {
    if (this.edges.get(src).get(target) == undefined) { return false;} // this means this path was already removed earlier
    if (this.edges.get(src).get(target) > this.threshold + this.epsilon) {
      return true
    } else {
      var pathExists = false;
      debugger;
      for (var [key, value] of this.edges.get(src)) {
        if ((currentPath.indexOf(key) < 0) && (value > this.threshold + this.epsilon)) {
          currentPath.push(key);
          if (this.findCertainPath(key, target, currentPath)) {
            pathExists = true;
            break;
          }
        }
      }
      return pathExists;
    }
  }

  removeRedundantEdges() {
    var newUncertainEdges = [];
    for (var unCertainEdge of this.uncertainEdges) {
      // e(a1,a2) can be replaced with path through only certain edges
      if (this.findCertainPath(unCertainEdge.srcWord, unCertainEdge.targetWord, [unCertainEdge.srcWord])) {
        this.removeEdge(unCertainEdge.srcWord, unCertainEdge.targetWord);
      } else {
        newUncertainEdges.push(unCertainEdge)
      }
    }
   this.uncertainEdges = newUncertainEdges;
  }


  _getClusters() {
    var addedNodes = [];
    var clusters  = [];
    for (var [key, edges] of this.edges) {
      if (addedNodes.indexOf(key) == -1) {
        var subCluster = this._buildCluster(key, addedNodes)
        addedNodes = addedNodes.concat(subCluster);
        clusters.push(subCluster);
      }
    }
    return clusters;
  }

  getAllClusters() {
    var allClusters = [];
    console.log("*** Number of Uncertain Edges: " + this.uncertainEdges.length)
    var subsets = this._findSubsets(this.uncertainEdges);
    console.log("*** Generated all subsets: " + subsets.length + " ***");
    for (var edgeSet of subsets) {
      for (var edge of edgeSet) {
        this.removeEdge(edge.srcWord, edge.targetWord)
      }
      allClusters.push(this._getClusters())
      // add the edges back - dumb
      for (var edge of edgeSet) {
        this.addEdge(edge.srcWord, edge.targetWord)
      }
    }
    return allClusters;

  }

  _buildCluster(key, addedNodes) {
    var cluster = []; 
    for (var [subKey, value] of this.edges.get(key)) {
      if (addedNodes.indexOf(subKey) == -1) { //&& value > this.threshold) {
        addedNodes.push(key);
        var subCluster = this._buildCluster(subKey, addedNodes);
        cluster = cluster.concat(subCluster);
      }
    }
    cluster.push(key);
    return cluster;
  }

  //https://stackoverflow.com/questions/127704/algorithm-to-return-all-combinations-of-k-elements-from-n/8171776#8171776
  _findSubsets(rest) {
    if (rest.length == 0) {
        return [[]];
    } else {
        var arr = this._findSubsets(rest.slice(1));
        // var arr2 = [];
        var arr2 = arr.map((set) => { return set.concat(rest[0])});
        return arr.concat(arr2) ;
    }
  }

  _sameUncertaintyEdge(edge1, edge2) {
    var case1 = edge1.srcWord == edge2.srcWord && edge1.targetWord == edge2.targetWord;
    var case2 = edge1.srcWord == edge2.targetWord && edge1.targetWord == edge2.srcWord;
    return case1 || case2;
  }

  printGraph() {
    for (var [key, value] of this.edges) {
      console.log(key + ":")
      for (var [key2, value2] of value) {
        console.log("\t " + key2+ ": " + value2)
      }
    }
    console.log("Uncertainty Edges: " + JSON.stringify(this.uncertainEdges))
  }
}

// Testing Code Snippet
// var g = new jGraph();
// debugger;
// g.addEdge('a', 'b', 0.5);
// console.log(g.findEdges('a'));
// console.log(g.findEdges('b'));
// debugger;
// g.removeEdge('b', 'a');
// debugger;


// jimmy: Map { 'jim' => 0.5, 'jimy_p' => 0.5 }
// jim: Map { 'jimmy' => 0.5, 'jimy_p' => 0.4 }
// jimy_p:  Map { 'jimmy' => 0.5, 'jim' => 0.4 }
// 0.4 and 0.09

// var schemaObjects = [ 
//   {name:"object1", schema: ["world", "eat", "jimmy", "jim"]},
//   {name:"object2", schema: ["local", "eatery", "rating"]},
//   {name:"object3", schema: ["wordly", "drink", "jim"]},
//   {name:"object4", schema: ["locality", "sleep", "jon"]},
//   {name:"object5", schema: ["winter", "art", "jimy_p"]}
//   ];

// var g = new jGraph(0.6, 0.2, schemaObjects);
// // var clusters = g.getClusters();
// // console.log(clusters);
// g.printGraph();
// debugger;
// var allClusters = g.getAllClusters();
// console.log(allClusters);
// debugger;

// var totalScore = 0;
// var scores = allClusters.map( (clusters) => {
//   var score = 0;
//   for (var so of schemaObjects) {
//     var consistent = true;
//     var hitIndex = Array(clusters.length).fill(false);
//     for (var header of so.schema) {
//       var index = clusters.findIndex( (c) => {
//         return c.indexOf(header) > -1;
//       });
//       if (hitIndex[index]) {
//         consistent = false;
//         break;
//       } else {
//         hitIndex[index] = true;
//       }
//     }
//     if (consistent) {
//       score += 1;
//     }
//   }
//   totalScore += score;
//   return score;
// })

// console.log(scores.map( (s) => { return s/totalScore}));
// debugger;

// debugger;
module.exports = {
  jGraph
}

