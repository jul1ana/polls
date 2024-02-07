import z from "zod";
import { randomUUID } from "node:crypto";
import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

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

    //verificando se o usuario ja votou na enquete
    if(sessionId) {
      const userPreviousVoteOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId
          }
        }
      });

      //ja votou anteriormente e a opcao que ele escolheu é diferente da opcao q esta escolhendo AGORA
      if(userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionId !== pollOptionId) {
        //apagar o voto anterior
        await prisma.vote.delete({
          where: {
            id: userPreviousVoteOnPoll.id
          }
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

    //criar um novo voto
    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId
      }
    });

    return res.status(201).send();
  });
}