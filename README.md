# Amano Take Home Assessment
Kyle Haltermann's submission for the take home assessment.

I decided to start by making the simplest version of the program, which is a CLI app. Once I were to finish the CRUD functionalities, which were the next planned feature after the unit testing was fully implemented, I could have begun to convert this to a node server with a basic RESTful API.

Once I realized I was running out of time to implement all the features on my dream list, I changed focus to explaining my thinking and showing the groundwork for the features I would not have time to finish.

I did not follow best security practices on the app keys and API keys. In a real project those would be in .env files. But leaving them in means that you should be able to clone and run the project anywhere you have up to date node installed. To run it, clone the respository, use npm to install the side packages, and then run "npm run run" to run the CLI app, or "npm run test" to run the basic unit tests I set up.