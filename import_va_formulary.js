'use strict'

const xlsx = require('xlsx');
const csvtojson = require('csvtojson');
const mongoose = require('mongoose');
const config = require("./config.js");

const keypress = async () => {
  console.log('\tPress any key to continue or Control-C to cancel.\n');
  process.stdin.setRawMode(true);
  return new Promise(resolve => process.stdin.once('data', data => {
    const byteArray = [...data];
    if (byteArray.length > 0 && byteArray[0] === 3) {
      console.log('^C');
      process.exit(1);
    }
    process.stdin.setRawMode(false);
    resolve();
  }))
};

(async () => {
  const spreadsheetFileName = process.argv.pop();

  console.info(`Using spreadsheet '${spreadsheetFileName}'`);
  await keypress();

  let spreadsheet
  try {
    spreadsheet = xlsx.readFile(spreadsheetFileName);
  } catch (e) {
    console.error(`Could not parse '${spreadsheetFileName}' as a xlsx spreadsheet`);
    return 1;
  }
  let formularySheet = spreadsheet.Sheets['Formulary'];
  if (!formularySheet) {
    console.warn('Could not find sheet named \'Formulary\'; using first sheet instead.');
    await keypress();
    formularySheet = spreadsheet.Sheets[spreadsheet.SheetNames[0]]
  }

  // One big string with everything in it, csv format
  const csvString = xlsx.utils.sheet_to_csv(formularySheet);
  // Parsed into 2D array
  const rows = await csvtojson({ noheader: true, output: 'csv' }).fromString(csvString)
  // Index of the row that starts with 'VA Class', this should be the header row of the actual data
  const indexOfHeaderRow = rows.map((row) => row[0]).indexOf('VA Class');

  if (indexOfHeaderRow < 0) {
    console.error('Could not find data header row. Expecting "VA Class" in first column.');
    return 2;
  }

  console.info('Found the header of the data at row', indexOfHeaderRow);
  await keypress();

  const rowsWithoutMeta = rows.slice(indexOfHeaderRow);
  // Now that we sliced off the extra info at the top of the sheet,
  // we glue this back into one big string so we can parse it again with headers enabled
  const csvStringWithoutMeta = rowsWithoutMeta.map((row) => row.map((value) => `"${value}"`).join(',')).join('\n');

  // Array of objects, keys for each value are derived from the header
  const parsedFormulary = await csvtojson().fromString(csvStringWithoutMeta)

  const cleanedFormulary = parsedFormulary.map((entry) => ({
    vaClass: entry['VA Class'],
    restriction: entry['Restriction'],
    genericName: entry['Generic'],
    dosageForm: entry['Dosage Form'],
    comments: entry['Comments'],
  }));

  // Currently, dosageForm is a list of forms.
  // Now we split this up so that we have individual entries for each dosage form.
  const expandedFormularyByDosageForm = cleanedFormulary.reduce((expandedFormularyByDosageForm, entry) => {
    const dosageForms = entry.dosageForm.split(',');
    const expandedEntries = dosageForms.map((form) => ({ ...entry, dosageForm: form }));
    return expandedFormularyByDosageForm.concat(expandedEntries);
  }, []);

  console.info(`About to *replace* the formulary collection contents with these ${expandedFormularyByDosageForm.length} entries.`);
  await keypress();

  var options = {
      useNewUrlParser: true
  };
  if (config.sslEnabled) {
      options.server = {};
      options.server.ssl = config.sslEnabled;
      if (config.sslCaCert) {
          options.server.sslCA = config.sslCaCert;
      }
  }
  await mongoose.connect(config.mongo, options)
  const FormularyEntry = require("./lib/models/formulary_entry.js");
  await FormularyEntry.remove({});
  await FormularyEntry.insertMany(expandedFormularyByDosageForm);

  return 0;
})()
.then(process.exit)
.catch((err) => {
  console.error(err);
  process.exit(-1);
});
