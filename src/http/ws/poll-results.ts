import { FastifyInstance } from "fastify";
import z from "zod";
import { voting } from "../../utils/voting-pub-sub";

export async function pollResults(app: FastifyInstance) {
  app.get("/polls/:pollId/results", { websocket: true }, (connection, req) => {
    const getPollParams = z.object({
      pollId: z.string().uuid()
    });

    const { pollId } = getPollParams.parse(req.params);

    //ouvir as mensagens
    //subscribe -> ouve | publish -> escreve/publica as mensages
    voting.subscribe(pollId, (message) => {
      //enviando os dados da mensagem dentro de um JSON
      connection.socket.send(JSON.stringify(message));
    });
  });
};