# Auth0 MFA Companion App

This project shows how an Auth0 user can list, add and delete his/her MFA devices using [MFA API](https://auth0.com/docs/multifactor-authentication/api) (which is just a part of [Authentication API](https://auth0.com/docs/api/authentication#multi-factor-authentication)) directly from a web page without any backend. Currently, it only supports adding SMS and OTP.

**Configuration steps:**

1. Enable "SMS" and "One-time Password" factors and enable "Always require Multi-factor Authentication" switch [docs](https://auth0.com/docs/multifactor-authentication#1-enable-the-factors-you-require) 
1. Create a new SPA [docs](https://auth0.com/docs/dashboard/guides/applications/register-app-spa)
1. Go yo your SPA setting and add "http://localhost:8080" (don't add the slash at the back) to "Allowed Callback URLs", "Allowed Web Origins", "Allowed Logout URLs", "Allowed Origins (CORS)"
1. Go to "Advanced Settings" of the SPA and enable "MFA" grant type
1. Copy `config.json.example` file to `config.json` in the repo's dir and put your Auth0 domain (Can be custom domain or auth0 domain), auth0_domain and SPA client id in there
1. Run `npm install`
1. Run `npm run start` and open http://localhost:8080 in your browser

**Usage tips:**

* Start another SPA / Web App say at http://localhost:3000
* After the user signin / signup, the Auth0 rules run.
* You can check the rules folder in this repo and copy then onto your Auth0 tenant.
* The rules redirect's the user to http://localhost:8080 our companion MFA app.
* The MFA companion app does an /authorize to Auth0, as a SSO cookie is in play, getback the code and exchanges for tokens to the MFA API.
* After you log in your access token, user info and a list of MFA devices will be displayed.
* To delete a device just copy it's id from the list to the input field next to "Delete by id" in "Manage MFA devices" block and press "delete".
* To add a phone number click "Add Phone Number" (use `+1234567890` format) and press "Enroll". You should receive an SMS with a code (if your Auth0 account is configured correctly or you still have free quota), enter the code into the new input that should appear under the phone number and press "verify".
* To add an OTP device just press "add" button next to "Add new OTP device" then a new block with QR code should appear. Scan the QR code or copy OTP secret to your Google Authenticator (or similar software), enter 6-digit code and press "verify".
* Finally click the Continue Authentication button to resume the original login transaction and back into the http://localhost:3000 application.
* Note that access token is only valid for 10 minutes. After that, you will have to login again.

### To Do

- [ ] Display recovery code on first device enrollment 
- [ ] UML Diagram
