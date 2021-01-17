# stock-bot

Automate retrieval of Trading 212 dividend payments.

## Requirements

- Node.js (only tested against `v14`)
- Yarn

## Instructions

1. Install dependencies: `yarn install`
2. Set your Trading 212 username and password in the [config](./config/default.json)
3. Run `yarn fetch`

A JSON file will be created in `./src/api-response/dividends.json` of your payments.

To view a dashboard of your results, run `yarn start`.
