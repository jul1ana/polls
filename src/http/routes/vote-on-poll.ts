import z from "zod";
import { randomUUID } from "node:crypto";
import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";
import { voting } from "../../utils/voting-pub-sub";

export async function voteOnPoll(app: FastifyInstance) {
  app.post("/polls/:pollId/votes", async (req, res) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid()
    });

    const voteOnPollParams = z.object({
      pollId: z.string().uuid()
    });

    const { pollId } = voteOnPollParams.parse(req.params);
    const { pollOptionId } = voteOnPollBody.parse(req.body);

    let { sessionId } = req.cookies;

    if(sessionId) {
      const userPreviousVoteOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId
          }
        }
      });

      if(userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionId !== pollOptionId) {
        await prisma.vote.delete({
          where: {
            id: userPreviousVoteOnPoll.id
          }
        });

        //descendo a pontuaçao ANTIGA apos deletar o voto acima
        const votes = await redis.zincrby(pollId, -1, userPreviousVoteOnPoll.pollOptionId);
        //avisando p/ voto antigo
        voting.publish(pollId, {
          pollOptionId: userPreviousVoteOnPoll.pollOptionId,
          votes: Number(votes)
        });
      } else if(userPreviousVoteOnPoll) {
        return res.status(400).send({ message: "You already voted on this poll." });
      };
    };

    if(!sessionId) {
      sessionId = randomUUID(); 

      res.setCookie("sessionId", sessionId, {
        path: "/", 
        maxAge: 60 * 60 * 24 * 30, 
        signed: true, 
        httpOnly: true 
      });
    };

    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId
      }
    });

    //incrementando os votos
    //3 parametros obrigatorios -> 1.key = ID da enquete(pq cada enquete terá um ranking proprio) | 2.valor do voto | 3.opção da enquete
    //incrementando em 1 voto em uma opçao de uma enquete
    //retornando o numero de votos real
    const votes = await redis.zincrby(pollId, 1, pollOptionId);

    //publicar mensagens dentro do canal com o ID (pollId) -> falando que houve um novo voto etc
    voting.publish(pollId, {
      //passando uma mensagem -> qual opçao que recebeu voto(pollOptionId) e o n° de votos(votes)
      pollOptionId,
      votes: Number(votes)
    });

    return res.status(201).send();
  });
}