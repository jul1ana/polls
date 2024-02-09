// server HTTP
import fastify from "fastify";
import websocket from "@fastify/websocket";
import cookie from "@fastify/cookie";
import { createPoll } from "./routes/create-poll";
import { getPoll } from "./routes/get-poll";
import { voteOnPoll } from "./routes/vote-on-poll";
import { pollResults } from "./ws/poll-results";

const app = fastify();

app.register(websocket);
app.register(cookie, {
  secret: "polls-cookie-id", //assinar o cookie p/ usuario nao mudar o valor dele
  hook: 'onRequest' //antes da req faz com que o plugin-cookie entre em acao
});

//routes-HTTP
app.register(createPoll);
app.register(getPoll);
app.register(voteOnPoll);

//routes-WebSockets
app.register(pollResults);

app.listen({port: 3333}).then(() => {
  console.log("HTTP server running!");
});