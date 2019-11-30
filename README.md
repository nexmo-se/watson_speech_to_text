# Nexmo and DialogFlow Websockets 
Using Nexmo Websockets with Google DialogFlow

# Installation
Install required softwares: `nodejs`, `npm`, `git`

Clone this repo:
```
$ git clone git@github.com:nexmo-se/nexmo-df.git
```
Install required dependencies: 
```
npm install
```

Setup `.env` according to example `.env` file
```
To run: 
node df
```
From any phone (you are the Customer!), dial the Nexmo LVN number (the one in the .env file).  This will
connect to the Agent phone (as specified in the .env file), and transcribe both the
Customer and Agent streams using Watson Test-to-Speech, and write the transcription to the console.