// /api/checklist.js
// Função serverless (Vercel) que guarda e lê o estado da checklist partilhada
// numa base de dados Redis (Upstash), ligada ao projecto via Marketplace.
//
// Rotas:
//   POST /api/checklist            -> cria uma nova checklist partilhada, devolve { id, session, updatedAt }
//   GET  /api/checklist?id=XXX     -> devolve { id, session, updatedAt } dessa checklist
//   PUT  /api/checklist?id=XXX     -> actualiza o estado dessa checklist, devolve { id, session, updatedAt }

const { Redis } = require('@upstash/redis');

// Redis.fromEnv() lê automaticamente as variáveis de ambiente que a
// integração Upstash injecta no projecto Vercel (KV_REST_API_URL /
// KV_REST_API_TOKEN, ou UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
const redis = Redis.fromEnv();

const TTL_SECONDS = 60 * 60 * 24 * 120; // checklists expiram ao fim de 120 dias sem uso

function genId(){
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos
  let out = '';
  for(let i = 0; i < 6; i++){
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return 'CHK-' + out;
}

module.exports = async (req, res) => {
  try{
    if(req.method === 'GET'){
      const id = req.query.id;
      if(!id) return res.status(400).json({ error: 'Parâmetro "id" em falta.' });
      const data = await redis.get(`checklist:${id}`);
      if(!data) return res.status(404).json({ error: 'Checklist não encontrada.' });
      return res.status(200).json(data);
    }

    if(req.method === 'POST'){
      const body = req.body || {};
      const { session } = body;
      if(!session) return res.status(400).json({ error: 'Campo "session" em falta.' });

      let id = genId();
      let attempts = 0;
      while(attempts < 5 && await redis.get(`checklist:${id}`)){
        id = genId();
        attempts++;
      }

      const updatedAt = Date.now();
      const payload = { id, session, updatedAt };
      await redis.set(`checklist:${id}`, payload, { ex: TTL_SECONDS });
      return res.status(200).json(payload);
    }

    if(req.method === 'PUT'){
      const id = req.query.id;
      const body = req.body || {};
      const { session } = body;
      if(!id) return res.status(400).json({ error: 'Parâmetro "id" em falta.' });
      if(!session) return res.status(400).json({ error: 'Campo "session" em falta.' });

      const updatedAt = Date.now();
      const payload = { id, session, updatedAt };
      await redis.set(`checklist:${id}`, payload, { ex: TTL_SECONDS });
      return res.status(200).json(payload);
    }

    res.setHeader('Allow', 'GET, POST, PUT');
    return res.status(405).json({ error: 'Método não suportado.' });
  }catch(err){
    console.error('Erro em /api/checklist:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.', detail: String(err && err.message || err) });
  }
};
