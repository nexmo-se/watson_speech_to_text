'use strict'

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const expressWs = require('express-ws')(app);
const Nexmo = require('nexmo');
const { Readable } = require('stream');
const cors = require('cors');
const https = require('https');

var prefix = "https://";
var wsprefix = "wss://";

// Nexmo credentials
var api_key = process.env.api_key; //  Nexmo API Key
var api_secret = process.env.api_secret; // Nexmo API Secret
var app_id = process.env.app_id; // Nexmo App_ID
var keyfile = process.env.keyfile; // Nexmp API keyfile
var server_url = process.env.server_url;  // THis server URL
var lvn = process.env.phone; //  Nexmo LVN
var agent = process.env.agent; // Agent's phone number
var wuser = process.env.wuser; // Watson Username
var wpassword = process.env.wpassword; // Watson password
var language_model = process.env.language_model || 'en-US_NarrowbandModel'; // Watson Narrowband model for your language
var language_code = process.env.language_code; // Nexmo Language Code
var wshostname = server_url; //"ec2-3-14-177-139.us-east-2.compute.amazonaws.com/";
let config = {
  projectId: 'nexmo-extend',
  credentials: {
    client_email: "tony-nexmo@asr1-cavort.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCr/XydioIyKKc4\n5ZYPwZvdrjfisvgNNClJICpCVazf05QU0olp64dubLKZb4dBaddkRsElOd+IEG3h\not1UMCrv+RvPXEVsHiGrvqc/a34za10IJhINe5TgntUOXHxC6pABNnqVi2WzD+YA\nbXL+DWKqM4gmzmqeTItCjxpQNGnzEH63zIe2yKn4PWCxFR/lzAQm0+rLZkvuoJ8J\neRSi1g3rVrd31Vd2UuXb4kpd0scgaPMCKZWqKj1FFmTj8j+/IORHTCA5rJr0CdMj\nOTeauTnze+gFjJPWx3Q5icetZLYv6zue/BK8cxGuJuvyvAqGgwbHAVlSWZ4+O4v8\n8JX0A/jlAgMBAAECggEAQ5DXrcRGFZJm7zEyXIpAwzu39LU+QWGmfnXGZDzoJx4l\nZHC5TwUaNUU6fJCV4BrGZTxukENGD1v07tlefb5Wf+OrCzFCjJDhxWimp4GBGI4r\nBBKAsQ9Fk2CSbovivR8M540RZ0JV95xdTPmyXR/BDQAlkqkwtXN4mfNB8RRGMxg4\nv9G9tSPkPfVEY3jjijuOKHr43WZ743A+9pMyjnqHbD60wQr97mhWzT5Fo7UhpdPa\n6As2SHXmn9EBzfsJZWxvTta8ofS7rg4EhTrqwXn4qRrl7xFLzPBCoRzPZ8chMa/4\nx4UISokISv4MFJOmFMyRh2jGX9tW2dyWj3KXLXUm2QKBgQDcU7LQ9E5/C3dA5NQ2\nwiJyv0LRC6UAs4YqRBmj/FwAWxUqdpN8X8tBWLjzk8e3GB+v02hcZEuExkXrssHk\nZXSowOVO2V0jfD1taVq4LxTpX7kJWEb8y2ZjyGeGUXqs9FbnDfm/v8h8ita/CfAy\nAGdl7ZFCPmmonpIYcQO9cw0EzwKBgQDH1kjKR4/uA4dwMSU38E3oJkSVYVcMAx8L\nwvwdfOIUp8K+dyCnyV4CCwksc23x9E4bgokpAksmxPAoEKBN+19NztkXaO14Hct0\n/I3v9GogECf7l599FxJlrpvbS5T9yjHEjYfiZLg8hehRKAnOTDYsdBKqRagaKcy5\n2GXFEvf8CwKBgQCwzCUIUZKPlbbLBxRXIG8eHuXR84MjTeuSDPV6Rm3ZBz2zxlTR\nD9l9BWHcazBudtgucfkjcoO69pNy8A1wZg03wRoArKF1cSOloU3f0D/6iQplOkY0\nYk82MMEJ4mYLVUJKxEctnAqYDZ0GzUXGCdbuzrSqMIT+fsgC/uUeZ60BtwKBgGfQ\nXFQpRQ5C6xNPlKQwxGg7qRlpTg1BedlkXBD9lX1hgXvs6xv/MkUhcoyTEqTFY+ZK\ns/KH7H6hhJlrubuJQQNs176fle32nIGTyjDD6nXprru3EvWrDLWiNfmAlFAbwCr5\n04O7CzL15bBzelSfpu0FB8VJFoExAdfyITx2FDntAoGADpuQSCmZJxesqpXiqjv1\nL8o13PODEKc20oJj08KzjX0OpKM1IHZwaclfVHj/q+AhmoFOd0u8TVZ7NXodlZve\nhXOJUx5Rz3/pCKPZQeGqLGxNdT1JZEEYE9qScklDpPAHBLBD2qTPJVk/pcWzGkcj\n4x08XYp3npigit67JGPB8WI=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n')
  }
};

