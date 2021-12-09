function StepupUsingRTAndMFA(user, context, callback) {
    
    // this is the privilege scope(s) for your api
    let privilegeScope = "withdraw:funds";

    if (context.request.body.stepUp) {

        var requestedScopes = context.request.body.stepUp.split(" ");
        console.log(requestedScopes);

        // check is client has requested privilege scope(s)
        if (requestedScopes && requestedScopes.includes(privilegeScope)) {
            
            // check user permissions here before granting privilege scope
            // ANY REGISTERED/LOGGED_IN USER IS ELIGIBLE

            // add privilege scope to AT
            context.accessToken.scope = requestedScopes;

            // enforce 2FA
            context.multifactor = {
                provider: 'any'
            };
        }
    }
    callback(null, user, context);
}
