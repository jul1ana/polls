// server HTTP
import fastify from "fastify";
import {PrismaClient} from "@prisma/client";
import {z} from "zod";

const app = fastify();

//database connection
const prisma = new PrismaClient();

app.post("/polls", async (req, res) => {
  //estrutura esperada do req.body 
  const createPollBody = z.object({
    //validação que title seja obrigatório e uma String
    title: z.string()
  });

  //validando e retornando as informações passadas acima
  const {title} = createPollBody.parse(req.body);

  //salvando dentro do BD
  /* 
  obs.: operações no BD tendem a ter latências [não é instantena -> Promise(pode dar certo ou não! leva um tempo)] => async/await - funçoes assincronas  
  */
  const poll = await prisma.poll.create({
    //dados que serão inseridos na tabela
    data: {
      title
    }
  });

  //retornando o ID da enquente criada acima
  return res.status(201).send({pollId: poll.id});
});

app.listen({port: 3333}).then(() => {
  console.log("HTTP server running!");
});