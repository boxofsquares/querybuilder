// parse City of Vancouver sources //

const cheerio = require('cheerio')
const request = require('request-promise-native');

function getCovSources() {
  return request
    .get({
      uri: "http://data.vancouver.ca/datacatalogue/index.htm",
      resolveWithFullResponse: true
    })
    .then( (response) => {
      var $ = cheerio.load(response.body);
      var sources = $(".catalogTable tbody tr").map( (i, row) => {
        // row must have children
        var rowChildren = $(row).children();
        var availableFormats = rowChildren.filter( (i, rChild) => { 
            return $(rChild).children().length > 0 && i > 0 // filter label
          })
        availableFormats = availableFormats.map( (i, rChild) => {
          return $(rChild).find('a').map( (i, a) => {
            var href = $(a).attr('href');
            var f = $(a).find('span').text();
            if (f == "") {
              f = $(rChild).find('span').text();
            }
            var reg2 = /.htm/;
            var reg3 = /^ftp/;
            // NO indirect htm sources for now, as well as ftp access
            if (!reg2.test(href) && !reg3.test(href)) {
              return { format: f.toLowerCase(), url: href }
            }
          }).toArray()
        })
        if (rowChildren.length > 1 && i > 0 ) {
                      // console.log($(row).find('> td a'))
          return { 
            tag: $(rowChildren[0]).children().first().text(),
            formats: availableFormats.toArray(),
            src: "vancouver"
          }
        }
      });
      return sources.toArray().filter((src) => {return src != undefined});
    })
}

function getCovSourcesByTag(tag) {
  return getCovSources().then( (srcs) => {
    // console.log("COV sources: ")
    // for (src of srcs) {
    //   console.log(src.tag)
    // }
    var trimmed = []
    if (tag != "" && tag != undefined) {
      trimmed = srcs.filter( (src, i) => {
        // very basic 'tag' filter
        return src.formats.length > 0 && src.tag.toLowerCase().indexOf(tag) > -1
      })
    }
    var reg = /^\.\./;
    for (src of trimmed) {
      for (f of src.formats) {
        f.url = f.url.replace(reg, "http://data.vancouver.ca");
        }
    }

    return trimmed;
  });
}

module.exports = { getCovSources, getCovSourcesByTag };