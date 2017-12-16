const request = require('request-promise-native');

let responseString = '';

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
				return console.log("Invalid request.");
			};

const getResource = (resourceId) => {
	let allResources = "";
	requestPromise("http://data.surrey.ca/api/3/action/package_show?id=" + resourceId)
	.then(handleResponse, handleError)
	.then((value) => {console.log(responseString)});
}

const handleResponseList = (response) => {
		  		//console.log(body);
		  		if (response.body.success) {
		  			let results = response.body.result.results;
		  			responseString += response.request.uri.hostname + '\n';
		  			responseString += '=======================\n';
		  			// console.log(response.resources);
		  			for(i = 0; i < results.length ; i++){
		  				responseString += results[i].name+ '\n';
		  			}
		  			responseString += '\n';
		  		}
		  		else {
		  			console.log("Invalid request.")
		  		}
			};


const listResources = (term) => {
	let q = "action/package";
	if (term) {
		q = q + "_search?q=" + term;
	}
	else {
		q = q + "_list";
	}
	requestPromise("http://data.surrey.ca/api/3/" + q)
	.then(handleResponseList, handleError)
	.then((value) => {return requestPromise("https://catalogue.data.gov.bc.ca/api/" + q)})
	.then(handleResponseList, handleError)
	.then((value) => {console.log(responseString); responseString = "";});
}

module.exports = {  getResource , listResources};