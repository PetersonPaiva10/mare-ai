import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { gerarSystemPrompt, gerarMensagensAutomacao, HotelConfig } from './hotelPrompt';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const hotelExemplo: HotelConfig = {
  nomeHotel: 'Pousada Brisa de Itamambuca',
  diferenciais: 'pé na areia, piscina aquecida, café da manhã artesanal com frutas locais e trilhas exclusivas',
  regrasBasicas: 'Check-in às 14h, Check-out às 12h. Aceitamos pets de pequeno porte (taxa de R$ 50/diária). Estacionamento gratuito.',
  linkGoogleAvaliacao: 'https://g.page',
  cupomRetorno: 'VOLTEUBATUBA15'
};

const historicoConversas: Record<string, { role: 'user' | 'model'; parts: { text: string }[] }[]> = {};

// Função para enviar a resposta da IA direto para o WhatsApp do cliente via Meta Cloud API
async function enviarMensagemWhatsApp(paraTelefone: string, texto: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneNumberId) {
    console.log('Simulação (sem token WhatsApp):', texto);
    return;
  }

  await fetch(https://facebook.com{phoneNumberId}/messages, {
    method: 'POST',
    headers: {
      'Authorization': Bearer ,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: paraTelefone,
      type: 'text',
      text: { body: texto }
    })
  });
}

// 1. Rota de verificação obrigatória da Meta (WhatsApp)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook da Meta verificado com sucesso!');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 2. Rota que recebe as mensagens reais do WhatsApp
app.post('/webhook', async (req, res) => {
  // Responde 200 imediatamente para a Meta não reenviar a mesma mensagem
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== 'text') return;

    const telefone = message.from;
    const textoRecebido = message.text.body;
    const nomeCliente = value?.contacts?.[0]?.profile?.name || 'Hóspede';

    if (!historicoConversas[telefone]) {
      historicoConversas[telefone] = [];
    }

    historicoConversas[telefone].push({
      role: 'user',
      parts: [{ text: textoRecebido }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: historicoConversas[telefone],
      config: {
        systemInstruction: gerarSystemPrompt(hotelExemplo),
        temperature: 0.7,
      }
    });

    let respostaIA = response.text || '';
    let transferirHumano = false;

    if (respostaIA.includes('[LEAD_QUALIFICADO]')) {
      transferirHumano = true;
      respostaIA = respostaIA.replace('[LEAD_QUALIFICADO]', '').trim();
      console.log(🔥 LEAD QUALIFICADO:  ());
      // Aqui você pode disparar um alerta no WhatsApp do gerente do hotel!
    }

    historicoConversas[telefone].push({
      role: 'model',
      parts: [{ text: respostaIA }]
    });

    await enviarMensagemWhatsApp(telefone, respostaIA);
  } catch (error: any) {
    console.error('Erro no Webhook WhatsApp:', error?.message || error);
  }
});

// Rota de saúde para o Render saber que o servidor está online
app.get('/', (req, res) => {
  res.send('🌊 API Maré AI está online!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor Mare AI rodando na porta ' + PORT);
});