//==========================================================
app.use(bodyParser.json());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "OPTIONS,GET,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
  next();
});

let nexmo = new Nexmo({
  apiKey: api_key,
  apiSecret: api_secret,
  applicationId: app_id,
  privateKey: keyfile,
});

//----
function app_callback(error, response, body) {
  if (error) {
    console.log("App callback, error=");
    console.log(error);
    console.log("App callback error, body=");
    console.log(body);
  }
}

console.log("Listening for answer webhook at: " + prefix + server_url + "/answer");

// This sets the answer and event webhooks for the number/application
nexmo.applications.update(app_id, "WATSONWS", "voice", prefix + server_url + "/answer", prefix + server_url + "/event", {}, app_callback);

app.get('/answer', (req, res) => {
  let uuid = req.query.uuid;
  let entity = 'customer';
  // Connect customer call via websocket to this server (for Dialogflow audio stream)
  let wsuri = wsprefix + wshostname + '/watsocket?uuid=' + uuid + '&entity=' + entity;
  console.log('************************************* customer websocket URI: ', wsuri);
  console.log("Conversation: conference_" + uuid);
  setTimeout(() => { // Give the NCCO time to play the response and join the conference
    nexmo.calls.create({
      to: [{
        'type': 'websocket',
        'uri': wsuri,
        'content-type': 'audio/l16;rate=16000',
        "headers": {}
      }],
      from: {
        type: 'phone',
        number: lvn 
      },
      answer_url: [prefix + server_url + '/customer_ws_answer?orig_uuid=' + uuid],
      event_url: [prefix + server_url + '/customer_ws_event?orig_uuid=' + uuid]
    }, (err, res) => {
      if (err) {
        console.error(">>> websocket create error:", err);
      }
      else { console.log(">>> websocket create status:", res); }
    });
  }, 3000);
  nexmo.calls.create({ // Call out to the Agent's phone
    to: [{
      type: 'phone',
      number: agent
    }],
    from: {
      type: 'phone',
      number: lvn
    },
    answer_url: [prefix + server_url + '/agent_answer?original_uuid=' + uuid],
    event_url: [prefix + server_url + '/agent_event?original_uuid=' + uuid]
  }, (err, res) => {
    if (err) {
      console.error(">>> agent call create error:", err);
      console.error(err.body.title);
      console.error(err.body.invalid_parameters);
    }
    else {
      console.log(">>> agent call create status:", res);
    }
  });

  let nccoResponse = [
    {
      "action": "talk",
      "text": "Connecting your call, please wait."
    },
    {
      "action": "conversation",
      "name": "conference_" + uuid,
      "startOnEnter": true,
      "answerUrl": [prefix + server_url + '/customer_conference_answer?uuid=' + uuid],
      "eventUrl": [prefix + server_url + '/customer_conference_event?uuid=' + uuid]
    }
  ];
  res.status(200).json(nccoResponse);
});
app.post('/customer_conference_event', (req, res) => {
  console.log("Customer conference event: ");
  console.log(req.body);
  res.status(204).end();
});

