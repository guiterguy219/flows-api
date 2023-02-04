import { Request, response, Response } from "express";
import { Configuration, CountryCode, LinkTokenCreateRequest, PlaidApi, PlaidEnvironments, Products } from "plaid";
import { badRequest, getUserId } from "./controller-utils";

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';
const PLAID_CLIENT_NAME = process.env.PLAID_CLIENT_NAME || 'Flows App';

// PLAID_PRODUCTS is a comma-separated list of products to use when initializing
// Link. Note that this list must contain 'assets' in order for the app to be
// able to create and retrieve asset reports.
const PLAID_PRODUCTS = (process.env.PLAID_PRODUCTS || Products.Transactions).split(
  ',',
);

// PLAID_COUNTRY_CODES is a comma-separated list of countries for which users
// will be able to select institutions from.
const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || 'US').split(
  ',',
);

// Parameters used for the OAuth redirect Link flow.
//
// Set PLAID_REDIRECT_URI to 'http://localhost:3000'
// The OAuth redirect flow requires an endpoint on the developer's website
// that the bank website should redirect to. You will need to configure
// this redirect URI for your client ID through the Plaid developer dashboard
// at https://dashboard.plaid.com/team/api.
const PLAID_REDIRECT_URI = process.env.PLAID_REDIRECT_URI || '';

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});

const client = new PlaidApi(configuration);

export const createLinkToken = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) { return badRequest(res); }

  const linkRequest: LinkTokenCreateRequest = {
    user: {
      client_user_id: userId,
    },
    client_name: PLAID_CLIENT_NAME,
    language: 'en',
    country_codes: PLAID_COUNTRY_CODES as CountryCode[],
    products: PLAID_PRODUCTS as Products[],
  }

  if (PLAID_REDIRECT_URI !== '') {
    linkRequest.redirect_uri = PLAID_REDIRECT_URI;
  }

  const createRequestToken = await client.linkTokenCreate(linkRequest);
  response.json(createRequestToken.data);
}