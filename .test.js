const { convertCurrencyFromFirestore, getExchangeRateFromFirestore, getExchangeRateFromPublicAPI } = require('./index');

// Unit testing was the last thing I worked on and I began to run out of time. Mocking the firestore queries is the next thing I planned to work on,
// once I had a better mock of that then it would be easy to set up tests that check that only valid records are found and returned and that the program
// gracefully fails when it happens. But I hope this WIP implementation shows that the architecture of the program makes abstracting the functionality
// for unit testing relatively simple, if not easy.

jest.mock('firebase/firestore', () => {
    return {
        collection: jest.fn().mockReturnThis(),
        query: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getDocs: jest.fn().mockResolvedValue({
            docs: [{
                data: jest.fn().mockReturnValue({ CurrencyCode: 'EUR', ExchangeRate: 0.91 })
            }]
        }),
        getFirestore: jest.fn(() => ({})),
    };
});

jest.mock('axios', () => {
    return {
        get: jest.fn().mockResolvedValue({
            data: {
                rates: {
                    GBP: 0.75,
                    CZK: 22.25,
                    EUR: 0.91
                }
            }
        }),
    };
});

test('converts 1000 USD to euros', async () => {
    const code = 'EUR';
    const usdAmount = '1000';
    const result = await convertCurrencyFromFirestore(code, usdAmount);
    expect(result).toBe(910);
});

test('Gets the exchange rate for USD to EUR', async () => {
    const code = 'EUR';
    const result = await getExchangeRateFromFirestore(code);
    expect(result).toBe(0.91);
});

test('Gets the exchange rate for USD to CZK from openExchange', async () => {
    const code = 'CZK';
    const result = await getExchangeRateFromPublicAPI(code);
    expect(result).toBe(22.25);
});
