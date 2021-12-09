const scope = "enroll read:authenticators remove:authenticators";
let auth0 = null;

let domain;
let clientId;
let audience;
let token;
let auth0_domain;
let user;
let continueUrl;
let mfaDevices = [];
let namespace = 'https://myapp.example.com/';
window.onload = async () => {
    log("creating auth0 client");
    var res = httpRequest({
        method: "GET",
        url: `/config.json`,
    });
    domain = res.domain;
    clientId = res.client_id;
    auth0_domain = res.auth0_domain;
    audience = `https://${auth0_domain}/mfa/`;
    try {
        auth0 = await createAuth0Client({
            domain: domain,
            client_id: clientId,
            audience: audience,
            scope: scope,
            redirect_uri: window.location.origin,
            useRefreshTokens: true,
            cacheLocation: 'localstorage'
        });
    } catch (err) {
        log("error creating auth0 client");
        console.dir(err);
    }

    const query = window.location.search;
    if (query.includes("session_token=") && query.includes("enroll_mfa=")) {
        const urlParams = new URLSearchParams(window.location.search);
        window.localStorage.setItem("original_state", urlParams.get('state'));
        window.localStorage.setItem("session_token", urlParams.get('session_token'));
        continueUrl = `https://${domain}/continue?state=${urlParams.get('state')}`;
        console.log(continueUrl);
        login();
    }
    if (query.includes("code=") && query.includes("state=")) {
        await auth0.handleRedirectCallback();
        window.history.replaceState({}, document.title, "/");
    }
    updateUI();
}
/**
 * Iterates over the elements matching 'selector' and passes them
 * to 'fn'
 * @param {*} selector The CSS selector to find
 * @param {*} fn The function to execute for every element
 */
const eachElement = (selector, fn) => {
    for (let e of document.querySelectorAll(selector)) {
        fn(e);
    }
};

const updateUI = async () => {
    log("updateUI called, checking isAuthenticated");
    const isAuthenticated = await auth0.isAuthenticated();

    document.getElementById("qsLogoutBtn").style.display = !isAuthenticated ? 'none' : '';
    document.getElementById("qsLoginBtn").style.display = isAuthenticated ? 'none' : '';

    if (isAuthenticated) {
        log("authenticated");
        document.getElementById("gated-content").classList.remove("hidden");

        token = await auth0.getTokenSilently();
        user =  await auth0.getUser()
        document.getElementById(
            "access-token"
        ).innerHTML = token;

        document.getElementById("user-profile").innerHTML = JSON.stringify(
          user, null, 2
        );
        if (user[namespace + 'mobile']) {
            document.getElementById("associate-mfa-sms-phone").value = user[namespace + 'mobile'];
            document.getElementById("associate-mfa-sms-phone").readOnly = true;
        }
        await refreshMfaList();

    } else {
        log("not authenticated");
        document.getElementById("gated-content").classList.add("hidden");
    }
};

const refreshMfaList = async () => {
    var mfa = httpRequest({
        method: "GET",
        url: `https://${domain}/mfa/authenticators`,
        headers: {
            authorization: `Bearer ${token}`
        }
    });
    //$('#associate-sms-form').modal();
    //window.localStorage.setItem("mfaDevices", JSON.stringify(mfa));
    mfaDevices = mfa;
    document.getElementById("mfa-devices").innerHTML = JSON.stringify(mfa, null, 2);
}

const login = async () => {
    await auth0.loginWithRedirect({
        audience: audience,
        scope: scope,
        redirect_uri: window.location.origin
    });
};

const logout = () => {
    auth0.logout({
        returnTo: window.location.origin
    });
};

const log = (text) => {
    console.log(new Date(), text);
}

const challengeFactorMFA = async (oobChannel) => {
    try {
        await auth0.getTokenSilently({ ignoreCache: true, stepUp: 'withdraw:funds'});
    } catch (e) {
        if(e.error === 'mfa_required') {
            log(e.mfa_token);
            let obj = mfaDevices.find(o => o.oob_channel === oobChannel);
            if (obj) {
                challengeMFA(obj, e.mfa_token);
            } else {
                alert(`No ${oobChannel.toUpperCase()} factor found, Please enroll.`)
            }
        }
    }
}
const associateMfaOtp = async () => {
    var res = httpRequest({
        method: "POST",
        url: `https://${domain}/mfa/associate`,
        headers: {
            authorization: `Bearer ${token}`
        },
        body: {
            authenticator_types: ["otp"],
        }
    });
    await refreshMfaList();
    if (!res.secret) {
        log("failed to add new otp device")
        console.dir(res)
        return
    }
    document.getElementById("verify-mfa-otp-secret").value = res.secret;
    document.getElementById("verify-mfa-otp-code").value = "";
    QRCode.toCanvas(document.getElementById("verify-mfa-otp-qr"), res.barcode_uri, function (err) {
        if (err) {
            log("failed to draw QR code");
            console.dir(err);
        }
    })

    document.getElementById("verify-mfa-otp-block").style.display = "";
}

const verifyMfaOtp = async () => {
    var code = document.getElementById("verify-mfa-otp-code").value
    var res = httpRequest({
        method: "POST",
        url: `https://${domain}/oauth/token`,
        body: {
            mfa_token: token,
            otp: code,
            grant_type: 'http://auth0.com/oauth/grant-type/mfa-otp',
            client_id: clientId,
        }
    });
    if (!res.access_token) {
        log("failed to verify otp device");
        console.dir(res);
        return;
    }
    document.getElementById("verify-mfa-otp-block").style.display = "none";
    $('#associate-otp-form').modal('hide');
    await refreshMfaList();
}

