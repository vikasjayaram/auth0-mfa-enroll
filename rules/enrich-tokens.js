function enrichToken(user, context, callback) {
    const namespace = 'https://myapp.example.com/';
    context.idToken[namespace + 'mobile'] = user.phone_number || user.user_metadata.mobile;
    callback(null, user, context);
  }