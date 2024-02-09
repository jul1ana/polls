import z from "zod";
import { randomUUID } from "node:crypto";
import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";

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
        await redis.zincrby(pollId, -1, userPreviousVoteOnPoll.pollOptionId);
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
    await redis.zincrby(pollId, 1, pollOptionId);

    return res.status(201).send();
  });
}