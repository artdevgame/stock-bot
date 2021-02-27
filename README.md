# stock-bot

Automate retrieval of Trading 212 dividend payments.

## Requirements

- Node.js (only tested against `v14`)
- Yarn

> I've created [stock-bot-api](https://github.com/artdevgame/stock-bot-api) to retrieve dividend yield information, which I intend to host somewhere in the future, but for now you can download and run it locally. It's not _exactly_ a requirement, but this app will show warnings when trying to generate the dashboard data without it.

## Instructions

1. Install dependencies: `yarn install`
2. Set your Trading 212 username and password in the [config](./config/default.json)
3. Run `yarn data:fetch`

A Chrome browser will be started via Puppeteer, trading212.com will be loaded and your username/password will be filled out. You'll be asked to input a 2FA code if it has been enabled on your account.

The app then captures the required tokens to call different endpoints on trading212.com and a JSON file is created in `./src/api-response/dividends.json` with the history of your dividend payments.

To view a dashboard of your results, run `yarn start:fresh`.