// This processes events on the main Customer call.  If the Customer ends the call, or the call is otherwise terminated,
// it will tear down the Agent call, and the two Nexmo Websockets.
app.post('/event', (req, res) => { 
  console.log("Original call Event:");
  console.log(req.body);
  if (req.body.status == 'completed') {
    // Terminate Nexmo server websocket to this server
    let customer_ws_uuid = app.get('customer_ws_uuid_' + req.body.uuid);
    if ((customer_ws_uuid != undefined) && (customer_ws_uuid != '')) {  // terminate customer websocket leg
      nexmo.calls.update(customer_ws_uuid, { action: 'hangup' }, (err, res) => {
        if (err) { console.error('>>> Customer 1st websocket leg ' + customer_ws_uuid + ' tear down error', err); }
        else { console.log('>>> Customer 1st websocket leg ' + customer_ws_uuid + ' terminated') }
      });
    }
    // Agent websocket tear down
    let agent_ws_uuid = app.get('agent_ws_uuid_' + req.body.uuid);
    if ((agent_ws_uuid != undefined) && (agent_ws_uuid != '')) {  // terminate agemt websocket leg
      setTimeout(() => {
        nexmo.calls.update(agent_ws_uuid, { action: 'hangup' }, (err, res) => {
          if (err) { console.error('>>> Agent websocket leg ' + agent_ws_uuid + ' tear down error', err); }
          else { console.log('>>> Agent websocket leg ' + agent_ws_uuid + ' terminated') }
        });
      }, 1000);
    }
    // Agent call tear down
    let agent_uuid = app.get('agent_uuid_' + req.body.uuid);
    if ((agent_uuid != undefined) && (agent_uuid != '')) {  // terminate agemt websocket leg
      setTimeout(() => {
        nexmo.calls.update(agent_uuid, { action: 'hangup' }, (err, res) => {
          if (err) { console.error('>>> Agent call leg ' + agent_uuid + ' tear down error', err); }
          else { console.log('>>> Agent call leg ' + agent_uuid + ' terminated') }
        });
      }, 1000);
    }
  }
  res.status(204).end();
});
//-----------------------------------------
app.get('/customer_ws_answer', (req, res) => {
  // This is the answer callback for the Customer stream websocket.  We want to ONLY hear the customer on it.
  let to = req.query.to;
  let uuid = req.query.orig_uuid;
  var date = new Date().toLocaleString();

  console.log(">>> customer ws original_uuid at " + date + ": ", uuid);

  // This stored uuid be used to tear down this websocket
  app.set('customer_ws_uuid_' + uuid, req.query.uuid)

  let nccoResponse = [
    {
      "action": "conversation",
      "name": "conference_" + uuid,
      "canHear": [uuid] // This limits the audo to the original customer only
    }
  ];

  console.log('>>> nccoResponse:\n', nccoResponse);

  res.status(200).json(nccoResponse);
});
//-----------------------------------------
app.post('/customer_ws_event', (req, res) => {
  res.status(204).end();
});
//-----------------------------------------
app.get('/agent_answer', (req, res) => {
  let uuid = req.query.uuid;
  let original_uuid = req.query.original_uuid;
  var date = new Date().toLocaleString();
  console.log("agent_answer at " + date + " original uuid= " + original_uuid);
  app.set('agent_uuid_' + original_uuid, req.query.uuid);
  let entity = 'agent'
  // connect agent call to Watson via Nexmo websocket server connector
  nexmo.calls.create({  // Create a websocket stream of the Agent to this URI
    to: [{
      type: 'websocket',
      'uri': wsprefix + wshostname + '/watsocket?entity=' + entity + '&uuid=' + uuid,
      'content-type': 'audio/l16;rate=16000',
      "headers": {
        "languageCode": language_code,
        "user": uuid
      }
    }],
    from: {
      type: 'phone',
      number: lvn
    },
    answer_url: [prefix + server_url + '/agent_ws_answer?agent_uuid=' + uuid + '&original_uuid=' + original_uuid],
    event_url: [prefix + server_url + '/agent_ws_event?agent_uuid=' + uuid + '&original_uuid=' + original_uuid]

  }, (err, res) => {
    if (err) {
      console.error(">>> websocket create error:", err);
      console.error(err.body.title);
      console.error(err.body.invalid_parameters);
    }
    else {
      console.log(">>> websocket create status:", res);
    }
  });

  let nccoResponse =
    [
      {
        "action": "conversation",
        "name": "conference_" + original_uuid,
        "startOnEnter": true
      }
    ];
  res.status(200).json(nccoResponse);
});
//-----------------------------------------
app.post('/agent_event', (req, res) => {
  res.status(204).end();
});
app.get('/agent_ws_answer', (req, res) => {
  // This is the answer callback for the Agent stream websocket.  We want to ONLY hear the agent on it.
  var date = new Date().toLocaleString();
  console.log("agent_ws_answer at " + date);
  let original_uuid = req.query.original_uuid;
  let agent_uuid = req.query.agent_uuid;
  app.set('agent_ws_uuid_' + original_uuid, req.query.uuid)
  let nccoResponse =
    [
      {
        "action": "conversation",
        "name": "conference_" + original_uuid,
        "canHear": [agent_uuid]  // This limits the audio to the Agent ONLY
      }
    ];
  res.status(200).json(nccoResponse);
});
//-----------------------------------------
app.post('/agent_ws_event', (req, res) => {
  res.status(204).end();
});

