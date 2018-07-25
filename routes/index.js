var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var request = require('request');
var path = require('path');

router.use(bodyParser.json());
// in latest body-parser use like below.
router.use(bodyParser.urlencoded({extended: true}));
fs = require('fs');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Zoomdata Alerts Initialization Tool' });
});

var template;

fs.readFile(path.join(__dirname, '../init.yml.template'), 'utf8', function (err, data) {
    if (err) {
        return console.log(err);
    }
    template = data;
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

    var payload = req.query;

    payload.callbackUrls = callbacks;
    payload.ZOOMDATA_CLIENTID = "";
    payload.ZOOMDATA_ACCESSTOKEN = "";

    payload = getDefaultsForMissing(payload);

    getClientId(res, payload);

});

var getDefaultsForMissing = function(payload) {

    if (payload.CONSUL_ENABLED) {
       if (!payload.CONSUL_HOST) {
           payload.CONSUL_HOST = "http://localhost";
       }
       if (!payload.CONSUL_PORT) {
           payload.CONSUL_PORT = "8500";
       }
    }

    if (!payload.RABBIT_URL) {
        payload.RABBIT_URL = "rabbitmq:5672";
    }

    if (!payload.POSTGRES_URL) {
        payload.POSTGRES_URL = "jdbc:postgresql://postgres:5432/alerts";
    }

    if (!payload.ALERT_PRIORITIES) {
        payload.ALERT_PRIORITIES = "low,medium,high,critical";
    }

    return payload;
};


var getClientId = function (res, payload) {

    var url = payload.ZOOMDATA_URL + ":" + payload.ZOOMDATA_PORT + "/zoomdata/api/oauth2/client";

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
            payload.ZOOMDATA_CLIENTID = JSON.parse(body).clientId;
            getAccessToken(res, payload);
        }
    );
};

var getAccessToken = function (res, payload) {

    var url = payload.ZOOMDATA_URL + ":" + payload.ZOOMDATA_PORT + "/zoomdata/api/oauth2/token";

    var username = payload.ADMIN_USERNAME;
    var password = payload.ADMIN_PASSWORD;

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
            body: '{"clientId": "' + payload.ZOOMDATA_CLIENTID + '"}'
        },
        function (e, r, body) {
            payload.ZOOMDATA_ACCESSTOKEN = JSON.parse(body).tokenValue;
            sendResponse(res, payload);
        }
    );
};

var sendResponse = function (res, payload) {
    var resultingTemplate = fillTemplate(payload);

    res.set({"Content-Disposition": "attachment; filename=init.yml"});
    res.send(resultingTemplate);
}

var fillTemplate = function(payload) {
    var result = template;

    for (var key in payload) {
        if (payload.hasOwnProperty(key)) {
            result = result.replace("${" + key + "}", payload[key])
        }
    }

    return result;
}

module.exports = router;
