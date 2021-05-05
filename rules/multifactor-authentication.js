function multifactorAuthentication(user, context, callback) {

    // SKIP MFA prompt on signup or first login
    if (context.stats.loginsCount === 1) {
        return callback(null, user, context);
    }

    let app_metadata = user.app_metadata || {};
    if (app_metadata && app_metadata.mfa && (app_metadata.mfa.sms_mfa_enabled || app_metadata.mfa.otp_mfa_enabled)) {
        context.multifactor = {
            provider: 'any',

            // optional, defaults to true. Set to false to force authentication every time.
            // See https://auth0.com/docs/multifactor-authentication/custom#change-the-frequency-of-authentication-requests for details
            allowRememberBrowser: false
        };
    }

    callback(null, user, context);
}