// This websocket receives the Customer and Agent streams, (same code, but separate individual websocket connections)
// differentiating them by the "entity" we set in the URI ("customer" or "agent")
// It then connects to the Watson Speech-to-Text through websockets (using the ibm-watson node SDK)
// It will process the streams, get the transcription, and print the results to the console.
app.ws('/watsocket', async (ws, req) => {  
  var date = new Date().toLocaleString();
  console.log("Watson WebSocket call at " + date);
  let uuid = req.query.uuid;
  let entity = req.query.entity;
  let started = true;
  var SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');
  const { IamAuthenticator } = require('ibm-watson/auth');
  var speechToText = new SpeechToTextV1({
    authenticator: new IamAuthenticator({ apikey: wpassword }),
    url: 'https://stream.watsonplatform.net/speech-to-text/api',
    headers: {
      'Transfer-Encoding': 'chunked'
    }
  });
  var params = {
    contentType: 'audio/l16;rate=16000',
    objectMode: true,
    model: language_model,
    interimResults: true,
    continuous: true,
    inactivityTimeout: 120,
  };
  // create the stream
  var recognizeStream = speechToText.recognizeUsingWebSocket(params);

  recognizeStream.on('data', function (data) {
    //  onEvent('Watson Data ' + entity + ':', data);
    if (data && data.results[0] && data.results[0].final) {
      console.log("************ From " + entity + ": " + data.results[0].alternatives[0].transcript);
    }
  });
  recognizeStream.on('end', function (event) { onEvent('Watson End ' + entity + ':', event); });
  recognizeStream.on('error', function (event) { onEvent('Watson Error ' + entity + ':', event.raw.data); });
  recognizeStream.on('close', function (event) {
    onEvent('Watson Close ' + entity + ':', event);
    started = false;
  });
  recognizeStream.on('readable', function (event) {
    let data;
    while (data = recognizeStream.read()) {
      // just keep reading
    }
  });

  // Displays events on the console.
  function onEvent(name, event) {
    console.log(name, JSON.stringify(event, null, 2));
  };
  let cnt = 0;
  ws.on('message', (msg) => {
    if (typeof msg === "string") {
      let config = JSON.parse(msg);
    } else {
      if (started) {
        recognizeStream.write(msg);
      }
    }
  });
  ws.on('close', () => {
    console.log("Watson websocket Nexmo-side WS close " + uuid);
  })
})

app.use('/', express.static(__dirname));

//-----------
const port = process.env.port || 8010;
var date = new Date().toLocaleString();
console.log("Starting up watson websocket demo at " + date);
app.listen(port, 'localhost', () => console.log(`Server application listening on port ${port}!`));

//------------
