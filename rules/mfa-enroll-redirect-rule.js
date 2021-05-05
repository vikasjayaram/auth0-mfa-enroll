function redirectForMFAEnrollment(user, context, callback) {
    if (context.protocol === "redirect-callback") {
        if (context.request.query.sms_mfa_enabled && context.request.query.otp_mfa_enabled) {
            user.app_metadata = user.app_metadata || {};
            user.app_metadata.mfa = {
                sms_mfa_enabled: context.request.query.sms_mfa_enabled,
                otp_mfa_enabled: context.request.query.otp_mfa_enabled
            };
            var request = require('request@2.56.0');
            var userApiUrl = auth0.baseUrl + '/users';
            request.patch({
                url: userApiUrl + '/' + user.user_id,
                headers: {
                    Authorization: 'Bearer ' + auth0.accessToken
                },
                json: { app_metadata: user.app_metadata }
            }, function (err, response, body) {
                if (response.statusCode >= 400) {
                    return callback(new Error('Error updating account: ' + response.statusMessage));
                } else {
                    return callback(null, user, context);
                }
            });
        } else {
            return callback(new UnauthorizedError('User did not provide Email!'));
        }
        return callback(null, user, context);
    }

    if (context.clientID === '<CLIENT_ID>' && user.multifactor.length === 0) {
        var auth0Domain = auth0.baseUrl.match(/([^:]*:\/\/)?([^\/]+\.[^\/]+)/)[2];
        // configuration.MFA_COMPANION_APP_ENDPOINT => http://localhost:8080
        context.redirect = {
            url: configuration.MFA_COMPANION_APP_ENDPOINT +
                '?auth0_domain=' + encodeURIComponent(auth0Domain) + '&client_name=' + encodeURIComponent(context.clientName) + '&enroll_mfa=true'
        };
    }
    return callback(null, user, context);
}