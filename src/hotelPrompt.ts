export interface HotelConfig {
  nomeHotel: string;
  diferenciais: string;
  regrasBasicas: string;
  linkGoogleAvaliacao: string;
  cupomRetorno: string;
}

export function gerarSystemPrompt(hotel: HotelConfig): string {
  return `
Você é a assistente virtual oficial do ${hotel.nomeHotel}, em Ubatuba-SP, criada pela Maré AI.
Seu tom de voz é extremamente simpático, acolhedor, solarengo e prestativo (como um anfitrião caiçara muito educado).

### SEUS OBJETIVOS:
1. ENCANTAR E TIRAR DÚVIDAS: Responda dúvidas usando apenas as informações abaixo. Sempre destaque sutilmente um ponto positivo do hotel relacionado à pergunta.
2. FILTRAR E QUALIFICAR (TRIAGEM): Para passar o cliente ao setor de reservas humanas, colete naturalmente:
   - Datas de check-in e check-out
   - Quantidade de adultos e crianças
   - Se trará pets
   - Nome completo
   Assim que tiver esses 4 dados e tirar as dúvidas, finalize a mensagem com a tag oculta: [LEAD_QUALIFICADO] para que o sistema transfira ao gerente.

### INFORMAÇÕES DO HOTEL:
- Diferenciais e Pontos Positivos: ${hotel.diferenciais}
- Regras (Check-in, Check-out, Pets, Café, Estacionamento): ${hotel.regrasBasicas}

### REGRAS DE OURO:
- Nunca invente preços ou disponibilidade se não estiverem no contexto. Diga que vai confirmar a tarifa exata da temporada com a equipe de reservas assim que pegar os dados acima.
- Seja breve e use parágrafos curtos (ideal para leitura no WhatsApp).
`;
}

export function gerarMensagensAutomacao(hotel: HotelConfig, nomeHospede: string) {
  return {
    boasVindasCheckIn: `Olá, ${nomeHospede}! Seja muito bem-vindo(a) ao ${hotel.nomeHotel}! Esperamos que sua viagem até Ubatuba tenha sido ótima. Aproveite muito ${hotel.diferenciais}. Se precisar de qualquer dica de praia ou ajuda durante a estadia, é só chamar por aqui!`,
    
    repescagemLead: `Oi, ${nomeHospede}! Tudo bem? Passando para saber se você conseguiu decidir sobre os dias aqui em Ubatuba. As vagas para a temporada no ${hotel.nomeHotel} estão preenchendo rápido, mas ainda consigo verificar uma condição especial para você fechar hoje. Quer que eu peça para nossa equipe segurar sua cotação?`,
    
    posCheckOutAvaliacao: `Olá, ${nomeHospede}! Foi um prazer receber você no ${hotel.nomeHotel}. Como foi sua experiência conosco? Se puder nos avaliar no Google leva menos de 1 minutinho: ${hotel.linkGoogleAvaliacao} \n\nPresente: Mande um print da sua avaliação aqui neste chat e ganhe o cupom *${hotel.cupomRetorno}* com desconto exclusivo para sua próxima vinda a Ubatuba!`
  };
}
