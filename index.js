const prompt = require('prompt-sync')()
const { initializeApp } = require("firebase/app")
const { getFirestore, collection, getDocs, query, where, addDoc } = require("firebase/firestore");
var Validator = require("jsonschema").Validator
var v = new Validator();
const axios = require("axios");

// Firebase configuration
// In all cases except an assessment, this needs to be in an .env file that is not uploaded to version control.
const firebaseConfig = {
    apiKey: "AIzaSyAIgBYbc27vyxp57Bj7Ej3iltXkcWFWq78",
    authDomain: "amanoassessment.firebaseapp.com",
    projectId: "amanoassessment",
    storageBucket: "amanoassessment.appspot.com",
    messagingSenderId: "29959978335",
    appId: "1:29959978335:web:5f8b1e3d05f1da18eb0aea"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// Functions for interacting directly with firestore
async function getCurrencyRecordByCode(code) {
    const currenciesCollection = collection(db, "currency");
    const q = query(currenciesCollection, where("CurrencyCode", "==", code)) // My personal preference is for temporary, one use variables to receive single letter names
    const currencySnapshot = await getDocs(q)
    // Data validation begins here
    // Check that there is one and only one result
    if (currencySnapshot.docs.length !== 1) {
        throw new Error("Incorrect number of records found for this code")
    }
    const currencyRecord = currencySnapshot.docs[0].data()
    // Check that the record has the expected structure. The instructions specified javascript, otherwise I think would have used typescript here instead of a json validation library
    var currencySchema = {
        "type": "object", "properties": {
            "CurrencyCode": { "type": "string" },
            "CurrencyID": { "type": "number" },
            "ExchangeRate": { "type": "number" }
        },
        "required": ["CurrencyCode", "ExchangeRate"]
    }
    var validationResult = v.validate(currencyRecord, currencySchema)
    if (validationResult.errors.length) {
        throw new Error("Invalid currency record returned")
    }
    return currencyRecord
}

async function addCurrency(code, rate, id) {
    const docRef = await addDoc(collection(db, "currency"), { CurrencyCode: code, ExchangeRate: rate, CurrencyID: id })
    return docRef
}


// These functions are the core of the program. They are being used in a simple CLI driver fashion but in a 
// production environment I would serve them as a REST API so that the different platforms can access data in the same way through the API
async function convertCurrencyFromFirestore(code, usdAmount) {
    try {
        // If the amount of USD given is not a valid number there's no point carrying out the slow database transfer process
        const parsedUSD = parseFloat(usdAmount)
        if (isNaN(parsedUSD)) { throw new Error("Amount of USD is not a valid number") }

        const currencyRecord = await getCurrencyRecordByCode(code)

        // The converted amount is naively the exchange rate times the entered amount of USD
        // In a real-life scenario it would be important to use fixed point numbers instead of floating point numbers and to include things such as fees in the calculation.
        // I considered making one of my improvements be to use fixed point arithmetic, but firestore doesn't seem to support fixed point data and the instructions specified making
        // the exchange rate a float (Double, but firestore only has the number type aligning it with javascript). I didn't want to look into it during my assessment time but I am
        // curious if anyone actually uses firestore for financial data and if so, how they do it.
        const { ExchangeRate: exchangeRate } = currencyRecord
        return parseFloat(parsedUSD) * exchangeRate
    } catch (e) { console.log(e) }
}

async function getExchangeRateFromFirestore(code) {
    try {
        const currencyRecord = await getCurrencyRecordByCode(code)
        if (currencyRecord) return currencyRecord.ExchangeRate
    } catch (e) { console.log(e) }
}

async function getExchangeRateFromPublicAPI(code) {
    const response = await axios.get('http://openexchangerates.org/api/latest.json', {
        params: {
            // This also should be in an env file but hopefully you'll be able to run this code without needing anything from me other than cloning the repository.
            app_id: 'fa88a39f4c8a450699b868332958c27b',
        }
    })
    const { data } = response
    if (data.rates[code]) {
        return data.rates[code]
    } else {
        return "No rate found for that currency"
    }
}


// A conversion driver for each of the CLI options allows me to abstract the program logic out and make the actual functionality easily unit testable
async function conversionDriver() {
    const currency = prompt("Enter the three letter code for the currency you wish to convert USD into: ");
    const amount = prompt("Enter the amount of USD you would like to convert: ");
    try {
        const convertedAmount = await convertCurrencyFromFirestore(currency, amount, db);
        console.log(amount, "USD exchanges to", convertedAmount, currency)
    } catch (e) { console.log(e) }
}

async function exchangeRateDriver() {
    const currency = prompt("Enter the three letter code for the currency you wish to get the exchange rate for: ")
    try {
        const exchangeRate = await getExchangeRateFromFirestore(currency)
        console.log("The exchange rate for USD to", currency, " is: ", exchangeRate)
    } catch (e) { console.log(e) }
}

async function publicExchangeRateDriver() {
    const currency = prompt("Enter the three letter code for the currency you wish to get the exchange rate for: ")
    try {
        const exchangeRate = await getExchangeRateFromPublicAPI(currency)
        console.log('Exchange rate from USD to', currency, 'is', exchangeRate)
    } catch (e) { console.log(e) }
}

async function addCurrencyDriver() {
    const currencyCode = prompt("Enter the three letter currency code you wish to add: ")
    const exchangeRate = parseFloat(prompt("Enter the exchange rate for the new currency from USD: "))
    const currencyID = prompt("Enter the ID for the new currency: ")
    const newCurrencyRecord = await addCurrency(currencyCode, exchangeRate, currencyID)
    console.log("New currency with ID", newCurrencyRecord.id, "added")

}

// Running the CLI. Won't be needed if this were to be converted into an API
async function main() {
    let run = true;
    while (run) {
        console.log("Choose from one of the following options:")
        console.log("1. Convert a currency from the firestore")
        console.log("2. Get the exchange rate for a specific currency from the firestore")
        console.log("3. Get the exchange rate for a currency using open exchange API")
        console.log("4. Add a currency to firestore")
        console.log("5. Quit")
        const option = prompt("Enter choice here: ")
        switch (option) {
            case "1":
                await conversionDriver()
                break;
            case "2":
                await exchangeRateDriver()
                break;
            case "3":
                await publicExchangeRateDriver()
                break;
            case "4":
                await addCurrencyDriver()
            case "5":
                run = false;
                process.exit(0)
                break;
        }
    }
    return
}

if (require.main === module) main().catch(console.error);


// Exporting the library functions in order to test them
module.exports = {
    convertCurrencyFromFirestore,
    getExchangeRateFromFirestore,
    getExchangeRateFromPublicAPI
}
