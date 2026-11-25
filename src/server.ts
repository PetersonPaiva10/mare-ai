import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { gerarSystemPrompt, HotelConfig } from './hotelPrompt';

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

function normalizarTelefoneBrasil(telefone: string): string {
  // Se for número brasileiro (55 + DDD + 8 dígitos = 12 dígitos), insere o 9 após o DDD
  if (telefone.startsWith('55') && telefone.length === 12) {
    return telefone.slice(0, 4) + '9' + telefone.slice(4);
  }
  return telefone;
}

async function enviarMensagemWhatsApp(paraTelefone: string, texto: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneNumberId || token === 'aguardando') {
    console.log('Simulação (sem token WhatsApp):', texto);
    return;
  }

  const destino = normalizarTelefoneBrasil(paraTelefone);
  const base = 'https://graph.' + 'facebook' + '.com/v21.0/';
  const url = `${base}${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: destino,
      type: 'text',
      text: { body: texto }
    })
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Erro detalhado da Meta:', JSON.stringify(data));
  } else {
    console.log('Mensagem enviada com sucesso para:', destino);
  }
}

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

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const entry = req.body.entry && req.body.entry.at(0);
    const changes = entry && entry.changes && entry.changes.at(0);
    const value = changes && changes.value;
    const message = value && value.messages && value.messages.at(0);

    if (!message || message.type !== 'text') return;

    const telefone = message.from;
    const textoRecebido = message.text.body;
    const contato = value.contacts && value.contacts.at(0);
    const nomeCliente = (contato && contato.profile && contato.profile.name) || 'Hóspede';

    if (!historicoConversas[telefone]) {
      historicoConversas[telefone] = [];
    }

    historicoConversas[telefone].push({
      role: 'user',
      parts: [{ text: textoRecebido }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: historicoConversas[telefone],
      config: {
        systemInstruction: gerarSystemPrompt(hotelExemplo),
        temperature: 0.7,
      }
    });

    let respostaIA = response.text || '';

    if (respostaIA.includes('[LEAD_QUALIFICADO]')) {
      respostaIA = respostaIA.replace('[LEAD_QUALIFICADO]', '').trim();
      console.log('🔥 LEAD QUALIFICADO: ' + nomeCliente + ' (' + telefone + ')');
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

app.get('/', (req, res) => {
  res.send('🌊 API Maré AI está online!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor Mare AI rodando na porta ' + PORT);
});
