# watson_text_to_speech
Using Nexmo Websockets with Watson Text-to-Speech

# Installation
Install required softwares: `nodejs`, `npm`, `git`

Clone this repo:
```
$ git clone git@github.com:nexmo-se/watson_text_to_speech.git
```
Install required dependencies: 
```
npm install
```

Setup `.env` according to example `.env` file
```
To run: 
node watson
```
From any phone (you are the Customer!), dial the Nexmo LVN number (the one in the .env file).  This will
connect to the Agent phone (as specified in the .env file), and transcribe both the
Customer and Agent streams using Watson Test-to-Speech, and write the transcription to the console.

# What it does...
When the application starts, it creates a "nexmo" object with the nexmo node SDK.  It uses this to set the Voice webhook to point to the app at the "/answer" url.  When the Customer dials the LVN number, the /answer webhook is invoked.  In the webhook, we keep track of the original call uuid, and create a call to a websocket for this leg (using nexmo.calls.create()), setting the websocket to be "/watsocket?uuid=' + uuid + '&entity=' + entity", where uuid is the aforementioned Customer call leg uuid, and "entity" is "customer". We also set the answer webhook for this websocket to be "/customer_ws_answer?orig_uuid=' + uuid", where uuid is, agaon, the Customer call leg uuid.  Then, still in the "/answer" webhook, we set up a call from our LVN out to the Agent phone (again using nexmo.calls.create()),and again passing along the this Customer call leg uuid in the URL. We are using this original uuid as part of the "conversation" name ("conference_xxxx" where xxxx is the uuid) so that ALL legs are joined into the same unique conversation. Finally, still in the "/answer" webhook, we set up our NCCO with 2 actions... "talk" to say "Connecting your call, please wait.", followed by "conversation" to add this leg to the "conference_xxxx" conversation.

The answer webhook for the Agent leg of the call, "/agent_answer", gets called when the agent answers.  In this webhook, we create a websocket call very similar to what we did with the Customer leg, only this is for the Agent leg... the websocket is still the same "/watsocket" only this time the entity is "agent", and the answer webhook is "/agent_ws_answer", only this time we pass along the uuid of the Agent call leg as well. We finish up in this webhook by returning an NCCO that adds the agent call leg into the "conference_xxxx" conversation.

The websocket answer webhook for the Customer, as we said, is "/customer_ws_answer".  In this webhook, we return an NCCO that brings the websocket into the "conference_xxxx" conversation, AND (this is IMPORTANT...) sets "canHear" to be the Customer uuid.  This means that the websocket will ONLY get the audio stream coming from the Customer.  This allows us to split the transcription between the Customer and Agent.

Similarly, in the answer webhook for the Agent "/agent_ws_answer", we add the agent call leg to the "conference_xxxx" conversation, and set "canHear" to the AGENT'S uuid.  Again, allowing us to split the transcription correctly.

Now, all the legs are set up. We finally come to the websocket(s) themselves, at "/watsocket".  This entry point will be called by both the Customer and Agent, with the appropriate "entity" so that we can tell which is which.  In "/watsocket", we use the ibm-watson SDK to set up a connection to the Watson Speech-to-Text service (using the SpeechToTextV1 API).  Basically, as audio packets come in to /watsocket, we forward them along to Watson (in the "ws.on('message'..." function).  Watson indicates when it has some transcription ready by signalling "readable" (recognizeStream.on('readable'...), and then we tell it to read the data.  It then gets signalled that the data is read, by signalling "recognizeStream.on('data', ...", where we grab the transcription out of the structure. Since we know whether it is Customer or Agent by the passed in "entity", we print to the console appropriately.

And we have transcription!!

Once the original Customer leg gets torn down, we see the "completed" event in the "/events" webhook, and we go through the various leg uuid and hangup each leg.  All done, ready for another call!

