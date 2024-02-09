import z from "zod";
import { prisma } from "../../lib/prisma";
import { FastifyInstance } from "fastify";
import { redis } from "../../lib/redis";

export async function getPoll(app: FastifyInstance) {
  app.get("/polls/:pollId", async (req, res) => {
    const getPollParams = z.object({
      pollId: z.string().uuid()
    });

    const { pollId } = getPollParams.parse(req.params);

    const poll = await prisma.poll.findUnique({
      where: {
        id: pollId
      },
      include: {
        options: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    //caso nao encontre a enquete
    if(!poll) {
      return res.status(400).send({ message: "Poll not found." });
    };

    //retorna o ranking atraves de uma key(enquete)
    //retornando da posicao 0 ate -1 -> todas as opcoes | WITHSCORES -> retorna qual a pontuacao de cada uma das opcoes
    const result = await redis.zrange(pollId, 0, -1, "WITHSCORES");

    //reduce -> metodo dentro de um Array do JS p/ converter um Array em outra estrtura
    //percorre cada um dos itens do Array -> e executa uma funcao no item(1º parametro), 2ºparametro(qual é a estrtura inicial que quero converter este Array) -> convertendo em um objeto que vai possuir: o id da opcao e o seu voto que esta opcao possui
    //passando qual o valor do objeto Record(é um generico - aceita 2 parametros | 1.tipo da chave do objeto(string pois sera o ID), 2.valor da chave(number pois sera o score/voto)) -> usado em objetos
    const votes = result.reduce((obj, line, index) => { //3 parametros -> 1.objeto que esta sendo criado, 2.cada linha do Array, 3.indice
      if(index % 2 === 0) {
        //se o indice for PAR -> armazena na var score a opcao que vem logo depois deles -> ou seja os votos
        const score = result[index + 1];

        //assign -> mesclar 2 objetos -> mesclando a linha(o ID) c/ o valor do voto(score)
        Object.assign(obj, { [line]: Number(score) });
      };

      return obj; //reduce smp retorna um objeto no final de cada interacao
    }, {} as Record<string, number>);

    return res.send({
      poll: {
        id: poll.id,
        title: poll.title,
        options: poll.options.map(option => {
          return {
            id: option.id,
            title: option.title,
            score: (option.id in votes) ? votes[option.id] : 0
          };
        })
      }
    });
  });
}