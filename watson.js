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
var wpassword = process.env.wpassword; // Watson password
var language_model = process.env.language_model || 'en-US_NarrowbandModel'; // Watson Narrowband model for your language
var language_code = process.env.language_code; // Nexmo Language Code
var wshostname = server_url;

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
      "endOnExit": true,
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
  console.log("Original call Event: "+req.body.status);

  // The following is ONLY necessary if you DO NOT want to use "endOnExit" for the customer.
  // Setting "endOnExit" for in the conversation for the Customer means that once the customer 
  // hangs up, all the legs in the conversation will be closed.  However, we are
  // leaving the code here (just with "0 &&" so it doesn't get executed), just in case 
  // some other usecase requires us to leave the conference open... this code demonstrates how
  // we would tear down each leg individually.

  if (0 && req.body.status == 'completed') {  
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
      "startOnEnter": false,
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
  // Now that the agent has answered, we know the conversation (conference_xxxx) has been established.
  // This means we can now safely use the conference with canHear for each side.  Start by connecting the Customer websocket.

  // Connect customer call via websocket to this server (for Dialogflow audio stream)
  let wsuri = wsprefix + wshostname + '/watsocket?uuid=' + original_uuid + '&entity=customer';
  console.log('************************************* customer websocket URI: ', wsuri);
  console.log("Conversation: conference_" + original_uuid);
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
    answer_url: [prefix + server_url + '/customer_ws_answer?orig_uuid=' + original_uuid],
    event_url: [prefix + server_url + '/customer_ws_event?orig_uuid=' + original_uuid]
  }, (err, res) => {
    if (err) {
      console.error(">>> customerwebsocket create error:", err);
    }
    else { console.log(">>> customer websocket create status:", res); }
  });

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
      console.error(">>> agent websocket create error:", err);
      console.error(err.body.title);
      console.error(err.body.invalid_parameters);
    }
    else {
      console.log(">>> agent websocket create status:", res);
    }
  });

  let nccoResponse =
    [
      {
        "action": "conversation",
        "name": "conference_" + original_uuid,
        "startOnEnter": false
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
        "startOnEnter": false,
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
