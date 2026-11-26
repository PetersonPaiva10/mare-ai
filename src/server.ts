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

async function enviarMensagemEvolution(remoteJid: string, texto: string) {
  const evolutionUrl = process.env.EVOLUTION_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY || 'MinhaSenhaSecreta123';
  const instanceName = process.env.EVOLUTION_INSTANCE || 'mare-ai';

  if (!evolutionUrl) {
    console.log('Falta configurar EVOLUTION_URL no Render:', texto);
    return;
  }

  const url = `${evolutionUrl}/message/sendText/${instanceName}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': evolutionKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      number: remoteJid,
      text: texto
    })
  });

  if (!res.ok) {
    console.error('Erro ao enviar na Evolution:', await res.text());
  } else {
    console.log('Resposta enviada via Evolution para:', remoteJid);
  }
}

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.event !== 'messages.upsert') return;
    const data = body.data;
    if (!data || data.key?.fromMe) return;

    const remoteJid = data.key?.remoteJid;
    if (!remoteJid || remoteJid.includes('@g.us')) return;

    const textoRecebido =
      data.message?.conversation ||
      data.message?.extendedTextMessage?.text;

    if (!textoRecebido) return;

    const nomeCliente = data.pushName || 'Hóspede';

    if (!historicoConversas[remoteJid]) {
      historicoConversas[remoteJid] = [];
    }

    historicoConversas[remoteJid].push({
      role: 'user',
      parts: [{ text: textoRecebido }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: historicoConversas[remoteJid],
      config: {
        systemInstruction: gerarSystemPrompt(hotelExemplo),
        temperature: 0.7,
      }
    });

    let respostaIA = response.text || '';

    if (respostaIA.includes('[LEAD_QUALIFICADO]')) {
      respostaIA = respostaIA.replace('[LEAD_QUALIFICADO]', '').trim();
      console.log('🔥 LEAD QUALIFICADO: ' + nomeCliente + ' (' + remoteJid + ')');
    }

    historicoConversas[remoteJid].push({
      role: 'model',
      parts: [{ text: respostaIA }]
    });

    await enviarMensagemEvolution(remoteJid, respostaIA);
  } catch (error: any) {
    console.error('Erro no Webhook Evolution:', error?.message || error);
  }
});

app.get('/', (req, res) => {
  res.send('🌊 API Maré AI (Evolution) está online!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor Mare AI rodando na porta ' + PORT);
});
