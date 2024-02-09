//cada vez que uma mensagem for publicada dentro de um canal -> [pollOptionId]qual foi a opcao que recebeu voto e [votes]qual seu numero total de votos no momento
type Message = {
  pollOptionId: string,
  votes: number
};

type Subscriber = (message: Message) => void;

class VotingPubSub {
  //toda estrtura de Pub/Sub possui canais
  //chave deles é o ID da enquete - string | valor - subscribers - quem ta ouvindo as mensagens
  //cada enquete pode ter varios subscribers - usuários=subscribers
  private channels: Record<string, Subscriber[]> = {} //inicializando c/ objeto vazio

  //recebe o ID da enquete=canal e qual funçao sera chamada quando esta enquete receber algum voto
  subscribe(pollId: string, subscriber: Subscriber) {
    //se nenhuma pessoa assinou os resultados de uma enquete -> cria um Array
    if(!this.channels[pollId]) {
      this.channels[pollId] = [];
    };

    this.channels[pollId].push(subscriber);
  };

  //publicação das mensagens dentro de uma enquete especifica
  publish(pollId: string, message: Message) {
    //se nao tiver nenhum subscriber inscrito -> retorna
    if(!this.channels[pollId]) {
      return;
    };

    //caso contrario -> percorre cada subscriber que esta dentro do canal desta enquete -> chama a funçao subscribe -> envia a mensagem
    for(const subscriber of this.channels[pollId]) {
      subscriber(message);
    };
  };
};

export const voting = new VotingPubSub();