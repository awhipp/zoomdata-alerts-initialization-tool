var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var request = require('request');
router.use(bodyParser.json());
// in latest body-parser use like below.
router.use(bodyParser.urlencoded({extended: true}));

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Zoomdata ClientID/Oauth Tool' });
});

router.get('/params', function (req, res) {
    var callbackUrls = req.query.callbackUrls.split(",");
    for (var i = 0; i < callbackUrls.length; i++) {
        while (callbackUrls[i].indexOf(" ") >= 0) {
            callbackUrls[i] = callbackUrls[i].replace(" ","");
        }
    }

    var callbacks = "[";
    for(var i = 0; i < callbackUrls.length; i++) {
        callbacks += "\"" + callbackUrls[i] + "\"";
        if (i+1 != callbackUrls.length) {
            callbacks += ",";
        }
    }
    callbacks += "]";

    var payload = {
        "zdSuperName" : req.query.zdSuperName,
        "zdSuperPass" : req.query.zdSuperPass,
        "zdAdminName" : req.query.zdAdminName,
        "zdAdminPass" : req.query.zdAdminPass,
        "zdHost" : req.query.zdHost,
        "zdPort" : req.query.zdPort,
        "callbackUrls" : callbacks,
        "clientId" : "",
        "accessToken" : ""
    };

    getClientId(res, payload);

});


var getClientId = function (res, payload) {

    var url = payload.zdHost + ":" + payload.zdPort + "/zoomdata/api/oauth2/client";

    var username = payload.zdSuperName;
    var password = payload.zdSuperPass;

    var auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

    var headers = {
        'Accept': 'application/vnd.zoomdata+json',
        'content-type': 'application/vnd.zoomdata+json',
        "Authorization": auth
    };

    request.post(
        {
            url: url,
            headers: headers,
            body: '{"clientName": "' + payload.zdSuperName + '", ' +
            '"registeredRedirectURIs": ' + payload.callbackUrls + ', ' +
            '"autoApprove": true,' +
            '"accessTokenValiditySeconds": 99999999}'
        },
        function (e, r, body) {
            payload.clientId = JSON.parse(body).clientId;
            getAccessToken(res, payload);
        }
    );
};

var getAccessToken = function (res, payload) {

    var url = payload.zdHost + ":" + payload.zdPort + "/zoomdata/api/oauth2/token";

    var username = payload.zdAdminName;
    var password = payload.zdAdminPass;

    var auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

    var headers = {
        'Accept': 'application/vnd.zoomdata+json',
        'content-type': 'application/vnd.zoomdata+json',
        "Authorization": auth
    };

    request.post(
        {
            url: url,
            headers: headers,
            body: '{"clientId": "' + payload.clientId + '"}'
        },
        function (e, r, body) {
            payload.accessToken = JSON.parse(body).tokenValue;
            sendResponse(res, payload);
        }
    );
};

var sendResponse = function (res, payload) {
    res.json({
        "clientId": payload.clientId,
        "accessToken": payload.accessToken
    })
}

module.exports = router;
