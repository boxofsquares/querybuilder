const request = require('request-promise-native');
const simple_request = require('request');
const csv = require('csv');
const fs = require('fs');
const zip = require('adm-zip')
const unzip = require("unzip")
const cov = require("./covparser")
const schemaParser = require('./schemaparser')

const FORMATS = ["json", "csv", "kml"] // those are the only useful formats, really
let responseString = '';
const offline = false;

// All registered sources
const RegisteredSources = [
	{name: "Vancouer", fetchResourceHandler: (st) => { return vancouverGetData(st) }}, 
	{name: "Surrey", fetchResourceHandler: (st) => { return surreyGetData(st)}} 
]

// Surrey API Fetch
const surreyGetData = (searchTag) => {
	return (
		requestPromise("http://data.surrey.ca/api/3/action/package_search?q=" + searchTag)
		.then( (response) => {
			// resCount = response.body.result.count;
			resources = response.body.result.results.map( (resource) => {
				formats = resource.resources.map( (resource) => {
					return { format: resource.format.toLowerCase(), url: resource.url }
				})
				return { tag: resource.name.toLowerCase(), formats, src: "surrey" }
			})
			return resources;
		})
	)
}

// Vancouver Web Crawl
const vancouverGetData = (searchTag) => {
	return cov.getCovSourcesByTag(searchTag)
}

const requestPromise = (req) => {
	return request({uri: req, 
			json: true,
			resolveWithFullResponse: true
	});
}

const handleResponse = (response) => {
				// console.log(response.body.result.resources);
				let result = response.body.result;
				if (response.body.success) {
		  			// console.log(response.resources);
		  			// responseString = responseString + 
		  			responseString += result.name;

		  		}
		  		else {
		  			console.log("Invalid request.")
		  		}
		  	};

const handleError = (error) => {
				return console.log("Invalid request with error: " + error);
			};

// Testing (offline)
// const getResource = (resourceId) => {
// 	if (offline) {
// 		return dummyPromise;
// 	}	
// 	else {
// 		return requestPromise("http://data.surrey.ca/api/3/action/package_show?id=" + resourceId);
// 	}
// }

const handleResponseList = (responses) => {
		//console.log(body);
		return new Promise((success, fail) => {
			let string = "";
			responses.forEach( (response) => {
				if (response.body.success) {
					let results = response.body.result.results;
					string += response.request.uri.hostname + '\n';
					string += '=======================\n';
				// console.log(response.resources);
				for(i = 0; i < results.length ; i++){
					string += results[i].name+ '\n';
				}
				string += '\n';
			}
			else {
				console.log("Invalid request.")
			}
		});
			success(string);
		});	
	};

const getData = (searchTag) => {
	return (
		fetchSources(searchTag)
		.then( ( result ) => {
			console.log(result)
			i = -1
			reqPromises = result.resources.map( (resource) => {
				for (i = 0; i < FORMATS.length; i++) {
					index = resource.formats.map( f => { return f.format }).indexOf(FORMATS[i])
					if ( index > -1 ) {
						return { tag: resource.tag, format: resource.formats[index].format, req: resource.formats[index].url, src: resource.src }
					}
				}
			}).filter((rp) => { return rp != undefined});
			var promises = reqPromises.map((reqPromise) => {
				return new Promise ( (success, fail) => {
					var extractDir = __dirname + "/extract/" + reqPromise.src;
					var rx = /(.zip|.kmz)$/
					if (!fs.existsSync(extractDir)) {
						fs.mkdir(extractDir)
					}
					if (rx.test(reqPromise.req)) { 
						// console.log("zipped from " + reqPromise.req)
						simple_request
						.get(reqPromise.req)
						.on('error', (err) => {success(reqPromise)})
						// .pipe(unzip.Extract({ path: "./extract/" + reqPromise.src }))
						.pipe(unzip.Parse())
						.on('entry', (entry) => {
							var zippedFileName = entry.path;
							entry.pipe(fs.createWriteStream(extractDir + "/" + zippedFileName))
							.on('close', (args) => {
								reqPromise.localFile = extractDir + "/" + zippedFileName;
								success(reqPromise);
							})
							.on('error', (err) => {
								success(reqPromise)
							})	
						})
					}	else {
						// console.log("Non-zipped from " +reqPromise.require);
						simple_request
						.get(reqPromise.req)
						.on('error', (err) => {success(reqPromise)})
						.pipe(fs.createWriteStream(extractDir+ "/" + reqPromise.tag + "." + reqPromise.format))
						.on('close', (args) => {
							reqPromise.localFile = extractDir + "/" + reqPromise.tag + "." + reqPromise.format;
							success(reqPromise);
						})

					}
				})
			})
			return Promise.all(promises)
		})
		.then( (resources) => {
			var schemaPromises = resources.map( (resource) => {
				if (resource.localFile) {
					return schemaParser.parseSource(resource.tag, resource.localFile, resource.src);
				}
				// otherwise, ignore
			})
			return Promise.all(schemaPromises);
		})
	)
}

const fetchSources = (searchTag) => {
	var s = RegisteredSources.map( (source) => {
	 return source.fetchResourceHandler(searchTag);
	})
	return Promise.all(s).then((accSources) => { 
		return accSources.reduce((acc, setsForSource) => {
			acc.resCount += setsForSource.length;
			acc.resources = acc.resources.concat(setsForSource)
			return acc
		}, { resCount: 0, resources: [] }) 
	})
}

const listResources = (term) => {
	if (offline) {
		return [dummyPromise, dummyPromise];
	}
	let q = "action/package";
	if (term) {
		q = q + "_search?q=" + term;
	}
	else {
		q = q + "_list";
	}

	let promises = [
	requestPromise("http://data.surrey.ca/api/3/" + q),
	requestPromise("https://catalogue.data.gov.bc.ca/api/" + q)
	];
	// .then(handleResponseList, handleError)
	// // .then((value) => {console.log(responseString); responseString = "";});
	// let collated = responseString;
	return promises;
}

// Offline Testing
const dummyPromise = new Promise((success, fail) => {
	let dummyResponse = JSON.parse(
		'{' +
		'	"body": {' +
		'		"success": true,' +
		'		"result": {' +
		'			"results": [' +
		'				{ "name": "resource A",' + 
		'				  "url": "./test.csv"'	 +
		'				},' +
		'				{ "name": "resource B"},' +
		'				{ "name": "resource C"}' +
		'			]' +
		'		}' +
		'	}, ' +
		'	"request": {' +
		'		"uri": {' +
		'			"hostname": "notarealdomain.com"' +
		'		}' +
		'	}'+
		'}'
	);
	success(dummyResponse);
})

module.exports = {
	getData
};