const associateMfaSms = async () => {
    var res = httpRequest({
        method: "POST",
        url: `https://${domain}/mfa/associate`,
        headers: {
            authorization: `Bearer ${token}`
        },
        body: {
            authenticator_types: ["oob"],
            oob_channels: ["sms"],
            phone_number: document.getElementById("associate-mfa-sms-phone").value,
        }
    });
    await refreshMfaList()
    if (!res.oob_code) {
        log("failed to add new sms device");
        console.dir(res);
        return;
    }
    document.getElementById("associate-mfa-sms-block").style.display = "none";
    document.getElementById("verify-mfa-sms-code").dataset.oobCode = res.oob_code;
    document.getElementById("verify-mfa-sms-code").value = "";
    document.getElementById("verify-mfa-sms-block").style.display = "";
}

const verifyMfaSms = async () => {
    var oobCode = document.getElementById("verify-mfa-sms-code").dataset.oobCode;
    var bindingCode = document.getElementById("verify-mfa-sms-code").value;
    var res = httpRequest({
        method: "POST",
        url: `https://${domain}/oauth/token`,
        body: {
            mfa_token: token,
            oob_code: oobCode,
            binding_code: bindingCode,
            grant_type: 'http://auth0.com/oauth/grant-type/mfa-oob',
            client_id: clientId,
        }
    });
    if (!res.access_token) {
        log("failed to verify sms device");
        console.dir(res);
        return;
    }
    document.getElementById("verify-mfa-sms-block").style.display = "none";
    $('#associate-sms-form').modal('hide');
    await refreshMfaList();
}

const deleteMfa = async () => {
    var elem = document.getElementById("delete-mfa-id");
    var id = elem.value;
    elem.value = "";
    httpRequest({
        method: "DELETE",
        url: `https://${domain}/mfa/authenticators/${id}`,
        headers: {
            authorization: `Bearer ${token}`
        }
    });
    await refreshMfaList();
}

const challengeMFA = async (device, mfa_token) => {
    var res = httpRequest({
        method: "POST",
        url: `https://${domain}/mfa/challenge`,
        body: {
            mfa_token: mfa_token,
            challenge_type: 'oob',
            authenticator_id: device.id, // If you want Auth0 to trigger the most secure leave this parameter out.
            client_id: clientId,
        }
    });
    if (!res.oob_code) {
        log("failed to challenge MFA");
        console.dir(res);
        return;
    }
    document.getElementById("verify-mfa-code").dataset.oobCode = res.oob_code;
    document.getElementById("verify-mfa-code").dataset.mfaToken = mfa_token;
    $("#verify-otp-form").modal({show: true});
}
const httpRequest = ({ method, url, body, headers }) => {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open(method, url, false);
    if (headers) {
        for (var header in headers) {
            xmlHttp.setRequestHeader(header, headers[header]);
        }
    }
    if (body == undefined) {
        xmlHttp.send(null);
    } else if (body instanceof FormData) {
        xmlHttp.send(body);
    } else {
        xmlHttp.setRequestHeader("Content-Type", "application/json");
        xmlHttp.send(JSON.stringify(body));
    }

    if (xmlHttp.responseText == "") {
        return {};
    }

    try {
        return JSON.parse(xmlHttp.responseText);
    } catch (err) {
        return {};
    }

}

const copyToClipboard = async () => {
  var copyText = document.getElementById("verify-mfa-otp-secret");

  /* Select the text field */
  copyText.select();
  copyText.setSelectionRange(0, 99999); /* For mobile devices */

  /* Copy the text inside the text field */
  document.execCommand("copy");

  /* Alert the copied text */
  alert("Copied the text: " + copyText.value);
}

const execContinue = async () => {
    var data = {
        sms_mfa_enabled: false,
        otp_mfa_enabled: false
    };
    for (var i = 0; i < mfaDevices.length; i++) {
        switch (mfaDevices[i].authenticator_type) {
            case 'oob':
                data.sms_mfa_enabled = true;
                break;
            case 'otp':
                data.otp_mfa_enabled = true;
                break;
            default:
                break;
        }
    }
    window.location = `https://${domain}/continue?state=${window.localStorage.getItem('original_state')}&${window.localStorage.getItem('session_token')}&sms_mfa_enabled=${data.sms_mfa_enabled}&otp_mfa_enabled=${data.otp_mfa_enabled}`;
    // httpRequest({
    //     method: "POST",
    //     url: `https://${domain}/continue?state=${window.localStorage.getItem('original_state')}&sms_mfa_enabled=${data.sms_mfa_enabled}&otp_mfa_enabled=${data.otp_mfa_enabled}`,
    //     body: data
    // });
}

const verifyChallenge = async (device, oob_code, mfa_token) => {
    var oobCode = document.getElementById("verify-mfa-code").dataset.oobCode;
    var mfaToken = document.getElementById("verify-mfa-code").dataset.mfaToken;
    var bindingCode = document.getElementById("verify-mfa-code").value;
    var res = httpRequest({
        method: "POST",
        url: `https://${domain}/oauth/token`,
        body: {
            mfa_token: mfaToken,
            oob_code: oobCode,
            binding_code: bindingCode,
            grant_type: 'http://auth0.com/oauth/grant-type/mfa-oob',
            client_id: clientId,
        }
    });
    if (!res.access_token) {
        log("failed to verify sms device");
        console.dir(res);
        alert('Invalid Code');
        return;
    } else {
        document.getElementById('json-container').innerHTML = JSON.stringify(res, null, 2);
        $('#verify-otp-form').modal('hide');
    }
}