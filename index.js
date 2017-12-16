const program = require('commander');
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
    qBuilder.listResources(term);
  });

program.parse(process.argv);